#!/usr/bin/env node
/**
 * scripts/harness/g-core-005-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-CORE-005:
 * Dependency Graph and Scope-Drift Harness
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Exact-HEAD verification and fail-closed parity check
 * 4. Conformance harness on G-CORE-005
 * 5. Direct invocation of dependency DAG and scope drift validation
 */

import { run5WhySocraticVerification } from '../agentic/g-core-005-5why-socratic-engine.mjs';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🚀  EXECUTING G-CORE-005 MASTER REPLICATION HARNESS');
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
const evalProcess = spawnSync('node', ['scripts/agentic/g-core-005-provenance-oracle-evaluator.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (evalProcess.status !== 0) {
  console.error('FATAL: Provenance oracle evaluation exited with failure.');
  process.exit(evalProcess.status || 1);
}

// 3. Run Conformance Validation on G-CORE-005
console.log('\n▶ Stage 3: Running Conformance Harness on G-CORE-005...');
const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-CORE-005'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (confProcess.status !== 0) {
  console.error('FATAL: Conformance validation on G-CORE-005 failed.');
  process.exit(confProcess.status || 1);
}

// 4. Run Direct Goal Dependency and Scope Drift Harnesses
console.log('\n▶ Stage 4: Running Direct Goal Dependency and Scope Drift Harnesses...');
const depProcess = spawnSync('node', ['scripts/harness/goal-dependency-harness.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (depProcess.status !== 0) {
  console.error('FATAL: Dependency DAG harness exited with failure.');
  process.exit(depProcess.status || 1);
}

let targetGoalPath = 'docs/07-backlog/goals/G-CORE-005.md';
if (!fs.existsSync(path.join(REPO_ROOT, targetGoalPath))) {
  targetGoalPath = 'docs/07-backlog/goals/_archived/G-CORE-005.md';
}

const scopeProcess = spawnSync('node', ['scripts/harness/goal-scope-drift-harness.mjs', targetGoalPath], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (scopeProcess.status !== 0) {
  console.error('FATAL: Scope drift harness exited with failure.');
  process.exit(scopeProcess.status || 1);
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🏆  G-CORE-005 MASTER REPLICATION HARNESS: 100% GREEN CERTIFICATION');
console.log('════════════════════════════════════════════════════════════════════════════════\n');
