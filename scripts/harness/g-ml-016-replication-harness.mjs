#!/usr/bin/env node
/**
 * scripts/harness/g-ml-016-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-ML-016:
 * Four-Way Dynamic Routing State Machine
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Conformance harness on G-ML-016
 * 4. Isolated truth table test (-k test_truth_table_permutation)
 * 5. Full routing decision unit test suite
 * 6. Property test truth table combinatorial suite
 * 7. Confidence calibration integration harness
 * 8. Template parity diff check between root and template
 * 9. Proof receipt validator on G-ML-016
 * 10. Mathematical invariant proof harness on G-ML-016
 */

import { run5WhySocraticVerification } from '../agentic/g-ml-016-5why-socratic-engine.mjs';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let REPO_ROOT = path.resolve(__dirname, '../..');
if (path.basename(REPO_ROOT) === 'template') {
  REPO_ROOT = path.resolve(REPO_ROOT, '..');
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🚀 EXECUTING G-ML-016 MASTER REPLICATION HARNESS');
console.log('   Four-Way Dynamic Routing State Machine');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

// 1. Run 5-Why Dialectic Verification
console.log('▶ Stage 1: Running 5-Why Socratic Dialectic Engine...');
const socraticResult = run5WhySocraticVerification();
if (socraticResult.passedWhys !== socraticResult.totalWhys) {
  console.error('FATAL: Socratic 5-Why invariants failed.');
  process.exit(1);
}

// 2. Run Provenance Oracle & Empirical Evaluator
console.log('\n▶ Stage 2: Running Provenance Oracle & Empirical Evaluator...');
const evalProcess = spawnSync('node', ['scripts/agentic/g-ml-016-provenance-oracle-evaluator.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (evalProcess.status !== 0) {
  console.error('FATAL: Provenance oracle evaluation exited with failure.');
  process.exit(evalProcess.status || 1);
}

// 3. Run Conformance Validation on G-ML-016
console.log('\n▶ Stage 3: Running Conformance Harness on G-ML-016...');
const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-ML-016'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (confProcess.status !== 0) {
  console.error('FATAL: Goal template conformance harness failed.');
  process.exit(confProcess.status || 1);
}

// 4. Run Isolated Truth Table Verification Test (-k test_truth_table_permutation)
console.log('\n▶ Stage 4: Running Isolated Truth Table Verification Test...');
const isolatedTestProcess = spawnSync('node', ['tests/unit/test-routing-decision.mjs', '-k', 'test_truth_table_permutation'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (isolatedTestProcess.status !== 0) {
  console.error('FATAL: Isolated truth table verification test failed.');
  process.exit(isolatedTestProcess.status || 1);
}

// 5. Run Full Routing Decision Unit Test Suite
console.log('\n▶ Stage 5: Running Full Routing Decision Unit Test Suite...');
const testProcess = spawnSync('node', ['tests/unit/test-routing-decision.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (testProcess.status !== 0) {
  console.error('FATAL: Full routing decision unit test suite failed.');
  process.exit(testProcess.status || 1);
}
console.log('  ✔ Routing decision unit test suite verified: all tests passed cleanly');

// 6. Run Property Test Truth Table Combinatorial Suite
console.log('\n▶ Stage 6: Running Property Test Truth Table Combinatorial Suite...');
const propTestProcess = spawnSync('node', ['scripts/harness/property-tests/test-routing-truth-table.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (propTestProcess.status !== 0) {
  console.error('FATAL: Property test truth table suite failed.');
  process.exit(propTestProcess.status || 1);
}
console.log('  ✔ Combinatorial property tests verified: 100% green');

// 7. Run Confidence Calibration Integration Harness
console.log('\n▶ Stage 7: Running Confidence Calibration Integration Harness...');
const calibProcess = spawnSync('node', ['scripts/harness/confidence-calibration-harness.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (calibProcess.status !== 0) {
  console.error('FATAL: Confidence calibration harness failed.');
  process.exit(calibProcess.status || 1);
}
console.log('  ✔ Confidence calibration harness verified: 100% green');

// 8. Run Template Parity Diff Check
console.log('\n▶ Stage 8: Verifying Template Parity Diff Check...');
const diffProcess1 = spawnSync('diff', ['-u', 'scripts/lib/confidence-calibration.mjs', 'template/scripts/lib/confidence-calibration.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (diffProcess1.status !== 0) {
  console.error('FATAL: Template drift detected in scripts/lib/confidence-calibration.mjs!');
  process.exit(1);
}

const diffProcess2 = spawnSync('diff', ['-u', 'tests/unit/test-routing-decision.mjs', 'template/tests/unit/test-routing-decision.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (diffProcess2.status !== 0) {
  console.error('FATAL: Template drift detected in tests/unit/test-routing-decision.mjs!');
  process.exit(1);
}
console.log('  ✔ Template parity diff check verified: zero drift');

// 9. Run Proof Receipt Validator on G-ML-016
console.log('\n▶ Stage 9: Validating G-ML-016 Proof Receipt...');
const proofValidator = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', 'G-ML-016'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (proofValidator.status !== 0) {
  console.error('FATAL: Proof receipt validation failed for G-ML-016.');
  process.exit(proofValidator.status || 1);
}

// 10. Run Mathematical Invariant Proof Harness on G-ML-016
console.log('\n▶ Stage 10: Running Mathematical Invariant Proof Harness...');
const mathHarness = spawnSync('node', ['scripts/harness/mathematical-invariant-proof-harness.mjs', 'G-ML-016'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (mathHarness.status !== 0) {
  console.error('FATAL: Mathematical invariant proof harness failed for G-ML-016.');
  process.exit(mathHarness.status || 1);
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('🏆 G-ML-016 MASTER REPLICATION HARNESS: 100% GREEN ACROSS ALL 10 STAGES');
console.log('════════════════════════════════════════════════════════════════════════════════\n');
process.exit(0);
