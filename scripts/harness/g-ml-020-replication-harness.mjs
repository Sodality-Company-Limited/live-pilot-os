#!/usr/bin/env node
/**
 * scripts/harness/g-ml-020-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-ML-020:
 * CI Calibration Gate and Quality Policy Enforcement
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Conformance harness on G-ML-020
 * 4. Full CI calibration gate unit test suite
 * 5. Clean module import verification (root & template)
 * 6. Template parity diff check between root and template
 * 7. Proof receipt validator on G-ML-020
 * 8. Bare CI gate execution (exit 0)
 * 9. Failing scorecard SLA breach rejection (exit 1)
 */

import { run5WhySocraticVerification } from '../agentic/g-ml-020-5why-socratic-engine.mjs';
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
console.log('🚀 EXECUTING G-ML-020 MASTER REPLICATION HARNESS');
console.log('   CI Calibration Gate and Quality Policy Enforcement');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

async function main() {
  // 1. Run 5-Why Dialectic Verification
  console.log('▶ Stage 1: Running 5-Why Socratic Dialectic Engine...');
  const socraticResult = await run5WhySocraticVerification();
  if (socraticResult.verifiedWhys !== socraticResult.totalWhys) {
    console.error('FATAL: Socratic 5-Why invariants failed.');
    process.exit(1);
  }

  // 2. Run Provenance Oracle & Empirical Evaluator
  console.log('\n▶ Stage 2: Running Provenance Oracle & Empirical Evaluator...');
  const evalProcess = spawnSync('node', ['scripts/agentic/g-ml-020-provenance-oracle-evaluator.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (evalProcess.status !== 0) {
    console.error('FATAL: Provenance oracle evaluation exited with failure.');
    process.exit(evalProcess.status || 1);
  }

  // 3. Run Conformance Validation on G-ML-020
  console.log('\n▶ Stage 3: Running Conformance Harness on G-ML-020...');
  const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-ML-020'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (confProcess.status !== 0) {
    console.error('FATAL: Goal template conformance harness failed.');
    process.exit(confProcess.status || 1);
  }

  // 4. Run Full CI Calibration Gate Unit Test Suite
  console.log('\n▶ Stage 4: Running Full CI Calibration Gate Unit Test Suite...');
  const unitTestProcess = spawnSync('node', ['tests/unit/test-ci-calibration-gate.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (unitTestProcess.status !== 0) {
    console.error('FATAL: CI calibration gate unit test suite failed.');
    process.exit(unitTestProcess.status || 1);
  }
  console.log('  ✔ CI calibration gate unit test suite verified: all tests passed cleanly');

  // 5. Clean Module Import Verification
  console.log('\n▶ Stage 5: Running Clean Module Import Verification...');
  const importCheck = spawnSync('node', ['-e', 'import("./scripts/ci/ci-calibration-gate.mjs")'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });
  if (importCheck.status !== 0) {
    console.error('FATAL: Clean module import failed.');
    process.exit(importCheck.status || 1);
  }

  const templateImportCheck = spawnSync('node', ['-e', 'import("./template/scripts/ci/ci-calibration-gate.mjs")'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });
  if (templateImportCheck.status !== 0) {
    console.error('FATAL: Template clean module import failed.');
    process.exit(templateImportCheck.status || 1);
  }
  console.log('  ✔ Module import verification passed cleanly');

  // 6. Verify Template Parity Diff Check
  console.log('\n▶ Stage 6: Verifying Template Parity Diff Check...');
  const filesToDiff = [
    ['scripts/ci/ci-calibration-gate.mjs', 'template/scripts/ci/ci-calibration-gate.mjs'],
    ['.github/workflows/calibration-gate.yml', 'template/.github/workflows/calibration-gate.yml'],
    ['tests/unit/test-ci-calibration-gate.mjs', 'template/tests/unit/test-ci-calibration-gate.mjs'],
    ['scripts/agentic/g-ml-020-5why-socratic-engine.mjs', 'template/scripts/agentic/g-ml-020-5why-socratic-engine.mjs'],
    ['scripts/agentic/g-ml-020-provenance-oracle-evaluator.mjs', 'template/scripts/agentic/g-ml-020-provenance-oracle-evaluator.mjs']
  ];

  for (const [src, dst] of filesToDiff) {
    const diff = spawnSync('diff', ['-u', path.join(REPO_ROOT, src), path.join(REPO_ROOT, dst)], { encoding: 'utf8' });
    if (diff.status !== 0) {
      console.error(`FATAL: Template parity diff failed for ${src} and ${dst}:\n${diff.stdout}`);
      process.exit(1);
    }
  }
  console.log('  ✔ Template parity diff check verified: zero drift');

  // 7. Validate G-ML-020 Proof Receipt
  console.log('\n▶ Stage 7: Validating G-ML-020 Proof Receipt...');
  const receiptValidatorProcess = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', 'G-ML-020'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (receiptValidatorProcess.status !== 0) {
    console.error('FATAL: Proof receipt validation failed for G-ML-020.');
    process.exit(receiptValidatorProcess.status || 1);
  }

  // 8. Verify Bare Gate Runner (Pass Baseline)
  console.log('\n▶ Stage 8: Verifying Bare Gate Runner Execution (Exit 0)...');
  const bareProc = spawnSync('node', ['scripts/ci/ci-calibration-gate.mjs'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  if (bareProc.status !== 0) {
    console.error(`FATAL: Bare gate runner exited with code ${bareProc.status}`);
    process.exit(1);
  }
  console.log('  ✔ Bare gate runner successfully passed with exit code 0');

  // 9. Verify SLA Breach Rejection (Exit 1)
  console.log('\n▶ Stage 9: Verifying Failing Scorecard Rejection (Exit 1)...');
  const failProc = spawnSync('node', ['scripts/ci/ci-calibration-gate.mjs', '-a', 'artifacts/eval/calibration_scorecard.json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  if (failProc.status !== 1) {
    console.error(`FATAL: Expected exit code 1 on failing scorecard, got ${failProc.status}`);
    process.exit(1);
  }
  console.log('  ✔ SLA breach properly rejected with exit code 1');

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('🏆 G-ML-020 MASTER REPLICATION HARNESS: 100% GREEN ACROSS ALL 9 STAGES');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal error in replication harness:', err);
  process.exit(1);
});
