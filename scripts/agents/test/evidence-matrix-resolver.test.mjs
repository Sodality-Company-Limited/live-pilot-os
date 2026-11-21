import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRequiredEvidence } from '../../lib/evidence-matrix-resolver.mjs';

test('resolves formal verification gates when formal profile is declared', () => {
  const res = resolveRequiredEvidence(['formal_verification', 'core'], 'feature');
  assert.ok(res.requiredGates.includes('cryptographic_proof_receipt'));
  assert.ok(res.requiredGates.includes('property_invariant_suite'));
  assert.ok(res.requiredGates.includes('smt_z3_verification'));
  assert.ok(res.requiredGates.includes('pre_execution_design_spec'));
});

test('resolves minimal evidence set for simple governance chore', () => {
  const res = resolveRequiredEvidence([], 'governance');
  assert.equal(res.requiredGates.includes('cryptographic_proof_receipt'), false);
  assert.ok(res.requiredGates.includes('unit_integration_test_green'));
  assert.ok(res.requiredGates.includes('goal_conformance_zero_deviation'));
});
