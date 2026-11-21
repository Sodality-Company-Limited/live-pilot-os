#!/usr/bin/env node
/**
 * scripts/harness/g-ml-013-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-ML-013:
 * Trained-Model Runtime Adapter Contract
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Conformance harness on G-ML-013
 * 4. Integration test suite execution on tests/integration/test-model-adapter.mjs
 * 5. Proof receipt validator on G-ML-013
 * 6. Mathematical invariant proof harness on G-ML-013
 */

import { run5WhySocraticVerification } from '../agentic/g-ml-013-5why-socratic-engine.mjs';
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
console.log('🚀 EXECUTING G-ML-013 MASTER REPLICATION HARNESS');
console.log('   Trained-Model Runtime Adapter Contract');
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
const evalProcess = spawnSync('node', ['scripts/agentic/g-ml-013-provenance-oracle-evaluator.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (evalProcess.status !== 0) {
  console.error('FATAL: Provenance oracle evaluation exited with failure.');
  process.exit(evalProcess.status || 1);
}

// 3. Run Conformance Validation on G-ML-013
console.log('\n▶ Stage 3: Running Conformance Harness on G-ML-013...');
const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-ML-013'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (confProcess.status !== 0) {
  console.error('FATAL: Goal template conformance harness failed.');
  process.exit(confProcess.status || 1);
}

// 4. Run Integration Test Suite
console.log('\n▶ Stage 4: Running Model Adapter Live Integration Test Suite...');
const testProcess = spawnSync('node', ['tests/integration/test-model-adapter.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (testProcess.status !== 0) {
  console.error('FATAL: Integration test suite tests/integration/test-model-adapter.mjs failed.');
  process.exit(testProcess.status || 1);
}
console.log('  ✔ Model adapter integration test suite verified: all tests passed cleanly');

// 5. Run Proof Receipt Validator
console.log('\n▶ Stage 5: Running Proof Receipt Validator on G-ML-013...');
const receiptPath = path.join(REPO_ROOT, 'docs/07-backlog/evidence/G-ML-013-proof-receipt.json');
const validatorProcess = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', receiptPath], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (validatorProcess.status !== 0) {
  console.error('FATAL: Proof receipt validation failed.');
  process.exit(validatorProcess.status || 1);
}

// 6. Run Mathematical Invariant Proof Harness
console.log('\n▶ Stage 6: Running Mathematical Invariant Proof Harness on G-ML-013...');
const mathProcess = spawnSync('node', ['scripts/harness/mathematical-invariant-proof-harness.mjs', 'G-ML-013'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (mathProcess.status !== 0) {
  console.error('FATAL: Mathematical invariant proof harness failed.');
  process.exit(mathProcess.status || 1);
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('🏆 G-ML-013 MASTER REPLICATION HARNESS: 100% GREEN (ALL 6 STAGES PASS)');
console.log('════════════════════════════════════════════════════════════════════════════════\n');
process.exit(0);
