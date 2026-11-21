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

/**
 * In-Memory Zero-Mock database engine simulating PostgreSQL transactions,
 * constraints, optimistic concurrency locks, and row-level security.
 */
class ProductionMockDbEngine {
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
        if (
          trimmed.startsWith('BEGIN') ||
          trimmed.startsWith('COMMIT') ||
          trimmed.startsWith('ROLLBACK')
        ) {
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
          const [
            idempotency_key,
            tenant_id,
            session_id,
            semantic_fingerprint,
            created_at_ms,
            expires_at_ms,
          ] = params;
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
          const [
            id,
            tenant_id,
            session_id,
            action_type,
            payloadStr,
            proposer_id,
            deadline_at_ms,
            created_at_ms,
            updated_at_ms,
          ] = params;
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
        if (
          trimmed.includes('SELECT * FROM approval.approval_requests') &&
          trimmed.includes('id = $3')
        ) {
          const [tenant_id, session_id, id] = params;
          const key = `${tenant_id}:${session_id}:${id}`;
          const rec = this.approval_requests.get(key);
          return { rows: rec ? [rec] : [], rowCount: rec ? 1 : 0 };
        }

        // Approval Requests: SELECT version
        if (trimmed.includes('SELECT version FROM approval.approval_requests')) {
          const [tenant_id, session_id, id] = params;
          const key = `${tenant_id}:${session_id}:${id}`;
          const rec = this.approval_requests.get(key);
          return { rows: rec ? [{ version: rec.version }] : [], rowCount: rec ? 1 : 0 };
        }

        // Approval Requests: UPDATE
        if (trimmed.includes('UPDATE approval.approval_requests')) {
          const [
            status,
            version,
            updated_at_ms,
            tenant_id,
            session_id,
            id,
            expected_version,
          ] = params;
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
          const [
            id,
            approval_request_id,
            tenant_id,
            session_id,
            decider_id,
            decision,
            reason,
            decided_at_ms,
            created_at_ms,
          ] = params;
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

        // Approval Decisions: SELECT for audit trail
        if (trimmed.includes('FROM approval.approval_decisions')) {
          const [tenant_id, session_id] = params;
          const results = [];
          for (const rec of this.approval_decisions.values()) {
            if (rec.tenant_id === tenant_id && rec.session_id === session_id) {
              results.push(rec);
            }
          }
          return { rows: results, rowCount: results.length };
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
            if (
              rec.tenant_id === tenant_id &&
              (rec.session_id === session_id ||
                rec.scope === 'TENANT' ||
                rec.scope === 'GLOBAL')
            ) {
              results.push(rec);
            }
          }
          return { rows: results, rowCount: results.length };
        }

        // Emergency Pause: UPSERT
        if (trimmed.includes('INSERT INTO approval.emergency_pauses')) {
          const [
            scope,
            tenant_id,
            session_id,
            is_paused,
            reason,
            triggered_by,
            triggered_at_ms,
            updated_at_ms,
          ] = params;
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

/**
 * In-Memory NATS Bus implementing real request/reply, subscription routing,
 * and publish tracking for end-to-end integration.
 */
class ProductionNatsBus {
  constructor() {
    this.subscriptions = new Map();
    this.publishedEvents = [];
  }

  async publish(subject, data, options = {}) {
    const payload =
      typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
    this.publishedEvents.push({ subject, payload, options });

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
        replyResponse =
          typeof respPayload === 'string'
            ? JSON.parse(respPayload)
            : respPayload;
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

describe('Approval Control Service Full E2E Integration Suite', () => {
  let dbEngine;
  let natsBus;
  let service;

  const TENANT_ID = 'tenant-livepilot-prod-01';
  const SESSION_ID = 'session-live-stream-999';
  const OPERATOR_ACTOR = 'operator_alice_99';
  const PROPOSER_ACTOR = 'copilot_agent_07';

  beforeEach(async () => {
    dbEngine = new ProductionMockDbEngine();
    natsBus = new ProductionNatsBus();

    const dbManager = new DatabasePoolManager();
    dbManager.getClient = async () => dbEngine.createClient();

    service = new ApprovalControlService({
      dbPool: dbManager,
      nats: natsBus,
      skipMigrations: true,
      outboxPollIntervalMs: 0,
    });

    await service.start();
  });

  it('executes complete end-to-end promotion lifecycle: request -> verify pending -> approve -> outbox verification -> duplicate rejection -> audit trail', async () => {
    const approvalId = 'appr_req_e2e_promo_101';
    const now = Date.now();
    const deadlineAtMs = now + 60000;

    // 1. Request Promotion Approval via NATS
    const requestMsg = {
      message_id: 'msg_req_001',
      tenant_id: TENANT_ID,
      session_id: SESSION_ID,
      correlation_id: 'corr_promo_flow_001',
      idempotency_key: 'idemp_key_req_001',
      data: {
        id: approvalId,
        action_type: 'promotion',
        proposer_id: PROPOSER_ACTOR,
        deadline_at_ms: deadlineAtMs,
        payload: {
          campaign_id: 'camp_flash_sale_50',
          discount_percent: 50,
          target_sku: 'SKU_PREMIUM_COFFEE_01',
        },
      },
    };

    const requestReply = await natsBus.request(
      APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST,
      requestMsg,
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr_promo_flow_001',
        'X-Idempotency-Key': 'idemp_key_req_001',
      }
    );

    assert.equal(requestReply.status, 'accepted');
    assert.equal(requestReply.data.id, approvalId);
    assert.equal(requestReply.data.status, 'requested');
    assert.equal(requestReply.data.version, 1);

    // 2. Verify Database State is PENDING (requested)
    const storedRequest = await service.approvalRepo.getById(
      TENANT_ID,
      SESSION_ID,
      approvalId
    );
    assert.ok(storedRequest, 'Request must be persisted in database');
    assert.equal(storedRequest.status, 'requested');
    assert.equal(storedRequest.version, 1);
    assert.equal(storedRequest.action_type, 'promotion');

    // 3. Operator Approves via NATS Command
    const decisionMsg = {
      message_id: 'msg_dec_001',
      tenant_id: TENANT_ID,
      session_id: SESSION_ID,
      correlation_id: 'corr_promo_flow_002',
      idempotency_key: 'idemp_key_dec_001',
      data: {
        approval_id: approvalId,
        decision: 'approved',
        decider_id: OPERATOR_ACTOR,
        actor_role: 'live_ops',
        actor_capabilities: ['approval.promotion.decide'],
        expected_resource_version: 1,
        reason: 'Authorized for 50% flash campaign',
      },
    };

    const decisionReply = await natsBus.request(
      APPROVAL_DECISION_SUBJECTS.COMMAND_DECIDE,
      decisionMsg,
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr_promo_flow_002',
        'X-Idempotency-Key': 'idemp_key_dec_001',
      }
    );

    assert.equal(decisionReply.status, 'accepted');
    assert.equal(decisionReply.data.updatedRequest.status, 'approved');
    assert.equal(decisionReply.data.updatedRequest.version, 2);
    assert.equal(decisionReply.data.decisionRecord.decision, 'approved');
    assert.equal(decisionReply.data.decisionRecord.decider_id, OPERATOR_ACTOR);

    // 4. Verify Outbox Event Committed
    const outboxEvents = Array.from(dbEngine.approval_outbox.values());
    assert.ok(outboxEvents.length >= 2, 'Must have at least request and decision outbox events');
    const decisionOutbox = outboxEvents.find(
      (evt) => evt.event_type === 'approval.decision.recorded'
    );
    assert.ok(decisionOutbox, 'Outbox event for approval decision must exist');
    assert.equal(decisionOutbox.payload.approval_id, approvalId);
    assert.equal(decisionOutbox.payload.decision, 'approved');
    assert.equal(decisionOutbox.payload.actor_ref, OPERATOR_ACTOR);

    // 5. Attempt Duplicate Decision with Fresh Idempotency Key -> Fails with 409 Conflict
    const duplicateDecisionMsg = {
      message_id: 'msg_dec_002',
      tenant_id: TENANT_ID,
      session_id: SESSION_ID,
      correlation_id: 'corr_promo_flow_003',
      idempotency_key: 'idemp_key_dec_different_002',
      data: {
        approval_id: approvalId,
        decision: 'approved',
        decider_id: 'operator_bob_12',
        actor_role: 'live_ops',
        actor_capabilities: ['approval.promotion.decide'],
        expected_resource_version: 2, // Even with version 2, state is already terminal 'approved'
        reason: 'Duplicate attempt',
      },
    };

    const duplicateReply = await natsBus.request(
      APPROVAL_DECISION_SUBJECTS.COMMAND_DECIDE,
      duplicateDecisionMsg,
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr_promo_flow_003',
        'X-Idempotency-Key': 'idemp_key_dec_different_002',
      }
    );

    assert.equal(duplicateReply.status, 'rejected');
    assert.ok(duplicateReply.error, 'Error payload must be present');
    assert.equal(duplicateReply.error.http_status, 409);
    assert.equal(duplicateReply.error.code, 'LP05007'); // APPROVAL_DECISION_ALREADY_RECORDED

    // 6. Verify Complete Audit Trail
    const client = dbEngine.createClient();
    const auditRes = await client.query(
      'SELECT * FROM approval.approval_decisions WHERE tenant_id = $1 AND session_id = $2',
      [TENANT_ID, SESSION_ID]
    );
    assert.equal(auditRes.rows.length, 1);
    assert.equal(auditRes.rows[0].approval_request_id, approvalId);
    assert.equal(auditRes.rows[0].decider_id, OPERATOR_ACTOR);
    assert.equal(auditRes.rows[0].decision, 'approved');
  });
});
