import assert from 'node:assert/strict';
import test from 'node:test';
import { NatsAuditReceiptPublisher } from '../../code/apps/services/promotion-service/src/adapters/outbound/audit-receipt.publisher';
import { buildAuditReceipt } from '../../code/apps/services/promotion-service/src/application/audit-receipt';
import { validatePromotionAuthContext } from '../../code/apps/services/promotion-service/src/adapters/inbound/auth-context.guard';
import { redactedContractView } from '../fixtures/promotion-contract-fixtures.ts';

test('public contract redaction removes credentials, authorization, and raw provider payloads recursively', () => {
  const view = redactedContractView({ safe: 'retained', credentials: { token: 'secret' }, nested: [{ raw_provider_payload: { access_token: 'secret' } }] });
  assert.deepEqual(view, { safe: 'retained', nested: [{}] });
  assert.doesNotMatch(JSON.stringify(view), /secret|token|credential|raw_provider_payload/i);
});

test('authorization failures do not expose request secrets', () => {
  const secret = 'provider-token-value';
  assert.throws(() => validatePromotionAuthContext({ auth: { tenantId: 'tenant', sessionId: 'session', actorRef: 'actor', capability: 'admin.root', correlationId: 'corr', deadlineAt: '2099-01-01T00:00:00Z' }, token: secret }), (error: unknown) => error instanceof Error && error.message === 'Promotion authorization context is invalid' && !error.message.includes(secret));
});

test('audit publisher rejects raw provider payloads before publication', async () => {
  const receipt = buildAuditReceipt({ tenantId: 'tenant', sessionId: 'session', promotionId: 'promotion', actorRef: 'actor', capability: 'promotion.propose', policyRevision: 'authorization', fromState: 'proposed', toState: 'pending', expectedResourceVersion: 1, actualResourceVersion: 2, correlationId: 'corr', causationId: 'cause', idempotencyKey: 'idempotency', idempotencyFingerprint: 'a'.repeat(64), mode: 'SIMULATED' });
  const published: unknown[] = [];
  const publisher = new NatsAuditReceiptPublisher({ publish: async (envelope) => { published.push(envelope); return { seq: 1, duplicate: false, stream: 'promotion' }; } } as never);
  await assert.rejects(() => publisher.append(receipt), /prohibited sensitive data/);
  assert.equal(published.length, 0);
});
