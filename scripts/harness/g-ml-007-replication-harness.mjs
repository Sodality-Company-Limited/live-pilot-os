#!/usr/bin/env node
/**
 * scripts/harness/g-ml-007-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-ML-007:
 * Parameter-Efficient LoRA/QLoRA Training Pipeline
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Conformance harness on G-ML-007
 * 4. Pytest execution on tests/ml/test_training_pipeline.py
 * 5. Proof receipt validator on G-ML-007
 * 6. Mathematical invariant proof harness on G-ML-007
 */

import { run5WhySocraticVerification } from '../agentic/g-ml-007-5why-socratic-engine.mjs';
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
console.log('🚀  EXECUTING G-ML-007 MASTER REPLICATION HARNESS');
console.log('    Parameter-Efficient LoRA/QLoRA Training Pipeline');
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
const evalProcess = spawnSync('node', ['scripts/agentic/g-ml-007-provenance-oracle-evaluator.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (evalProcess.status !== 0) {
  console.error('FATAL: Provenance oracle evaluation exited with failure.');
  process.exit(evalProcess.status || 1);
}

// 3. Run Conformance Validation on G-ML-007
console.log('\n▶ Stage 3: Running Conformance Harness on G-ML-007...');
const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-ML-007'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (confProcess.status !== 0) {
  console.error('FATAL: Conformance validation on G-ML-007 failed.');
  process.exit(confProcess.status || 1);
}

// 4. Run Pytest Suite Validation
console.log('\n▶ Stage 4: Running Pytest Test Suite...');
const pytestProcess = spawnSync('pytest', ['tests/ml/test_training_pipeline.py'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (pytestProcess.status !== 0) {
  console.error('FATAL: Pytest suite execution failed.');
  process.exit(pytestProcess.status || 1);
}
console.log('  ✔ Pytest test suite verified: tests passed cleanly');

// 5. Run Proof Receipt Validator on G-ML-007
console.log('\n▶ Stage 5: Running Proof Receipt Validator on G-ML-007...');
const receiptRel = 'docs/07-backlog/evidence/G-ML-007-proof-receipt.json';
const receiptProcess = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', receiptRel], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (receiptProcess.status !== 0) {
  console.error('FATAL: Proof receipt validator exited with failure.');
  process.exit(receiptProcess.status || 1);
}

// 6. Run Mathematical Invariant Proof Harness on G-ML-007
console.log('\n▶ Stage 6: Running Mathematical Invariant Proof Harness on G-ML-007...');
const mathProcess = spawnSync('node', ['scripts/harness/mathematical-invariant-proof-harness.mjs', 'G-ML-007'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (mathProcess.status !== 0) {
  console.error('FATAL: Mathematical invariant proof harness failed.');
  process.exit(mathProcess.status || 1);
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('🏆 G-ML-007 MASTER REPLICATION HARNESS: 100% GREEN (ALL 6 STAGES PASS)');
console.log('════════════════════════════════════════════════════════════════════════════════\n');
process.exit(0);
