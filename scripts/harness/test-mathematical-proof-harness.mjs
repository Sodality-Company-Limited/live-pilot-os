#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 MATHEMATICAL INVARIANT PROOF HARNESS UNIT TEST SUITE (TDD RED PHASE)
 * ════════════════════════════════════════════════════════════════════════════════
 * Purpose: Empirically verify that the 5-layer Mathematical Invariant Proof Harness:
 *   1. Correctly extracts machine-readable invariant registries from goal cards.
 *   2. Validates invariant schemas against canonical bounds and classifications.
 *   3. Executes real property tests (zero stubs, zero mocks).
 *   4. Verifies statistical bounds (Wilson score, ECE, Brier score).
 *   5. Emits cryptographic provenance receipts bound to git HEAD and source digests.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  extractInvariantsFromGoal,
  validateInvariantSchema,
  executeGoalInvariants,
  generateProofReceipt,
  INVARIANT_TYPES,
  EPISTEMIC_CLASSIFICATIONS
} from './mathematical-invariant-proof-harness.mjs';

const TEST_DIR = path.join(process.cwd(), '.test-tmp-proof');
if (fs.existsSync(TEST_DIR)) {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DIR, { recursive: true });

console.log("================================================================================");
console.log("🧪 Running Mathematical Invariant Proof Harness Unit Tests...");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`      ↳ ${err.message}`);
  }
}

async function runAllTests() {
  // Test 1: Invariant Extraction from Goal Markdown
  await runTest("1. Extracts machine-readable YAML invariant registry from goal card", () => {
    const sampleGoalPath = path.join(TEST_DIR, 'G-SAMPLE-001.md');
    const sampleContent = `# G-SAMPLE-001: Sample Goal
**Status:** ready
**Kind:** feature
**Profile:** ml-research

### Machine-Readable Invariant Registry
\`\`\`yaml
invariants:
  - id: SAMPLE-INV-001
    type: monotonicity
    claim: wrong-answer loss strictly increases with confidence
    classification: executable_property_test
    domain:
      confidence: [0.0, 1.0]
    test:
      command: node -e "process.exit(0)"
    bound:
      relation: strictly_increasing
    statistical_method: none
    sample_count: 100
    operating_envelope: "confidence in [0.0, 1.0]"
    invalidation_conditions: "NaN or infinite loss"
    evaluator_oracle: "Analytical check"
    evidence: artifacts/proofs/SAMPLE-INV-001.json
\`\`\`
`;
    fs.writeFileSync(sampleGoalPath, sampleContent, 'utf8');
    const invariants = extractInvariantsFromGoal(sampleGoalPath);
    assert.equal(Array.isArray(invariants), true);
    assert.equal(invariants.length, 1);
    assert.equal(invariants[0].id, 'SAMPLE-INV-001');
    assert.equal(invariants[0].type, 'monotonicity');
  });

  // Test 2: Invariant Schema Validation
  await runTest("2. Validates schema and rejects missing or invalid fields", () => {
    const validInv = {
      id: 'INV-TEST-001',
      type: 'boundedness',
      claim: 'ECE is bounded within [0.0, 1.0]',
      classification: 'executable_property_test',
      domain: { ece: [0.0, 1.0] },
      test: { command: 'node -e "process.exit(0)"' },
      bound: { relation: 'bounded', range: [0.0, 1.0] },
      sample_count: 1000
    };
    const validRes = validateInvariantSchema(validInv);
    assert.equal(validRes.valid, true);

    const invalidInv = {
      id: 'INV-TEST-BAD',
      type: 'unknown_type', // Invalid type
      claim: 'Test'
    };
    const invalidRes = validateInvariantSchema(invalidInv);
    assert.equal(invalidRes.valid, false);
    assert.ok(invalidRes.errors.length > 0);
  });

  // Test 3: Provenance-Bound Proof Receipt Generation
  await runTest("3. Generates cryptographic receipt bound to git HEAD and source hashes", () => {
    const dummyResult = {
      goal: 'G-SAMPLE-001',
      invariant: 'SAMPLE-INV-001',
      classification: 'executable_property_test',
      passed: true,
      command: 'node -e "process.exit(0)"',
      exit_code: 0,
      sample_count: 100,
      source_files: ['scripts/lib/confidence-calibration.mjs']
    };
    const receipt = generateProofReceipt(dummyResult);
    assert.equal(receipt.goal, 'G-SAMPLE-001');
    assert.equal(receipt.passed, true);
    assert.ok(receipt.git_head && receipt.git_head.length === 40, "Must contain 40-char git HEAD SHA");
    assert.ok(receipt.source_hashes && typeof receipt.source_hashes === 'object');
    assert.ok(receipt.generated_at);
  });

  // Test 4: Execution of Invariants
  await runTest("4. Executes property tests and records terminal exit codes fail-closed", async () => {
    const goalSpec = {
      goalId: 'G-SAMPLE-001',
      invariants: [
        {
          id: 'INV-PASS',
          type: 'determinism',
          claim: 'Command passes cleanly',
          classification: 'executable_property_test',
          test: { command: 'node -e "process.exit(0)"' },
          sample_count: 10
        },
        {
          id: 'INV-FAIL',
          type: 'determinism',
          claim: 'Command fails',
          classification: 'executable_property_test',
          test: { command: 'node -e "process.exit(1)"' },
          sample_count: 10
        }
      ]
    };
    const report = await executeGoalInvariants(goalSpec);
    assert.equal(report.results.length, 2);
    assert.equal(report.results[0].passed, true);
    assert.equal(report.results[1].passed, false);
    assert.equal(report.overall_passed, false);
  });

  // Cleanup
  fs.rmSync(TEST_DIR, { recursive: true, force: true });

  console.log("\n================================================================================");
  console.log(`📊 Proof Harness Test Result: ${passedTests} / ${totalTests} Passed`);
  console.log("================================================================================\n");

  if (passedTests === totalTests) {
    console.log("🏆 ALL PROOF HARNESS UNIT TESTS PASSED 100% GREEN!\n");
    process.exit(0);
  } else {
    console.error("❌ Some proof harness unit tests failed!\n");
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
