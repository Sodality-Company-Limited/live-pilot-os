import assert from 'node:assert/strict';
import test from 'node:test';
import { PromotionProposalValidationError, validatePromotionProposalRequest } from '../../code/apps/services/promotion-service/src/application/propose-promotion';
import { PromotionAuthContextError } from '../../code/apps/services/promotion-service/src/adapters/inbound/auth-context.guard';

const request = (overrides: Record<string, unknown> = {}) => ({
  auth: { tenantId: 'tenant_promo_01', sessionId: 'session_live_01', actorRef: 'actor.creator.01', capability: 'promotion.propose', correlationId: 'corr.promotion.01', deadlineAt: '2026-11-21T10:00:05Z' },
  headers: { 'Idempotency-Key': 'proposal.session.01.0001' },
  body: { promotion_id: 'promotion-01', product_id: 'product-01', discount_percent: 10, claim_limit: 100, policy_revision: 'policy:1', ...overrides },
});

test('proposal request rejects unknown fields and invalid deadline before persistence', async () => {
  assert.throws(() => validatePromotionProposalRequest(request({ unexpected: true }), Date.parse('2026-11-21T10:00:00Z')), (error: unknown) => error instanceof PromotionProposalValidationError && error.code === 'REQUEST_INVALID');
  assert.throws(() => validatePromotionProposalRequest({ ...request(), auth: { ...request().auth, deadlineAt: '2026-11-21T09:59:59Z' } }, Date.parse('2026-11-21T10:00:00Z')), (error: unknown) => error instanceof PromotionAuthContextError && error.reason === 'expired_context');
});
