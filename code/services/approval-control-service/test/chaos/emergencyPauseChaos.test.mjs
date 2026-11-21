import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabasePoolManager } from '../../src/persistence/database.ts';
import { ApprovalControlService } from '../../src/index.ts';
import {
  APPROVAL_REQUEST_SUBJECTS,
  APPROVAL_DECISION_SUBJECTS,
  EMERGENCY_PAUSE_SUBJECTS,
} from '../../src/handlers/index.ts';

class ChaosPostgresEngine {
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

        return { rows: [], rowCount: 0 };
      },
      release: () => {},
    };
  }
}

class ChaosNatsBus {
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

describe('Emergency Pause Chaos Resilience Suite', () => {
  let dbEngine;
  let natsBus;
  let service;

  const TENANT_ID = 'tenant-livepilot-chaos';
  const SESSION_ID = 'session-live-chaos-1';

  beforeEach(async () => {
    dbEngine = new ChaosPostgresEngine();
    natsBus = new ChaosNatsBus();

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

  it('proves 100% fail-closed rejection with zero leaks under rapid concurrent submissions while emergency pause triggers abruptly', async () => {
    const TOTAL_REQUESTS = 50;
    const PAUSE_AT_INDEX = 20;

    const requestPromises = [];

    // Trigger submissions concurrently
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const idx = i;
      const p = (async () => {
        if (idx === PAUSE_AT_INDEX) {
          // Abruptly trigger Emergency Pause midway
          await natsBus.request(
            EMERGENCY_PAUSE_SUBJECTS.COMMAND_TRIGGER,
            {
              message_id: `msg_pause_chaos_${Date.now()}`,
              tenant_id: TENANT_ID,
              session_id: SESSION_ID,
              correlation_id: `corr_pause_${idx}`,
              data: {
                scope: 'SESSION',
                reason: 'Abrupt chaos trigger during high traffic burst',
                triggered_by: 'lead_operator_911',
                actor_role: 'admin',
              },
            },
            {
              'X-Tenant-Id': TENANT_ID,
              'X-Session-Id': SESSION_ID,
              'X-Correlation-Id': `corr_pause_${idx}`,
            }
          );
        }

        // Attempt approval submission
        const reply = await natsBus.request(
          APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST,
          {
            message_id: `msg_req_chaos_${idx}`,
            tenant_id: TENANT_ID,
            session_id: SESSION_ID,
            correlation_id: `corr_req_${idx}`,
            idempotency_key: `idemp_chaos_req_${idx}`,
            data: {
              id: `appr_chaos_${idx}`,
              action_type: 'promotion',
              proposer_id: `actor_bot_${idx}`,
              deadline_at_ms: Date.now() + 60000,
              payload: { item_index: idx },
            },
          },
          {
            'X-Tenant-Id': TENANT_ID,
            'X-Session-Id': SESSION_ID,
            'X-Correlation-Id': `corr_req_${idx}`,
            'X-Idempotency-Key': `idemp_chaos_req_${idx}`,
          }
        );
        return { index: idx, reply };
      })();

      requestPromises.push(p);
    }

    const results = await Promise.all(requestPromises);

    // Analyze results
    let acceptedCount = 0;
    let rejectedCount = 0;

    for (const r of results) {
      if (r.reply.status === 'accepted') {
        acceptedCount++;
      } else if (r.reply.status === 'rejected') {
        rejectedCount++;
        assert.equal(r.reply.error.code, 'LP05004'); // EMERGENCY_PAUSE_ACTIVE
        assert.equal(r.reply.error.http_status, 422);
      }
    }

    assert.equal(
      acceptedCount + rejectedCount,
      TOTAL_REQUESTS,
      'Every request must have either completed before pause or been rejected fail-closed'
    );
    assert.ok(rejectedCount > 0, 'At least all requests following pause must be rejected');

    // Post-pause verification: any new request MUST be rejected 100% fail-closed
    for (let postIdx = 0; postIdx < 10; postIdx++) {
      const postReply = await natsBus.request(
        APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST,
        {
          message_id: `msg_req_post_${postIdx}`,
          tenant_id: TENANT_ID,
          session_id: SESSION_ID,
          correlation_id: `corr_post_${postIdx}`,
          idempotency_key: `idemp_post_${postIdx}`,
          data: {
            id: `appr_post_${postIdx}`,
            action_type: 'promotion',
            proposer_id: `actor_bot_post_${postIdx}`,
            deadline_at_ms: Date.now() + 60000,
            payload: { item_index: postIdx },
          },
        },
        {
          'X-Tenant-Id': TENANT_ID,
          'X-Session-Id': SESSION_ID,
          'X-Correlation-Id': `corr_post_${postIdx}`,
          'X-Idempotency-Key': `idemp_post_${postIdx}`,
        }
      );

      assert.equal(postReply.status, 'rejected');
      assert.equal(postReply.error.code, 'LP05004');
    }

    // Verify database has exactly acceptedCount records and ZERO records for rejected attempts
    assert.equal(dbEngine.approval_requests.size, acceptedCount);
  });
});
