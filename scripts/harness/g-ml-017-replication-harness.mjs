#!/usr/bin/env node
/**
 * scripts/harness/g-ml-017-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-ML-017:
 * Model-Provider and Checkpoint Configuration Subsystem
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Conformance harness on G-ML-017
 * 4. Isolated health check test (-k test_health_check)
 * 5. Full model configuration unit test suite
 * 6. Module import verification
 * 7. Template parity diff check between root and template
 * 8. Proof receipt validator on G-ML-017
 * 9. Mathematical invariant proof harness on G-ML-017
 */

import { run5WhySocraticVerification } from '../agentic/g-ml-017-5why-socratic-engine.mjs';
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
console.log('🚀 EXECUTING G-ML-017 MASTER REPLICATION HARNESS');
console.log('   Model-Provider and Checkpoint Configuration Subsystem');
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
const evalProcess = spawnSync('node', ['scripts/agentic/g-ml-017-provenance-oracle-evaluator.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (evalProcess.status !== 0) {
  console.error('FATAL: Provenance oracle evaluation exited with failure.');
  process.exit(evalProcess.status || 1);
}

// 3. Run Conformance Validation on G-ML-017
console.log('\n▶ Stage 3: Running Conformance Harness on G-ML-017...');
const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-ML-017'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (confProcess.status !== 0) {
  console.error('FATAL: Goal template conformance harness failed.');
  process.exit(confProcess.status || 1);
}

// 4. Run Isolated Health Check Test (-k test_health_check)
console.log('\n▶ Stage 4: Running Isolated Health Check Test...');
const isolatedTestProcess = spawnSync('node', ['tests/unit/test-model-config.mjs', '-k', 'test_health_check'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (isolatedTestProcess.status !== 0) {
  console.error('FATAL: Isolated health check test failed.');
  process.exit(isolatedTestProcess.status || 1);
}

// 5. Run Full Model Configuration Unit Test Suite
console.log('\n▶ Stage 5: Running Full Model Configuration Unit Test Suite...');
const testProcess = spawnSync('node', ['tests/unit/test-model-config.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (testProcess.status !== 0) {
  console.error('FATAL: Full model configuration unit test suite failed.');
  process.exit(testProcess.status || 1);
}
console.log('  ✔ Model configuration unit test suite verified: all tests passed cleanly');

// 6. Run Module Import Verification
console.log('\n▶ Stage 6: Running Clean Module Import Verification...');
const importProcess = spawnSync('node', ['-e', "import('./scripts/lib/model-config.mjs')"], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (importProcess.status !== 0) {
  console.error('FATAL: Clean module import verification failed.');
  process.exit(importProcess.status || 1);
}
console.log('  ✔ Module import verification passed cleanly');

// 7. Verify Template Parity Diff Check
console.log('\n▶ Stage 7: Verifying Template Parity Diff Check...');
const diffProcess = spawnSync('diff', ['-u', 'scripts/lib/model-config.mjs', 'template/scripts/lib/model-config.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (diffProcess.status !== 0) {
  console.error('FATAL: Template drift detected between root and template scripts/lib/model-config.mjs');
  process.exit(diffProcess.status || 1);
}
console.log('  ✔ Template parity diff check verified: zero drift');

// 8. Validate G-ML-017 Proof Receipt
console.log('\n▶ Stage 8: Validating G-ML-017 Proof Receipt...');
const receiptProcess = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', 'G-ML-017'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (receiptProcess.status !== 0) {
  console.error('FATAL: Proof receipt validation failed for G-ML-017.');
  process.exit(receiptProcess.status || 1);
}

// 9. Run Mathematical Invariant Proof Harness
console.log('\n▶ Stage 9: Running Mathematical Invariant Proof Harness...');
const mathProcess = spawnSync('node', ['scripts/harness/mathematical-invariant-proof-harness.mjs', 'G-ML-017'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (mathProcess.status !== 0) {
  console.error('FATAL: Mathematical invariant proof harness failed for G-ML-017.');
  process.exit(mathProcess.status || 1);
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('🏆 G-ML-017 MASTER REPLICATION HARNESS: 100% GREEN ACROSS ALL 9 STAGES');
console.log('════════════════════════════════════════════════════════════════════════════════\n');
