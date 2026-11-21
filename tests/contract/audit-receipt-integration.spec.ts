import assert from 'node:assert/strict';
import test from 'node:test';
import { appendBeforeCommit, buildAuditReceipt, type AuditReceipt, validateAuditReceipt } from '../../code/apps/services/promotion-service/src/application/audit-receipt.ts';
import { NatsAuditReceiptPublisher } from '../../code/apps/services/promotion-service/src/adapters/outbound/audit-receipt.publisher.ts';

const transition = {
  tenantId: 'tenant:p1', sessionId: 'session:p1', promotionId: 'promotion:p1', actorRef: 'actor:p1', capability: 'promotion.submit',
  policyRevision: 'policy:1', fromState: 'proposed', toState: 'pending', expectedResourceVersion: 1, actualResourceVersion: 2,
  correlationId: 'corr:p1', causationId: 'cause:p1', idempotencyKey: 'proposal:p1', idempotencyFingerprint: 'a'.repeat(64), mode: 'SIMULATED' as const,
  occurredAt: '2026-11-21T00:00:00.000Z',
};

test('audit receipt is hash-chained, redacted by construction, and append is idempotently keyed', async () => {
  const calls: unknown[] = [];
  const publisher = new NatsAuditReceiptPublisher({ publish: async (envelope) => { calls.push(envelope); return {}; } });
  const receipt = buildAuditReceipt(transition, 'b'.repeat(64));
  const result = await publisher.append(receipt);
  const replay = await publisher.append(receipt);
  assert.equal(result.receiptHash, receipt.receiptHash);
  assert.equal(replay.receiptHash, result.receiptHash);
  assert.equal((calls[0] as { message_id: string }).message_id, (calls[1] as { message_id: string }).message_id);
  assert.doesNotMatch(JSON.stringify(calls), /secret|token|password|raw_provider_payload/i);
});

test('audit append failure leaves the consequential transition pending and does not commit', async () => {
  let committed = false;
  const result = await appendBeforeCommit({ append: async () => { throw new Error('audit unavailable'); } }, transition, async () => { committed = true; });
  assert.equal(result.status, 'pending');
  assert.equal(result.committed, false);
  assert.equal(committed, false);
});

test('tampering with receipt content fails closed', () => {
  const receipt = buildAuditReceipt(transition) as AuditReceipt;
  assert.throws(() => {
    const tampered = { ...receipt, actualResourceVersion: 3 };
    validateAuditReceipt(tampered);
  }, /hash does not match/);
});
