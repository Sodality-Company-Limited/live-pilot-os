import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePromotionAuthContext } from '../../code/apps/services/promotion-service/src/adapters/inbound/auth-context.guard';
import { IdempotencyConflictError, PromotionIdempotencyBoundary, requestFingerprint } from '../../code/apps/services/promotion-service/src/application/idempotency';

const valid = () => ({ tenantId: 'tenant_promo_01', sessionId: 'session_live_01', actorRef: 'actor:creator_01', capability: 'promotion.propose', correlationId: 'corr_promotion_01', deadlineAt: '2026-11-21T10:00:05Z' });

test('auth context validates scope, capability, correlation, and future deadline', () => {
  assert.equal(validatePromotionAuthContext({ auth: valid() }, Date.parse('2026-11-21T10:00:00Z')).tenantId, 'tenant_promo_01');
});

test('auth context fails closed for missing, mismatched, or expired values', () => {
  assert.throws(() => validatePromotionAuthContext({ auth: { ...valid(), tenantId: 'bad value' } }), /invalid/);
  assert.throws(() => validatePromotionAuthContext({ auth: { ...valid(), capability: 'admin.root' } }), /invalid/);
  assert.throws(() => validatePromotionAuthContext({ auth: { ...valid(), deadlineAt: '2020-01-01T00:00:00Z' } }), /invalid/);
});

test('idempotency replays the same outcome and rejects a conflicting key', async () => {
  const boundary = new PromotionIdempotencyBoundary<string>();
  let calls = 0;
  const first = await boundary.execute('proposal:session_live_01:promotion_01:1', { tenantId: 't', amount: 1 }, async () => `result-${++calls}`);
  const replay = await boundary.execute('proposal:session_live_01:promotion_01:1', { amount: 1, tenantId: 't' }, async () => `result-${++calls}`);
  assert.equal(first, replay);
  assert.equal(calls, 1);
  await assert.rejects(() => boundary.execute('proposal:session_live_01:promotion_01:1', { tenantId: 't', amount: 2 }, () => 'never'), IdempotencyConflictError);
});

test('fingerprints are deterministic and omit secret-bearing fields', () => {
  assert.equal(requestFingerprint({ b: 2, a: 1, secret: 'one' }), requestFingerprint({ a: 1, b: 2, secret: 'two' }));
});
