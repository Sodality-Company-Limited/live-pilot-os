import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateSchema,
  assertValid,
  decisionSchema,
  fingerprint,
  idempotencyConflict,
  proposalSchema,
  validAggregate,
  validDecision,
  validProposal,
} from '../fixtures/promotion-contract-fixtures.ts';

test('Promotion payloads validate against the checked-in aggregate and NATS schemas', () => {
  assert.doesNotThrow(() => assertValid(validProposal(), proposalSchema));
  assert.doesNotThrow(() => assertValid(validDecision(), decisionSchema));
  assert.doesNotThrow(() => assertValid(validAggregate(), aggregateSchema));
});

test('schema validation rejects invalid payloads before business interpretation', () => {
  assert.throws(() => assertValid(validProposal({ discount_percent: 101 }), proposalSchema));
  assert.throws(() => assertValid(validDecision({ capability: 'promotion.propose' }), decisionSchema));
  assert.throws(() => assertValid(validAggregate({ resource_version: 0 }), aggregateSchema));
  assert.throws(() => assertValid(validProposal({ schema_version: '2.0.0' }), proposalSchema), /constant/);
});

test('additive payload fields remain consumable while incompatible fields fail', () => {
  const additive = validProposal({ extension: { source: 'future-producer', revision: 2 } });
  assert.throws(() => assertValid(additive, proposalSchema));
  assert.doesNotThrow(() => assertValid(additive, proposalSchema, true));
  assert.throws(() => assertValid(validProposal({ discount_percent: '15' }), proposalSchema, true));
});

test('duplicate delivery is bound to stable message identity and conflicting idempotency is rejected', () => {
  const original = validProposal();
  const duplicate = { ...original };
  assert.equal(fingerprint(original), fingerprint(duplicate));
  assert.equal(idempotencyConflict(
    { key: String(original.idempotency_key), fingerprint: String(original.idempotency_fingerprint) },
    { key: String(duplicate.idempotency_key), fingerprint: String(duplicate.idempotency_fingerprint) },
  ), false);
  assert.equal(idempotencyConflict(
    { key: String(original.idempotency_key), fingerprint: String(original.idempotency_fingerprint) },
    { key: String(original.idempotency_key), fingerprint: 'c'.repeat(64) },
  ), true);
});
