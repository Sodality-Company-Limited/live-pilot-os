#!/usr/bin/env node
/**
 * scripts/harness/g-core-011-replication-harness.mjs
 *
 * Master Replication Harness for Goal G-CORE-011:
 * Framework-Source Versus Downstream-Project Upgrade Mode
 *
 * Coordinates:
 * 1. 5-Why Socratic Dialectic Engine execution (5 branches through Level 5)
 * 2. Provenance Oracle Evaluator (20 measured trials, 8 mutations, Wilson CI)
 * 3. Exact-HEAD verification and fail-closed parity check
 * 4. Conformance harness on G-CORE-011
 * 5. CLI Upgrade Report validation
 * 6. Proof receipt validator on G-CORE-011
 * 7. Multi-layer goal assurance suite unit tests
 */

import { run5WhySocraticVerification } from '../agentic/g-core-011-5why-socratic-engine.mjs';
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
console.log('🚀  EXECUTING G-CORE-011 MASTER REPLICATION HARNESS');
console.log('    Framework-Source Versus Downstream-Project Upgrade Mode');
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
const evalProcess = spawnSync('node', ['scripts/agentic/g-core-011-provenance-oracle-evaluator.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (evalProcess.status !== 0) {
  console.error('FATAL: Provenance oracle evaluation exited with failure.');
  process.exit(evalProcess.status || 1);
}

// 3. Run Conformance Validation on G-CORE-011
console.log('\n▶ Stage 3: Running Conformance Harness on G-CORE-011...');
const confProcess = spawnSync('node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-CORE-011'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (confProcess.status !== 0) {
  console.error('FATAL: Conformance validation on G-CORE-011 failed.');
  process.exit(confProcess.status || 1);
}

// 4. Run CLI Upgrade Report Validation
console.log('\n▶ Stage 4: Running CLI Upgrade Report Validation...');
const cliProcess = spawnSync('node', ['cli.js', 'upgrade', '--report'], {
  cwd: REPO_ROOT,
  encoding: 'utf8'
});

if (cliProcess.status !== 0 || !cliProcess.stdout.includes('framework_source') || !cliProcess.stdout.includes('FRAMEWORK SOURCE INTEGRITY MODE')) {
  console.error('FATAL: CLI upgrade report validation failed.');
  process.exit(cliProcess.status || 1);
}
console.log('  ✔ CLI upgrade report verified: framework_source integrity mode active');

// 5. Run Proof Receipt Validator on G-CORE-011
console.log('\n▶ Stage 5: Running Proof Receipt Validator on G-CORE-011...');
const receiptRel = 'docs/07-backlog/evidence/G-CORE-011-proof-receipt.json';
const receiptProcess = spawnSync('node', ['scripts/harness/proof-receipt-validator.mjs', receiptRel], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (receiptProcess.status !== 0) {
  console.error('FATAL: Proof receipt validator exited with failure.');
  process.exit(receiptProcess.status || 1);
}

// 6. Run Multi-Layer Goal Assurance Suite Unit Tests
console.log('\n▶ Stage 6: Running Multi-Layer Goal Assurance Suite...');
const suiteProcess = spawnSync('node', ['scripts/harness/test-goal-assurance-suite.mjs'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

if (suiteProcess.status !== 0) {
  console.error('FATAL: Goal assurance suite failed.');
  process.exit(suiteProcess.status || 1);
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🏆  G-CORE-011 MASTER REPLICATION HARNESS: 100% GREEN CERTIFICATION');
console.log('════════════════════════════════════════════════════════════════════════════════\n');
process.exit(0);
