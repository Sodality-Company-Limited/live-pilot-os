import assert from 'node:assert/strict';
import {
  ExecutionRepository,
} from '../../src/infra/ExecutionRepository.ts';
import { TransactionalBoundary } from '../../src/infra/TransactionalBoundary.ts';
import { OutboxPublisher } from '../../src/infra/OutboxPublisher.ts';
import { NatsExecutionClient } from '../../src/infra/NatsExecutionClient.ts';

// Deterministic in-memory database mock for unit/infra verification
class InMemoryDbExecutor {
  actions = new Map();
  transitions = [];
  idempotency = new Set();
  outbox = new Map();

  async query(sql, params = []) {
    if (sql.includes('INSERT INTO execution.execution_actions')) {
      const record = {
        tenant_id: params[0],
        session_id: params[1],
        action_id: params[2],
        aggregate_id: params[3],
        action_type: params[4],
        status: params[5],
        mode: params[6],
        payload_hash: params[7],
        idempotency_key: params[8],
        version: params[9],
        retry_count: params[10],
        max_retries: params[11],
        error_code: params[12],
        error_detail: params[13],
        correlation_id: params[14],
        causation_id: params[15],
        traceparent: params[16],
        observed_at: params[17],
        created_at: params[18],
        updated_at: params[19],
      };
      const key = `${record.tenant_id}:${record.session_id}:${record.action_id}`;
      this.actions.set(key, record);
      return [record];
    }

    if (sql.includes('SELECT * FROM execution.execution_actions')) {
      const key = `${params[0]}:${params[1]}:${params[2]}`;
      const found = this.actions.get(key);
      return found ? [found] : [];
    }

    if (sql.includes('UPDATE execution.execution_actions')) {
      const key = `${params[6]}:${params[7]}:${params[8]}`;
      const found = this.actions.get(key);
      const expectedVersion = params[9];
      if (!found || found.version !== expectedVersion) {
        return []; // Simulate 0 rows updated on version mismatch
      }
      const updated = {
        ...found,
        status: params[0],
        version: params[1],
        retry_count: params[2],
        error_code: params[3],
        error_detail: params[4],
        observed_at: params[5],
        updated_at: new Date().toISOString(),
      };
      this.actions.set(key, updated);
      return [updated];
    }

    if (sql.includes('INSERT INTO execution.execution_state_transitions')) {
      this.transitions.push({
        tenant_id: params[0],
        session_id: params[1],
        action_id: params[2],
        from_status: params[3],
        to_status: params[4],
        transition_reason: params[5],
        error_code: params[6],
        actor_id: params[7],
        correlation_id: params[8],
        causation_id: params[9],
        traceparent: params[10],
        occurred_at: params[11],
      });
      return [];
    }

    if (sql.includes('INSERT INTO execution.adapter_idempotency_records')) {
      const key = `${params[0]}:${params[1]}`;
      if (this.idempotency.has(key)) {
        return [];
      }
      this.idempotency.add(key);
      return [{ idempotency_key: params[1] }];
    }

    if (sql.includes('SELECT * FROM execution.execution_outbox')) {
      const pending = Array.from(this.outbox.values()).filter(
        (m) => m.tenant_id === params[0] && !m.dispatched_at && !m.dead_lettered
      );
      return pending.slice(0, params[1]);
    }

    if (sql.includes('UPDATE execution.execution_outbox')) {
      const msg = this.outbox.get(params[1]);
      if (msg && msg.tenant_id === params[0]) {
        msg.dispatched_at = new Date().toISOString();
      }
      return [];
    }

    return [];
  }
}

class MockNatsTransport {
  published = [];

  async publish(subject, data, headers) {
    this.published.push({ subject, data, headers });
  }
}

// 1. Repository Creation and Query Test
const db = new InMemoryDbExecutor();
const repo = new ExecutionRepository(db);

