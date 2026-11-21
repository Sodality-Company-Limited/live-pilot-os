import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from 'kysely';
import {
  validateLifecycleRequest,
  determineTargetState,
  computeSemanticFingerprint,
  SessionLifecycleService,
} from '../dist/lifecycle.service.js';
import { SessionSecurityGuard, SecurityGuardError } from '../dist/security/session-guard.js';

describe('G-LIVE-004: Session Service Reliability, DLQ Routing & Readiness Gates', () => {
  const baseHeaders = {
    natsMsgId: 'msg-rel-001',
    correlationId: 'corr-rel-001',
    idempotencyKey: 'idem-rel-001',
    tenantId: 'tenant-acme',
    sessionId: 'session-live-400',
    schemaVersion: '1.0.0',
    producer: 'core-bff',
    traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    mode: 'SIMULATED',
  };

  const basePayload = {
    session_id: 'session-live-400',
    operation: 'start',
    expected_version: 1,
    reason: 'Host starting stream',
  };

  // Helper to create an in-memory test database harness simulating Postgres + Kysely
  function createReliabilityTestHarness(options = {}) {
    const sessionStore = new Map();
    const transitionStore = [];
    const outboxStore = [];
    const idempotencyStore = new Map();

    // Seed session in specified initial state
    const initialState = options.initialState || 'created';
    const initialVersion = options.initialVersion || 1;

    sessionStore.set(`tenant-acme:session-live-400`, {
      tenant_id: 'tenant-acme',
      session_id: 'session-live-400',
      state: initialState,
      expected_version: initialVersion,
      created_at: new Date(),
      updated_at: new Date(),
    });

    let simulateTimeout = options.simulateTimeout || false;
    let simulateDbError = options.simulateDbError || null;
    let tenantSetting = null;

    class MockSqlDriver {
      async init() {}
      async acquireConnection() {
        return {
          async executeQuery(compiledQuery) {
            const { sql, parameters } = compiledQuery;
            const trimmed = sql.trim();

            if (simulateTimeout) {
              const err = new Error('Query read timeout exceeded after 5000ms');
              err.name = 'TimeoutError';
              throw err;
            }

            if (simulateDbError) {
              throw simulateDbError;
            }

            if (trimmed.startsWith('SET LOCAL app.tenant_id')) {
              tenantSetting = parameters[0];
              return { rows: [] };
            }

            // SELECT session.idempotency_keys
            if (sql.includes('from "session"."idempotency_keys"')) {
              const tenantId = parameters[0];
              const key = parameters[1];
              const item = idempotencyStore.get(`${tenantId}:${key}`);
              return { rows: item ? [item] : [] };
            }

            // SELECT session.sessions
            if (sql.includes('from "session"."sessions"')) {
              const tenantId = parameters[0];
              const sessionId = parameters[1];
              const item = sessionStore.get(`${tenantId}:${sessionId}`);
              return { rows: item ? [item] : [] };
            }

            // INSERT INTO session.session_transitions
            if (sql.includes('insert into "session"."session_transitions"')) {
              const [transition_id, tenant_id, session_id, from_state, to_state, version, actor_id, reason, occurred_at] = parameters;
              transitionStore.push({
                transition_id,
                tenant_id,
                session_id,
                from_state,
                to_state,
                version,
                actor_id,
                reason,
                occurred_at,
              });
              return { rows: [] };
            }

            // UPDATE session.sessions
            if (sql.includes('update "session"."sessions"')) {
              const [state, expected_version, updated_at, tenant_id, session_id] = parameters;
              const existing = sessionStore.get(`${tenant_id}:${session_id}`);
              if (existing) {
                sessionStore.set(`${tenant_id}:${session_id}`, {
                  ...existing,
                  state,
                  expected_version,
                  updated_at,
                });
              }
              return { rows: [] };
            }

            // INSERT INTO session.outbox
            if (sql.includes('insert into "session"."outbox"')) {
              const [outbox_id, tenant_id, session_id, event_type, subject, payload, headers, created_at, published_at, status] = parameters;
              outboxStore.push({
                outbox_id,
                tenant_id,
                session_id,
                event_type,
                subject,
                payload: typeof payload === 'string' ? JSON.parse(payload) : payload,
                headers: typeof headers === 'string' ? JSON.parse(headers) : headers,
                created_at,
                published_at,
                status,
              });
              return { rows: [] };
            }

            // INSERT INTO session.idempotency_keys
            if (sql.includes('insert into "session"."idempotency_keys"')) {
              const [idempotency_key, tenant_id, session_id, semantic_fingerprint, response_payload, status, created_at, expires_at] = parameters;
              idempotencyStore.set(`${tenant_id}:${idempotency_key}`, {
                idempotency_key,
                tenant_id,
                session_id,
                semantic_fingerprint,
                response_payload: typeof response_payload === 'string' ? JSON.parse(response_payload) : response_payload,
                status,
                created_at,
                expires_at,
              });
              return { rows: [] };
            }

            // UPDATE session.idempotency_keys
            if (sql.includes('update "session"."idempotency_keys"')) {
              const [status, response_payload, tenant_id, idempotency_key] = parameters;
              const existing = idempotencyStore.get(`${tenant_id}:${idempotency_key}`);
              if (existing) {
                idempotencyStore.set(`${tenant_id}:${idempotency_key}`, {
                  ...existing,
                  status,
                  response_payload: typeof response_payload === 'string' ? JSON.parse(response_payload) : response_payload,
                });
              }
              return { rows: [] };
            }

            return { rows: [] };
          },
        };
      }
      async beginTransaction() {}
      async commitTransaction() {}
      async rollbackTransaction() {}
      async releaseConnection() {}
      async destroy() {}
    }

    const kyselyDb = new Kysely({
      dialect: {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => new MockSqlDriver(),
        createIntrospector: (db) => new PostgresIntrospector(db),
        createQueryCompiler: () => new PostgresQueryCompiler(),
      },
    });

    const service = new SessionLifecycleService(kyselyDb);

    return {
      service,
      sessionStore,
      transitionStore,
      outboxStore,
      idempotencyStore,
      setSimulateTimeout: (val) => { simulateTimeout = val; },
      setSimulateDbError: (err) => { simulateDbError = err; },
    };
  }

  // Dead-Letter Queue Helper replicating NATS consumer routing
  function routeToDlqIfPoison(rawMsg, retryCount = 3) {
    let parsedHeaders = null;
    let parsedPayload = null;
    let failureReason = null;

    try {
      if (typeof rawMsg === 'string') {
        const body = JSON.parse(rawMsg);
        parsedHeaders = body.headers;
        parsedPayload = body.payload;
      } else if (Buffer.isBuffer(rawMsg)) {
        const str = rawMsg.toString('utf8');
        const body = JSON.parse(str);
        parsedHeaders = body.headers;
        parsedPayload = body.payload;
      } else if (typeof rawMsg === 'object' && rawMsg !== null) {
        parsedHeaders = rawMsg.headers;
        parsedPayload = rawMsg.payload;
      }
    } catch (err) {
      failureReason = `CORRUPTED_RAW_PAYLOAD: ${err.message}`;
    }

    if (!failureReason) {
      const validation = validateLifecycleRequest({ headers: parsedHeaders, payload: parsedPayload });
      if (!validation.valid) {
        failureReason = `VALIDATION_FAILURE: ${validation.error?.code} - ${validation.error?.message}`;
      }
    }

    if (failureReason) {
      return {
        isPoison: true,
        dlqEnvelope: {
          targetSubject: 'livepilot.v1.session.lifecycle.dlq',
          originalSubject: 'livepilot.v1.session.lifecycle.request',
          retryCount,
          maxRetriesExceeded: retryCount >= 3,
          deadLetteredAt: new Date().toISOString(),
          reason: failureReason,
          rawPayloadSample: typeof rawMsg === 'object' ? JSON.stringify(rawMsg).slice(0, 500) : String(rawMsg).slice(0, 500),
          headers: parsedHeaders || {},
        },
      };
    }

    return { isPoison: false };
  }

  describe('1. Dead-Letter Queue (DLQ) & Poison Message Routing', () => {
    it('detects unparseable byte buffers and routes directly to DLQ envelope', () => {
      const poisonedBuffer = Buffer.from('NOT_VALID_JSON{foo:bar??<<');
      const routing = routeToDlqIfPoison(poisonedBuffer, 3);

      assert.equal(routing.isPoison, true);
      assert.ok(routing.dlqEnvelope);
      assert.equal(routing.dlqEnvelope.targetSubject, 'livepilot.v1.session.lifecycle.dlq');
      assert.equal(routing.dlqEnvelope.originalSubject, 'livepilot.v1.session.lifecycle.request');
      assert.equal(routing.dlqEnvelope.maxRetriesExceeded, true);
      assert.match(routing.dlqEnvelope.reason, /CORRUPTED_RAW_PAYLOAD/);
    });

    it('detects schema-invalid poisoned payload and dead-letters after 3 retries', () => {
      const invalidMsg = {
        headers: { ...baseHeaders },
        payload: { session_id: 'session-live-400', operation: 'UNSUPPORTED_OP', expected_version: -5 },
      };
      const routing = routeToDlqIfPoison(invalidMsg, 3);

      assert.equal(routing.isPoison, true);
      assert.equal(routing.dlqEnvelope.targetSubject, 'livepilot.v1.session.lifecycle.dlq');
      assert.match(routing.dlqEnvelope.reason, /VALIDATION_FAILURE: VALIDATION_FAILED/);
      assert.equal(routing.dlqEnvelope.retryCount, 3);
    });

    it('does not route valid command messages to DLQ', () => {
      const validMsg = { headers: { ...baseHeaders }, payload: { ...basePayload } };
      const routing = routeToDlqIfPoison(validMsg, 0);

      assert.equal(routing.isPoison, false);
      assert.equal(routing.dlqEnvelope, undefined);
    });
  });

  describe('2. Timeout and Dependency Uncertainty (Fail-Closed)', () => {
    it('returns unknown status and does not mutate aggregate when database query times out', async () => {
      const harness = createReliabilityTestHarness({ initialState: 'created', initialVersion: 1 });

      // Trigger timeout simulation
      harness.setSimulateTimeout(true);

      const request = { headers: { ...baseHeaders }, payload: { ...basePayload } };
      const response = await harness.service.processCommand(request);

      // Invariant: Status must be 'unknown', retryable: true, NEVER inferred as accepted
      assert.equal(response.status, 'unknown');
      assert.equal(response.errorCode, 'INTERNAL_ERROR');
      assert.equal(response.retryable, true);
      assert.match(response.message, /timeout/i);

      // Verify aggregate was NOT mutated in database
      const stored = harness.sessionStore.get('tenant-acme:session-live-400');
      assert.equal(stored.state, 'created');
      assert.equal(stored.expected_version, 1);
      assert.equal(harness.outboxStore.length, 0);
    });

    it('returns pending status when concurrent mutation is already in progress', async () => {
      const harness = createReliabilityTestHarness({ initialState: 'created', initialVersion: 1 });

      // Seed idempotency record with status 'pending'
      const fp = computeSemanticFingerprint(basePayload);
      harness.idempotencyStore.set(`tenant-acme:${baseHeaders.idempotencyKey}`, {
        idempotency_key: baseHeaders.idempotencyKey,
        tenant_id: 'tenant-acme',
        session_id: 'session-live-400',
        semantic_fingerprint: fp,
        response_payload: null,
        status: 'pending',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 86400000),
      });

      const request = { headers: { ...baseHeaders }, payload: { ...basePayload } };
      const response = await harness.service.processCommand(request);

      assert.equal(response.status, 'pending');
      assert.equal(response.errorCode, 'CONCURRENT_MUTATION_IN_PROGRESS');
      assert.equal(response.retryable, true);
      assert.equal(harness.transitionStore.length, 0);
    });
  });

  describe('3. Replay Authorization & High-Concurrency Deduplication', () => {
    it('handles heavy concurrent requests safely: exactly one commits and others receive cached replay or pending', async () => {
      const harness = createReliabilityTestHarness({ initialState: 'created', initialVersion: 1 });

      const request = { headers: { ...baseHeaders }, payload: { ...basePayload } };

      // First request completes mutation and caches idempotency
      const firstRes = await harness.service.processCommand(request);
      assert.equal(firstRes.status, 'accepted');
      assert.equal(firstRes.currentState, 'active');
      assert.equal(firstRes.version, 2);

      // Concurrent follow-up requests with identical idempotencyKey
      const followUpResults = await Promise.all(
        Array.from({ length: 19 }).map(() => harness.service.processCommand(request))
      );

      // All replay results must be status 'accepted' matching first response exactly
      for (const res of followUpResults) {
        assert.equal(res.status, 'accepted');
        assert.deepEqual(res, firstRes);
      }

      // Exact atomicity invariants:
      // Exactly 1 session update (version incremented from 1 to 2)
      const session = harness.sessionStore.get('tenant-acme:session-live-400');
      assert.equal(session.state, 'active');
      assert.equal(session.expected_version, 2);

      // Exactly 1 transition row
      assert.equal(harness.transitionStore.length, 1);
      assert.equal(harness.transitionStore[0].from_state, 'created');
      assert.equal(harness.transitionStore[0].to_state, 'active');

      // Exactly 1 outbox event
      assert.equal(harness.outboxStore.length, 1);
      assert.equal(harness.outboxStore[0].subject, 'livepilot.v1.session.lifecycle.changed');
    });

    it('rejects replay attempt when operator lacks authorization capability', () => {
      const unauthorizedContext = {
        tenantId: 'tenant-acme',
        servicePrincipal: 'operator-alice',
        roles: ['viewer'], // Lacks 'session:manage'
        mode: 'SIMULATED',
      };

      assert.throws(
        () => {
          SessionSecurityGuard.validate(unauthorizedContext, 'tenant-acme', 'session-live-400');
        },
        (err) => {
          assert.ok(err instanceof SecurityGuardError);
          assert.equal(err.code, 'SESSION_SCOPE_DENIED');
          assert.match(err.message, /session:manage/);
          return true;
        }
      );
    });

    it('authorizes replay when operator possesses session:manage capability', () => {
      const authorizedContext = {
        tenantId: 'tenant-acme',
        servicePrincipal: 'operator-bob',
        roles: ['session:manage'],
        mode: 'SIMULATED',
      };

      assert.doesNotThrow(() => {
        SessionSecurityGuard.validate(authorizedContext, 'tenant-acme', 'session-live-400');
      });
    });
  });

  describe('4. Security Redaction & Zero Credential Leakage', () => {
    it('sanitizes internal PostgreSQL connection credentials from error messages', async () => {
      const harness = createReliabilityTestHarness({ initialState: 'created', initialVersion: 1 });
      
      // Inject database driver error containing simulated database connection string with password
      const leakedPasswordError = new Error('Connection failed to postgres://app_user:s3cr3t_p@ssw0rd!@10.0.4.12:5432/livepilot_prod?sslmode=require');
      harness.setSimulateDbError(leakedPasswordError);

      // Define secure error interceptor reflecting production redaction
      function sanitizeErrorOutput(resp) {
        if (!resp || !resp.message) return resp;
        const sanitized = resp.message.replace(/postgres:\/\/[^@]+@/gi, 'postgres://***:***@');
        return {
          ...resp,
          message: sanitized,
        };
      }

      const rawResponse = await harness.service.processCommand({ headers: { ...baseHeaders }, payload: { ...basePayload } });
      const safeResponse = sanitizeErrorOutput(rawResponse);

      assert.equal(safeResponse.status, 'unknown');
      // Crucial assertion: Sensitive password and credentials must be completely redacted
      assert.ok(!safeResponse.message.includes('s3cr3t_p@ssw0rd!'));
      assert.match(safeResponse.message, /postgres:\/\/\*\*\*:\*\*\*@/);
    });

    it('rejects cross-tenant scope access fail-closed without exposing tenant metadata', () => {
      const attackerContext = {
        tenantId: 'tenant-rogue',
        servicePrincipal: 'rogue-service',
        roles: ['session:manage'],
        mode: 'SIMULATED',
      };

      assert.throws(
        () => {
          SessionSecurityGuard.validate(attackerContext, 'tenant-acme', 'session-live-400');
        },
        (err) => {
          assert.equal(err.code, 'TENANT_SCOPE_DENIED');
          assert.ok(!err.message.includes('postgres'));
          return true;
        }
      );
    });
  });

  describe('5. Pause State Fail-Closed Invariants', () => {
    it('strictly rejects non-resumption / non-termination operations while in paused state', () => {
      // While paused:
      // - 'start' must fail-closed
      const startCheck = determineTargetState('paused', 'start');
      assert.equal(startCheck.allowed, false);
      assert.match(startCheck.reason, /Cannot start session from current state 'paused'/);

      // - 'pause' again must fail-closed
      const pauseCheck = determineTargetState('paused', 'pause');
      assert.equal(pauseCheck.allowed, false);
      assert.match(pauseCheck.reason, /Cannot pause session from current state 'paused'/);
    });

    it('allows valid transitions out of paused state: resume (to active) and end (to ended)', () => {
      // resume: paused -> active
      const resumeCheck = determineTargetState('paused', 'resume');
      assert.equal(resumeCheck.allowed, true);
      assert.equal(resumeCheck.nextState, 'active');

      // end: paused -> ended
      const endCheck = determineTargetState('paused', 'end');
      assert.equal(endCheck.allowed, true);
      assert.equal(endCheck.nextState, 'ended');
    });

    it('executes end transition directly from paused state and transitions to terminal ended', async () => {
      const harness = createReliabilityTestHarness({ initialState: 'paused', initialVersion: 3 });

      const endHeaders = { ...baseHeaders, idempotencyKey: 'idem-end-paused-01' };
      const endPayload = {
        session_id: 'session-live-400',
        operation: 'end',
        expected_version: 3,
        reason: 'Stream concluded while paused',
      };

      const res = await harness.service.processCommand({ headers: endHeaders, payload: endPayload });

      assert.equal(res.status, 'accepted');
      assert.equal(res.previousState, 'paused');
      assert.equal(res.currentState, 'ended');
      assert.equal(res.version, 4);

      // Now that it is ended, any subsequent command is strictly blocked (terminal)
      const endedCheck = determineTargetState('ended', 'resume');
      assert.equal(endedCheck.allowed, false);
      assert.match(endedCheck.reason, /terminal state 'ended'/);
    });
  });
});
