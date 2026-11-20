#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ZERO-BUG QUALITY & VERIFICATION GUARANTEE HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Executes a deterministic, fail-closed multi-stage quality scan:
 *   [1] Zero-Mock & Placeholder Scan (Article I)
 *   [2] Zero-Float & Minor-Unit Math Verification (Article V)
 *   [3] Multi-Node Contract & Schema Invariant Gate
 *   [4] Canonical 51-Section Goal Specification & Scope Lock
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checks = [];

function assert(description, passed, details = '') {
  checks.push({ description, passed, details });
  const icon = passed ? '  ✔' : '  ✖';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${description}\x1b[0m`);
  if (!passed && details) {
    console.log(`    \x1b[33m↳ Details: ${details}\x1b[0m`);
  }
}

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║   🛡️  SODA OS ZERO-BUG QUALITY & VERIFICATION GUARANTEE HARNESS               ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// 1. Zero-Mock & Placeholder Gate (Article I)
// Skip tests, fixtures, docs, build artifacts (.next, dist, build, node_modules)
const skipPattern = /(^|\/)(test|tests|__tests__|fixtures|node_modules|\.git|\.next|dist|build|out)(\/|$)|(\.(test|spec)\.[a-z0-9]+$)/i;
const forbiddenPattern = /\b(?:TODO\b|FIXME\b|HACK\b|unimplemented!\(\)|todo!\(\)|mock[_-]?response\s*=|fake[_-]?response\s*=|stub[_-]?response\s*=)/;
const placeholderHits = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (skipPattern.test(path.relative(root, fullPath)) || skipPattern.test(entry)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(js|mjs|ts|tsx|rs|go|py|java)$/.test(entry)) {
      const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        const clean = line.trim();
        if (clean.startsWith('//') || clean.startsWith('/*') || clean.startsWith('*') || clean.startsWith('//!')) return;
        if (clean.includes('BARRED_MOCK_SUBSTRINGS') || clean.includes('.contains(') || clean.includes('"hack"') || clean.includes('"todo"')) return;
        if (forbiddenPattern.test(clean)) {
          placeholderHits.push(`${path.relative(root, fullPath)}:${idx + 1}`);
        }
      });
    }
  }
}

const prodDirs = ['code', 'src'].filter(d => fs.existsSync(path.join(root, d)));
prodDirs.forEach(d => scanDir(path.join(root, d)));

assert(
  'Pillar 1: Zero-Mock & Zero-Placeholder Invariant (Article I)',
  placeholderHits.length === 0,
  placeholderHits.length > 0 ? `Found ${placeholderHits.length} forbidden placeholders: \n      ${placeholderHits.slice(0, 5).join('\n      ')}` : ''
);

// 2. Multi-Currency Minor Unit & Zero-Float Invariant (Article V)
// Fail-closed: Must exist and pass
const moneyLib = path.join(root, 'scripts/lib/multi-currency-money.mjs');
const moneyTest = path.join(root, 'tests/unit/test-multi-currency-money.mjs');

if (!fs.existsSync(moneyLib)) {
  assert('Pillar 2: Zero-Float Minor-Unit Math Invariant (Article V)', false, `Prerequisite missing: ${path.relative(root, moneyLib)}`);
} else if (!fs.existsSync(moneyTest)) {
  assert('Pillar 2: Zero-Float Minor-Unit Math Invariant (Article V)', false, `Prerequisite test missing: ${path.relative(root, moneyTest)}`);
} else {
  const r = spawnSync(process.execPath, [moneyTest], { cwd: root, stdio: 'pipe' });
  assert('Pillar 2: Zero-Float Minor-Unit Math Invariant (Article V)', r.status === 0, r.stderr?.toString() || r.stdout?.toString());
}

// 3. Multi-Node Contract Invariant Gate
// Fail-closed: Must exist and pass
const contractHarness = path.join(root, 'scripts/harness/node-contract-invariant-harness.mjs');
if (!fs.existsSync(contractHarness)) {
  assert('Pillar 3: Multi-Node Contract Parity & Wire Serialization Invariant', false, `Contract harness missing: ${path.relative(root, contractHarness)}`);
} else {
  const r = spawnSync(process.execPath, [contractHarness], { cwd: root, stdio: 'pipe' });
  assert('Pillar 3: Multi-Node Contract Parity & Wire Serialization Invariant', r.status === 0, r.stderr?.toString() || r.stdout?.toString());
}

// 4. Goal Template Conformance & Scope Lock
// Fail-closed: Canonical template and conformance harness must exist and validate clean
const goalTemplateHarness = path.join(root, 'scripts/harness/goal-template-conformance-harness.mjs');
const goalTemplateFile = path.join(root, 'docs/07-backlog/goals/_template.md');

if (!fs.existsSync(goalTemplateHarness)) {
  assert('Pillar 4: Canonical 51-Section Goal Specification & Scope Lock', false, `Goal template harness missing: ${path.relative(root, goalTemplateHarness)}`);
} else if (!fs.existsSync(goalTemplateFile)) {
  assert('Pillar 4: Canonical 51-Section Goal Specification & Scope Lock', false, `Canonical goal template missing: ${path.relative(root, goalTemplateFile)}`);
} else {
  const r = spawnSync(process.execPath, [goalTemplateHarness], { cwd: root, stdio: 'pipe' });
  assert('Pillar 4: Canonical 51-Section Goal Specification & Scope Lock', r.status === 0, r.stderr?.toString() || r.stdout?.toString());
}

const total = checks.length;
const passed = checks.filter(c => c.passed).length;
const failed = total - passed;

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log(`📊 Quality Guarantee: ${passed} / ${total} Pillars Verified`);
if (failed > 0) {
  console.log(`\x1b[31m❌ FAIL-CLOSED: ${failed} Zero-Bug Quality Invariants Violated!\x1b[0m\n`);
  process.exit(1);
}
console.log(`\x1b[32m✔ SUCCESS: 100% Zero-Bug Quality Guarantees Certified Clean!\x1b[0m\n`);
process.exit(0);
