import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPromotionHeaders,
  decodePromotionEnvelope,
  PROMOTION_SCHEMA_VERSION,
  PROMOTION_SUBJECTS,
  type PromotionEnvelope,
} from '../../code/apps/services/promotion-service/src/adapters/outbound/nats-publisher';

const encode = (value: PromotionEnvelope<Record<string, unknown>>): Uint8Array => new TextEncoder().encode(JSON.stringify(value));

function proposalEnvelope(): PromotionEnvelope<Record<string, unknown>> {
  const data: Record<string, unknown> = {
    schema_version: PROMOTION_SCHEMA_VERSION,
    message_kind: 'command',
    event_type: 'promotion.proposal.requested',
    promotion_id: 'promotion_01',
    session_id: 'session_01',
    product_id: 'product_01',
    discount_percent: 15,
    claim_limit: 100,
    policy_revision: 'policy:2026-11-01',
    expected_resource_version: 0,
    resource_version: 0,
    actor_ref: 'actor:creator_01',
    capability: 'promotion.propose',
    idempotency_key: 'proposal:session_01:promotion_01:1',
    idempotency_fingerprint: 'a'.repeat(64),
    correlation_id: 'corr:promotion_01',
    causation_id: 'msg:parent_01',
    lifecycle_state: 'proposed',
    mode: 'SIMULATED',
  };
  return {
    message_id: 'msg:promotion_01',
    message_kind: 'command',
    subject: PROMOTION_SUBJECTS.proposalRequest,
    schema_version: PROMOTION_SCHEMA_VERSION,
    occurred_at: '2026-11-21T10:00:00.000Z',
    producer: 'core-bff',
    tenant_id: 'tenant_01',
    session_id: 'session_01',
    aggregate_type: 'promotion',
    aggregate_id: 'promotion_01',
    correlation_id: 'corr:promotion_01',
    causation_id: 'msg:parent_01',
    idempotency_key: 'proposal:session_01:promotion_01:1',
    priority: 'normal',
    deadline_at: '2026-11-21T10:00:05.000Z',
    mode: 'SIMULATED',
    authorization: { actor_ref: 'actor:creator_01', capability: 'promotion.propose', policy_revision: 'policy:2026-11-01' },
    data,
  };
}

test('promotion adapter emits the versioned envelope headers and ordering key', () => {
  const envelope = proposalEnvelope();
  const result = buildPromotionHeaders(envelope, {
    tenantId: envelope.tenant_id,
    sessionId: envelope.session_id,
    producer: envelope.producer,
    traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    orderingKey: envelope.aggregate_id,
    mode: envelope.mode,
    authorization: envelope.authorization,
  });

  assert.equal(result.get('Nats-Msg-Id'), envelope.message_id);
  assert.equal(result.get('X-Schema-Version'), PROMOTION_SCHEMA_VERSION);
  assert.equal(result.get('X-Correlation-Id'), envelope.correlation_id);
  assert.equal(result.get('X-Causation-Id'), envelope.causation_id);
  assert.equal(result.get('X-Ordering-Key'), envelope.aggregate_id);
  assert.equal(result.get('X-Mode'), 'SIMULATED');
});

test('promotion adapter accepts a compatible payload and rejects broken lineage', () => {
  const envelope = proposalEnvelope();
  const decoded = decodePromotionEnvelope(encode(envelope));
  assert.equal(decoded.data.promotion_id, envelope.data.promotion_id);

  const invalid = { ...envelope, correlation_id: 'corr:other' };
  assert.throws(() => decodePromotionEnvelope(encode(invalid)), /correlation\/causation lineage mismatch/);
});

test('promotion adapter fails closed on an unsupported schema version', () => {
  const invalid = { ...proposalEnvelope(), schema_version: '2.0.0' as typeof PROMOTION_SCHEMA_VERSION };
  assert.throws(() => decodePromotionEnvelope(encode(invalid)), /unsupported schema version/);
});
