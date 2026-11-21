import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAUSATION_ID,
  CORRELATION_ID,
  IDEMPOTENCY_KEY,
  proposalSchema,
  SCHEMA_VERSION,
  TENANT_ID,
  assertValid,
  redactedContractView,
  validEnvelope,
  validProposal,
  validateEnvelope,
} from '../fixtures/promotion-contract-fixtures.ts';

test('Promotion envelope carries schema, scope, authorization, idempotency, and lineage context', () => {
  const envelope = validEnvelope();
  assert.deepEqual(validateEnvelope(envelope), []);
  assert.equal(envelope.schema_version, SCHEMA_VERSION);
  assert.equal(envelope.tenant_id, TENANT_ID);
  assert.equal(envelope.correlation_id, CORRELATION_ID);
  assert.equal(envelope.causation_id, CAUSATION_ID);
  assert.equal(envelope.idempotency_key, IDEMPOTENCY_KEY);
});

test('envelope validation fails closed for missing or forged authorization context', () => {
  const missing = validEnvelope();
  delete (missing as unknown as Record<string, unknown>).authorization;
  assert.notDeepEqual(validateEnvelope(missing), []);

  const forged = validEnvelope({ actor_ref: 'actor:creator_01' });
  forged.tenant_id = 'tenant_other';
  assert.match(validateEnvelope(forged).join(','), /scope mismatch/);

  const capabilityForged = validEnvelope({ capability: 'promotion.approve' });
  assert.match(validateEnvelope(capabilityForged).join(','), /capability mismatch/);
});

test('envelope rejects schema-version mismatch and broken correlation/causation lineage', () => {
  const stale = validEnvelope();
  stale.schema_version = '0.9.0';
  stale.causation_id = 'wrong_parent';
  const errors = validateEnvelope(stale);
  assert.ok(errors.includes('schema version mismatch'));
  assert.ok(errors.includes('correlation lineage mismatch'));
});

test('redaction removes credentials and raw provider payloads while retaining safe contract evidence', () => {
  const unsafe = {
    ...validEnvelope(),
    authorization_header: 'Bearer secret-token',
    data: {
      ...validProposal(),
      raw_provider_payload: { access_token: 'provider-secret', offer: 'unsafe' },
      safe_reason: 'provider rejected',
    },
  };
  const redacted = redactedContractView(unsafe) as Record<string, unknown>;
  const serialized = JSON.stringify(redacted);
  assert.doesNotMatch(serialized, /secret-token|provider-secret|raw_provider_payload|authorization_header/);
  assert.match(serialized, /provider rejected/);
  assert.match(serialized, /promotion_01/);
});

test('envelope data remains schema-valid after normal construction', () => {
  assert.doesNotThrow(() => assertValid(validEnvelope().data, proposalSchema));
});
