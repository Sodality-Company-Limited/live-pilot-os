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

describe('G-LIVE-003: Session Lifecycle Service Unit & Contract Invariants', () => {
  const baseHeaders = {
    natsMsgId: 'msg-001',
    correlationId: 'corr-001',
    idempotencyKey: 'idem-001',
    tenantId: 'tenant-demo',
    sessionId: 'session-123',
    schemaVersion: '1.0.0',
    producer: 'core-bff',
    traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    mode: 'SIMULATED',
  };

  const basePayload = {
    session_id: 'session-123',
    operation: 'start',
    expected_version: 1,
    reason: 'Host clicked start',
  };

  describe('1. Transport Header & Payload Validation Invariants', () => {
    it('accepts valid request', () => {
      const res = validateLifecycleRequest({ headers: { ...baseHeaders }, payload: { ...basePayload } });
      assert.equal(res.valid, true);
    });

    it('rejects when required headers are missing', () => {
      const missingHeaders = { ...baseHeaders };
      delete missingHeaders.correlationId;
      const res = validateLifecycleRequest({ headers: missingHeaders, payload: { ...basePayload } });
      assert.equal(res.valid, false);
      assert.equal(res.error?.code, 'VALIDATION_FAILED');
    });

    it('rejects invalid X-Mode header', () => {
      const invalidMode = { ...baseHeaders, mode: 'INVALID_MODE' };
      const res = validateLifecycleRequest({ headers: invalidMode, payload: { ...basePayload } });
      assert.equal(res.valid, false);
      assert.equal(res.error?.code, 'VALIDATION_FAILED');
    });

    it('rejects session ID mismatch between header and payload', () => {
      const mismatched = {
        headers: { ...baseHeaders, sessionId: 'session-AAA' },
        payload: { ...basePayload, session_id: 'session-BBB' },
      };
      const res = validateLifecycleRequest(mismatched);
      assert.equal(res.valid, false);
      assert.equal(res.error?.code, 'SESSION_SCOPE_MISMATCH');
    });

    it('rejects unsupported operation', () => {
      const invalidOp = {
        headers: { ...baseHeaders },
        payload: { ...basePayload, operation: 'delete' },
      };
      const res = validateLifecycleRequest(invalidOp);
      assert.equal(res.valid, false);
      assert.equal(res.error?.code, 'VALIDATION_FAILED');
    });

    it('rejects non-positive integer expected_version', () => {
      const zeroVersion = {
        headers: { ...baseHeaders },
        payload: { ...basePayload, expected_version: 0 },
      };
      const res1 = validateLifecycleRequest(zeroVersion);
      assert.equal(res1.valid, false);

      const floatVersion = {
        headers: { ...baseHeaders },
        payload: { ...basePayload, expected_version: 1.5 },
      };
      const res2 = validateLifecycleRequest(floatVersion);
      assert.equal(res2.valid, false);
    });

    it('rejects reason exceeding 500 characters', () => {
      const longReason = {
        headers: { ...baseHeaders },
        payload: { ...basePayload, reason: 'a'.repeat(501) },
      };
      const res = validateLifecycleRequest(longReason);
      assert.equal(res.valid, false);
    });
  });

  describe('2. Strict FSM State Machine Invariants', () => {
    it('allows valid transitions according to SOT', () => {
      // start: created -> active
      assert.deepEqual(determineTargetState('created', 'start'), { allowed: true, nextState: 'active' });

      // pause: active -> paused
      assert.deepEqual(determineTargetState('active', 'pause'), { allowed: true, nextState: 'paused' });

      // resume: paused -> active
      assert.deepEqual(determineTargetState('paused', 'resume'), { allowed: true, nextState: 'active' });

      // end: created -> ended
      assert.deepEqual(determineTargetState('created', 'end'), { allowed: true, nextState: 'ended' });

      // end: active -> ended
      assert.deepEqual(determineTargetState('active', 'end'), { allowed: true, nextState: 'ended' });

      // end: paused -> ended
      assert.deepEqual(determineTargetState('paused', 'end'), { allowed: true, nextState: 'ended' });
    });

    it('enforces ended is terminal state (no transitions allowed)', () => {
      for (const op of ['start', 'pause', 'resume', 'end']) {
        const res = determineTargetState('ended', op);
        assert.equal(res.allowed, false);
        assert.match(res.reason, /terminal state/);
      }
    });

    it('rejects invalid transitions fail-closed', () => {
      // Cannot start an already active or paused session
      assert.equal(determineTargetState('active', 'start').allowed, false);
      assert.equal(determineTargetState('paused', 'start').allowed, false);

      // Cannot pause a created session
      assert.equal(determineTargetState('created', 'pause').allowed, false);

      // Cannot resume a created or already active session
      assert.equal(determineTargetState('created', 'resume').allowed, false);
      assert.equal(determineTargetState('active', 'resume').allowed, false);
    });
  });

  describe('3. Semantic Fingerprint Determinism', () => {
    it('produces identical SHA-256 for identical payload', () => {
      const fp1 = computeSemanticFingerprint(basePayload);
      const fp2 = computeSemanticFingerprint({ ...basePayload });
      assert.equal(fp1, fp2);
      assert.equal(fp1.length, 64);
    });

    it('produces different SHA-256 when operation, version, or reason change', () => {
      const fp1 = computeSemanticFingerprint(basePayload);
      const fpDiffOp = computeSemanticFingerprint({ ...basePayload, operation: 'end' });
      const fpDiffVer = computeSemanticFingerprint({ ...basePayload, expected_version: 2 });
      const fpDiffReason = computeSemanticFingerprint({ ...basePayload, reason: 'different reason' });

      assert.notEqual(fp1, fpDiffOp);
      assert.notEqual(fp1, fpDiffVer);
      assert.notEqual(fp1, fpDiffReason);
    });
  });

  describe('4. Service Operational Execution & Transactional Invariants', () => {
    function createTestContext() {
      const sessionStore = new Map();
      const transitionStore = [];
      const outboxStore = [];
      const idempotencyStore = new Map();

      // Seed initial session in 'created' state
      sessionStore.set('tenant-demo:session-123', {
        tenant_id: 'tenant-demo',
        session_id: 'session-123',
        state: 'created',
        expected_version: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      let currentTenantSetting = null;

      class TestSqlDriver {
        async init() {}
        async acquireConnection() {
          return {
            async executeQuery(compiledQuery) {
              const { sql, parameters } = compiledQuery;
              const trimmed = sql.trim();

              // 1. SET LOCAL app.tenant_id
              if (trimmed.startsWith('SET LOCAL app.tenant_id')) {
                currentTenantSetting = parameters[0];
                return { rows: [] };
              }

              // 2. SELECT session.idempotency_keys
              if (sql.includes('from "session"."idempotency_keys"')) {
                const tenantId = parameters[0];
                const key = parameters[1];
                const item = idempotencyStore.get(`${tenantId}:${key}`);
                return { rows: item ? [item] : [] };
              }

              // 3. SELECT session.sessions
              if (sql.includes('from "session"."sessions"')) {
                const tenantId = parameters[0];
                const sessionId = parameters[1];
                const item = sessionStore.get(`${tenantId}:${sessionId}`);
                return { rows: item ? [item] : [] };
              }

              // 4. INSERT INTO session.session_transitions
              if (sql.includes('insert into "session"."session_transitions"')) {
                // columns: transition_id, tenant_id, session_id, from_state, to_state, version, actor_id, reason, occurred_at
                const [transition_id, tenant_id, session_id, from_state, to_state, version, actor_id, reason, occurred_at] = parameters;
                const rec = {
                  transition_id,
                  tenant_id,
                  session_id,
                  from_state,
                  to_state,
                  version,
                  actor_id,
                  reason,
                  occurred_at,
                };
                transitionStore.push(rec);
                return { rows: [] };
              }

              // 5. UPDATE session.sessions
              if (sql.includes('update "session"."sessions"')) {
                // set "state" = $1, "expected_version" = $2, "updated_at" = $3 where "tenant_id" = $4 and "session_id" = $5
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

              // 6. INSERT INTO session.outbox
              if (sql.includes('insert into "session"."outbox"')) {
                // columns: outbox_id, tenant_id, session_id, event_type, subject, payload, headers, created_at, published_at, status
                const [outbox_id, tenant_id, session_id, event_type, subject, payload, headers, created_at, published_at, status] = parameters;
                const rec = {
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
                };
                outboxStore.push(rec);
                return { rows: [] };
              }

              // 7. INSERT INTO session.idempotency_keys
              if (sql.includes('insert into "session"."idempotency_keys"')) {
                // columns: idempotency_key, tenant_id, session_id, semantic_fingerprint, response_payload, status, created_at, expires_at
                const [idempotency_key, tenant_id, session_id, semantic_fingerprint, response_payload, status, created_at, expires_at] = parameters;
                const rec = {
                  idempotency_key,
                  tenant_id,
                  session_id,
                  semantic_fingerprint,
                  response_payload: typeof response_payload === 'string' ? JSON.parse(response_payload) : response_payload,
                  status,
                  created_at,
                  expires_at,
                };
                idempotencyStore.set(`${tenant_id}:${idempotency_key}`, rec);
                return { rows: [] };
              }

              // 8. UPDATE session.idempotency_keys
              if (sql.includes('update "session"."idempotency_keys"')) {
                // set "status" = $1, "response_payload" = $2 where "tenant_id" = $3 and "idempotency_key" = $4
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
          createDriver: () => new TestSqlDriver(),
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
      };
    }

    it('processes valid start transition: updates session, inserts transition & outbox, caches idempotency', async () => {
      const ctx = createTestContext();

      const req = {
        headers: { ...baseHeaders, idempotencyKey: 'key-1' },
        payload: { session_id: 'session-123', operation: 'start', expected_version: 1 },
      };

      const res = await ctx.service.processCommand(req);
      assert.equal(res.status, 'accepted');
      if (res.status === 'accepted') {
        assert.equal(res.sessionId, 'session-123');
        assert.equal(res.previousState, 'created');
        assert.equal(res.currentState, 'active');
        assert.equal(res.version, 2);
      }

      // Check session store updated
      const updatedSession = ctx.sessionStore.get('tenant-demo:session-123');
      assert.equal(updatedSession.state, 'active');
      assert.equal(updatedSession.expected_version, 2);

      // Check transition recorded
      assert.equal(ctx.transitionStore.length, 1);
      assert.equal(ctx.transitionStore[0].from_state, 'created');
      assert.equal(ctx.transitionStore[0].to_state, 'active');
      assert.equal(ctx.transitionStore[0].version, 2);

      // Check outbox event inserted
      assert.equal(ctx.outboxStore.length, 1);
      assert.equal(ctx.outboxStore[0].subject, 'livepilot.v1.session.lifecycle.changed');
      assert.equal(ctx.outboxStore[0].event_type, 'session.lifecycle.changed');
      assert.equal(ctx.outboxStore[0].status, 'pending');
      assert.equal(ctx.outboxStore[0].payload.from_state, 'created');
      assert.equal(ctx.outboxStore[0].payload.to_state, 'active');
      assert.equal(ctx.outboxStore[0].payload.version, 2);

      // Check idempotency record stored
      const idem = ctx.idempotencyStore.get('tenant-demo:key-1');
      assert.ok(idem);
      assert.equal(idem.status, 'completed');
      assert.deepEqual(idem.response_payload, res);
    });

    it('replays cached response for identical idempotency key without side-effects', async () => {
      const ctx = createTestContext();

      const req = {
        headers: { ...baseHeaders, idempotencyKey: 'key-replay' },
        payload: { session_id: 'session-123', operation: 'start', expected_version: 1 },
      };

      // First execution
      const res1 = await ctx.service.processCommand(req);
      assert.equal(res1.status, 'accepted');
      assert.equal(ctx.transitionStore.length, 1);
      assert.equal(ctx.outboxStore.length, 1);

      // Second execution with same idempotency key and same payload
      const res2 = await ctx.service.processCommand(req);
      assert.equal(res2.status, 'accepted');
      assert.deepEqual(res1, res2);

      // Ensure no duplicate transition or outbox event was created
      assert.equal(ctx.transitionStore.length, 1);
      assert.equal(ctx.outboxStore.length, 1);
    });

    it('rejects duplicate idempotency key used with different payload (IDEMPOTENCY_CONFLICT)', async () => {
      const ctx = createTestContext();

      const req1 = {
        headers: { ...baseHeaders, idempotencyKey: 'key-reuse' },
        payload: { session_id: 'session-123', operation: 'start', expected_version: 1 },
      };
      await ctx.service.processCommand(req1);

      // Reusing key with different operation
      const req2 = {
        headers: { ...baseHeaders, idempotencyKey: 'key-reuse' },
        payload: { session_id: 'session-123', operation: 'end', expected_version: 1 },
      };

      const res2 = await ctx.service.processCommand(req2);
      assert.equal(res2.status, 'rejected');
      if (res2.status === 'rejected') {
        assert.equal(res2.errorCode, 'IDEMPOTENCY_CONFLICT');
      }
    });

    it('rejects version conflict when expected_version does not match current version', async () => {
      const ctx = createTestContext();

      // Session version is 1, but caller supplies expected_version = 2
      const req = {
        headers: { ...baseHeaders, idempotencyKey: 'key-stale' },
        payload: { session_id: 'session-123', operation: 'start', expected_version: 2 },
      };

      const res = await ctx.service.processCommand(req);
      assert.equal(res.status, 'rejected');
      if (res.status === 'rejected') {
        assert.equal(res.errorCode, 'VERSION_CONFLICT');
        assert.equal(res.retryable, true);
        assert.equal(res.currentVersion, 1);
      }
      // Ensure no state changes occurred
      assert.equal(ctx.transitionStore.length, 0);
      assert.equal(ctx.outboxStore.length, 0);
    });

    it('rejects invalid state transition fail-closed', async () => {
      const ctx = createTestContext();

      // Session is in 'created' state; attempt to 'pause' (pause requires 'active')
      const req = {
        headers: { ...baseHeaders, idempotencyKey: 'key-invalid-fsm' },
        payload: { session_id: 'session-123', operation: 'pause', expected_version: 1 },
      };

      const res = await ctx.service.processCommand(req);
      assert.equal(res.status, 'rejected');
      if (res.status === 'rejected') {
        assert.equal(res.errorCode, 'INVALID_TRANSITION');
        assert.equal(res.retryable, false);
      }
      assert.equal(ctx.transitionStore.length, 0);
      assert.equal(ctx.outboxStore.length, 0);
    });

    it('rejects non-existent session with SESSION_NOT_FOUND', async () => {
      const ctx = createTestContext();

      const req = {
        headers: { ...baseHeaders, sessionId: 'session-missing', idempotencyKey: 'key-not-found' },
        payload: { session_id: 'session-missing', operation: 'start', expected_version: 1 },
      };

      const res = await ctx.service.processCommand(req);
      assert.equal(res.status, 'rejected');
      if (res.status === 'rejected') {
        assert.equal(res.errorCode, 'SESSION_NOT_FOUND');
      }
    });

    it('completes multi-step lifecycle: created -> active -> paused -> active -> ended', async () => {
      const ctx = createTestContext();

      // 1. start: created -> active (v1 -> v2)
      const res1 = await ctx.service.processCommand({
        headers: { ...baseHeaders, idempotencyKey: 'step-1' },
        payload: { session_id: 'session-123', operation: 'start', expected_version: 1 },
      });
      assert.equal(res1.status, 'accepted');
      assert.equal(res1.currentState, 'active');
      assert.equal(res1.version, 2);

      // 2. pause: active -> paused (v2 -> v3)
      const res2 = await ctx.service.processCommand({
        headers: { ...baseHeaders, idempotencyKey: 'step-2' },
        payload: { session_id: 'session-123', operation: 'pause', expected_version: 2 },
      });
      assert.equal(res2.status, 'accepted');
      assert.equal(res2.currentState, 'paused');
      assert.equal(res2.version, 3);

      // 3. resume: paused -> active (v3 -> v4)
      const res3 = await ctx.service.processCommand({
        headers: { ...baseHeaders, idempotencyKey: 'step-3' },
        payload: { session_id: 'session-123', operation: 'resume', expected_version: 3 },
      });
      assert.equal(res3.status, 'accepted');
      assert.equal(res3.currentState, 'active');
      assert.equal(res3.version, 4);

      // 4. end: active -> ended (v4 -> v5)
      const res4 = await ctx.service.processCommand({
        headers: { ...baseHeaders, idempotencyKey: 'step-4' },
        payload: { session_id: 'session-123', operation: 'end', expected_version: 4 },
      });
      assert.equal(res4.status, 'accepted');
      assert.equal(res4.currentState, 'ended');
      assert.equal(res4.version, 5);

      // 5. terminal invariant: end from ended fails
      const res5 = await ctx.service.processCommand({
        headers: { ...baseHeaders, idempotencyKey: 'step-5' },
        payload: { session_id: 'session-123', operation: 'end', expected_version: 5 },
      });
      assert.equal(res5.status, 'rejected');
      assert.equal(res5.errorCode, 'INVALID_TRANSITION');

      // Transitions count: 4
      assert.equal(ctx.transitionStore.length, 4);
      // Outbox events count: 4
      assert.equal(ctx.outboxStore.length, 4);
    });
  });
});
