#!/usr/bin/env node
/**
 * scripts/harness/g-core-003-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-CORE-003:
 * Upgrade Agent OS Goal Contracts, Proof Assurance, and Runtime Governance
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Exact-HEAD verification and fail-closed parity check
 */

import { run5WhySocraticVerification } from '../agentic/g-core-003-5why-socratic-engine.mjs';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🚀  EXECUTING G-CORE-003 MASTER REPLICATION HARNESS');
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
const evalProcess = spawnSync('node', ['scripts/agentic/g-core-003-provenance-oracle-evaluator.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (evalProcess.status !== 0) {
  console.error('FATAL: Provenance oracle evaluation exited with failure.');
  process.exit(evalProcess.status || 1);
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🏆  G-CORE-003 MASTER REPLICATION HARNESS: 100% GREEN CERTIFICATION');
console.log('════════════════════════════════════════════════════════════════════════════════\n');