const actionRecord = {
  tenant_id: 'tenant-1',
  session_id: 'sess-100',
  action_id: 'act-pin-1001',
  aggregate_id: 'prom-1',
  action_type: 'pin_product',
  status: 'requested',
  mode: 'CONFIRMED',
  payload_hash: 'hash-abc',
  idempotency_key: 'idem-key-1',
  version: 1,
  retry_count: 0,
  max_retries: 3,
  correlation_id: 'corr-1',
  traceparent: '00-trace-01',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const created = await repo.createAction(actionRecord);
assert.equal(created.action_id, 'act-pin-1001');

const fetched = await repo.findById('tenant-1', 'sess-100', 'act-pin-1001');
assert.ok(fetched);
assert.equal(fetched.action_id, 'act-pin-1001');

// 2. Optimistic Concurrency Locking Test
const updated = await repo.updateActionWithOptimisticLock(
  { ...created, status: 'accepted', version: 2 },
  1
);
assert.equal(updated.version, 2);
assert.equal(updated.status, 'accepted');

// Attempt update with stale version
await assert.rejects(
  async () => {
    await repo.updateActionWithOptimisticLock(
      { ...updated, status: 'pending', version: 2 },
      1
    );
  },
  /Optimistic lock conflict/
);

// 3. Idempotency Reservation Test
const res1 = await repo.reserveIdempotency({
  tenant_id: 'tenant-1',
  idempotency_key: 'idem-key-1',
  action_id: 'act-pin-1001',
  session_id: 'sess-100',
  action_type: 'pin_product',
  payload_hash: 'hash-abc',
  status: 'accepted',
  expires_at: new Date(Date.now() + 60000).toISOString(),
});
assert.equal(res1, true);

// Duplicate attempt returns false
const res2 = await repo.reserveIdempotency({
  tenant_id: 'tenant-1',
  idempotency_key: 'idem-key-1',
  action_id: 'act-pin-1001',
  session_id: 'sess-100',
  action_type: 'pin_product',
  payload_hash: 'hash-abc',
  status: 'accepted',
  expires_at: new Date(Date.now() + 60000).toISOString(),
});
assert.equal(res2, false);

// 4. Transactional Boundary Transition Test
const boundary = new TransactionalBoundary(repo);
const transitioned = await boundary.transitionActionState(
  updated,
  'pending',
  { actorId: 'user-op-1', reason: 'Dispatched to TikTok Shop adapter' }
);
assert.equal(transitioned.status, 'pending');
assert.equal(transitioned.version, 3);
assert.equal(db.transitions.length, 1);
assert.equal(db.transitions[0].to_status, 'pending');

// 5. Outbox Publishing Test
const nats = new MockNatsTransport();
const outboxPublisher = new OutboxPublisher(repo, nats);

db.outbox.set('msg-1', {
  tenant_id: 'tenant-1',
  message_id: 'msg-1',
  event_type: 'livepilot.v1.execution.action.updated',
  aggregate_type: 'execution_action',
  aggregate_id: 'act-pin-1001',
  idempotency_key: 'idem-key-1',
  payload: { action_id: 'act-pin-1001', aggregate_id: 'prom-1', status: 'pending', mode: 'CONFIRMED' },
  headers: { 'X-Tenant-Id': 'tenant-1' },
  retry_count: 0,
  max_retries: 5,
  dead_lettered: false,
  created_at: new Date().toISOString(),
});

const dispatched = await outboxPublisher.drainOutbox('tenant-1', 10);
assert.equal(dispatched, 1);
assert.equal(nats.published.length, 1);
assert.equal(nats.published[0].subject, 'livepilot.v1.execution.action.updated');

// 6. NATS Execution Client Test
const client = new NatsExecutionClient(nats);
await client.publishActionUpdated(
  {
    action_id: 'act-pin-1001',
    aggregate_id: 'prom-1',
    status: 'succeeded',
    mode: 'CONFIRMED',
    observed_at: new Date().toISOString(),
  },
  {
    'Nats-Msg-Id': 'msg-99',
    'X-Correlation-Id': 'corr-1',
    'X-Idempotency-Key': 'idem-key-1',
    'X-Tenant-Id': 'tenant-1',
    'X-Session-Id': 'sess-100',
    'X-Schema-Version': '1.0.0',
    'X-Producer': 'execution-service',
    'X-Traceparent': '00-trace-01',
    'X-Mode': 'CONFIRMED',
  }
);
assert.equal(nats.published.length, 2);
assert.equal(nats.published[1].headers?.['X-Tenant-Id'], 'tenant-1');

console.log('execution-service infrastructure and repository tests: PASS');
