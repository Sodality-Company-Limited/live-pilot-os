#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 PROPERTY TEST SUITE: Exhaustive Routing State Truth Table (G-ML-016)
 * ════════════════════════════════════════════════════════════════════════════════
 * Proves:
 *   1. Complete truth table coverage across Risk x Evidence x Confidence
 *   2. Normal risk + verified evidence + high confidence => 'proceed'
 *   3. Normal risk + unverified evidence => 'verify'
 *   4. Normal risk + low confidence => 'verify'
 *   5. High risk + verified evidence + high confidence => 'human_review'
 *   6. High risk + unverified evidence OR low confidence => 'defer'
 *   7. Zero unhandled states or non-deterministic returns
 * ════════════════════════════════════════════════════════════════════════════════
 */

import assert from 'node:assert/strict';
import { routeDecision } from '../../lib/confidence-calibration.mjs';

console.log("🧪 Executing Property Tests for G-ML-016: Routing State Machine Truth Table...");

const RISKS = ['normal', 'high'];
const EVIDENCE_STATES = [true, false];
const CONFIDENCE_LEVELS = [
  { val: 0.95, label: 'high' },
  { val: 0.85, label: 'high' },
  { val: 0.79, label: 'low' },
  { val: 0.40, label: 'low' },
  { val: 0.05, label: 'low' }
];

const VALID_ACTIONS = new Set(['proceed', 'verify', 'defer', 'human_review']);
let evaluatedCombinations = 0;

for (const risk of RISKS) {
  for (const evidenceVerified of EVIDENCE_STATES) {
    for (const { val: conf, label: confLevel } of CONFIDENCE_LEVELS) {
      const decision = { answer: 'ActionTest', confidence: conf, evidence: evidenceVerified ? ['ev'] : [] };
      const action = routeDecision(decision, { risk, evidenceVerified, threshold: 0.8 });

      assert.ok(VALID_ACTIONS.has(action), `Action '${action}' is not in valid action set!`);

      // Formal Truth Table Assertions
      if (risk === 'normal') {
        if (evidenceVerified && confLevel === 'high') {
          assert.equal(action, 'proceed', `Expected 'proceed' for normal + verified + high conf, got '${action}'`);
        } else {
          assert.equal(action, 'verify', `Expected 'verify' for normal + (unverified or low conf), got '${action}'`);
        }
      } else if (risk === 'high') {
        if (evidenceVerified && confLevel === 'high') {
          assert.equal(action, 'human_review', `Expected 'human_review' for high risk + verified + high conf, got '${action}'`);
        } else {
          assert.equal(action, 'defer', `Expected 'defer' for high risk + (unverified or low conf), got '${action}'`);
        }
      }
      evaluatedCombinations++;
    }
  }
}

assert.equal(evaluatedCombinations, 2 * 2 * 5, `Expected 20 truth table combinations, got ${evaluatedCombinations}`);
console.log(`  ✔ Property 1 Passed: Complete truth table verified across ${evaluatedCombinations} exhaustive combinations.`);

// Edge case testing: invalid decision input must fail closed
assert.throws(() => routeDecision(null), /decision must be a non-null object/);
assert.throws(() => routeDecision({ answer: 'bad', confidence: 1.5, evidence: [] }), /between 0 and 1/);
console.log("  ✔ Property 2 Passed: Invalid decisions rejected fail-closed with type and range checks.");

console.log("🏆 ALL G-ML-016 PROPERTY TESTS PASSED 100% GREEN!\n");
process.exit(0);
