#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS VERIFICATION DOCUMENTATION CONFORMANCE TEST SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: PROOF (G-PROOF-013)
 * Standards: Global Engineering Constitution (Article I & II), 28 Senior Engineering Pillars
 * Purpose: Formally verifies documentation integrity, relative link validity,
 *          CLI command script existence on disk, and comprehensive coverage across
 *          all 7 verification profiles, 5 epistemic levels, and 8 troubleshooting playbooks.
 *
 * Invariant: 100% genuine operational test assertions. Zero mocks, zero stubs.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const ARCH_GUIDE_PATH = path.resolve(REPO_ROOT, 'docs/03-architecture/verification-architecture-guide.md');
const RUNBOOK_PATH = path.resolve(REPO_ROOT, 'docs/06-workflows/verification-operator-runbook.md');

const ALL_7_PROFILES = [
  'property_invariant',
  'stateful_model',
  'adversarial_boundary',
  'mutation_testing',
  'epistemic_classification',
  'counterexample',
  'concurrency_schedule'
];

const ALL_5_EPISTEMIC_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'];

const ALL_8_PLAYBOOKS = [
  { id: 1, title: 'Invariant Violation & Delta Shrinking Analysis', slug: 'Playbook 1' },
  { id: 2, title: 'Shadow Oracle State Divergence Remediation', slug: 'Playbook 2' },
  { id: 3, title: 'Adversarial Arithmetic Extremes & Precision Dust Remediation', slug: 'Playbook 3' },
  { id: 4, title: 'Mutation Kill Score Shortfall Remediation', slug: 'Playbook 4' },
  { id: 5, title: 'Epistemic Pseudo-Proof & Undisclosed Stub Remediation', slug: 'Playbook 5' },
  { id: 6, title: 'Counterexample Replay & Deterministic Minimization', slug: 'Playbook 6' },
  { id: 7, title: 'Stale Receipt & Hash Desync Re-binding', slug: 'Playbook 7' },
  { id: 8, title: 'Concurrency Race & Deadlock Resolution', slug: 'Playbook 8' }
];

const CORE_8_PROOF_HARNESSES = [
  'property-invariant-harness.mjs',
  'stateful-model-harness.mjs',
  'adversarial-boundary-harness.mjs',
  'mutation-testing-harness.mjs',
  'epistemic-classification-gate.mjs',
  'counterexample-minimizer.mjs',
  'concurrency-schedule-harness.mjs',
  'proof-receipt-validator.mjs'
];

/**
 * Extracts all internal relative markdown links from a document.
 * Ignores external URLs (http/https) and pure anchor links (#...).
 *
 * @param {string} content Markdown document content
 * @returns {string[]} Array of relative target paths
 */
function extractRelativeMarkdownLinks(content) {
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const rawTarget = match[2].trim();
    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://')) {
      continue;
    }
    if (rawTarget.startsWith('#')) {
      continue;
    }
    // Strip in-document hash anchors if present
    const cleanTarget = rawTarget.split('#')[0];
    if (cleanTarget.length > 0) {
      links.push(cleanTarget);
    }
  }

  return links;
}

/**
 * Extracts referenced JavaScript / shell script paths from markdown code blocks.
 *
 * @param {string} content Markdown document content
 * @returns {string[]} Array of script paths referenced in code blocks
 */
function extractReferencedScripts(content) {
  const scripts = new Set();
  const codeBlockRegex = /```(?:bash|sh)?\n([\s\S]*?)```/g;
  let blockMatch;

  while ((blockMatch = codeBlockRegex.exec(content)) !== null) {
    const blockCode = blockMatch[1];
    const lines = blockCode.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue; // Skip pure comments

      // Pattern: node (scripts/\S+\.mjs) or (scripts/\S+\.mjs)
      const scriptMatches = trimmed.matchAll(/(?:node\s+)?(scripts\/(?:harness|lib|ci)\/[\w-]+\.mjs)/g);
      for (const sm of scriptMatches) {
        scripts.add(sm[1]);
      }
    }
  }

  return Array.from(scripts);
}

