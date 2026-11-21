import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabasePoolManager } from '../../src/persistence/database.ts';
import {
  IdempotencyStore,
  IdempotencyConflictError,
  IdempotencyInProgressError,
} from '../../src/infrastructure/idempotencyStore.ts';

class MockIdempotencyEngine {
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
        if (trimmed.includes('SELECT * FROM approval.idempotency_keys')) {
          const [tenant_id, idempotency_key] = params;
          const key = `${tenant_id}:${idempotency_key}`;
          const rec = this.rows.get(key);
          return { rows: rec ? [rec] : [], rowCount: rec ? 1 : 0 };
        }
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
          this.rows.set(key, rec);
          return { rows: [rec], rowCount: 1 };
        }
        if (trimmed.includes("SET status = 'COMPLETED'")) {
          const [payloadStr, tenant_id, idempotency_key] = params;
          const key = `${tenant_id}:${idempotency_key}`;
          const existing = this.rows.get(key);
          if (existing) {
            existing.status = 'COMPLETED';
            existing.response_payload = JSON.parse(payloadStr);
          }
          return { rows: [], rowCount: existing ? 1 : 0 };
        }
        return { rows: [], rowCount: 0 };
      },
      release: () => {},
    };
  }
}

describe('IdempotencyStore Suite', () => {
  let db;
  let store;
  let mockEngine;

  beforeEach(() => {
    mockEngine = new MockIdempotencyEngine();
    db = new DatabasePoolManager();
    db.getClient = async () => mockEngine.createClient();
    store = new IdempotencyStore(db);
  });

  it('computes deterministic semantic fingerprints regardless of key ordering', () => {
    const payloadA = { b: 2, a: 1 };
    const payloadB = { a: 1, b: 2 };
    const fpA = IdempotencyStore.computeFingerprint(payloadA);
    const fpB = IdempotencyStore.computeFingerprint(payloadB);
    assert.equal(fpA, fpB);
  });

  it('executes operation on first call and caches completed result', async () => {
    let executionCount = 0;
    const op = async () => {
      executionCount++;
      return { approval_id: 'appr-001', outcome: 'created' };
    };

    const payload = { target_id: 'item-100', amount: 50 };
    const res1 = await store.executeWithIdempotency(
      'tenant-th-01',
      'session-live-01',
      'idem-key-abc',
      payload,
      op
    );

    assert.equal(executionCount, 1);
    assert.deepEqual(res1, { approval_id: 'appr-001', outcome: 'created' });

    // Second call with same key and payload returns cached response without executing op
    const res2 = await store.executeWithIdempotency(
      'tenant-th-01',
      'session-live-01',
      'idem-key-abc',
      payload,
      op
    );

    assert.equal(executionCount, 1); // Not incremented!
    assert.deepEqual(res2, { approval_id: 'appr-001', outcome: 'created' });
  });

  it('rejects duplicate call with different payload (payload mismatch conflict LP04003)', async () => {
    const op = async () => ({ status: 'ok' });

    await store.executeWithIdempotency(
      'tenant-th-01',
      'session-live-01',
      'idem-key-conflict',
      { action: 'pin', item_id: 'sku-1' },
      op
    );

    // Call with same idempotency key but changed payload
    await assert.rejects(
      async () => {
        await store.executeWithIdempotency(
          'tenant-th-01',
          'session-live-01',
          'idem-key-conflict',
          { action: 'pin', item_id: 'sku-2' }, // Different payload!
          op
        );
      },
      (err) => {
        assert.ok(err instanceof IdempotencyConflictError);
        assert.equal(err.code, 'LP04003');
        return true;
      }
    );
  });

  it('detects concurrent execution in progress (LP04004)', async () => {
    const fp = IdempotencyStore.computeFingerprint({ x: 1 });
    // Acquire without completing
    const acquireRes = await store.acquire('tenant-th-01', 'session-1', 'idem-in-progress', fp);
    assert.equal(acquireRes.acquired, true);

    // Another caller attempts while status is still PENDING
    await assert.rejects(
      async () => {
        await store.executeWithIdempotency(
          'tenant-th-01',
          'session-1',
          'idem-in-progress',
          { x: 1 },
          async () => ({ ok: true })
        );
      },
      (err) => {
        assert.ok(err instanceof IdempotencyInProgressError);
        assert.equal(err.code, 'LP04004');
        return true;
      }
    );
  });
});
