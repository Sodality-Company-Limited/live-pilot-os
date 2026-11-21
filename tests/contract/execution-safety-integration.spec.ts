import assert from 'node:assert/strict';
import test from 'node:test';
import { assertIssuanceEvidence, ExecutionSafetyError, type ExecutionSafetyAuthorization, type IssuanceEvidence } from '../../code/apps/services/promotion-service/src/adapters/outbound/execution-safety.port';
import { MARGIN_VERDICT_SCHEMA_HASH } from '../../code/apps/services/promotion-service/src/adapters/outbound/margin-policy.port';
import { ExecutionResultConsumer } from '../../code/apps/services/promotion-service/src/adapters/inbound/execution-result.consumer';
import type { MarginPolicyVerdict } from '../../code/apps/services/promotion-service/src/adapters/outbound/margin-policy.port';
import type { InventoryReservationResult } from '../../code/apps/services/promotion-service/src/adapters/outbound/inventory.port';

const margin: MarginPolicyVerdict = { eventId: 'margin-1', eventType: 'margin.verdict.updated.v1', occurredAt: '2026-11-21T10:00:00.000Z', deadlineAt: '2099-11-21T10:00:00.000Z', producer: 'margin-policy-service', tenantId: 'tenant-1', sessionId: 'session-1', promotionId: 'promotion-1', aggregateId: 'promotion-1', schemaVersion: '1.0.0', schemaHash: MARGIN_VERDICT_SCHEMA_HASH, policyRevision: 'policy:1', resourceVersion: 1, correlationId: 'corr-1', causationId: 'cause-1', idempotencyKey: 'issue-1', verdict: 'allow', evidenceIds: ['e-1'], mode: 'SIMULATED' };
const inventory: InventoryReservationResult = { schemaVersion: '1.0.0', reservationId: 'reservation-1', promotionId: 'promotion-1', tenantId: 'tenant-1', sessionId: 'session-1', sku: 'sku-1', quantity: 1, outcome: 'accepted', revision: 2, expiresAt: '2099-11-21T10:00:00.000Z', idempotencyKey: 'issue-1', idempotencyFingerprint: 'a'.repeat(64), correlationId: 'corr-1', causationId: 'cause-1', observedAt: '2026-11-21T10:00:00.000Z', reconciliationRequired: false };
const authorization: ExecutionSafetyAuthorization = { authorizationId: 'auth-1', outcome: 'authorized', fencingToken: 7, mode: 'SIMULATED', resourceVersion: 1, promotionId: 'promotion-1', tenantId: 'tenant-1', sessionId: 'session-1', policyRevision: 'policy:1', correlationId: 'corr-1', causationId: 'cause-1', idempotencyKey: 'issue-1', expiresAt: '2099-11-21T10:00:00.000Z' };
const evidence = (): IssuanceEvidence => ({ margin, approval: { outcome: 'accepted', decisionId: 'decision-1', decision: 'approve', resourceVersion: 2, approvalRevision: 'approval:1', pauseRevision: 'pause:1', idempotencyKey: 'issue-1', correlationId: 'corr-1', causationId: 'cause-1' }, inventory, executionSafety: authorization, expectedResourceVersion: 1, tenantId: 'tenant-1', sessionId: 'session-1', promotionId: 'promotion-1', correlationId: 'corr-1', causationId: 'cause-1', idempotencyKey: 'issue-1', policyRevision: 'policy:1', mode: 'SIMULATED' });

test('requires all four current evidence records before issuance', () => {
  assert.throws(() => assertIssuanceEvidence({ ...evidence(), margin: { ...margin, verdict: 'deny' } }), (error: unknown) => error instanceof ExecutionSafetyError && error.code === 'MISMATCHED_EVIDENCE');
  assert.throws(() => assertIssuanceEvidence({ ...evidence(), approval: { ...evidence().approval, outcome: 'unknown' } }), /accepted/);
  assert.throws(() => assertIssuanceEvidence({ ...evidence(), inventory: { ...inventory, expiresAt: '2020-01-01T00:00:00.000Z' } }), /expired|current/i);
});

test('never dispatches without a bound authorization and safely deduplicates results', async () => {
  let dispatched = 0;
  const consumer = new ExecutionResultConsumer({ authorize: async () => ({ ...authorization, outcome: 'denied' }) }, { onDispatch: async () => { dispatched += 1; }, onResult: async () => undefined });
  const request = { actionId: 'action-1', evidence: evidence() };
  await assert.rejects(() => consumer.dispatch(request), /denied/);
  assert.equal(dispatched, 0);
});

test('replays the same result safely and never turns unknown into issuance', async () => {
  const observations: string[] = [];
  let reconciled = 0;
  const consumer = new ExecutionResultConsumer({ authorize: async () => authorization }, {
    onDispatch: async () => { throw new Error('dispatch must not be called by result consumption'); },
    onResult: async ({ action, duplicate }) => { observations.push(`${action}:${duplicate}`); },
    reconcile: async () => { reconciled += 1; },
  });
  const event = { messageId: 'message-1', actionId: 'action-1', evidence: evidence(), result: 'unknown' as const };
  assert.equal((await consumer.consume(event)).duplicate, false);
  assert.equal((await consumer.consume(event)).duplicate, true);
  await assert.rejects(() => consumer.consume({ ...event, messageId: 'message-2', result: 'issued' }), /replayed|conflicting/);
  assert.deepEqual(observations, ['unknown:false', 'unknown:true']);
  assert.equal(reconciled, 1);
});

