import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTddRequirement, validateStepTddSequence } from '../../lib/tdd-lifecycle-checker.mjs';

test('mandates strict TDD for feature with core profile', () => {
  const contract = { kind: 'feature', profiles: ['core'] };
  const res = evaluateTddRequirement(contract);
  assert.equal(res.strictTddRequired, true);
  assert.equal(res.protocol, 'RED_GREEN_REFACTOR');
});

test('allows spec-first verification for governance kind', () => {
  const contract = { kind: 'governance', profiles: [] };
  const res = evaluateTddRequirement(contract);
  assert.equal(res.strictTddRequired, false);
  assert.equal(res.protocol, 'SPEC_VERIFICATION_FIRST');
});

test('blocks implementation step if test does not exist beforehand in strict TDD', () => {
  const contract = { kind: 'api', profiles: ['core'] };
  const seqRes = validateStepTddSequence(contract, 'IMPLEMENT_CODE', false);
  assert.equal(seqRes.valid, false);
  assert.ok(seqRes.error.includes('TDD Invariant Violation'));
});

test('permits implementation step if test exists beforehand in strict TDD', () => {
  const contract = { kind: 'api', profiles: ['core'] };
  const seqRes = validateStepTddSequence(contract, 'IMPLEMENT_CODE', true);
  assert.equal(seqRes.valid, true);
});
