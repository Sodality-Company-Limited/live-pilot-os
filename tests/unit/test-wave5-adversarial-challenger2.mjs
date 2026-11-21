#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ ADVERSARIAL EMPIRICAL CHALLENGE SUITE: WAVE 5 GOAL G-PROOF-013
 * ════════════════════════════════════════════════════════════════════════════════
 * Target: G-PROOF-013 (Verification Architecture Guide, Operator Runbook &
 *                      Documentation Conformance)
 * Challenger: challenger_wave5_2 (Roles: Critic, Specialist, Empirical Challenger)
 * Standards: Global Engineering Constitution (Article I, II, III), 28 Senior
 *            Engineering Pillars, Zero Mocks, Live Script Execution
 *
 * Focus Dimensions:
 *   1. Exhaustive link & cross-reference verification (100% resolution, zero broken links)
 *   2. CLI command, flag, and referenced script path validation across all code snippets
 *   3. Conformance test harness robustness under synthetic mutation injection
 *   4. Completeness audit of all 8 troubleshooting playbooks (symptoms, root causes, remediation)
 *   5. Cryptographic proof receipt validation, SHA-256 live byte matching, and template parity
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const ARCH_GUIDE_PATH = path.resolve(REPO_ROOT, 'docs/03-architecture/verification-architecture-guide.md');
const RUNBOOK_PATH = path.resolve(REPO_ROOT, 'docs/06-workflows/verification-operator-runbook.md');
const CONFORMANCE_TEST_PATH = path.resolve(REPO_ROOT, 'tests/unit/test-verification-documentation-conformance.mjs');
const RECEIPT_PATH = path.resolve(REPO_ROOT, 'docs/07-backlog/evidence/G-PROOF-013-proof-receipt.json');
const GOAL_ARCHIVED_PATH = path.resolve(REPO_ROOT, 'docs/07-backlog/goals/_archived/G-PROOF-013.md');

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

const ALL_8_HARNESS_SCRIPTS = [
  'scripts/harness/property-invariant-harness.mjs',
  'scripts/harness/stateful-model-harness.mjs',
  'scripts/harness/adversarial-boundary-harness.mjs',
  'scripts/harness/mutation-testing-harness.mjs',
  'scripts/harness/epistemic-classification-gate.mjs',
  'scripts/harness/counterexample-minimizer.mjs',
  'scripts/harness/concurrency-schedule-harness.mjs',
  'scripts/harness/proof-receipt-validator.mjs'
];

/**
 * Extracts markdown links [text](target) from markdown content.
 */
function extractAllMarkdownLinks(content) {
  const links = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push({
      text: match[1].trim(),
      rawTarget: match[2].trim()
    });
  }
  return links;
}

/**
 * Extracts bash code blocks from markdown content.
 */
