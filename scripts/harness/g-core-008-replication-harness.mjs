#!/usr/bin/env node
/**
 * scripts/harness/g-core-008-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-CORE-008:
 * Failure, Rollback, and Fail-Closed Harness
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Exact-HEAD verification and fail-closed parity check
 * 4. Conformance harness on G-CORE-008
 * 5. Direct invocation of failure-rollback harness and routing truth-table harness
 * 6. Proof receipt validator on G-CORE-008
 * 7. Multi-layer goal assurance suite unit tests
 */

import { run5WhySocraticVerification } from '../agentic/g-core-008-5why-socratic-engine.mjs';
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
console.log('🚀  EXECUTING G-CORE-008 MASTER REPLICATION HARNESS');
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
const evalProcess = spawnSync('node', ['scripts/agentic/g-core-008-provenance-oracle-evaluator.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (evalProcess.status !== 0) {
  console.error('FATAL: Provenance oracle evaluation exited with failure.');
  process.exit(evalProcess.status || 1);
}

// 3. Run Conformance Validation on G-CORE-008
console.log('\n▶ Stage 3: Running Conformance Harness on G-CORE-008...');
const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-CORE-008'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (confProcess.status !== 0) {
  console.error('FATAL: Conformance validation on G-CORE-008 failed.');
  process.exit(confProcess.status || 1);
}

// 4. Run Failure & Rollback Harness on G-CORE-008
console.log('\n▶ Stage 4: Running Failure & Rollback Harness on G-CORE-008...');
const goalCardRel = fs.existsSync(path.join(REPO_ROOT, 'docs/07-backlog/goals/G-CORE-008.md'))
  ? 'docs/07-backlog/goals/G-CORE-008.md'
  : 'docs/07-backlog/goals/_archived/G-CORE-008.md';

const failProcess = spawnSync('node', ['scripts/harness/failure-rollback-harness.mjs', goalCardRel], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (failProcess.status !== 0) {
  console.error('FATAL: Failure & rollback harness exited with failure.');
  process.exit(failProcess.status || 1);
}

// 5. Run Routing Truth Table Harness on G-CORE-008
console.log('\n▶ Stage 5: Running Routing Truth Table Harness on G-CORE-008...');
const routeProcess = spawnSync('node', ['scripts/harness/routing-truth-table-harness.mjs', goalCardRel], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (routeProcess.status !== 0) {
  console.error('FATAL: Routing truth table harness exited with failure.');
  process.exit(routeProcess.status || 1);
}

// 6. Run Proof Receipt Validator on G-CORE-008
console.log('\n▶ Stage 6: Running Proof Receipt Validator on G-CORE-008...');
const valProcess = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', 'G-CORE-008'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (valProcess.status !== 0) {
  console.error('FATAL: Proof receipt validator exited with failure.');
  process.exit(valProcess.status || 1);
}

// 7. Run Multi-Layer Goal Assurance Suite
console.log('\n▶ Stage 7: Running Multi-Layer Goal Assurance Suite...');
const suiteProcess = spawnSync('node', ['scripts/harness/test-goal-assurance-suite.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (suiteProcess.status !== 0) {
  console.error('FATAL: Assurance suite exited with failure.');
  process.exit(suiteProcess.status || 1);
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('🏆  G-CORE-008 MASTER REPLICATION HARNESS: 100% GREEN CERTIFICATION');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

process.exit(0);
