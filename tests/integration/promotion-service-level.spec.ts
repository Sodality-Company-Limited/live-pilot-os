import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { PromotionAggregate, PromotionDomainError } from '../../code/apps/services/promotion-service/src/domain/promotion-aggregate';
import { PromotionControl, PromotionControlError } from '../../code/apps/services/promotion-service/src/application/promotion-control';
import { PromotionIdempotencyBoundary, IdempotencyConflictError } from '../../code/apps/services/promotion-service/src/application/idempotency';
import { TransactionManager, TransactionBoundaryError } from '../../code/apps/services/promotion-service/src/application/transaction-manager';
import { buildPromotionHeaders, decodePromotionEnvelope, PROMOTION_SCHEMA_VERSION } from '../../code/apps/services/promotion-service/src/adapters/outbound/nats-publisher';
import { PromotionRetryWorker } from '../../code/apps/services/promotion-service/src/workers/promotion-retry.worker';
import { PromotionDlqWorker, PROMOTION_DLQ_REPLAY_CAPABILITY, type PromotionDlqRecord } from '../../code/apps/services/promotion-service/src/workers/promotion-dlq.worker';
import { validatePromotionAuthContext } from '../../code/apps/services/promotion-service/src/adapters/inbound/auth-context.guard';
import { proposalSchema, aggregateSchema, assertValid, validAggregate, validProposal } from '../fixtures/promotion-contract-fixtures.ts';
import { promotionActor, promotionEnvelope, RecordingTransactionClient, SERVICE_CAUSATION, SERVICE_PROMOTION, SERVICE_SESSION, SERVICE_TENANT, transitionCommand } from '../fixtures/promotion-service-fixtures.ts';

test('service matrix accepts the legal lifecycle and rejects illegal, stale, unknown, and unauthorized transitions', () => {
  const aggregate = new PromotionAggregate(SERVICE_PROMOTION, SERVICE_TENANT);
  assert.equal(aggregate.transition(transitionCommand('pending', 0, 'submit-1', { submissionValid: true })).version, 1);
  assert.equal(aggregate.transition(transitionCommand('approved', 1, 'approve-1', { approvalEvidence: true }, promotionActor(['promotion:approve']))).state, 'approved');
  assert.equal(aggregate.transition(transitionCommand('issued', 2, 'issue-1', { issuanceEvidence: true }, promotionActor(['promotion:issue']))).state, 'issued');
  assert.throws(() => aggregate.transition(transitionCommand('pending', 3, 'illegal', { submissionValid: true })), (error: unknown) => error instanceof PromotionDomainError && error.code === 'ILLEGAL_TRANSITION');
  assert.throws(() => aggregate.transition(transitionCommand('cancelled', 4, 'stale', { reason: 'late' })), (error: unknown) => error instanceof PromotionDomainError && error.code === 'VERSION_CONFLICT');
  assert.throws(() => new PromotionAggregate(SERVICE_PROMOTION, 'other-tenant').transition(transitionCommand('pending', 0, 'cross-tenant', { submissionValid: true })), (error: unknown) => error instanceof PromotionDomainError && error.code === 'TENANT_MISMATCH');
});

test('service matrix binds duplicate commands to one outcome and rejects conflicting fingerprints', async () => {
  const boundary = new PromotionIdempotencyBoundary<string>();
  let executions = 0;
  const request = { tenantId: SERVICE_TENANT, promotionId: SERVICE_PROMOTION, secret: 'first' };
  const first = await boundary.execute('proposal:session_live_01:promotion_01:1', request, async () => `outcome-${++executions}`);
  const replay = await boundary.execute('proposal:session_live_01:promotion_01:1', { ...request, secret: 'second' }, async () => `outcome-${++executions}`);
  assert.equal(first, replay);
  assert.equal(executions, 1);
  await assert.rejects(() => boundary.execute('proposal:session_live_01:promotion_01:1', { ...request, discount: 20 }, () => 'unreachable'), IdempotencyConflictError);
});

test('service matrix validates authorization and fail-closed pause state', () => {
  const auth = validatePromotionAuthContext({ auth: { tenantId: SERVICE_TENANT, sessionId: SERVICE_SESSION, actorRef: 'actor:creator_01', capability: 'promotion.propose', correlationId: 'corr_1', deadlineAt: '2099-01-01T00:00:00Z' } }, Date.parse('2026-11-21T00:00:00Z'));
  assert.equal(auth.tenantId, SERVICE_TENANT);
  assert.throws(() => validatePromotionAuthContext({ auth: { ...auth, capability: 'admin.root' } }), /invalid/i);
  const control = new PromotionControl();
  control.updatePause({ actor: promotionActor(['promotion:pause']), scope: 'tenant', scopeId: SERVICE_TENANT, paused: true, expectedRevision: 0, idempotencyKey: 'pause-1', fingerprint: 'pause-fingerprint' });
  assert.throws(() => control.assertDispatchAllowed({ tenantId: SERVICE_TENANT, sessionId: SERVICE_SESSION, promotionId: SERVICE_PROMOTION, controlRevision: 1 }), (error: unknown) => error instanceof PromotionControlError && error.code === 'PROMOTION_PAUSED');
  assert.throws(() => new PromotionControl({ known: false }).assertDispatchAllowed({ tenantId: SERVICE_TENANT, sessionId: SERVICE_SESSION, promotionId: SERVICE_PROMOTION, controlRevision: 0 }), /unavailable/i);
});

