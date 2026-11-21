#!/usr/bin/env node
/**
 * scripts/harness/g-ml-024-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-ML-024:
 * Operational Runbook and Documentation Suite
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5, 25 invariants)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Conformance harness on G-ML-024
 * 4. Full Unit & Integration Test Suite (tests/unit/test-operational-runbook.mjs)
 * 5. Template Unit Test Suite (template/tests/unit/test-operational-runbook.mjs)
 * 6. Mathematical invariant proof on G-ML-024
 * 7. Statistical evidence harness on G-ML-024
 * 8. Routing truth table harness on G-ML-024
 * 9. Proof Receipt Validator on G-ML-024
 * 10. Template parity diff check between root and template
 */

import { run5WhyDialectic } from '../agentic/g-ml-024-5why-socratic-engine.mjs';
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
console.log('🚀 EXECUTING G-ML-024 MASTER REPLICATION HARNESS');
console.log('   Operational Runbook and Documentation Suite');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

async function main() {
  // 1. Run 5-Why Dialectic Verification
  console.log('▶ Stage 1: Running 5-Why Socratic Dialectic Engine...');
  const socraticResult = run5WhyDialectic();
  if (socraticResult.passed !== socraticResult.total) {
    console.error('FATAL: Socratic 5-Why invariants failed.');
    process.exit(1);
  }

  // 2. Run Provenance Oracle & Empirical Evaluator
  console.log('\n▶ Stage 2: Running Provenance Oracle & Empirical Evaluator...');
  const evalProcess = spawnSync('node', ['scripts/agentic/g-ml-024-provenance-oracle-evaluator.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (evalProcess.status !== 0) {
    console.error('FATAL: Provenance oracle evaluation exited with failure.');
    process.exit(evalProcess.status || 1);
  }

  // 3. Run Conformance Validation on G-ML-024
  console.log('\n▶ Stage 3: Running Conformance Harness on G-ML-024...');
  const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-ML-024'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (confProcess.status !== 0) {
    console.error('FATAL: Conformance check failed for G-ML-024.');
    process.exit(confProcess.status || 1);
  }

  // 4. Run Full Unit & Integration Test Suite
  console.log('\n▶ Stage 4: Running Full Operational Runbook Unit Test Suite...');
  const testProcess = spawnSync('node', ['tests/unit/test-operational-runbook.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (testProcess.status !== 0) {
    console.error('FATAL: Unit test suite failed.');
    process.exit(testProcess.status || 1);
  }

  // 5. Run Template Unit Test Suite (Zero-Drift Validation)
  console.log('\n▶ Stage 5: Running Template Mirror Test Suite...');
  const templateTestProcess = spawnSync('node', ['template/tests/unit/test-operational-runbook.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (templateTestProcess.status !== 0) {
    console.error('FATAL: Template mirror test suite failed.');
    process.exit(templateTestProcess.status || 1);
  }

  // 6. Mathematical Invariant Proof on G-ML-024
  console.log('\n▶ Stage 6: Running Mathematical Invariant Proof Harness on G-ML-024...');
  const mathProcess = spawnSync('node', ['scripts/harness/mathematical-invariant-proof-harness.mjs', 'G-ML-024'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (mathProcess.status !== 0) {
    console.error('FATAL: Mathematical invariant proof failed on G-ML-024.');
    process.exit(mathProcess.status || 1);
  }

  // 7. Statistical Evidence Harness on G-ML-024
  console.log('\n▶ Stage 7: Running Statistical Evidence Harness on G-ML-024...');
  const statProcess = spawnSync('node', ['scripts/harness/statistical-evidence-harness.mjs', 'docs/07-backlog/goals/G-ML-024.md'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (statProcess.status !== 0) {
    console.error('FATAL: Statistical evidence harness failed on G-ML-024.');
    process.exit(statProcess.status || 1);
  }

  // 8. Routing Truth Table Harness on G-ML-024
  console.log('\n▶ Stage 8: Running Routing Truth Table Harness on G-ML-024...');
  const routeProcess = spawnSync('node', ['scripts/harness/routing-truth-table-harness.mjs', 'docs/07-backlog/goals/G-ML-024.md'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (routeProcess.status !== 0) {
    console.error('FATAL: Routing truth table harness failed on G-ML-024.');
    process.exit(routeProcess.status || 1);
  }

  // 9. Proof Receipt Validator on G-ML-024
  console.log('\n▶ Stage 9: Running Proof Receipt Validator on G-ML-024...');
  const proofProcess = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', 'G-ML-024'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  });

  if (proofProcess.status !== 0) {
    console.error('FATAL: Proof receipt validator failed on G-ML-024.');
    process.exit(proofProcess.status || 1);
  }

  // 10. Template Parity Diff Check between Root and Template
  console.log('\n▶ Stage 10: Running Zero-Drift Template Parity Audit...');
  const diffCheckFiles = [
    ['docs/06-workflows/confidence-aware-execution.md', 'template/docs/06-workflows/confidence-aware-execution.md'],
    ['tests/unit/test-operational-runbook.mjs', 'template/tests/unit/test-operational-runbook.mjs'],
    ['docs/02-product/acceptance/G-ML-024.md', 'template/docs/02-product/acceptance/G-ML-024.md'],
    ['docs/07-backlog/clarifications/CLARIFICATION-G-ML-024.md', 'template/docs/07-backlog/clarifications/CLARIFICATION-G-ML-024.md'],
    ['scripts/agentic/g-ml-024-5why-socratic-engine.mjs', 'template/scripts/agentic/g-ml-024-5why-socratic-engine.mjs'],
    ['scripts/agentic/g-ml-024-provenance-oracle-evaluator.mjs', 'template/scripts/agentic/g-ml-024-provenance-oracle-evaluator.mjs'],
    ['scripts/harness/g-ml-024-replication-harness.mjs', 'template/scripts/harness/g-ml-024-replication-harness.mjs']
  ];

  for (const [rootF, tmplF] of diffCheckFiles) {
    const rootPath = path.join(REPO_ROOT, rootF);
    const tmplPath = path.join(REPO_ROOT, tmplF);
    if (!fs.existsSync(rootPath) || !fs.existsSync(tmplPath)) {
      console.error(`FATAL: Parity file missing: ${rootF} or ${tmplF}`);
      process.exit(1);
    }
    const rootContent = fs.readFileSync(rootPath, 'utf8');
    const tmplContent = fs.readFileSync(tmplPath, 'utf8');
    if (rootContent !== tmplContent) {
      console.error(`FATAL: Template drift detected in ${rootF}!`);
      process.exit(1);
    }
    console.log(`  ✔ [PARITY PASS] ${rootF} <==> ${tmplF}`);
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('✅ ALL 10 G-ML-024 MASTER REPLICATION STAGES COMPLETED CLEANLY (100% GREEN)');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(`\n❌ Master replication harness failed: ${err.message}`);
  process.exit(1);
});
