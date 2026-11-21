#!/usr/bin/env node
/**
 * scripts/harness/g-ml-021-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-ML-021:
 * Model Regression and Integration Test Harness
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5, 25 invariants)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Conformance harness on G-ML-021
 * 4. Full E2E test suite (tests/e2e/test-calibrated-agent-workflow.mjs)
 * 5. Isolated missing evidence route check (-k test_missing_evidence)
 * 6. Clean module import verification (root & template)
 * 7. Template parity diff check between root and template
 * 8. Mathematical invariant proof on G-ML-021
 * 9. Dry-run CLI execution (exit 0)
 * 10. Full 5-scenario integration battery (exit 0)
 */

import { run5WhySocraticVerification } from '../agentic/g-ml-021-5why-socratic-engine.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let REPO_ROOT = path.resolve(__dirname, '../..');
if (path.basename(REPO_ROOT) === 'template') {
  REPO_ROOT = path.resolve(REPO_ROOT, '..');
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🚀 EXECUTING G-ML-021 MASTER REPLICATION HARNESS');
console.log('   Model Regression and Integration Test Harness');
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
  const evalProcess = spawnSync('node', ['scripts/agentic/g-ml-021-provenance-oracle-evaluator.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (evalProcess.status !== 0) {
    console.error('FATAL: Provenance oracle evaluation exited with failure.');
    process.exit(evalProcess.status || 1);
  }

  // 3. Run Conformance Validation on G-ML-021
  console.log('\n▶ Stage 3: Running Conformance Harness on G-ML-021...');
  const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-ML-021'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (confProcess.status !== 0) {
    console.error('FATAL: Goal template conformance harness failed.');
    process.exit(confProcess.status || 1);
  }

  // 4. Run Full E2E Test Suite
  console.log('\n▶ Stage 4: Running Full Calibrated Agent Workflow E2E Test Suite...');
  const e2eProcess = spawnSync('node', ['tests/e2e/test-calibrated-agent-workflow.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (e2eProcess.status !== 0) {
    console.error('FATAL: E2E test suite failed.');
    process.exit(e2eProcess.status || 1);
  }
  console.log('  ✔ E2E test suite verified: all tests passed cleanly');

  // 5. Run Isolated Missing Evidence Route Check
  console.log('\n▶ Stage 5: Running Isolated Missing Evidence Route Check (-k test_missing_evidence)...');
  const isolatedProcess = spawnSync('node', ['tests/e2e/test-calibrated-agent-workflow.mjs', '-k', 'test_missing_evidence'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (isolatedProcess.status !== 0) {
    console.error('FATAL: Isolated missing evidence route check failed.');
    process.exit(isolatedProcess.status || 1);
  }
  console.log('  ✔ Isolated missing evidence route check passed cleanly');

  // 6. Clean Module Import Verification
  console.log('\n▶ Stage 6: Running Clean Module Import Verification...');
  const importCheck = spawnSync('node', ['-e', 'import("./scripts/harness/agent-workflow-harness.mjs")'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });
  if (importCheck.status !== 0) {
    console.error('FATAL: Clean module import failed.');
    process.exit(importCheck.status || 1);
  }

  const templateImportCheck = spawnSync('node', ['-e', 'import("./template/scripts/harness/agent-workflow-harness.mjs")'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });
  if (templateImportCheck.status !== 0) {
    console.error('FATAL: Template clean module import failed.');
    process.exit(templateImportCheck.status || 1);
  }
  console.log('  ✔ Module import verification passed cleanly');

  // 7. Verify Template Parity Diff Check
  console.log('\n▶ Stage 7: Verifying Template Parity Diff Check...');
  const filesToDiff = [
    ['scripts/harness/agent-workflow-harness.mjs', 'template/scripts/harness/agent-workflow-harness.mjs'],
    ['tests/e2e/test-calibrated-agent-workflow.mjs', 'template/tests/e2e/test-calibrated-agent-workflow.mjs'],
    ['scripts/agentic/g-ml-021-5why-socratic-engine.mjs', 'template/scripts/agentic/g-ml-021-5why-socratic-engine.mjs'],
    ['scripts/agentic/g-ml-021-provenance-oracle-evaluator.mjs', 'template/scripts/agentic/g-ml-021-provenance-oracle-evaluator.mjs'],
    ['docs/02-product/acceptance/G-ML-021.md', 'template/docs/02-product/acceptance/G-ML-021.md'],
    ['docs/07-backlog/clarifications/CLARIFICATION-G-ML-021.md', 'template/docs/07-backlog/clarifications/CLARIFICATION-G-ML-021.md']
  ];

  for (const [src, dst] of filesToDiff) {
    const diff = spawnSync('diff', ['-u', path.join(REPO_ROOT, src), path.join(REPO_ROOT, dst)], { encoding: 'utf8' });
    if (diff.status !== 0) {
      console.error(`FATAL: Template parity diff failed for ${src} and ${dst}:\n${diff.stdout}`);
      process.exit(1);
    }
  }
  console.log('  ✔ Template parity diff check verified: zero drift');

  // 8. Validate Invariant Proof Receipt
  console.log('\n▶ Stage 8: Validating G-ML-021 Mathematical Invariant Proof...');
  const mathProcess = spawnSync('node', ['scripts/harness/mathematical-invariant-proof-harness.mjs', 'G-ML-021'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (mathProcess.status !== 0) {
    console.error('FATAL: Mathematical invariant proof failed for G-ML-021.');
    process.exit(mathProcess.status || 1);
  }

  // 9. Verify Bare Harness CLI Dry-Run (Exit 0)
  console.log('\n▶ Stage 9: Verifying Bare Harness CLI Dry-Run Execution (Exit 0)...');
  const dryProc = spawnSync('node', ['scripts/harness/agent-workflow-harness.mjs', '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  if (dryProc.status !== 0) {
    console.error(`FATAL: Dry-run exited with code ${dryProc.status}`);
    process.exit(1);
  }
  console.log('  ✔ Bare harness CLI dry-run successfully passed with exit code 0');

  // 10. Verify Full 5-Scenario Battery (Exit 0)
  console.log('\n▶ Stage 10: Verifying Full 5-Scenario Battery (Exit 0)...');
  const fullProc = spawnSync('node', ['scripts/harness/agent-workflow-harness.mjs'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  if (fullProc.status !== 0) {
    console.error(`FATAL: Full 5-scenario battery exited with code ${fullProc.status}`);
    process.exit(1);
  }
  console.log('  ✔ Full 5-scenario battery successfully passed with exit code 0');

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('🏆 G-ML-021 MASTER REPLICATION HARNESS: 100% GREEN ACROSS ALL 10 STAGES');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal error in replication harness:', err);
  process.exit(1);
});
