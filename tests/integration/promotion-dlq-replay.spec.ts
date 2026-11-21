import assert from 'node:assert/strict';
import test from 'node:test';
import { PromotionDlqWorker, PROMOTION_DLQ_REPLAY_CAPABILITY, type PromotionDlqRecord } from '../../code/apps/services/promotion-service/src/workers/promotion-dlq.worker';
import { PromotionRetryWorker } from '../../code/apps/services/promotion-service/src/workers/promotion-retry.worker';

const record: PromotionDlqRecord<{ readonly event: string }> = { messageId: 'message-1', tenantId: 'tenant-1', sessionId: 'session-1', aggregateId: 'promotion-1', correlationId: 'corr-1', causationId: 'cause-1', reasonCode: 'RETRY_EXHAUSTED', payload: { event: 'promotion.proposed' } };
const auth = (capability = PROMOTION_DLQ_REPLAY_CAPABILITY) => ({ tenantId: 'tenant-1', sessionId: 'session-1', actorRef: 'operator-1', capability, correlationId: 'replay-corr-1', deadlineAt: '2099-01-01T00:00:00.000Z' });

test('retry worker retries only transient failures with bounded jitter and attempt limit', async () => {
  const scheduled: number[] = [];
  const worker = new PromotionRetryWorker({ random: () => 1, now: () => Date.parse('2026-01-01T00:00:00.000Z'), scheduleRetry: async (_message, delay) => scheduled.push(delay), quarantine: async () => undefined, maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 250 });
  const decision = await worker.handle({ messageId: 'm', attempt: 1, deadlineAt: '2099-01-01T00:00:00.000Z', payload: {} }, { transient: true });
  assert.equal(decision.action, 'retry');
  assert.deepEqual(scheduled, [120]);
  assert.equal(worker.decide({ messageId: 'm', attempt: 3, deadlineAt: '2099-01-01T00:00:00.000Z', payload: {} }, { transient: true }).reasonCode, 'RETRY_EXHAUSTED');
});

test('poison and unknown failures are quarantined without retry', async () => {
  const quarantined: string[] = [];
  const worker = new PromotionRetryWorker({ scheduleRetry: async () => assert.fail('must not retry'), quarantine: async (_message, reason) => quarantined.push(reason) });
  await worker.handle({ messageId: 'm', attempt: 1, deadlineAt: '2099-01-01T00:00:00.000Z', payload: {} }, { kind: 'unknown' });
  await worker.handle({ messageId: 'm2', attempt: 1, deadlineAt: '2099-01-01T00:00:00.000Z', payload: {} }, { kind: 'poison' });
  assert.deepEqual(quarantined, ['UNKNOWN_OUTCOME', 'POISON_MESSAGE']);
});

test('DLQ replay requires capability, scope, reconciliation, and a fresh idempotency key', async () => {
  const calls: string[] = [];
  const worker = new PromotionDlqWorker({ reconcile: async () => 'safe_to_replay', replay: async (_record, context) => calls.push(context.idempotencyKey) });
  await assert.rejects(() => worker.replay(record, auth('promotion.dlq.read'), 'run-1'), { code: 'UNAUTHORIZED' });
  const first = await worker.replay(record, auth(), 'run-1');
  const second = await worker.replay(record, auth(), 'run-1');
  assert.equal(first.status, 'replayed');
  assert.deepEqual(second, first);
  assert.deepEqual(calls, ['dlq-replay:message-1:run-1']);
});

test('DLQ replay fails closed for unknown reconciliation and reports already-applied state', async () => {
  const unknown = new PromotionDlqWorker({ reconcile: async () => 'unknown', replay: async () => assert.fail('must not replay') });
  await assert.rejects(() => unknown.replay(record, auth(), 'run-2'), { code: 'RECONCILIATION_REQUIRED' });
  const applied = new PromotionDlqWorker({ reconcile: async () => 'already_applied', replay: async () => assert.fail('must not replay') });
  assert.equal((await applied.replay(record, auth(), 'run-3')).status, 'already_applied');
});
