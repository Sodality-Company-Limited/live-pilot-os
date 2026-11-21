import assert from 'node:assert/strict';
import test from 'node:test';
import { ReadPromotionStatus, PromotionStatusReadError, type PromotionStatusRecord } from '../../code/apps/services/promotion-service/src/application/read-promotion-status';

const request = (overrides: Record<string, unknown> = {}) => ({
  auth: { tenantId: 'tenant_promo_01', sessionId: 'session_live_01', actorRef: 'actor.reader.01', capability: 'promotion.read', correlationId: 'corr.promotion.read.01', deadlineAt: '2026-11-21T10:00:05Z' },
  promotionId: 'promotion-01',
  ...overrides,
});

const currentRecord = (overrides: Partial<PromotionStatusRecord> = {}): PromotionStatusRecord => ({
  authoritative: { promotionId: 'promotion-01', tenantId: 'tenant_promo_01', sessionId: 'session_live_01', status: 'pending', resourceVersion: 3, policyRevision: 'policy:1', auditReceiptId: 'audit-01', correlationId: 'corr.promotion.read.01', causationId: 'corr.promotion.propose.01', mode: 'SIMULATED' },
  projection: { status: 'current', projectedResourceVersion: 3, reconciliation: { required: false, status: 'not_required' } },
  ...overrides,
});

test('reads authoritative status with tenant/session visibility, projection metadata, and strong ETag', async () => {
  const calls: unknown[] = [];
  const useCase = new ReadPromotionStatus({ readStatus: async (input) => { calls.push(input); return currentRecord(); } });
  const result = await useCase.execute(request());
  assert.equal(result.etag, '"3"');
  assert.deepEqual(result.body, { promotion_id: 'promotion-01', tenant_id: 'tenant_promo_01', session_id: 'session_live_01', status: 'pending', resource_version: 3, policy_revision: 'policy:1', audit_receipt_id: 'audit-01', correlation_id: 'corr.promotion.read.01', causation_id: 'corr.promotion.propose.01', mode: 'SIMULATED', projection_status: 'current', projected_resource_version: 3, version_lag: 0, reconciliation: { required: false, status: 'not_required' } });
  assert.deepEqual(calls, [{ promotionId: 'promotion-01', tenantId: 'tenant_promo_01', sessionId: 'session_live_01', correlationId: 'corr.promotion.read.01' }]);
});

test('fails closed for stale projection and never calls a mutating port', async () => {
  let reads = 0;
  const useCase = new ReadPromotionStatus({ readStatus: async () => { reads += 1; return currentRecord({ projection: { status: 'stale', projectedResourceVersion: 2, reconciliation: { required: true, status: 'required', reasonCode: 'PROJECTION_STALE' } } }); } });
  await assert.rejects(() => useCase.execute(request()), (error: unknown) => error instanceof PromotionStatusReadError && error.code === 'DEPENDENCY_UNAVAILABLE');
  assert.equal(reads, 1);
});

test('rejects cross-tenant authoritative data and invalid visibility capability', async () => {
  const useCase = new ReadPromotionStatus({ readStatus: async () => currentRecord({ authoritative: { ...currentRecord().authoritative, tenantId: 'tenant_other' } }) });
  await assert.rejects(() => useCase.execute(request()), (error: unknown) => error instanceof PromotionStatusReadError && error.code === 'INTEGRITY_ERROR');
  await assert.rejects(() => useCase.execute(request({ auth: { ...request().auth, capability: 'promotion.propose' } })), (error: unknown) => error instanceof PromotionStatusReadError && error.code === 'UNAUTHORIZED');
});
