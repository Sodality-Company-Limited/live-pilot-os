import assert from 'node:assert/strict';
import { EmergencyPauseHandler } from '../../dist/reliability/EmergencyPauseHandler.js';
import { CircuitBreaker } from '../../dist/reliability/CircuitBreaker.js';
import { RetryPolicy } from '../../dist/reliability/RetryPolicy.js';
import { DlqPublisher, ReconciliationWorker } from '../../dist/reliability/DlqReconciliation.js';
import { ExecutionRepository } from '../../dist/infra/ExecutionRepository.js';
import { TransactionalBoundary } from '../../dist/infra/TransactionalBoundary.js';
import { SimulatedPlatformAdapterClient } from '../../dist/domain/PlatformAdapterClient.js';

class InMemoryDbExecutor {
  actions = new Map();
  transitions = [];
  idempotency = new Set();

  async query(sql, params = []) {
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

    return [];
  }
}

class MockNatsTransport {
  published = [];

  async publish(subject, data, headers) {
    this.published.push({ subject, data, headers });
  }
}

// 1. Emergency Pause Verification (Fail-Closed LP40003)
const pauseHandler = new EmergencyPauseHandler();
assert.equal(pauseHandler.isPaused('sess-1'), false);
assert.doesNotThrow(() => pauseHandler.assertExecutionPermitted('sess-1'));

pauseHandler.setPause('sess-1', {
  isPaused: true,
  pauseReason: 'Host manual emergency pause triggered',
  pausedAt: new Date().toISOString(),
  pausedBy: 'host-1',
});

assert.equal(pauseHandler.isPaused('sess-1'), true);
assert.throws(
  () => pauseHandler.assertExecutionPermitted('sess-1'),
  (err) => err.code === 'LP40003'
);

// 2. Circuit Breaker Verification
const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 });
assert.equal(breaker.getState(), 'CLOSED');
assert.doesNotThrow(() => breaker.assertAvailable());

breaker.recordFailure();
breaker.recordFailure();
assert.equal(breaker.getState(), 'CLOSED');

breaker.recordFailure(); // Reaches 3 failures -> trips to OPEN
assert.equal(breaker.getState(), 'OPEN');
assert.throws(
  () => breaker.assertAvailable(),
  (err) => err.code === 'LP07001'
);

// 3. Retry Policy Verification
const retryPolicy = new RetryPolicy({ maxRetries: 3, baseDelayMs: 50, maxDelayMs: 500 });
assert.equal(retryPolicy.isRetryable('LP07001'), true); // Dependency unavailable
assert.equal(retryPolicy.isRetryable('LP07002'), true); // Dependency timeout
assert.equal(retryPolicy.isRetryable('LP06001'), true); // Rate limited
assert.equal(retryPolicy.isRetryable('LP01001'), false); // Auth required (non-retryable)
assert.equal(retryPolicy.isRetryable('LP03001'), false); // Validation error (non-retryable)

const backoff1 = retryPolicy.calculateBackoffMs(1);
assert.ok(backoff1 >= 0 && backoff1 <= 100);

// 4. DLQ and Reconciliation Worker Verification
const db = new InMemoryDbExecutor();
const repo = new ExecutionRepository(db);
const boundary = new TransactionalBoundary(repo);
const adapter = new SimulatedPlatformAdapterClient();
const nats = new MockNatsTransport();
const dlq = new DlqPublisher(nats);
const reconWorker = new ReconciliationWorker(repo, boundary, adapter, dlq);

const initialAction = {
  tenant_id: 'tenant-1',
  session_id: 'sess-1',
  action_id: 'act-pin-9001',
  aggregate_id: 'prom-1',
  action_type: 'pin_product',
  status: 'unknown',
  mode: 'CONFIRMED',
  payload_hash: 'hash-xyz',
  idempotency_key: 'idem-9001',
  version: 3,
  retry_count: 3,
  max_retries: 3,
  correlation_id: 'corr-9001',
  traceparent: '00-trace-01',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
db.actions.set('tenant-1:sess-1:act-pin-9001', initialAction);

// Scenario A: Reconciliation successfully observes platform confirmation
const reconciledSuccess = await reconWorker.reconcileAction(
  initialAction,
  { status: 'succeeded' }
);
assert.equal(reconciledSuccess.status, 'succeeded');
assert.equal(reconciledSuccess.version, 5); // unknown(3) -> reconciled(4) -> succeeded(5)

// Scenario B: Reconciliation cannot observe confirmation -> Routes to DLQ
const stillUnknownAction = { ...initialAction, action_id: 'act-pin-9002', version: 3 };
db.actions.set('tenant-1:sess-1:act-pin-9002', stillUnknownAction);

const reconciledToDlq = await reconWorker.reconcileAction(
  stillUnknownAction,
  { status: 'unknown' }
);
assert.equal(reconciledToDlq.status, 'reconciled');
assert.equal(nats.published.length, 1);
assert.equal(nats.published[0].subject, 'livepilot.v1.execution.action.dlq');
assert.equal(nats.published[0].headers?.['X-Tenant-Id'], 'tenant-1');

console.log('execution-service reliability, pause, circuit breaker, and reconciliation tests: PASS');