test('service matrix preserves transaction boundaries for commit and rollback', async () => {
  const committed = new RecordingTransactionClient();
  await new TransactionManager(committed).execute(async (client) => { await client.query('INSERT OUTBOX'); return 'committed'; });
  assert.deepEqual(committed.statements.map(({ sql }) => sql), ['BEGIN', 'INSERT OUTBOX', 'COMMIT']);
  const rolledBack = new RecordingTransactionClient();
  await assert.rejects(() => new TransactionManager(rolledBack).execute(async (client) => { await client.query('INSERT AGGREGATE'); throw new Error('domain failure'); }), /domain failure/);
  assert.deepEqual(rolledBack.statements.map(({ sql }) => sql), ['BEGIN', 'INSERT AGGREGATE', 'ROLLBACK']);
  const rollbackFailure = new RecordingTransactionClient();
  rollbackFailure.failOn = 'ROLLBACK';
  await assert.rejects(() => new TransactionManager(rollbackFailure).execute(async () => { throw new Error('commit path failure'); }), (error: unknown) => error instanceof TransactionBoundaryError && error.code === 'ROLLBACK_FAILED');
});

test('service matrix validates NATS lineage, schema compatibility, and transport headers', () => {
  const data = validProposal();
  assertValid(data, proposalSchema);
  const envelope = promotionEnvelope(data);
  const headers = buildPromotionHeaders(envelope, { tenantId: SERVICE_TENANT, sessionId: SERVICE_SESSION, producer: 'core-bff', traceparent: '00-trace-span-01', orderingKey: SERVICE_PROMOTION, mode: 'SIMULATED', authorization: envelope.authorization });
  assert.equal(headers.get('X-Schema-Version'), PROMOTION_SCHEMA_VERSION);
  assert.equal(decodePromotionEnvelope(new TextEncoder().encode(JSON.stringify(envelope))).aggregate_id, SERVICE_PROMOTION);
  assert.throws(() => decodePromotionEnvelope(new TextEncoder().encode(JSON.stringify({ ...envelope, schema_version: '2.0.0' }))), /unsupported schema version/);
  assert.throws(() => assertValid(validAggregate({ resource_version: 0 }), aggregateSchema), /below minimum/);
});

test('service matrix quarantines timeout and unknown outcomes without treating them as success', async () => {
  const quarantined: string[] = [];
  const worker = new PromotionRetryWorker({ scheduleRetry: async () => assert.fail('unknown outcome must not retry'), quarantine: async (_message, reason) => quarantined.push(reason) });
  const message = { messageId: 'message-timeout', attempt: 1, deadlineAt: '2099-01-01T00:00:00Z', payload: { promotionId: SERVICE_PROMOTION } };
  await worker.handle(message, { kind: 'unknown' });
  await worker.handle({ ...message, messageId: 'message-deadline', deadlineAt: '2020-01-01T00:00:00Z' }, { transient: true });
  assert.deepEqual(quarantined, ['UNKNOWN_OUTCOME', 'DEADLINE_EXCEEDED']);
});

test('service matrix requires authorized DLQ replay reconciliation and replay idempotency', async () => {
  const record: PromotionDlqRecord = { messageId: 'message-dlq', tenantId: SERVICE_TENANT, sessionId: SERVICE_SESSION, aggregateId: SERVICE_PROMOTION, correlationId: 'corr-dlq', causationId: SERVICE_CAUSATION, reasonCode: 'RETRY_EXHAUSTED', payload: { state: 'unknown' } };
  const auth = { tenantId: SERVICE_TENANT, sessionId: SERVICE_SESSION, actorRef: 'operator-1', capability: PROMOTION_DLQ_REPLAY_CAPABILITY, correlationId: 'corr-replay', deadlineAt: '2099-01-01T00:00:00Z' };
  const calls: string[] = [];
  const worker = new PromotionDlqWorker({ reconcile: async () => 'safe_to_replay', replay: async (_record, context) => calls.push(context.idempotencyKey) });
  await assert.rejects(() => worker.replay(record, { ...auth, capability: 'promotion.dlq.read' }, 'run-1'), { code: 'UNAUTHORIZED' });
  const first = await worker.replay(record, auth, 'run-1');
  const second = await worker.replay(record, auth, 'run-1');
  assert.equal(first.status, 'replayed');
  assert.deepEqual(second, first);
  assert.deepEqual(calls, ['dlq-replay:message-dlq:run-1']);
  const unknown = new PromotionDlqWorker({ reconcile: async () => 'unknown', replay: async () => assert.fail('unknown reconciliation must not replay') });
  await assert.rejects(() => unknown.replay(record, auth, 'run-2'), { code: 'RECONCILIATION_REQUIRED' });
});

test('service matrix checks migration constraints and non-destructive execution shape', async () => {
  const migrationPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../code/apps/services/promotion-service/db/migrations/001_promotion.sql');
  const sql = await readFile(migrationPath, 'utf8');
  for (const table of ['promotion_aggregate', 'promotion_transition_history', 'promotion_inbox', 'promotion_outbox', 'promotion_idempotency_record']) assert.match(sql, new RegExp(`CREATE TABLE ${table}\\s*\\(`));
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.doesNotMatch(sql, /\\b(DROP|TRUNCATE|ALTER SYSTEM)\\b/i);
  assert.match(sql, /promotion_outbox[\s\S]*UNIQUE \(aggregate_id, resource_version, event_type\)/);
  assert.match(sql, /promotion_idempotency_record[\s\S]*PRIMARY KEY \(tenant_id, idempotency_key\)/);
});
