#!/usr/bin/env node
/**
 * tests/unit/test-operational-runbook.mjs
 *
 * Comprehensive Unit & Integration Test Suite for Goal G-ML-024:
 * Operational Runbook and Documentation Suite.
 *
 * Verifies:
 * 1. Architecture guide completeness and mathematical formulas (RLCD, ECE, Brier, HCER)
 * 2. Exhaustive 8-case dynamic routing truth table documentation
 * 3. ADR-004 decision record structure, status, and decider compliance
 * 4. Operator runbook incident response playbooks and diagnostic CLI commands
 * 5. Zero-drift template parity for distributed workflow documents
 * 6. Markdown internal link resolution and integrity verification
 *
 * Zero mocks, zero stubs, zero dummy data.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let REPO_ROOT = path.resolve(__dirname, '../..');
if (path.basename(REPO_ROOT) === 'template') {
  REPO_ROOT = path.resolve(REPO_ROOT, '..');
}

// Parse -k filter argument if provided
const kIndex = process.argv.indexOf('-k');
const patternFilter = kIndex !== -1 && process.argv[kIndex + 1] ? process.argv[kIndex + 1] : null;

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🧪 RUNNING OPERATIONAL RUNBOOK & DOCUMENTATION TEST SUITE (G-ML-024)');
if (patternFilter) {
  console.log(`🔍 Filter active: "${patternFilter}"`);
}
console.log('════════════════════════════════════════════════════════════════════════════════\n');

const testCases = [];
function test(name, fn) {
  testCases.push({ name, fn });
}

// -----------------------------------------------------------------------------
// Test 1: Architecture Guide Existence & Required Sections
// -----------------------------------------------------------------------------
test('test_architecture_guide_existence_and_structure', () => {
  const docPath = path.join(REPO_ROOT, 'docs/03-architecture/confidence-aware-execution.md');
  assert.ok(fs.existsSync(docPath), 'Architecture doc docs/03-architecture/confidence-aware-execution.md must exist on disk');

  const content = fs.readFileSync(docPath, 'utf8');
  assert.ok(content.length > 2000, 'Architecture doc must be comprehensive (> 2,000 characters)');
  assert.ok(content.includes('Executive Summary & Architectural Motivation'), 'Must contain executive summary');
  assert.ok(content.includes('Hexagonal Port Architecture'), 'Must contain hexagonal architecture specification');
  assert.ok(content.includes('Mathematical Foundations & Objective Formulations'), 'Must contain mathematical formulations');
  assert.ok(content.includes('Four-Way Dynamic Routing State Machine'), 'Must contain 4-way routing state machine');
  assert.ok(content.includes('Model Circuit Breaker FSM'), 'Must contain circuit breaker section');
  assert.ok(content.includes('Physical Evidence Grounding & Decision Ledger'), 'Must contain evidence grounding section');
  assert.ok(content.includes('Operational SLA & Quality Thresholds'), 'Must contain SLA table');
});

// -----------------------------------------------------------------------------
// Test 2: Mathematical Formulations Completeness
// -----------------------------------------------------------------------------
test('test_mathematical_formulations_completeness', () => {
  const docPath = path.join(REPO_ROOT, 'docs/03-architecture/confidence-aware-execution.md');
  const content = fs.readFileSync(docPath, 'utf8');

  // RLCD Loss
  assert.ok(content.includes('\\mathcal{L}_{\\text{total}} = \\mathcal{L}_{\\text{LM}} + \\lambda_{\\text{cal}} \\mathcal{L}_{\\text{cal}}'), 'Must include RLCD total loss formula');
  assert.ok(content.includes('C_{\\text{fa}} = 10.0'), 'Must document asymmetric false-accept weight 10.0');
  assert.ok(content.includes('C_{\\text{fd}} = 1.0'), 'Must document false-deferral weight 1.0');
  assert.ok(content.includes('D_{\\text{KL}}(P \\parallel Q)'), 'Must document KL divergence regularization');

  // Expected Calibration Error (ECE)
  assert.ok(content.includes('\\text{ECE} = \\sum_{m=1}^M \\frac{|B_m|}{N}'), 'Must include 10-bin ECE formula');
  assert.ok(content.includes('M = 10'), 'Must specify 10 uniform probability bins');
  assert.ok(content.includes('0.0400'), 'Must specify ECE SLA bound <= 0.0400');

  // Quadratic Brier Score
  assert.ok(content.includes('\\text{BS} = \\frac{1}{N} \\sum_{i=1}^N (c_i - y_i)^2'), 'Must include Brier score formula');
  assert.ok(content.includes('0.0800'), 'Must specify Brier score SLA bound <= 0.0800');

  // High-Confidence Error Rate (HCER)
  assert.ok(content.includes('\\text{HCER}'), 'Must include HCER formula');
  assert.ok(content.includes('\\tau_{\\text{high}} = 0.80'), 'Must specify tau_high threshold 0.80');
  assert.ok(content.includes('0.0100'), 'Must specify HCER SLA bound <= 0.0100');
});

// -----------------------------------------------------------------------------
// Test 3: Exhaustive 8-Permutation Routing Truth Table
// -----------------------------------------------------------------------------
test('test_routing_truth_table_documentation', () => {
  const docPath = path.join(REPO_ROOT, 'docs/03-architecture/confidence-aware-execution.md');
  const content = fs.readFileSync(docPath, 'utf8');

  // Verify all 8 cases are explicitly documented
  assert.ok(content.includes('Case 1') && content.includes('`proceed`'), 'Case 1: normal, verified, high -> proceed');
  assert.ok(content.includes('Case 2') && content.includes('`verify`'), 'Case 2: normal, verified, low -> verify');
  assert.ok(content.includes('Case 3') && content.includes('`verify`'), 'Case 3: normal, unverified, high -> verify');
  assert.ok(content.includes('Case 4') && content.includes('`defer`'), 'Case 4: normal, unverified, low -> defer');
  assert.ok(content.includes('Case 5') && content.includes('`human_review`'), 'Case 5: high, verified, high -> human_review');
  assert.ok(content.includes('Case 6') && content.includes('`defer`'), 'Case 6: high, verified, low -> defer');
  assert.ok(content.includes('Case 7') && content.includes('`defer`'), 'Case 7: high, unverified, high -> defer');
  assert.ok(content.includes('Case 8') && content.includes('`defer`'), 'Case 8: high, unverified, low -> defer');
});

// -----------------------------------------------------------------------------
// Test 4: ADR-004 Structure & Decider Compliance
// -----------------------------------------------------------------------------
test('test_adr_004_structure_and_decider_compliance', () => {
  const adrPath = path.join(REPO_ROOT, 'docs/05-decisions/ADR-004-calibrated-confidence-routing.md');
  assert.ok(fs.existsSync(adrPath), 'ADR-004 file must exist at docs/05-decisions/ADR-004-calibrated-confidence-routing.md');

  const content = fs.readFileSync(adrPath, 'utf8');
  assert.ok(content.includes('ADR-004: Calibrated Confidence Routing'), 'Must have correct ADR-004 title');
  assert.ok(content.includes('**Status:** accepted'), 'ADR status must be accepted');
  assert.ok(content.includes('**Deciders:**'), 'Must declare deciders');
  assert.ok(content.includes('## Context'), 'Must include Context section');
  assert.ok(content.includes('## Decision'), 'Must include Decision section');
  assert.ok(content.includes('## Consequences'), 'Must include Consequences section');
  assert.ok(content.includes('## Alternatives Considered'), 'Must include Alternatives Considered section');
  assert.ok(content.includes('Positive'), 'Must include positive consequences');
  assert.ok(content.includes('Negative / Trade-Offs'), 'Must include negative consequences/trade-offs');
});

// -----------------------------------------------------------------------------
// Test 5: Operator Runbook Playbooks & Troubleshooting Trees
// -----------------------------------------------------------------------------
test('test_operator_runbook_playbooks_and_trees', () => {
  const runbookPath = path.join(REPO_ROOT, 'docs/06-workflows/confidence-aware-execution.md');
  assert.ok(fs.existsSync(runbookPath), 'Runbook must exist at docs/06-workflows/confidence-aware-execution.md');

  const content = fs.readFileSync(runbookPath, 'utf8');
  assert.ok(content.includes('Playbook 1: CI Calibration Gate Failure'), 'Must contain CI gate failure playbook');
  assert.ok(content.includes('Playbook 2: Online Distribution Drift Alert'), 'Must contain drift alert playbook');
  assert.ok(content.includes('Playbook 3: Model Circuit Breaker Trip & Recovery'), 'Must contain circuit breaker recovery playbook');
  assert.ok(content.includes('Playbook 4: Decision Ledger Audit & Citation Verification'), 'Must contain decision ledger audit playbook');
  assert.ok(content.includes('Operational CLI Command Reference'), 'Must contain CLI reference table');

  // Verify diagnostic CLI commands are present
  assert.ok(content.includes('node scripts/ci/ci-calibration-gate.mjs --strict'), 'Must document strict CI gate command');
  assert.ok(content.includes('node scripts/ci/ci-calibration-gate.mjs --report'), 'Must document report generation command');
  assert.ok(content.includes('node scripts/harness/confidence-calibration-harness.mjs'), 'Must document calibration harness command');
});

// -----------------------------------------------------------------------------
// Test 6: Zero-Drift Parity with Template
// -----------------------------------------------------------------------------
test('test_template_zero_drift_parity', () => {
  const rootRunbook = path.join(REPO_ROOT, 'docs/06-workflows/confidence-aware-execution.md');
  const tmplRunbook = path.join(REPO_ROOT, 'template/docs/06-workflows/confidence-aware-execution.md');

  assert.ok(fs.existsSync(rootRunbook), 'Root runbook must exist');
  assert.ok(fs.existsSync(tmplRunbook), 'Template runbook must exist');

  const rootContent = fs.readFileSync(rootRunbook, 'utf8');
  const tmplContent = fs.readFileSync(tmplRunbook, 'utf8');

  assert.strictEqual(rootContent, tmplContent, 'docs/06-workflows/confidence-aware-execution.md must maintain 100% zero drift with template mirror');
});

// -----------------------------------------------------------------------------
// Test 7: Markdown Internal Link Integrity
// -----------------------------------------------------------------------------
test('test_markdown_internal_link_integrity', () => {
  const filesToCheck = [
    path.join(REPO_ROOT, 'docs/03-architecture/confidence-aware-execution.md'),
    path.join(REPO_ROOT, 'docs/05-decisions/ADR-004-calibrated-confidence-routing.md'),
    path.join(REPO_ROOT, 'docs/06-workflows/confidence-aware-execution.md')
  ];

  // Regex to extract markdown links: [text](target)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  let totalLinks = 0;
  let verifiedLinks = 0;

  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const rawTarget = match[2].trim();
      totalLinks++;

      // Skip external web URLs or anchors
      if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('#')) {
        verifiedLinks++;
        continue;
      }

      // Convert file:/// URI or relative path
      let resolvedTarget;
      if (rawTarget.startsWith('file://')) {
        const parsedUrl = new URL(rawTarget);
        resolvedTarget = parsedUrl.pathname;
      } else {
        // Strip query params or line number hashes like #L10-L20
        const cleanPath = rawTarget.split('#')[0].split('?')[0];
        resolvedTarget = path.resolve(path.dirname(filePath), cleanPath);
      }

      // Strip trailing line hash if pathname has it
      resolvedTarget = resolvedTarget.split('#')[0];

      assert.ok(
        fs.existsSync(resolvedTarget),
        `Link in ${path.relative(REPO_ROOT, filePath)} pointing to "${rawTarget}" does not exist on disk: ${resolvedTarget}`
      );
      verifiedLinks++;
    }
  }

  assert.ok(totalLinks > 0, 'Must have verified at least one markdown link');
  assert.strictEqual(verifiedLinks, totalLinks, 'All markdown links must resolve cleanly to disk files');
});

// -----------------------------------------------------------------------------
// Execution Runner
// -----------------------------------------------------------------------------
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  if (patternFilter && !tc.name.includes(patternFilter)) {
    continue;
  }
  try {
    tc.fn();
    console.log(`  ✔ [PASS] ${tc.name}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${tc.name}: ${err.message}`);
    failed++;
  }
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
if (failed === 0) {
  console.log(`🎉 ALL TESTS PASSED: ${passed}/${passed} tests successful (0 failures).`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.error(`❌ TEST SUITE FAILED: ${failed} failure(s) detected out of ${passed + failed} tests.`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
  process.exit(1);
}
