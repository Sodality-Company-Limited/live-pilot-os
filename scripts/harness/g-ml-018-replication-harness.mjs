#!/usr/bin/env node
/**
 * scripts/harness/g-ml-018-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-ML-018:
 * Inference-Time Token and Latency Accounting Engine
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Conformance harness on G-ML-018
 * 4. Isolated overhead monitor test (-k test_overhead_monitor)
 * 5. Full model telemetry unit test suite
 * 6. Module import verification
 * 7. Template parity diff check between root and template
 * 8. Proof receipt validator on G-ML-018
 * 9. Mathematical invariant proof harness on G-ML-018
 */

import { run5WhySocraticVerification } from '../agentic/g-ml-018-5why-socratic-engine.mjs';
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
console.log('🚀 EXECUTING G-ML-018 MASTER REPLICATION HARNESS');
console.log('   Inference-Time Token and Latency Accounting Engine');
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
  const evalProcess = spawnSync('node', ['scripts/agentic/g-ml-018-provenance-oracle-evaluator.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (evalProcess.status !== 0) {
    console.error('FATAL: Provenance oracle evaluation exited with failure.');
    process.exit(evalProcess.status || 1);
  }

  // 3. Run Conformance Validation on G-ML-018
  console.log('\n▶ Stage 3: Running Conformance Harness on G-ML-018...');
  const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-ML-018'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (confProcess.status !== 0) {
    console.error('FATAL: Goal template conformance harness failed.');
    process.exit(confProcess.status || 1);
  }

  // 4. Run Isolated Overhead Monitor Test (-k test_overhead_monitor)
  console.log('\n▶ Stage 4: Running Isolated Overhead Monitor Test...');
  const isolatedTestProcess = spawnSync('node', ['tests/unit/test-model-telemetry.mjs', '-k', 'test_overhead_monitor'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (isolatedTestProcess.status !== 0) {
    console.error('FATAL: Isolated overhead monitor test failed.');
    process.exit(isolatedTestProcess.status || 1);
  }

  // 5. Run Full Model Telemetry Unit Test Suite
  console.log('\n▶ Stage 5: Running Full Model Telemetry Unit Test Suite...');
  const unitTestProcess = spawnSync('node', ['tests/unit/test-model-telemetry.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (unitTestProcess.status !== 0) {
    console.error('FATAL: Model telemetry unit test suite failed.');
    process.exit(unitTestProcess.status || 1);
  }
  console.log('  ✔ Model telemetry unit test suite verified: all tests passed cleanly');

  // 6. Clean Module Import Verification
  console.log('\n▶ Stage 6: Running Clean Module Import Verification...');
  const importCheck = spawnSync('node', ['-e', 'import("./scripts/lib/model-telemetry.mjs")'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });
  if (importCheck.status !== 0) {
    console.error('FATAL: Clean module import failed.');
    process.exit(importCheck.status || 1);
  }

  const templateImportCheck = spawnSync('node', ['-e', 'import("./template/scripts/lib/model-telemetry.mjs")'], {
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
    ['scripts/lib/model-telemetry.mjs', 'template/scripts/lib/model-telemetry.mjs'],
    ['tests/unit/test-model-telemetry.mjs', 'template/tests/unit/test-model-telemetry.mjs'],
    ['scripts/agentic/g-ml-018-5why-socratic-engine.mjs', 'template/scripts/agentic/g-ml-018-5why-socratic-engine.mjs'],
    ['scripts/agentic/g-ml-018-provenance-oracle-evaluator.mjs', 'template/scripts/agentic/g-ml-018-provenance-oracle-evaluator.mjs']
  ];

  for (const [src, dst] of filesToDiff) {
    const diff = spawnSync('diff', ['-u', path.join(REPO_ROOT, src), path.join(REPO_ROOT, dst)], { encoding: 'utf8' });
    if (diff.status !== 0) {
      console.error(`FATAL: Template parity diff failed for ${src} and ${dst}:\n${diff.stdout}`);
      process.exit(1);
    }
  }
  console.log('  ✔ Template parity diff check verified: zero drift');

  // 8. Validate G-ML-018 Proof Receipt
  console.log('\n▶ Stage 8: Validating G-ML-018 Proof Receipt...');
  const receiptValidatorProcess = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', 'G-ML-018'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (receiptValidatorProcess.status !== 0) {
    console.error('FATAL: Proof receipt validation failed for G-ML-018.');
    process.exit(receiptValidatorProcess.status || 1);
  }

  // 9. Run Mathematical Invariant Proof Harness
  console.log('\n▶ Stage 9: Running Mathematical Invariant Proof Harness...');
  const mathProofProcess = spawnSync('node', ['scripts/harness/mathematical-invariant-proof-harness.mjs', 'G-ML-018'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (mathProofProcess.status !== 0) {
    console.error('FATAL: Mathematical invariant proof harness failed for G-ML-018.');
    process.exit(mathProofProcess.status || 1);
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('🏆 G-ML-018 MASTER REPLICATION HARNESS: 100% GREEN ACROSS ALL 9 STAGES');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal error in replication harness:', err);
  process.exit(1);
});