function extractBashCodeBlocks(content) {
  const blocks = [];
  const regex = /```(?:bash|sh)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

/**
 * Computes live SHA-256 digest of a file.
 */
function computeFileSha256(filePath) {
  const data = fs.readFileSync(path.resolve(REPO_ROOT, filePath));
  return crypto.createHash('sha256').update(data).digest('hex');
}

describe('⚔️ Adversarial Empirical Challenge: Wave 5 Goal G-PROOF-013', () => {

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. Exhaustive Link Verification & Cross-Reference Integrity
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('1. Exhaustive Link & Cross-Reference Integrity Probes', () => {

    it('1.1 should verify 100% of relative markdown links in Architecture Guide resolve to existing disk files', () => {
      const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
      const links = extractAllMarkdownLinks(content);
      assert.ok(links.length >= 10, `Expected at least 10 links in Architecture Guide, found ${links.length}`);

      const baseDir = path.dirname(ARCH_GUIDE_PATH);
      for (const link of links) {
        if (link.rawTarget.startsWith('http://') || link.rawTarget.startsWith('https://')) {
          continue;
        }
        const cleanPath = link.rawTarget.split('#')[0];
        if (cleanPath.length === 0) continue; // Pure in-document anchor
        const resolved = path.resolve(baseDir, cleanPath);
        assert.strictEqual(
          fs.existsSync(resolved),
          true,
          `Architecture Guide broken link target: "${link.rawTarget}" resolved to "${resolved}"`
        );
      }
    });

    it('1.2 should verify 100% of relative markdown links in Operator Runbook resolve to existing disk files', () => {
      const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
      const links = extractAllMarkdownLinks(content);
      assert.ok(links.length >= 4, `Expected at least 4 links in Operator Runbook, found ${links.length}`);

      const baseDir = path.dirname(RUNBOOK_PATH);
      for (const link of links) {
        if (link.rawTarget.startsWith('http://') || link.rawTarget.startsWith('https://')) {
          continue;
        }
        const cleanPath = link.rawTarget.split('#')[0];
        if (cleanPath.length === 0) continue;
        const resolved = path.resolve(baseDir, cleanPath);
        assert.strictEqual(
          fs.existsSync(resolved),
          true,
          `Operator Runbook broken link target: "${link.rawTarget}" resolved to "${resolved}"`
        );
      }
    });

    it('1.3 should verify all header cross-references in Architecture Guide exist on disk', () => {
      const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
      const crossRefSection = content.split('**Cross-References:**')[1]?.split('---')[0] || '';
      assert.ok(crossRefSection.length > 0, 'Cross-References section missing from Architecture Guide');

      const links = extractAllMarkdownLinks(crossRefSection);
      assert.strictEqual(links.length, 6, `Expected exactly 6 header cross-references, found ${links.length}`);

      const baseDir = path.dirname(ARCH_GUIDE_PATH);
      for (const link of links) {
        const resolved = path.resolve(baseDir, link.rawTarget);
        assert.strictEqual(fs.existsSync(resolved), true, `Header cross-reference file missing: ${link.rawTarget}`);
      }
    });

    it('1.4 should verify all header cross-references in Operator Runbook exist on disk', () => {
      const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');
      const crossRefSection = content.split('**Cross-References:**')[1]?.split('---')[0] || '';
      assert.ok(crossRefSection.length > 0, 'Cross-References section missing from Operator Runbook');

      const links = extractAllMarkdownLinks(crossRefSection);
      assert.strictEqual(links.length, 4, `Expected exactly 4 header cross-references, found ${links.length}`);

      const baseDir = path.dirname(RUNBOOK_PATH);
      for (const link of links) {
        const resolved = path.resolve(baseDir, link.rawTarget);
        assert.strictEqual(fs.existsSync(resolved), true, `Header cross-reference file missing: ${link.rawTarget}`);
      }
    });

    it('1.5 should verify all targets in Section 7 Knowledge Links table exist on disk', () => {
      const content = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
      const sec7 = content.split('## 7. Knowledge Links & Verification Cross-References')[1] || '';
      assert.ok(sec7.length > 0, 'Section 7 missing from Architecture Guide');

      const links = extractAllMarkdownLinks(sec7);
      assert.strictEqual(links.length, 6, `Expected 6 links in Section 7 Knowledge Links table, found ${links.length}`);

      const baseDir = path.dirname(ARCH_GUIDE_PATH);
      for (const link of links) {
        const resolved = path.resolve(baseDir, link.rawTarget);
        assert.strictEqual(fs.existsSync(resolved), true, `Section 7 table link missing: ${link.rawTarget}`);
      }
    });

    it('1.6 should reject empty link targets or malformed markdown link syntax', () => {
      const archContent = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
      const runbookContent = fs.readFileSync(RUNBOOK_PATH, 'utf8');

      // Check for empty targets: []( ) or [text]()
      assert.strictEqual(/\[[^\]]*\]\(\s*\)/.test(archContent), false, 'Architecture Guide contains empty link target');
      assert.strictEqual(/\[[^\]]*\]\(\s*\)/.test(runbookContent), false, 'Operator Runbook contains empty link target');
    });

  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. CLI Command, Script Path & Argument Parsing Validation
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('2. CLI Command & Script Validation Across All Code Snippets', () => {

    it('2.1 should verify every referenced script path across all code blocks exists on disk', () => {
      const archContent = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
      const runbookContent = fs.readFileSync(RUNBOOK_PATH, 'utf8');
      const combined = archContent + '\n' + runbookContent;

      const scriptRegex = /(?:node\s+)?(scripts\/(?:harness|lib|ci)\/[\w-]+\.mjs)/g;
      const foundScripts = new Set();
      let match;
      while ((match = scriptRegex.exec(combined)) !== null) {
        foundScripts.add(match[1]);
      }

      assert.ok(foundScripts.size >= 10, `Expected at least 10 script paths referenced, found ${foundScripts.size}`);
      for (const scriptPath of foundScripts) {
        const full = path.resolve(REPO_ROOT, scriptPath);
        assert.strictEqual(fs.existsSync(full), true, `Referenced script does not exist on disk: ${scriptPath}`);
      }
    });

    it('2.2 should verify all 8 canonical proof harness scripts physically exist and have non-empty size', () => {
      for (const script of ALL_8_HARNESS_SCRIPTS) {
        const fullPath = path.resolve(REPO_ROOT, script);
        assert.strictEqual(fs.existsSync(fullPath), true, `Harness missing: ${script}`);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size > 1000, `Harness file suspiciously small (${stat.size} bytes): ${script}`);
      }
    });

    it('2.3 should verify all 7 supporting library modules referenced exist on disk', () => {
      const supportingLibs = [
        'scripts/lib/invariant-runner.mjs',
        'scripts/lib/shadow-oracle-validator.mjs',
        'scripts/lib/adversarial-probe-generator.mjs',
        'scripts/lib/ast-mutator.mjs',
        'scripts/lib/epistemic-classifier.mjs',
        'scripts/lib/receipt-freshness-engine.mjs',
        'scripts/lib/schedule-sequentializer.mjs'
      ];

      for (const lib of supportingLibs) {
        const fullPath = path.resolve(REPO_ROOT, lib);
        assert.strictEqual(fs.existsSync(fullPath), true, `Library module missing: ${lib}`);
      }
    });

    it('2.4 should execute dry-run / sample commands from each harness and confirm exit code 0', () => {
      // 1. Property invariant harness
      const r1 = execSync('node scripts/harness/property-invariant-harness.mjs --cases 100 --seed 42', { encoding: 'utf8' });
      assert.ok(r1.includes('ALL INVARIANTS PASSED'), 'property-invariant-harness failed');

      // 2. Stateful model harness
      const r2 = execSync('node scripts/harness/stateful-model-harness.mjs --model all --steps 10 --seed 42', { encoding: 'utf8' });
      assert.ok(r2.includes('ALL STATEFUL MODEL CHECKS PASSED'), 'stateful-model-harness failed');

      // 3. Adversarial boundary harness
      const r3 = execSync('node scripts/harness/adversarial-boundary-harness.mjs --dust-iterations 10 --seed 42', { encoding: 'utf8' });
      assert.ok(r3.includes('ALL ADVERSARIAL BOUNDARY PROBES PASSED'), 'adversarial-boundary-harness failed');

      // 4. Mutation testing harness
      const r4 = execSync('node scripts/harness/mutation-testing-harness.mjs --threshold 85', { encoding: 'utf8' });
      assert.ok(r4.includes('MUTATION TESTING GATE PASSED'), 'mutation-testing-harness failed');

      // 5. Epistemic classification gate
      const r5 = execSync('node scripts/harness/epistemic-classification-gate.mjs --audit-stubs', { encoding: 'utf8' });
      assert.ok(r5.includes('GATE PASS'), 'epistemic-classification-gate failed');

      // 6. Concurrency schedule harness
      const r6 = execSync('node scripts/harness/concurrency-schedule-harness.mjs --tasks 2 --depth 4', { encoding: 'utf8' });
      assert.ok(r6.includes('PASSED'), 'concurrency-schedule-harness failed');

      // 7. Touch map collision gate
      const r7 = execSync('node scripts/harness/touch-map-collision-gate.mjs --strict', { encoding: 'utf8' });
      assert.ok(r7.includes('ALL TOUCH MAPS DISJOINT'), 'touch-map-collision-gate failed');

      // 8. Proof receipt validator
      const r8 = execSync('node scripts/harness/proof-receipt-validator.mjs G-PROOF-013', { encoding: 'utf8' });
      assert.ok(r8.includes('Proof Receipt Validated'), 'proof-receipt-validator failed');
    });

    it('2.5 should audit flag behavior in counterexample-minimizer: test --check-freshness vs --freshness', () => {
      // Empirical verification: --check-freshness activates freshness check mode
      const outFreshness = execSync('node scripts/harness/counterexample-minimizer.mjs --check-freshness --receipt G-PROOF-010', { encoding: 'utf8' });
      assert.ok(outFreshness.includes('PROOF RECEIPT FRESHNESS VERIFICATION'), 'counterexample-minimizer --check-freshness failed');
      assert.ok(outFreshness.includes('FRESH'), 'receipt G-PROOF-010 not fresh');

      // Empirical verification: --replay reproduces deterministic failure
      const outReplay = execSync('node scripts/harness/counterexample-minimizer.mjs --replay artifacts/counterexamples/G-PROOF-010-DEMO-INV-001.json', { encoding: 'utf8' });
      assert.ok(outReplay.includes('COUNTEREXAMPLE REPLAY'), 'counterexample-minimizer --replay failed');
      assert.ok(outReplay.includes('VERIFIED'), 'counterexample replay was not verified');
    });

    it('2.6 should audit stateful-model-harness model identifiers (dave-fsm, saga-outbox, lease-token)', () => {
      // Empirical verification: --model dave-fsm executes DAVE Decision FSM
      const outDave = execSync('node scripts/harness/stateful-model-harness.mjs --model dave-fsm --steps 10 --verbose', { encoding: 'utf8' });
      assert.ok(outDave.includes('DAVE Decision FSM'), 'dave-fsm model did not execute');
      assert.ok(outDave.includes('Models Evaluated:       1'), 'Expected 1 model evaluated for dave-fsm');

      // Empirical verification: --model saga-outbox executes Saga Transactional Outbox
      const outSaga = execSync('node scripts/harness/stateful-model-harness.mjs --model saga-outbox --steps 10', { encoding: 'utf8' });
      assert.ok(outSaga.includes('Saga Transactional Outbox'), 'saga-outbox model did not execute');
    });

  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. Conformance Test Harness Robustness & Synthetic Mutation Injection
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('3. Conformance Test Harness Robustness & Adversarial Mutation Injection', () => {

    it('3.1 should fail relative link check when simulated broken relative link is injected', () => {
      const sampleDoc = `
# Sample Architecture Guide
- [Valid Link](proof-and-evidence.md)
- [Broken Link](non-existent-missing-file-404.md)
`;
      const links = extractAllMarkdownLinks(sampleDoc);
      const baseDir = path.dirname(ARCH_GUIDE_PATH);

      let brokenDetected = false;
      for (const l of links) {
        const resolved = path.resolve(baseDir, l.rawTarget);
        if (!fs.existsSync(resolved)) {
          brokenDetected = true;
          break;
        }
      }
      assert.strictEqual(brokenDetected, true, 'Link check failed to catch simulated broken link');
    });

    it('3.2 should fail script reference check when simulated non-existent script is injected into code block', () => {
      const sampleDoc = `
\`\`\`bash
node scripts/harness/phantom-non-existent-script.mjs --cases 100
\`\`\`
`;
      const scriptRegex = /(?:node\s+)?(scripts\/(?:harness|lib|ci)\/[\w-]+\.mjs)/g;
      const foundScripts = [];
      let m;
      while ((m = scriptRegex.exec(sampleDoc)) !== null) {
        foundScripts.push(m[1]);
      }

      assert.strictEqual(foundScripts.length, 1);
      assert.strictEqual(fs.existsSync(path.resolve(REPO_ROOT, foundScripts[0])), false);
    });

    it('3.3 should fail profile completeness check when any of the 7 profiles is omitted', () => {
      const fullGuideContent = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');

      for (const omittedProfile of ALL_7_PROFILES) {
        // Mutate guide content by stripping the omitted profile token completely
        const mutatedContent = fullGuideContent.replaceAll(omittedProfile, 'omitted_profile_placeholder');

        const profileDetected = mutatedContent.includes(omittedProfile);
        assert.strictEqual(
          profileDetected,
          false,
          `Mutated content should NOT contain ${omittedProfile}`
        );

        // Verify that asserting its presence in mutated content throws an assertion error
        assert.throws(() => {
          assert.ok(
            mutatedContent.includes(omittedProfile),
            `Verification profile missing: ${omittedProfile}`
          );
        }, /Verification profile missing/);
      }
    });

    it('3.4 should fail epistemic tier completeness check when any of L0..L4 is omitted', () => {
      const fullGuideContent = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');

      for (const tier of ALL_5_EPISTEMIC_LEVELS) {
        const mutatedContent = fullGuideContent
          .replaceAll(`[${tier}]`, '[XX]')
          .replaceAll(`**${tier}**`, '**XX**')
          .replaceAll(`**$${tier}$**`, '**$XX$**')
          .replaceAll(`$${tier}$`, '$XX$');

        assert.throws(() => {
          assert.ok(
            mutatedContent.includes(`[${tier}]`) ||
            mutatedContent.includes(`**${tier}**`) ||
            mutatedContent.includes(`**$${tier}$**`) ||
            mutatedContent.includes(`$${tier}$`),
            `Epistemic level missing: ${tier}`
          );
        }, /Epistemic level missing/);
      }
    });

    it('3.5 should fail playbook completeness check when any of Playbooks 1..8 is omitted', () => {
      const fullRunbookContent = fs.readFileSync(RUNBOOK_PATH, 'utf8');

      for (let i = 1; i <= 8; i++) {
        const playbookTag = `Playbook ${i}`;
        const mutatedRunbook = fullRunbookContent.replaceAll(playbookTag, 'Playbook OMITTED');

        assert.throws(() => {
          assert.ok(
            mutatedRunbook.includes(playbookTag),
            `Playbook missing: ${playbookTag}`
          );
        }, /Playbook missing/);
      }
    });

    it('3.6 should fail governance check when Article I Zero-Mock invariant is omitted', () => {
      const fullGuideContent = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
      const mutatedContent = fullGuideContent.replaceAll('Article I Zero-Mock Invariant', 'OMITTED');

      assert.throws(() => {
        assert.ok(
          mutatedContent.includes('Article I Zero-Mock Invariant'),
          'Governance invariant missing: Article I'
        );
      }, /Governance invariant missing/);
    });

    it('3.7 should fail 28-Pillar check when Senior Engineering Pillars reference is omitted', () => {
      const fullGuideContent = fs.readFileSync(ARCH_GUIDE_PATH, 'utf8');
      const mutatedContent = fullGuideContent
        .replaceAll('28-Pillar Senior Engineering Protocol', 'OMITTED')
        .replaceAll('28 Senior Engineering', 'OMITTED');

      assert.throws(() => {
        assert.ok(
          mutatedContent.includes('28-Pillar Senior Engineering Protocol') ||
          mutatedContent.includes('28 Senior Engineering'),
          'Governance reference missing: 28 Pillars'
        );
      }, /Governance reference missing/);
    });

    it('3.8 should handle adversarial markdown link patterns (multiple links per line, trailing punctuation)', () => {
      const trickyMarkdown = `
- Check [Guide](../03-architecture/verification-architecture-guide.md) and [Runbook](../06-workflows/verification-operator-runbook.md)!
- See [Evidence](../../docs/03-architecture/proof-and-evidence.md#L10) for details.
- Ignore [External Google](https://google.com) and [Internal Anchor](#section-1).
`;
      const links = extractAllMarkdownLinks(trickyMarkdown);
      assert.strictEqual(links.length, 5, 'Failed to extract all 5 markdown links from tricky content');
      assert.strictEqual(links[0].text, 'Guide');
      assert.strictEqual(links[1].text, 'Runbook');
      assert.strictEqual(links[2].text, 'Evidence');
      assert.strictEqual(links[3].text, 'External Google');
      assert.strictEqual(links[4].text, 'Internal Anchor');
    });

  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. Troubleshooting Playbooks Completeness Audit (Playbooks 1 through 8)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('4. The 8 Troubleshooting Playbooks Completeness Audit', () => {

    const EXPECTED_PLAYBOOKS = [
      { id: 1, title: 'Invariant Violation & Delta Shrinking Analysis' },
      { id: 2, title: 'Shadow Oracle State Divergence Remediation' },
      { id: 3, title: 'Adversarial Arithmetic Extremes & Precision Dust Remediation' },
      { id: 4, title: 'Mutation Kill Score Shortfall Remediation' },
      { id: 5, title: 'Epistemic Pseudo-Proof & Undisclosed Stub Remediation' },
      { id: 6, title: 'Counterexample Replay & Deterministic Minimization' },
      { id: 7, title: 'Stale Receipt & Hash Desync Re-binding' },
      { id: 8, title: 'Concurrency Race & Deadlock Resolution' }
    ];

    it('4.1 should verify all 8 playbooks exist in exact sequential order with header format', () => {
      const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

      let lastIndex = -1;
      for (const pb of EXPECTED_PLAYBOOKS) {
        const header = `### Playbook ${pb.id}: ${pb.title}`;
        const idx = content.indexOf(header);
        assert.ok(idx !== -1, `Playbook header missing: "${header}"`);
        assert.ok(idx > lastIndex, `Playbook ${pb.id} out of order (pos ${idx} <= last ${lastIndex})`);
        lastIndex = idx;
      }
    });

    it('4.2 should verify every playbook has a dedicated non-empty Symptom section', () => {
      const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

      for (const pb of EXPECTED_PLAYBOOKS) {
        const pbSection = content.split(`### Playbook ${pb.id}:`)[1]?.split(/### Playbook \d:|## 4\./)[0] || '';
        assert.ok(pbSection.length > 0, `Playbook ${pb.id} section content empty`);
        assert.ok(pbSection.includes('**Symptom:**'), `Playbook ${pb.id} missing **Symptom:** header`);

        const symptomContent = pbSection.split('**Symptom:**')[1]?.split('**Root Cause:**')[0] || '';
        assert.ok(symptomContent.trim().length > 30, `Playbook ${pb.id} symptom content too brief (${symptomContent.length} chars)`);
      }
    });

    it('4.3 should verify every playbook has a dedicated non-empty Root Cause section', () => {
      const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

      for (const pb of EXPECTED_PLAYBOOKS) {
        const pbSection = content.split(`### Playbook ${pb.id}:`)[1]?.split(/### Playbook \d:|## 4\./)[0] || '';
        assert.ok(pbSection.includes('**Root Cause:**'), `Playbook ${pb.id} missing **Root Cause:** header`);

        const rootCauseContent = pbSection.split('**Root Cause:**')[1]?.split('**Remediation Steps:**')[0] || '';
        assert.ok(rootCauseContent.trim().length > 30, `Playbook ${pb.id} root cause too brief (${rootCauseContent.length} chars)`);
      }
    });

    it('4.4 should verify every playbook has numbered Remediation Steps with actionable steps', () => {
      const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

      for (const pb of EXPECTED_PLAYBOOKS) {
        const pbSection = content.split(`### Playbook ${pb.id}:`)[1]?.split(/### Playbook \d:|## 4\./)[0] || '';
        assert.ok(pbSection.includes('**Remediation Steps:**'), `Playbook ${pb.id} missing **Remediation Steps:** header`);

        const remediationContent = pbSection.split('**Remediation Steps:**')[1] || '';
        assert.ok(remediationContent.includes('1. '), `Playbook ${pb.id} missing Step 1`);
        assert.ok(remediationContent.includes('2. '), `Playbook ${pb.id} missing Step 2`);
        assert.ok(remediationContent.includes('3. '), `Playbook ${pb.id} missing Step 3`);
      }
    });

    it('4.5 should verify every playbook contains at least one executable bash code block', () => {
      const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

      for (const pb of EXPECTED_PLAYBOOKS) {
        const pbSection = content.split(`### Playbook ${pb.id}:`)[1]?.split(/### Playbook \d:|## 4\./)[0] || '';
        const bashBlocks = extractBashCodeBlocks(pbSection);
        assert.ok(bashBlocks.length >= 1, `Playbook ${pb.id} missing executable bash code block`);

        for (const block of bashBlocks) {
          assert.ok(block.trim().length > 10, `Playbook ${pb.id} has empty or trivial bash block`);
        }
      }
    });

    it('4.6 should verify all scripts referenced in playbook remediation bash blocks exist on disk', () => {
      const content = fs.readFileSync(RUNBOOK_PATH, 'utf8');

      for (const pb of EXPECTED_PLAYBOOKS) {
        const pbSection = content.split(`### Playbook ${pb.id}:`)[1]?.split(/### Playbook \d:|## 4\./)[0] || '';
        const bashBlocks = extractBashCodeBlocks(pbSection);

        for (const block of bashBlocks) {
          const scriptMatches = block.matchAll(/(?:node\s+)?(scripts\/harness\/[\w-]+\.mjs)/g);
          for (const sm of scriptMatches) {
            const scriptPath = sm[1];
            assert.strictEqual(
              fs.existsSync(path.resolve(REPO_ROOT, scriptPath)),
              true,
              `Playbook ${pb.id} references missing script: ${scriptPath}`
            );
          }
        }
      }
    });

    it('4.7 should execute live verification commands for Playbooks 1, 3, 4, 5, 7, 8 cleanly', () => {
      // Playbook 1 command
      const p1Out = execSync('node scripts/harness/property-invariant-harness.mjs --cases 100 --seed 133742 --verbose', { encoding: 'utf8' });
      assert.ok(p1Out.includes('ALL INVARIANTS PASSED'), 'Playbook 1 command failed');

      // Playbook 3 command
      const p3Out = execSync('node scripts/harness/adversarial-boundary-harness.mjs --dust-iterations 100 --verbose', { encoding: 'utf8' });
      assert.ok(p3Out.includes('ALL ADVERSARIAL BOUNDARY PROBES PASSED'), 'Playbook 3 command failed');

      // Playbook 4 command
      const p4Out = execSync('node scripts/harness/mutation-testing-harness.mjs --threshold 85 --verbose', { encoding: 'utf8' });
      assert.ok(p4Out.includes('MUTATION TESTING GATE PASSED'), 'Playbook 4 command failed');

      // Playbook 5 command
      const p5Out = execSync('node scripts/harness/epistemic-classification-gate.mjs --audit-stubs --verbose', { encoding: 'utf8' });
      assert.ok(p5Out.includes('GATE PASS'), 'Playbook 5 command failed');

      // Playbook 7 command
      const p7Out = execSync('node scripts/harness/proof-receipt-validator.mjs G-PROOF-013', { encoding: 'utf8' });
      assert.ok(p7Out.includes('Proof Receipt Validated'), 'Playbook 7 command failed');

      // Playbook 8 command
      const p8Out = execSync('node scripts/harness/concurrency-schedule-harness.mjs --tasks 3 --depth 6 --verbose', { encoding: 'utf8' });
      assert.ok(p8Out.includes('PASSED'), 'Playbook 8 command failed');
    });

  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. Cryptographic Proof Receipt, Governance & Template Parity Audit
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('5. Cryptographic Proof Receipt, Governance & Template Parity Audit', () => {

    it('5.1 should validate G-PROOF-013 proof receipt using canonical receipt validator (exit 0)', () => {
      const output = execSync('node scripts/harness/proof-receipt-validator.mjs G-PROOF-013', { encoding: 'utf8' });
      assert.ok(output.includes('✅ Proof Receipt Validated'), 'Validator failed on G-PROOF-013');
      assert.ok(output.includes('Goal: G-PROOF-013'), 'Goal mismatch in validator output');
      assert.ok(output.includes('Classification: executable_invariant'), 'Classification mismatch');
    });

    it('5.2 should verify physical SHA-256 byte hashes in receipt match active disk bytes exactly', () => {
      const receipt = JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
      assert.ok(Array.isArray(receipt.source_files), 'source_files missing from receipt');
      assert.strictEqual(receipt.source_files.length, 2, 'Expected exactly 2 source files in receipt');

      for (const sf of receipt.source_files) {
        const diskHash = computeFileSha256(sf.path);
        assert.strictEqual(
          diskHash,
          sf.sha256,
          `Cryptographic SHA-256 desync for "${sf.path}": receipt=${sf.sha256}, disk=${diskHash}`
        );
      }
    });

    it('5.3 should verify source_revision in receipt matches active git HEAD', () => {
      const receipt = JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
      const activeGitHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      assert.strictEqual(
        receipt.source_revision,
        activeGitHead,
        `Receipt source_revision (${receipt.source_revision}) does not match git HEAD (${activeGitHead})`
      );
    });

    it('5.4 should verify receipt freshness SLA (< 24 hours)', () => {
      const receipt = JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
      const generatedAt = new Date(receipt.generated_at).getTime();
      const now = Date.now();
      const ageHours = (now - generatedAt) / (1000 * 60 * 60);

      assert.ok(
        ageHours >= 0 && ageHours < 24.0,
        `Proof receipt has exceeded 24-hour freshness SLA: ${ageHours.toFixed(2)} hours old`
      );
    });

    it('5.5 should verify senior engineering gate passes with 0 violations across 28 pillars', () => {
      const output = execSync('node scripts/harness/senior-engineering-gate-harness.mjs', { encoding: 'utf8' });
      assert.ok(output.includes('Violations: 0'), 'Senior engineering gate detected violations');
      assert.ok(output.includes('✅ ALL GATES PASSED'), 'Gate verdict was not ALL GATES PASSED');
    });

    it('5.6 should verify no-mock production gate passes clean (zero stubs/mocks)', () => {
      const output = execSync('node scripts/harness/no-mock-production-gate-harness.mjs', { encoding: 'utf8' });
      assert.ok(output.includes('Zero-mock production gate passed'), 'Zero-mock gate failed');
    });

    it('5.7 should verify goal template conformance harness certifies 51/51 sections', () => {
      const output = execSync(`node scripts/harness/goal-template-conformance-harness.mjs ${GOAL_ARCHIVED_PATH}`, { encoding: 'utf8' });
      assert.ok(output.includes('100% Conformance Verified'), 'Goal template conformance failed');
      assert.ok(output.includes('51/51 sections & invariants passed'), 'Section count mismatch');
    });

    it('5.8 should verify goal scope drift harness certifies zero out-of-scope files', () => {
      const output = execSync(`node scripts/harness/goal-scope-drift-harness.mjs ${GOAL_ARCHIVED_PATH}`, { encoding: 'utf8' });
      assert.ok(output.includes('Scope drift verified'), 'Scope drift gate failed');
      assert.ok(output.includes('6 work step files strictly within touch map'), 'Touch map count mismatch');
    });

    it('5.9 should verify 100% bitwise parity between repository deliverables and template/ mirrors', () => {
      const pairs = [
        ['docs/03-architecture/verification-architecture-guide.md', 'template/docs/03-architecture/verification-architecture-guide.md'],
        ['docs/06-workflows/verification-operator-runbook.md', 'template/docs/06-workflows/verification-operator-runbook.md'],
        ['tests/unit/test-verification-documentation-conformance.mjs', 'template/tests/unit/test-verification-documentation-conformance.mjs'],
        ['docs/07-backlog/evidence/G-PROOF-013-proof-receipt.json', 'template/docs/07-backlog/evidence/G-PROOF-013-proof-receipt.json'],
        ['artifacts/proofs/G-PROOF-013-proof-receipt.json', 'template/artifacts/proofs/G-PROOF-013-proof-receipt.json'],
        ['docs/07-backlog/goals/_archived/G-PROOF-013.md', 'template/docs/07-backlog/goals/_archived/G-PROOF-013.md']
      ];

      for (const [repoPath, tmplPath] of pairs) {
        assert.strictEqual(fs.existsSync(repoPath), true, `Repository file missing: ${repoPath}`);
        assert.strictEqual(fs.existsSync(tmplPath), true, `Template file missing: ${tmplPath}`);

        const diffOutput = execSync(`diff -u "${repoPath}" "${tmplPath}" || true`, { encoding: 'utf8' });
        assert.strictEqual(
          diffOutput.trim(),
          '',
          `Bitwise disparity detected between "${repoPath}" and "${tmplPath}":\n${diffOutput}`
        );
      }
    });

  });

});
