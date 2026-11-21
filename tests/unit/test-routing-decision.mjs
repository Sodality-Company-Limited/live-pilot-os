#!/usr/bin/env node
/**
 * tests/unit/test-routing-decision.mjs
 *
 * Comprehensive Unit Test Suite for Goal G-ML-016:
 * Four-Way Dynamic Routing State Machine
 *
 * Covers:
 * 1. All 8 canonical Risk x Evidence x Confidence permutations
 * 2. Boundary condition testing (0.0, 1.0, exact threshold tau)
 * 3. Configurable decision threshold tau (threshold / tau options)
 * 4. Flexible decision candidate handling (with or without answer string)
 * 5. Fail-closed input validation (null, non-object, NaN, Inf, out-of-bounds, invalid risk)
 * 6. Critical safety invariants (low-confidence never proceeds, unverified high-risk never proceeds)
 * 7. Command-line `-k` filter support for targeted test execution
 */

import assert from 'node:assert/strict';
import { routeDecision, validateDecision } from '../../scripts/lib/confidence-calibration.mjs';

const args = process.argv.slice(2);
let testFilter = null;
const kIndex = args.indexOf('-k');
if (kIndex !== -1 && args[kIndex + 1]) {
  testFilter = args[kIndex + 1].toLowerCase();
}