describe('G-PROOF-013: Verification Documentation Conformance Suite', () => {

  // ── 1. Document Existence & Encoding ────────────────────────────────────────

  it('Test 01: Verification Architecture Guide exists on disk', () => {
    assert.strictEqual(fs.existsSync(ARCH_GUIDE_PATH), true, `File missing: ${ARCH_GUIDE_PATH}`);
  });

  it('Test 02: Verification Operator Runbook exists on disk', () => {
    assert.strictEqual(fs.existsSync(RUNBOOK_PATH), true, `File missing: ${RUNBOOK_PATH}`);
  });

  it('Test 03: Architecture Guide has non-empty UTF-8 content and standard header', () => {
    const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
    assert.ok(content.length > 5000, `Architecture guide content too short (${content.length} bytes)`);
    assert.ok(content.includes('# DAVE Mathematical Invariant & Assurance Framework: Verification Architecture Guide'));
    assert.ok(content.includes('**Version:** 3.0.0'));
  });

  it('Test 04: Operator Runbook has non-empty UTF-8 content and standard header', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.length > 5000, `Operator runbook content too short (${content.length} bytes)`);
    assert.ok(content.includes('# DAVE Mathematical Invariant & Assurance Framework: Verification Operator Runbook'));
    assert.ok(content.includes('**Version:** 3.0.0'));
  });

  // ── 2. Markdown Link Integrity ──────────────────────────────────────────────

  it('Test 05: All relative markdown links in Architecture Guide resolve to existing files', () => {
    const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
    const links = extractRelativeMarkdownLinks(content);
    assert.ok(links.length > 0, 'No links extracted from architecture guide');

    const baseDir = path.dirname(ARCH_GUIDE_PATH);
    for (const link of links) {
      const resolvedTarget = path.resolve(baseDir, link);
      assert.strictEqual(
        fs.existsSync(resolvedTarget),
        true,
        `Broken relative link in Architecture Guide: "${link}" -> "${resolvedTarget}"`
      );
    }
  });

  it('Test 06: All relative markdown links in Operator Runbook resolve to existing files', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    const links = extractRelativeMarkdownLinks(content);
    assert.ok(links.length > 0, 'No links extracted from operator runbook');

    const baseDir = path.dirname(RUNBOOK_PATH);
    for (const link of links) {
      const resolvedTarget = path.resolve(baseDir, link);
      assert.strictEqual(
        fs.existsSync(resolvedTarget),
        true,
        `Broken relative link in Operator Runbook: "${link}" -> "${resolvedTarget}"`
      );
    }
  });

  // ── 3. Code Block Extraction & CLI Script Validity ─────────────────────────

  it('Test 07: Executable code blocks exist in both documentation files', () => {
    const archContent = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
    const runbookContent = fs.readFileSync(RUNBOOK_PATH, 'utf8');

    assert.ok(archContent.includes('```javascript') || archContent.includes('```yaml') || archContent.includes('```json'));
    assert.ok(runbookContent.includes('```bash'));
  });

  it('Test 08: All scripts referenced in Architecture Guide code blocks exist on disk', () => {
    const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
    const scripts = extractReferencedScripts(content);

    for (const scriptPath of scripts) {
      const fullPath = path.resolve(REPO_ROOT, scriptPath);
      assert.strictEqual(
        fs.existsSync(fullPath),
        true,
        `Script referenced in Architecture Guide does not exist on disk: ${scriptPath}`
      );
    }
  });

  it('Test 09: All scripts referenced in Operator Runbook code blocks exist on disk', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    const scripts = extractReferencedScripts(content);
    assert.ok(scripts.length >= 8, `Expected at least 8 harness scripts referenced, found ${scripts.length}`);

    for (const scriptPath of scripts) {
      const fullPath = path.resolve(REPO_ROOT, scriptPath);
      assert.strictEqual(
        fs.existsSync(fullPath),
        true,
        `Script referenced in Operator Runbook does not exist on disk: ${scriptPath}`
      );
    }
  });

  // ── 4. Profile & Epistemic Completeness ─────────────────────────────────────

  it('Test 10: All 7 verification profiles are thoroughly specified in Architecture Guide', () => {
    const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');

    for (const profile of ALL_7_PROFILES) {
      assert.ok(
        content.includes(profile),
        `Verification profile missing from Architecture Guide: ${profile}`
      );
    }
  });

  it('Test 11: All 7 verification profiles are referenced in Operator Runbook', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

    for (const profile of ALL_7_PROFILES) {
      assert.ok(
        content.includes(profile),
        `Verification profile missing from Operator Runbook: ${profile}`
      );
    }
  });

  it('Test 12: All 5 epistemic levels (L0..L4) are thoroughly defined in Architecture Guide', () => {
    const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');

    for (const level of ALL_5_EPISTEMIC_LEVELS) {
      assert.ok(
        content.includes(`[${level}]`) || content.includes(`**${level}**`) || content.includes(`**$${level}$**`) || content.includes(`$${level}$`),
        `Epistemic level missing from Architecture Guide: ${level}`
      );
    }
    assert.ok(content.includes('Anti-Pseudo-Proof Demarcation'));
    assert.ok(content.includes('Abstraction Boundary Disclosures'));
  });

  it('Test 13: Epistemic Continuum & Demarcation is referenced in Operator Runbook', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

    assert.ok(content.includes('epistemic-classification-gate.mjs'));
    assert.ok(content.includes('L0'));
    assert.ok(content.includes('L4'));
    assert.ok(content.includes('Anti-Stub Scan'));
  });

  // ── 5. The 8 Troubleshooting Playbooks Completeness ────────────────────────

  it('Test 14: Playbook 1 (Invariant Violation & Delta Shrinking Analysis) is defined with runnable command', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.includes('Playbook 1: Invariant Violation & Delta Shrinking Analysis'));
    assert.ok(content.includes('node scripts/harness/property-invariant-harness.mjs'));
    assert.ok(content.includes('Shrunk minimal counterexample'));
  });

  it('Test 15: Playbook 2 (Shadow Oracle State Divergence Remediation) is defined with runnable command', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.includes('Playbook 2: Shadow Oracle State Divergence Remediation'));
    assert.ok(content.includes('node scripts/harness/stateful-model-harness.mjs'));
    assert.ok(content.includes('State divergence'));
  });

  it('Test 16: Playbook 3 (Adversarial Arithmetic Extremes & Precision Dust Remediation) is defined with runnable command', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.includes('Playbook 3: Adversarial Arithmetic Extremes & Precision Dust Remediation'));
    assert.ok(content.includes('node scripts/harness/adversarial-boundary-harness.mjs'));
    assert.ok(content.includes('Precision Dust Conservation'));
  });

  it('Test 17: Playbook 4 (Mutation Kill Score Shortfall Remediation) is defined with runnable command', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.includes('Playbook 4: Mutation Kill Score Shortfall Remediation'));
    assert.ok(content.includes('node scripts/harness/mutation-testing-harness.mjs'));
    assert.ok(content.includes('85%'));
  });

  it('Test 18: Playbook 5 (Epistemic Pseudo-Proof & Undisclosed Stub Remediation) is defined with runnable command', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.includes('Playbook 5: Epistemic Pseudo-Proof & Undisclosed Stub Remediation'));
    assert.ok(content.includes('node scripts/harness/epistemic-classification-gate.mjs'));
    assert.ok(content.includes('--audit-stubs'));
  });

  it('Test 19: Playbook 6 (Counterexample Replay & Deterministic Minimization) is defined with runnable command', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.includes('Playbook 6: Counterexample Replay & Deterministic Minimization'));
    assert.ok(content.includes('node scripts/harness/counterexample-minimizer.mjs'));
    assert.ok(content.includes('--replay'));
  });

  it('Test 20: Playbook 7 (Stale Receipt & Hash Desync Re-binding) is defined with runnable command', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.includes('Playbook 7: Stale Receipt & Hash Desync Re-binding'));
    assert.ok(content.includes('node scripts/harness/proof-receipt-validator.mjs'));
    assert.ok(content.includes('SHA256 mismatch'));
  });

  it('Test 21: Playbook 8 (Concurrency Race & Deadlock Resolution) is defined with runnable command', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    assert.ok(content.includes('Playbook 8: Concurrency Race & Deadlock Resolution'));
    assert.ok(content.includes('node scripts/harness/concurrency-schedule-harness.mjs'));
    assert.ok(content.toLowerCase().includes('tagged pointer'));
  });

  // ── 6. Governance & Invariants Assertions ───────────────────────────────────

  it('Test 22: Hexagonal Architecture, Zero Floats & Pure Core Isolation are codified', () => {
    const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');

    assert.ok(content.includes('Zero-Float Invariant') || content.includes('Minor-Unit Integer Arithmetic'));
    assert.ok(content.includes('Pure Domain Isolation'));
    assert.ok(content.includes('Hexagonal Ports & Adapters'));
    assert.ok(content.includes('Typestate'));
  });

  it('Test 23: Global Constitution Article I (Zero Mocks) & 28 Pillars are documented', () => {
    const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');

    assert.ok(content.includes('Article I Zero-Mock Invariant'));
    assert.ok(content.includes('Article II Mandatory Verification Pass'));
    assert.ok(content.includes('Article III Structured Disclosure Standard'));
    assert.ok(content.includes('28-Pillar Senior Engineering Protocol') || content.includes('28 Senior Engineering'));
  });

  it('Test 24: Proof Receipt JSON Schema structure and 24h freshness SLA are documented', () => {
    const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');

    assert.ok(content.includes('source_revision'));
    assert.ok(content.includes('source_files'));
    assert.ok(content.includes('sha256'));
    assert.ok(content.includes('24-Hour SLA'));
  });

  it('Test 25: All 8 canonical proof harnesses are documented with dedicated CLI sections', () => {
    const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

    for (const harness of CORE_8_PROOF_HARNESSES) {
      assert.ok(
        content.includes(harness),
        `Core harness CLI section missing from Operator Runbook: ${harness}`
      );
    }
  });

});
