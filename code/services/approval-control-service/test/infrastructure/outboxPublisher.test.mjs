import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabasePoolManager } from '../../src/persistence/database.ts';
import { OutboxPublisher } from '../../src/infrastructure/outboxPublisher.ts';

class MockOutboxEngine {
  constructor() {
    this.rows = new Map();
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

        // Insert Outbox
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
            created_at_ms,
            processed_at_ms: null,
          };
          this.rows.set(key, record);
          return { rows: [record], rowCount: 1 };
        }

        // Fetch Pending Outbox
        if (trimmed.includes('SELECT * FROM approval.approval_outbox') && trimmed.includes("status = 'PENDING'")) {
          const [tenant_id, limit] = params;
          const results = [];
          for (const rec of this.rows.values()) {
            if (rec.tenant_id === tenant_id && rec.status === 'PENDING') {
              results.push(rec);
              if (results.length >= limit) break;
            }
          }
          return { rows: results, rowCount: results.length };
        }

        // Mark Published
        if (trimmed.includes("SET status = 'PUBLISHED'")) {
          const [processed_at_ms, tenant_id, id] = params;
          const key = `${tenant_id}:${id}`;
          const rec = this.rows.get(key);
          if (rec) {
            rec.status = 'PUBLISHED';
            rec.processed_at_ms = processed_at_ms;
            return { rows: [rec], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }

        // Mark Failed
        if (trimmed.includes('retry_count = retry_count + 1')) {
          const [maxRetries, tenant_id, id] = params;
          const key = `${tenant_id}:${id}`;
          const rec = this.rows.get(key);
          if (rec) {
            rec.retry_count += 1;
            rec.status = rec.retry_count >= maxRetries ? 'DEAD_LETTERED' : 'PENDING';
            return { rows: [rec], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }

        return { rows: [], rowCount: 0 };
      },
      release: () => {},
    };
  }
}

describe('OutboxPublisher Suite', () => {
  let db;
  let publisher;
  let mockEngine;

  beforeEach(() => {
    mockEngine = new MockOutboxEngine();
    db = new DatabasePoolManager();
    db.getClient = async () => mockEngine.createClient();
    publisher = new OutboxPublisher(db, 3); // Max retries = 3
  });

  it('enqueues transactional outbox messages with PENDING status', async () => {
    const enqueued = await publisher.enqueue({
      id: 'outbox-1',
      tenant_id: 'tenant-th-01',
      event_type: 'approval.requested',
      subject: 'livepilot.v1.control.approval.requested',
      payload: { request_id: 'req-001', action: 'promotion' },
    });

    assert.equal(enqueued.id, 'outbox-1');
    assert.equal(enqueued.status, 'PENDING');
    assert.equal(enqueued.retry_count, 0);

    const pending = await publisher.fetchPending('tenant-th-01');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, 'outbox-1');
  });

  it('successfully dispatches pending messages and marks them PUBLISHED', async () => {
    await publisher.enqueue({
      id: 'outbox-2',
      tenant_id: 'tenant-th-01',
      event_type: 'approval.decided',
      subject: 'livepilot.v1.control.approval.decided',
      payload: { request_id: 'req-002', decision: 'approved' },
    });

    const dispatched = [];
    const mockSink = {
      async publish(event) {
        dispatched.push(event);
      },
    };

    const result = await publisher.dispatchPending('tenant-th-01', mockSink);
    assert.equal(result.published, 1);
    assert.equal(result.failed, 0);
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].id, 'outbox-2');

    // Confirm no more pending messages
    const remaining = await publisher.fetchPending('tenant-th-01');
    assert.equal(remaining.length, 0);
  });

  it('increments retry count on dispatch failure and transitions to DEAD_LETTERED at threshold', async () => {
    await publisher.enqueue({
      id: 'outbox-failing',
      tenant_id: 'tenant-th-01',
      event_type: 'approval.failed',
      subject: 'livepilot.v1.control.approval.failed',
      payload: { error: 'test' },
    });

    const failingSink = {
      async publish() {
        throw new Error('NATS cluster temporarily unavailable');
      },
    };

    // Retry 1: PENDING (retry_count = 1)
    let res = await publisher.dispatchPending('tenant-th-01', failingSink);
    assert.equal(res.failed, 1);
    let pending = await publisher.fetchPending('tenant-th-01');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].retry_count, 1);

    // Retry 2: PENDING (retry_count = 2)
    res = await publisher.dispatchPending('tenant-th-01', failingSink);
    assert.equal(res.failed, 1);
    pending = await publisher.fetchPending('tenant-th-01');
    assert.equal(pending[0].retry_count, 2);

    // Retry 3: DEAD_LETTERED (retry_count = 3 >= maxRetries: 3)
    res = await publisher.dispatchPending('tenant-th-01', failingSink);
    assert.equal(res.failed, 1);

    // No longer in pending queue
    pending = await publisher.fetchPending('tenant-th-01');
    assert.equal(pending.length, 0);

    const recordInStore = mockEngine.rows.get('tenant-th-01:outbox-failing');
    assert.equal(recordInStore.status, 'DEAD_LETTERED');
    assert.equal(recordInStore.retry_count, 3);
  });
});
