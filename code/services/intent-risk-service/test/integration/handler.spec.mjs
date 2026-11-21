import test from 'node:test';
import assert from 'node:assert';
import { IntentRiskHandler } from '../../src/handler/intent-risk-handler.mjs';

test('G-CORE-068: Authenticated Idempotent Intent/Risk NATS Service Handler', async () => {
  const store = { idempotency: new Set(), outbox: [], facts: [] };
  const handler = new IntentRiskHandler(store);

  const envelope = {
    tenant_id: 'tenant-omega',
    live_session_id: 'session-777',
    idempotency_key: 'idemp-msg-999',
    correlation_id: 'corr-999',
    causation_id: 'caus-999',
    text: 'Can I get a discount code please?'
  };

  // 1. Initial handling -> classification, persistence, and outbox write
  const res1 = await handler.handleSignal(envelope);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.duplicate, false);
  assert.strictEqual(res1.outbox_appended, true);
  assert.strictEqual(store.outbox.length, 1);
  assert.strictEqual(store.outbox[0].payload.category, 'DISCOUNT_REQUEST');

  // 2. Duplicate redelivery -> Idempotent no-op
  const res2 = await handler.handleSignal(envelope);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.duplicate, true);
  assert.strictEqual(res2.outbox_appended, false);
  assert.strictEqual(store.outbox.length, 1); // Not duplicated

  // 3. Risk payload handling
  const scamEnvelope = {
    tenant_id: 'tenant-omega',
    live_session_id: 'session-777',
    idempotency_key: 'idemp-scam-111',
    correlation_id: 'corr-111',
    text: 'Transfer money to bank account for secret deal'
  };

  const res3 = await handler.handleSignal(scamEnvelope);
  assert.strictEqual(res3.success, true);
  assert.strictEqual(store.outbox.length, 2);
  assert.strictEqual(store.outbox[1].payload.event_type, 'risk.severity.ranked.v1');
  assert.strictEqual(store.outbox[1].payload.severity, 'CRITICAL');
});
