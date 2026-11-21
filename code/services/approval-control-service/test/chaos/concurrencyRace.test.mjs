import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabasePoolManager } from '../../src/persistence/database.ts';
import { ApprovalControlService } from '../../src/index.ts';
import {
  APPROVAL_REQUEST_SUBJECTS,
  APPROVAL_DECISION_SUBJECTS,
} from '../../src/handlers/index.ts';

/**
 * Race condition Postgres engine simulating atomic serialized updates with optimistic version check.
 */
class ConcurrencyRacePostgresEngine {
  constructor() {
    this.approval_requests = new Map();
    this.approval_decisions = new Map();
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

        // Approval Requests: UPDATE with atomic optimistic lock check
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
          return { rows: [], rowCount: 0 };
        }

        return { rows: [], rowCount: 0 };
      },
      release: () => {},
    };
  }
}

class RaceNatsBus {
  constructor() {
    this.subscriptions = new Map();
  }

  async publish(subject, data, options = {}) {
    const payload =
      typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
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

describe('Approval Decision Concurrency Race Suite', () => {
  let dbEngine;
  let natsBus;
  let service;

  const TENANT_ID = 'tenant-livepilot-race';
  const SESSION_ID = 'session-live-race-01';

  beforeEach(async () => {
    dbEngine = new ConcurrencyRacePostgresEngine();
    natsBus = new RaceNatsBus();

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

  it('simulates concurrent operators attempting to decide the same approval request simultaneously; proves optimistic lock allows exactly 1 decision and rejects with 409 Conflict', async () => {
    const approvalId = 'appr_req_race_100';

    // 1. Create Initial Request
    await natsBus.request(
      APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST,
      {
        message_id: 'msg_req_race_init',
        tenant_id: TENANT_ID,
        session_id: SESSION_ID,
        correlation_id: 'corr_race_init',
        idempotency_key: 'idemp_race_init',
        data: {
          id: approvalId,
          action_type: 'product_pin',
          proposer_id: 'host_operator_01',
          deadline_at_ms: Date.now() + 60000,
          payload: { pin_slot: 1, product_id: 'PROD_888' },
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr_race_init',
        'X-Idempotency-Key': 'idemp_race_init',
      }
    );

    // Verify initial version is 1
    const initialReq = await service.approvalRepo.getById(TENANT_ID, SESSION_ID, approvalId);
    assert.equal(initialReq.version, 1);
    assert.equal(initialReq.status, 'requested');

    // 2. Fire 2 simultaneous decisions for the exact same approval request with expected_resource_version: 1
    const decisionA = natsBus.request(
      APPROVAL_DECISION_SUBJECTS.COMMAND_DECIDE,
      {
        message_id: 'msg_dec_race_A',
        tenant_id: TENANT_ID,
        session_id: SESSION_ID,
        correlation_id: 'corr_dec_race_A',
        idempotency_key: 'idemp_dec_race_A',
        data: {
          approval_id: approvalId,
          decision: 'approved',
          decider_id: 'operator_alice',
          actor_role: 'live_ops',
          actor_capabilities: ['approval.product_pin.decide'],
          expected_resource_version: 1,
          reason: 'Decided by Alice',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr_dec_race_A',
        'X-Idempotency-Key': 'idemp_dec_race_A',
      }
    );

    const decisionB = natsBus.request(
      APPROVAL_DECISION_SUBJECTS.COMMAND_DECIDE,
      {
        message_id: 'msg_dec_race_B',
        tenant_id: TENANT_ID,
        session_id: SESSION_ID,
        correlation_id: 'corr_dec_race_B',
        idempotency_key: 'idemp_dec_race_B',
        data: {
          approval_id: approvalId,
          decision: 'rejected',
          decider_id: 'operator_bob',
          actor_role: 'live_ops',
          actor_capabilities: ['approval.product_pin.decide'],
          expected_resource_version: 1,
          reason: 'Decided by Bob',
        },
      },
      {
        'X-Tenant-Id': TENANT_ID,
        'X-Session-Id': SESSION_ID,
        'X-Correlation-Id': 'corr_dec_race_B',
        'X-Idempotency-Key': 'idemp_dec_race_B',
      }
    );

    const [replyA, replyB] = await Promise.all([decisionA, decisionB]);

    const replies = [replyA, replyB];
    const acceptedReplies = replies.filter((r) => r.status === 'accepted');
    const rejectedReplies = replies.filter((r) => r.status === 'rejected');

    // Exactly 1 must win, and exactly 1 must be rejected with 409 Conflict
    assert.equal(acceptedReplies.length, 1, 'Exactly one concurrent decision must succeed');
    assert.equal(rejectedReplies.length, 1, 'Exactly one concurrent decision must be rejected');

    const winner = acceptedReplies[0];
    const loser = rejectedReplies[0];

    assert.equal(winner.data.updatedRequest.version, 2);
    assert.ok(loser.error, 'Rejection error must be returned');
    assert.equal(loser.error.http_status, 409);
    // Code should be LP04001 (RESOURCE_VERSION_CONFLICT) or LP05007 (APPROVAL_DECISION_ALREADY_RECORDED)
    assert.ok(
      loser.error.code === 'LP04001' || loser.error.code === 'LP05007',
      `Error code must be conflict 409, got: ${loser.error.code}`
    );

    // Verify in database: exactly 1 decision recorded
    assert.equal(dbEngine.approval_decisions.size, 1);
    const finalReq = await service.approvalRepo.getById(TENANT_ID, SESSION_ID, approvalId);
    assert.equal(finalReq.version, 2);
    assert.notEqual(finalReq.status, 'requested');
  });
});
