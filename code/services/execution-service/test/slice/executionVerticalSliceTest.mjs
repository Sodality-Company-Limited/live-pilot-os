import assert from 'node:assert/strict';
import { ExecutionRepository } from '../../dist/infra/ExecutionRepository.js';
import { TransactionalBoundary } from '../../dist/infra/TransactionalBoundary.js';
import { NatsExecutionClient } from '../../dist/infra/NatsExecutionClient.js';
import {
  ExecutionDispatchService,
} from '../../dist/domain/ExecutionDispatchService.js';
import {
  SimulatedPlatformAdapterClient,
} from '../../dist/domain/PlatformAdapterClient.js';

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
        return [];
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

    return [];
  }
}

class MockNatsTransport {
  published = [];

  async publish(subject, data, headers) {
    this.published.push({ subject, data, headers });
  }
}

// 1. Success Flow: Requested -> Accepted -> Pending -> Succeeded
const db = new InMemoryDbExecutor();
const repo = new ExecutionRepository(db);
const boundary = new TransactionalBoundary(repo);
const adapter = new SimulatedPlatformAdapterClient();
const nats = new MockNatsTransport();
const natsClient = new NatsExecutionClient(nats);
const dispatchService = new ExecutionDispatchService(repo, boundary, adapter, natsClient);

const successCommand = {
  tenantId: 'tenant-prod-1',
  sessionId: 'sess-live-99',
  actionId: 'act-pin-5001',
  aggregateId: 'prom-prod-10',
  actionType: 'pin_product',
  mode: 'CONFIRMED',
  payload: { productId: 'prod-sku-999', pinDurationSeconds: 120 },
  idempotencyKey: 'idem-pin-5001',
  actorId: 'operator-alice',
  correlationId: 'corr-slice-01',
  causationId: 'caus-slice-01',
  traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
};

const outcome1 = await dispatchService.executeAction(successCommand);
assert.equal(outcome1.status, 'succeeded');
assert.equal(outcome1.version, 4); // 1 (requested) -> 2 (accepted) -> 3 (pending) -> 4 (succeeded)
assert.equal(outcome1.idempotentReplay, false);
assert.equal(nats.published.length, 1);
assert.equal(nats.published[0].subject, 'livepilot.v1.execution.action.updated');
assert.equal(db.transitions.length, 3);
assert.equal(db.transitions[0].to_status, 'accepted');
assert.equal(db.transitions[1].to_status, 'pending');
assert.equal(db.transitions[2].to_status, 'succeeded');

// 2. Duplicate Flow: Idempotent Replay
const outcomeReplay = await dispatchService.executeAction(successCommand);
assert.equal(outcomeReplay.status, 'succeeded');
assert.equal(outcomeReplay.idempotentReplay, true);
assert.equal(nats.published.length, 1); // No second publish

// 3. Adapter Failure Flow: Requested -> Accepted -> Pending -> Failed
const failureCommand = {
  ...successCommand,
  actionId: 'act-pin-5002',
  idempotencyKey: 'idem-pin-5002',
  payload: { productId: 'prod-sku-999', simulateFailure: true },
};

const outcomeFailure = await dispatchService.executeAction(failureCommand);
assert.equal(outcomeFailure.status, 'failed');
assert.equal(outcomeFailure.errorCode, 'LP05001');
assert.equal(nats.published.length, 2);

// 4. Adapter Timeout Flow: Requested -> Accepted -> Pending -> Unknown (Reconciliation Required)
const timeoutCommand = {
  ...successCommand,
  actionId: 'act-pin-5003',
  idempotencyKey: 'idem-pin-5003',
  payload: { productId: 'prod-sku-999', simulateTimeout: true },
};

const outcomeTimeout = await dispatchService.executeAction(timeoutCommand);
assert.equal(outcomeTimeout.status, 'unknown');
assert.equal(outcomeTimeout.errorCode, 'LP07002');
assert.equal(nats.published.length, 3);

console.log('execution-service vertical slice dispatch tests: PASS');
