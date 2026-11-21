import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MARGIN_VERDICT_SCHEMA_HASH,
  MARGIN_VERDICT_SCHEMA_VERSION,
  MARGIN_VERDICT_SUBJECT,
  MarginPolicyIntegrationError,
  evaluateWithUnknownOnTimeout,
  type MarginPolicyRequest,
  type MarginPolicyVerdict,
  validateMarginPolicyVerdict,
} from '../../code/apps/services/promotion-service/src/adapters/outbound/margin-policy.port.ts';
import { decodeMarginVerdict, MarginVerdictConsumer } from '../../code/apps/services/promotion-service/src/adapters/inbound/margin-verdict.consumer.ts';

const request: MarginPolicyRequest = { tenantId: 'tenant_01', sessionId: 'session_01', promotionId: 'promotion_01', correlationId: 'corr_01', causationId: 'cause_01', idempotencyKey: 'margin:promotion_01:1', policyRevision: 'policy:2026-11-01', expectedResourceVersion: 2, deadlineAt: '2026-11-21T10:00:10.000Z' };
const verdict = (): MarginPolicyVerdict => ({ eventId: 'event_01', eventType: 'margin.verdict.updated.v1', occurredAt: '2026-11-21T10:00:00.000Z', deadlineAt: '2026-11-21T10:00:05.000Z', producer: 'margin-policy-service', tenantId: request.tenantId, sessionId: request.sessionId, promotionId: request.promotionId, aggregateId: request.promotionId, schemaVersion: MARGIN_VERDICT_SCHEMA_VERSION, schemaHash: MARGIN_VERDICT_SCHEMA_HASH, policyRevision: request.policyRevision, resourceVersion: request.expectedResourceVersion, correlationId: request.correlationId, causationId: request.causationId, idempotencyKey: request.idempotencyKey, verdict: 'allow', evidenceIds: ['evidence_01'], mode: 'SIMULATED' });
const wire = (value: MarginPolicyVerdict): Uint8Array => new TextEncoder().encode(JSON.stringify({ event_id: value.eventId, event_type: value.eventType, occurred_at: value.occurredAt, deadline_at: value.deadlineAt, producer: value.producer, tenant_id: value.tenantId, session_id: value.sessionId, promotion_id: value.promotionId, aggregate_id: value.aggregateId, schema_version: value.schemaVersion, schema_hash: value.schemaHash, policy_revision: value.policyRevision, resource_version: value.resourceVersion, correlation_id: value.correlationId, causation_id: value.causationId, idempotency_key: value.idempotencyKey, verdict: value.verdict, evidence_ids: value.evidenceIds, mode: value.mode }));
type TestMessage = { subject: string; data: Uint8Array; ack: () => void; term: () => void };
const message = (data: Uint8Array): TestMessage => ({ subject: MARGIN_VERDICT_SUBJECT, data, ack: () => undefined, term: () => undefined });

test('validates schema identity, scope, lineage, policy revision, and version', () => { validateMarginPolicyVerdict(verdict(), request); });
test('rejects schema hash, correlation/causation, tenant/session, revision, and version mismatches', () => {
  for (const [field, code] of [['schemaHash', 'INVALID_CONTRACT'], ['correlationId', 'LINEAGE_MISMATCH'], ['tenantId', 'SCOPE_MISMATCH'], ['policyRevision', 'POLICY_REVISION_MISMATCH'], ['resourceVersion', 'RESOURCE_VERSION_MISMATCH']] as const) {
    const bad = { ...verdict(), [field]: field === 'resourceVersion' ? 3 : field === 'schemaHash' ? 'f'.repeat(64) : 'other' } as MarginPolicyVerdict;
    assert.throws(() => validateMarginPolicyVerdict(bad, request), (error: unknown) => error instanceof MarginPolicyIntegrationError && error.code === code);
  }
});
test('consumer acknowledges only a validated verdict and terminates malformed input', async () => {
  let received = 0; let terminated = 0;
  const consumer = new MarginVerdictConsumer({ onVerdict: async () => { received += 1; }, onUnknown: async () => undefined });
  await consumer.process(message(wire(verdict())) as never, request);
  assert.equal(received, 1);
  const invalid = { ...verdict(), schemaHash: '0'.repeat(64) };
  const badMessage = { ...message(wire(invalid)), term: () => { terminated += 1; } } as never;
  await assert.rejects(() => consumer.process(badMessage, request), /schema identity mismatch/);
  assert.equal(terminated, 1);
});
test('decoder rejects unknown versions and malformed schema hashes', () => {
  const bad = { ...verdict(), schemaVersion: '9.0.0' as typeof MARGIN_VERDICT_SCHEMA_VERSION };
  assert.throws(() => decodeMarginVerdict(wire(bad)), /schema identity mismatch/);
});
test('timeout is represented as an explicit unknown result', async () => {
  const result = await evaluateWithUnknownOnTimeout(() => new Promise<string>(() => undefined), 5);
  assert.deepEqual(result, { verdict: 'unknown', reasonCode: 'TIMEOUT' });
});
