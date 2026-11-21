import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabasePoolManager } from '../../src/persistence/database.ts';
import { ApprovalControlService } from '../../src/index.ts';
import {
  APPROVAL_REQUEST_SUBJECTS,
  APPROVAL_DECISION_SUBJECTS,
  CONTROL_MODE_SUBJECTS,
  EMERGENCY_PAUSE_SUBJECTS,
} from '../../src/handlers/index.ts';

// In-Memory Zero-Mock database engine simulating PostgreSQL transactions and RLS
class MockDatabaseEngine {
  constructor() {
    this.approval_requests = new Map();
    this.approval_decisions = new Map();
    this.approval_modes = new Map();
    this.emergency_pauses = new Map();
    this.approval_outbox = new Map();
    this.idempotency_keys = new Map();
  }

  createClient() {
    return {
      query: async (sqlText, params = []) => {
        const trimmed = sqlText.trim();
        if (trimmed.startsWith('BEGIN') || trimmed.startsWith('COMMIT') || trimmed.startsWith('ROLLBACK')) {
          return { rows: [], rowCount: 0 };
        }
        if (trimmed.includes("set_config('app.tenant_id'")) {
          return { rows: [{ set_config: params[0] }], rowCount: 1 };
        }

        // Idempotency: SELECT
        if (trimmed.includes('SELECT * FROM approval.idempotency_keys')) {
          const [tenant_id, idempotency_key] = params;
          const key = `${tenant_id}:${idempotency_key}`;
          const rec = this.idempotency_keys.get(key);
          return { rows: rec ? [rec] : [], rowCount: rec ? 1 : 0 };
        }

        // Idempotency: INSERT
        if (trimmed.includes('INSERT INTO approval.idempotency_keys')) {
          const [idempotency_key, tenant_id, session_id, semantic_fingerprint, created_at_ms, expires_at_ms] = params;
          const key = `${tenant_id}:${idempotency_key}`;
          const rec = {
            idempotency_key,
            tenant_id,
            session_id,
            semantic_fingerprint,
            response_payload: null,
            status: 'PENDING',
            created_at_ms,
            expires_at_ms,
          };
          this.idempotency_keys.set(key, rec);
          return { rows: [rec], rowCount: 1 };
        }

        // Idempotency: SET status = 'COMPLETED'
        if (trimmed.includes("SET status = 'COMPLETED'")) {
          const [payloadStr, tenant_id, idempotency_key] = params;
          const key = `${tenant_id}:${idempotency_key}`;
          const rec = this.idempotency_keys.get(key);
          if (rec) {
            rec.status = 'COMPLETED';
            rec.response_payload = JSON.parse(payloadStr);
          }
          return { rows: [], rowCount: rec ? 1 : 0 };
        }

        // Approval Requests: INSERT
        if (trimmed.includes('INSERT INTO approval.approval_requests')) {
          const [id, tenant_id, session_id, action_type, payloadStr, proposer_id, deadline_at_ms, created_at_ms, updated_at_ms] = params;
          const key = `${tenant_id}:${session_id}:${id}`;
          const record = {
            id,
            tenant_id,
            session_id,
            action_type,
            payload: JSON.parse(payloadStr),
            status: 'requested',
            proposer_id,
            deadline_at_ms: Number(deadline_at_ms),
            created_at_ms: Number(created_at_ms),
            updated_at_ms: Number(updated_at_ms),
            version: 1,
          };
          this.approval_requests.set(key, record);
          return { rows: [record], rowCount: 1 };
        }

        // Approval Requests: SELECT by ID
        if (trimmed.includes('SELECT * FROM approval.approval_requests') && trimmed.includes('id = $3')) {
          const [tenant_id, session_id, id] = params;
          const key = `${tenant_id}:${session_id}:${id}`;
          const rec = this.approval_requests.get(key);
          return { rows: rec ? [rec] : [], rowCount: rec ? 1 : 0 };
        }

        // Approval Requests: UPDATE
        if (trimmed.includes('UPDATE approval.approval_requests')) {
          const [status, version, updated_at_ms, tenant_id, session_id, id, expected_version] = params;
          const key = `${tenant_id}:${session_id}:${id}`;
          const rec = this.approval_requests.get(key);
          if (rec && rec.version === Number(expected_version)) {
            rec.status = status;
            rec.version = Number(version);
            rec.updated_at_ms = Number(updated_at_ms);
            return { rows: [rec], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }

        // Approval Decisions: INSERT
        if (trimmed.includes('INSERT INTO approval.approval_decisions')) {
          const [id, approval_request_id, tenant_id, session_id, decider_id, decision, reason, decided_at_ms, created_at_ms] = params;
          const key = `${tenant_id}:${id}`;
          const record = {
            id,
            approval_request_id,
            tenant_id,
            session_id,
            decider_id,
            decision,
            reason,
            decided_at_ms: Number(decided_at_ms),
            created_at_ms: Number(created_at_ms),
          };
          this.approval_decisions.set(key, record);
          return { rows: [record], rowCount: 1 };
        }

        // Approval Outbox: INSERT
        if (trimmed.includes('INSERT INTO approval.approval_outbox')) {
          const [id, tenant_id, event_type, subject, payloadStr, created_at_ms] = params;
          const key = `${tenant_id}:${id}`;
          const record = {
            id,
            tenant_id,
            event_type,
            subject,
            payload: JSON.parse(payloadStr),
            status: 'PENDING',
            retry_count: 0,
            created_at_ms: Number(created_at_ms),
            processed_at_ms: null,
          };
          this.approval_outbox.set(key, record);
          return { rows: [record], rowCount: 1 };
        }

        // Emergency Pause: SELECT
        if (trimmed.includes('SELECT * FROM approval.emergency_pauses')) {
          const [tenant_id, session_id] = params;
          const results = [];
          for (const rec of this.emergency_pauses.values()) {
            if (rec.tenant_id === tenant_id && (rec.session_id === session_id || rec.scope === 'TENANT' || rec.scope === 'GLOBAL')) {
              results.push(rec);
            }
          }
          return { rows: results, rowCount: results.length };
        }

        // Emergency Pause: UPSERT
        if (trimmed.includes('INSERT INTO approval.emergency_pauses')) {
          const [scope, tenant_id, session_id, is_paused, reason, triggered_by, triggered_at_ms, updated_at_ms] = params;
          const key = `${tenant_id}:${session_id}:${scope}`;
          const record = {
            scope,
            tenant_id,
            session_id,
            is_paused: Boolean(is_paused),
            reason,
            triggered_by,
            triggered_at_ms: Number(triggered_at_ms),
            updated_at_ms: Number(updated_at_ms),
          };
          this.emergency_pauses.set(key, record);
          return { rows: [record], rowCount: 1 };
        }

        // Approval Mode: SELECT
        if (trimmed.includes('SELECT * FROM approval.approval_modes')) {
          const [tenant_id, session_id] = params;
          const key = `${tenant_id}:${session_id}`;
          const rec = this.approval_modes.get(key);
          return { rows: rec ? [rec] : [], rowCount: rec ? 1 : 0 };
        }

        // Approval Mode: UPSERT
        if (trimmed.includes('INSERT INTO approval.approval_modes')) {
          const [tenant_id, session_id, mode, updated_by, updated_at_ms] = params;
          const key = `${tenant_id}:${session_id}`;
          const record = {
            tenant_id,
            session_id,
            mode,
            updated_by,
            updated_at_ms: Number(updated_at_ms),
          };
          this.approval_modes.set(key, record);
          return { rows: [record], rowCount: 1 };
        }

        return { rows: [], rowCount: 0 };
      },
      release: () => {},
    };
  }
}

// In-Memory NATS Bus implementing real publish/subscribe with reply capabilities
class MockNatsBus {
  constructor() {
    this.subscriptions = new Map();
    this.published = [];
  }

  async publish(subject, data, options = {}) {
    const payload = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
    this.published.push({ subject, payload, options });

    const handlers = this.subscriptions.get(subject) || [];
    for (const handler of handlers) {
      await handler({
        subject,
        data: payload,
        headers: options?.headers || {},
      });
    }
  }

  async subscribe(subject, callback) {
    if (!this.subscriptions.has(subject)) {
      this.subscriptions.set(subject, []);
    }
    const handlers = this.subscriptions.get(subject);
    handlers.push(callback);

    return {
      subject,
      unsubscribe: () => {
        const idx = handlers.indexOf(callback);
        if (idx !== -1) handlers.splice(idx, 1);
      },
    };
  }

  async request(subject, payload, headers = {}) {
    let replyResponse = null;
    const msg = {
      subject,
      data: payload,
      headers,
      respond: (respPayload) => {
        replyResponse = typeof respPayload === 'string' ? JSON.parse(respPayload) : respPayload;
      },
    };

    const handlers = this.subscriptions.get(subject) || [];
    if (handlers.length === 0) {
      throw new Error(`No NATS subscription registered for subject: ${subject}`);
    }

    for (const handler of handlers) {
      await handler(msg);
    }

    return replyResponse;
  }
}

describe('Approval Control Service NATS Vertical Slice Suite', () => {
  let mockDbEngine;
  let mockNats;
  let service;

  const TENANT_ID = 'tenant-livepilot-01';
  const SESSION_ID = 'session-live-stream-888';

  beforeEach(async () => {
    mockDbEngine = new MockDatabaseEngine();
    mockNats = new MockNatsBus();

    const dbManager = new DatabasePoolManager();
    dbManager.getClient = async () => mockDbEngine.createClient();

    service = new ApprovalControlService({
      dbPool: dbManager,
      nats: mockNats,
      skipMigrations: true,
      outboxPollIntervalMs: 0, // Manual/controlled polling in tests
    });

    await service.start();
  });

  it('handles livepilot.v1.control.approval.request command and emits outbox event', async () => {
    const requestPayload = {
      message_id: 'cmd-req-001',
      correlation_id: 'corr-slice-001',
      idempotency_key: 'idem-req-999',
      tenant_id: TENANT_ID,
      session_id: SESSION_ID,
      data: {
        approval_id: 'appr-req-slice-100',
        action_type: 'promotion',
        payload: { sku: 'PROMO-SUMMER', discount_pct: 20 },
        proposer_id: 'host-john-01',
        ttl_seconds: 60,
      },
    };

    const reply = await mockNats.request(
      APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST,
      requestPayload,
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-slice-001',
        'X-Idempotency-Key': 'idem-req-999',
      }
    );

    assert.ok(reply, 'Reply must not be null');
    assert.equal(reply.status, 'accepted');
    assert.equal(reply.correlation_id, 'corr-slice-001');
    assert.equal(reply.data.id, 'appr-req-slice-100');
    assert.equal(reply.data.status, 'requested');
    assert.equal(reply.data.version, 1);

    // Verify outbox entry
    const outboxKey = `${TENANT_ID}:evt_req_appr-req-slice-100`;
    const outboxRecord = mockDbEngine.approval_outbox.get(outboxKey);
    assert.ok(outboxRecord, 'Outbox event must be enqueued');
    assert.equal(outboxRecord.subject, APPROVAL_REQUEST_SUBJECTS.EVENT_REQUESTED);
  });

  it('rejects approval request if emergency pause is active (LP05004)', async () => {
    // 1. Activate emergency pause
    await mockNats.request(
      EMERGENCY_PAUSE_SUBJECTS.COMMAND_TRIGGER,
      {
        message_id: 'cmd-pause-001',
        correlation_id: 'corr-pause-001',
        data: {
          session_id: SESSION_ID,
          operation: 'pause',
          actor_ref: 'admin-alice',
          actor_role: 'admin',
          reason: 'Live stream price anomaly detected',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-pause-001',
      }
    );

    // 2. Attempt approval request
    const reply = await mockNats.request(
      APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST,
      {
        message_id: 'cmd-req-002',
        data: {
          approval_id: 'appr-req-paused',
          action_type: 'promotion',
          proposer_id: 'host-john-01',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-req-paused',
        'X-Idempotency-Key': 'idem-req-paused',
      }
    );

    assert.equal(reply.status, 'rejected');
    assert.equal(reply.error.code, 'LP05004');
    assert.equal(reply.error.symbol, 'EMERGENCY_PAUSE_ACTIVE');
  });

  it('handles livepilot.v1.control.approval.decide command and enforces Separation of Duty (LP05009)', async () => {
    // 1. Create approval request
    await mockNats.request(
      APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST,
      {
        data: {
          approval_id: 'appr-req-sod-01',
          action_type: 'promotion',
          proposer_id: 'host-john-01',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-sod-01',
        'X-Idempotency-Key': 'idem-sod-01',
      }
    );

    // 2. Proposer attempts to approve their own request -> Fails closed LP05009
    const selfApproveReply = await mockNats.request(
      APPROVAL_DECISION_SUBJECTS.COMMAND_DECIDE,
      {
        data: {
          approval_id: 'appr-req-sod-01',
          decision: 'approved',
          decider_id: 'host-john-01', // Same as proposer!
          actor_role: 'live_ops',
          actor_capabilities: ['approval.promotion.decide'],
          expected_resource_version: 1,
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-self-decide',
        'X-Idempotency-Key': 'idem-self-decide',
      }
    );

    assert.equal(selfApproveReply.status, 'rejected');
    assert.equal(selfApproveReply.error.code, 'LP05009');
    assert.equal(selfApproveReply.error.symbol, 'SEPARATION_OF_DUTY_VIOLATION');

    // 3. Different authorized supervisor approves -> Accepted
    const validDecisionReply = await mockNats.request(
      APPROVAL_DECISION_SUBJECTS.COMMAND_DECIDE,
      {
        data: {
          approval_id: 'appr-req-sod-01',
          decision: 'approved',
          decider_id: 'supervisor-carol-02',
          actor_role: 'live_ops',
          actor_capabilities: ['approval.promotion.decide'],
          expected_resource_version: 1,
          reason: 'Valid campaign flash sale',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-valid-decide',
        'X-Idempotency-Key': 'idem-valid-decide',
      }
    );

    assert.equal(validDecisionReply.status, 'accepted');
    assert.equal(validDecisionReply.data.updatedRequest.status, 'approved');
    assert.equal(validDecisionReply.data.updatedRequest.version, 2);
    assert.equal(validDecisionReply.data.decisionRecord.decision, 'approved');

    // Outbox event emitted
    const outboxKey = `${TENANT_ID}:evt_dec_appr-req-sod-01_${validDecisionReply.data.decisionRecord.decided_at_ms}`;
    const outboxRecord = mockDbEngine.approval_outbox.get(outboxKey);
    assert.ok(outboxRecord, 'Decision recorded outbox event must exist');
    assert.equal(outboxRecord.subject, APPROVAL_DECISION_SUBJECTS.EVENT_RECORDED);

    // 4. Repeated decision on terminal state rejects with LP05007
    const duplicateDecision = await mockNats.request(
      APPROVAL_DECISION_SUBJECTS.COMMAND_DECIDE,
      {
        data: {
          approval_id: 'appr-req-sod-01',
          decision: 'rejected',
          decider_id: 'supervisor-carol-02',
          actor_role: 'live_ops',
          actor_capabilities: ['approval.promotion.decide'],
          expected_resource_version: 2,
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-dup-decide',
        'X-Idempotency-Key': 'idem-dup-decide',
      }
    );

    assert.equal(duplicateDecision.status, 'rejected');
    assert.equal(duplicateDecision.error.code, 'LP05007');
    assert.equal(duplicateDecision.error.symbol, 'APPROVAL_DECISION_ALREADY_RECORDED');
  });

  it('handles control mode update and query with role authorization barriers (LP05008)', async () => {
    // 1. Query initial mode (defaults to RECOMMEND_ONLY)
    const initialQuery = await mockNats.request(
      CONTROL_MODE_SUBJECTS.QUERY,
      {},
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-mode-query-1',
      }
    );

    assert.equal(initialQuery.status, 'accepted');
    assert.equal(initialQuery.data.mode, 'RECOMMEND_ONLY');

    // 2. Transition to AUTONOMOUS without admin role fails closed with LP05008
    const unauthorizedUpdate = await mockNats.request(
      CONTROL_MODE_SUBJECTS.COMMAND_UPDATE,
      {
        data: {
          target_mode: 'AUTONOMOUS',
          actor_ref: 'operator-dan',
          actor_role: 'live_ops',
          actor_capabilities: [], // Missing 'control.mode.autonomous'
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-mode-unauth',
      }
    );

    assert.equal(unauthorizedUpdate.status, 'rejected');
    assert.equal(unauthorizedUpdate.error.code, 'LP05008');

    // 3. Authorized admin updates mode to ASSISTED
    const validUpdate = await mockNats.request(
      CONTROL_MODE_SUBJECTS.COMMAND_UPDATE,
      {
        data: {
          target_mode: 'ASSISTED',
          actor_ref: 'admin-alice',
          actor_role: 'admin',
          reason: 'Prime-time stream transition',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-mode-valid',
      }
    );

    assert.equal(validUpdate.status, 'accepted');
    assert.equal(validUpdate.data.mode, 'ASSISTED');

    // 4. Query mode confirms updated state
    const postQuery = await mockNats.request(
      CONTROL_MODE_SUBJECTS.QUERY,
      {},
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-mode-query-2',
      }
    );

    assert.equal(postQuery.status, 'accepted');
    assert.equal(postQuery.data.mode, 'ASSISTED');
  });

  it('handles emergency pause trigger, query, and forbids automated systems from resuming (LP05008)', async () => {
    // 1. Initial query: not paused
    const initialQuery = await mockNats.request(
      EMERGENCY_PAUSE_SUBJECTS.QUERY,
      {},
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-pause-query-1',
      }
    );
    assert.equal(initialQuery.status, 'accepted');
    assert.equal(initialQuery.data.is_paused, false);

    // 2. Automated risk system triggers emergency pause
    const triggerReply = await mockNats.request(
      EMERGENCY_PAUSE_SUBJECTS.COMMAND_TRIGGER,
      {
        data: {
          operation: 'pause',
          actor_ref: 'risk-ai-agent-01',
          actor_role: 'automated_risk_system',
          reason: 'Severe negative sentiment anomaly',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-pause-trigger',
      }
    );

    assert.equal(triggerReply.status, 'accepted');
    assert.equal(triggerReply.data.is_paused, true);

    // 3. Automated system attempts to deactivate pause -> REJECTED LP05008
    const automatedResume = await mockNats.request(
      EMERGENCY_PAUSE_SUBJECTS.COMMAND_TRIGGER,
      {
        data: {
          operation: 'resume',
          actor_ref: 'risk-ai-agent-01',
          actor_role: 'automated_risk_system',
          reason: 'Automated retry',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-auto-resume',
      }
    );

    assert.equal(automatedResume.status, 'rejected');
    assert.equal(automatedResume.error.code, 'LP05008');

    // 4. Human operator resumes session -> ACCEPTED
    const humanResume = await mockNats.request(
      EMERGENCY_PAUSE_SUBJECTS.COMMAND_TRIGGER,
      {
        data: {
          operation: 'resume',
          actor_ref: 'operator-dan',
          actor_role: 'live_ops',
          reason: 'Risk mitigated, human verified stream safety',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr-human-resume',
      }
    );

    assert.equal(humanResume.status, 'accepted');
    assert.equal(humanResume.data.is_paused, false);
  });

  it('publishes unhandled command errors to DLQ subject when msg cannot be replied to', async () => {
    const rawFailingMsg = {
      data: 'unparseable-corrupt-data',
    };

    await service.publishToDlq(
      APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST,
      rawFailingMsg,
      new Error('Broker socket closed unexpectedly')
    );

    const dlqPublished = mockNats.published.find(
      (p) => p.subject === `${APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST}.dlq`
    );

    assert.ok(dlqPublished, 'DLQ message must be published');
    const parsedDlq = JSON.parse(dlqPublished.payload);
    assert.equal(parsedDlq.original_subject, APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST);
    assert.equal(parsedDlq.error, 'Broker socket closed unexpectedly');
  });
});