let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
  if (testFilter && !testName.toLowerCase().includes(testFilter)) {
    return;
  }
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✔ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${testName}: ${err.message}`);
    throw err;
  }
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🧪 RUNNING ROUTING DECISION UNIT TEST SUITE (G-ML-016)');
if (testFilter) {
  console.log(`   Applying filter: -k "${testFilter}"`);
}
console.log('════════════════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 1: 8 Canonical Truth Table Permutations
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_truth_table_permutation_1_normal_verified_high', () => {
  const decision = { answer: 'Valid claim', confidence: 0.95, evidence: ['file.txt'] };
  const action = routeDecision(decision, { risk: 'normal', evidenceVerified: true, threshold: 0.8 });
  assert.equal(action, 'proceed');
});

runTest('test_truth_table_permutation_2_normal_verified_low', () => {
  const decision = { answer: 'Uncertain claim', confidence: 0.45, evidence: ['file.txt'] };
  const action = routeDecision(decision, { risk: 'normal', evidenceVerified: true, threshold: 0.8 });
  assert.equal(action, 'verify');
});

runTest('test_truth_table_permutation_3_normal_unverified_high', () => {
  const decision = { answer: 'Unbacked high claim', confidence: 0.90, evidence: [] };
  const action = routeDecision(decision, { risk: 'normal', evidenceVerified: false, threshold: 0.8 });
  assert.equal(action, 'verify');
});

runTest('test_truth_table_permutation_4_normal_unverified_low', () => {
  const decision = { answer: 'Unbacked low claim', confidence: 0.30, evidence: [] };
  const action = routeDecision(decision, { risk: 'normal', evidenceVerified: false, threshold: 0.8 });
  assert.equal(action, 'verify');
});

runTest('test_truth_table_permutation_5_high_verified_high', () => {
  const decision = { answer: 'High risk claim', confidence: 0.92, evidence: ['audit.txt'], riskLevel: 'high' };
  const action = routeDecision(decision, { risk: 'high', evidenceVerified: true, threshold: 0.8 });
  assert.equal(action, 'human_review');
});

runTest('test_truth_table_permutation_6_high_verified_low', () => {
  const decision = { answer: 'High risk low conf', confidence: 0.50, evidence: ['audit.txt'], riskLevel: 'high' };
  const action = routeDecision(decision, { risk: 'high', evidenceVerified: true, threshold: 0.8 });
  assert.equal(action, 'defer');
});

runTest('test_truth_table_permutation_7_high_unverified_high', () => {
  const decision = { answer: 'High risk unverified high', confidence: 0.98, evidence: [], riskLevel: 'high' };
  const action = routeDecision(decision, { risk: 'high', evidenceVerified: false, threshold: 0.8 });
  assert.equal(action, 'defer');
});

runTest('test_truth_table_permutation_8_high_unverified_low', () => {
  const decision = { answer: 'High risk unverified low', confidence: 0.20, evidence: [], riskLevel: 'high' };
  const action = routeDecision(decision, { risk: 'high', evidenceVerified: false, threshold: 0.8 });
  assert.equal(action, 'defer');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 2: Boundary Threshold Values
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_boundary_exact_threshold_transition', () => {
  const decAtThreshold = { answer: 'Boundary', confidence: 0.80, evidence: ['doc.md'] };
  assert.equal(routeDecision(decAtThreshold, { evidenceVerified: true, threshold: 0.80 }), 'proceed');

  const decJustBelow = { answer: 'Boundary', confidence: 0.7999, evidence: ['doc.md'] };
  assert.equal(routeDecision(decJustBelow, { evidenceVerified: true, threshold: 0.80 }), 'verify');

  const decJustAbove = { answer: 'Boundary', confidence: 0.8001, evidence: ['doc.md'] };
  assert.equal(routeDecision(decJustAbove, { evidenceVerified: true, threshold: 0.80 }), 'proceed');
});

runTest('test_boundary_extremes_zero_and_one', () => {
  const zeroConf = { answer: 'Zero', confidence: 0.0, evidence: ['doc.md'] };
  assert.equal(routeDecision(zeroConf, { evidenceVerified: true, threshold: 0.80 }), 'verify');

  const oneConf = { answer: 'Certain', confidence: 1.0, evidence: ['doc.md'] };
  assert.equal(routeDecision(oneConf, { evidenceVerified: true, threshold: 0.80 }), 'proceed');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 3: Configurable Threshold (tau option)
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_configurable_threshold_tau', () => {
  const dec = { answer: 'Custom tau', confidence: 0.65, evidence: ['doc.md'] };
  // Default tau 0.8 -> verify
  assert.equal(routeDecision(dec, { evidenceVerified: true }), 'verify');
  // Lower tau 0.6 -> proceed
  assert.equal(routeDecision(dec, { evidenceVerified: true, tau: 0.60 }), 'proceed');
  // Higher tau 0.9 -> verify
  assert.equal(routeDecision(dec, { evidenceVerified: true, tau: 0.90 }), 'verify');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 4: Flexible Decision Ingestion
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_flexible_ingestion_without_answer_string', () => {
  const rawTuple = { confidence: 0.95, evidence: ['receipt.json'], riskLevel: 'normal' };
  const action = routeDecision(rawTuple);
  assert.equal(action, 'proceed');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 5: Fail-Closed Input Validation
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_fail_closed_null_or_non_object', () => {
  assert.throws(() => routeDecision(null), { name: 'TypeError' });
  assert.throws(() => routeDecision(undefined), { name: 'TypeError' });
  assert.throws(() => routeDecision('string-not-object'), { name: 'TypeError' });
  assert.throws(() => routeDecision(123), { name: 'TypeError' });
  assert.throws(() => routeDecision([]), { name: 'TypeError' });
});

runTest('test_fail_closed_non_finite_confidence', () => {
  assert.throws(() => routeDecision({ answer: 'bad', confidence: NaN, evidence: [] }), { name: 'TypeError' });
  assert.throws(() => routeDecision({ answer: 'bad', confidence: Infinity, evidence: [] }), { name: 'TypeError' });
  assert.throws(() => routeDecision({ answer: 'bad', confidence: -Infinity, evidence: [] }), { name: 'TypeError' });
});

runTest('test_fail_closed_out_of_bounds_confidence', () => {
  assert.throws(() => routeDecision({ answer: 'bad', confidence: -0.01, evidence: [] }), { name: 'RangeError' });
  assert.throws(() => routeDecision({ answer: 'bad', confidence: 1.01, evidence: [] }), { name: 'RangeError' });
});

runTest('test_fail_closed_invalid_risk_level', () => {
  assert.throws(() => routeDecision({ answer: 'bad', confidence: 0.9, evidence: [], riskLevel: 'invalid-risk' }), { name: 'TypeError' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 6: Critical Safety Invariants
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_critical_safety_invariants', () => {
  // Invariant 1: Unverified high-risk must NEVER proceed
  assert.notEqual(routeDecision({ answer: 'Danger', confidence: 1.0, evidence: [], riskLevel: 'high' }, { evidenceVerified: false }), 'proceed');
  assert.notEqual(routeDecision({ answer: 'Danger', confidence: 1.0, evidence: ['ref'], riskLevel: 'high' }, { evidenceVerified: false }), 'proceed');

  // Invariant 2: Low confidence must NEVER proceed
  assert.notEqual(routeDecision({ answer: 'Weak', confidence: 0.1, evidence: ['ref'], riskLevel: 'normal' }, { evidenceVerified: true }), 'proceed');
  assert.notEqual(routeDecision({ answer: 'Weak', confidence: 0.79, evidence: ['ref'], riskLevel: 'normal' }, { evidenceVerified: true }), 'proceed');

  // Invariant 3: High-risk high-confidence must NEVER proceed autonomously without human review
  assert.notEqual(routeDecision({ answer: 'Deploy', confidence: 0.99, evidence: ['spec.pdf'], riskLevel: 'high' }, { evidenceVerified: true }), 'proceed');
  assert.equal(routeDecision({ answer: 'Deploy', confidence: 0.99, evidence: ['spec.pdf'], riskLevel: 'high' }, { evidenceVerified: true }), 'human_review');
});

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`📊 Summary: ${passedTests} / ${totalTests} Tests Passed (100.0%)`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
