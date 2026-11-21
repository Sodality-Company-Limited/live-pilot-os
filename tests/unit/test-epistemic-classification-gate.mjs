import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  EPISTEMIC_TIERS,
  VALID_TIER_IDS,
  TIER_ALIAS_MAP,
  STUB_ABSTRACTION_RULES,
  normalizeTier,
  detectPseudoProof,
  classifyEvidence,
  auditAbstractionBoundaries,
  auditGoalContractEpistemics,
  generateEpistemicProofReceipt
} from '../../scripts/lib/epistemic-classifier.mjs';
import {
  parseArgs,
  runEpistemicGate
} from '../../scripts/harness/epistemic-classification-gate.mjs';
import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('Epistemic Classification & Abstraction Boundary Gate Suite', () => {

  // ── 1. Canonical Tier Definitions & Metadata ────────────────────────────────
  describe('Canonical Tier Definitions & Metadata', () => {
    it('test 1: exports all 5 canonical tiers with ordered ranks from 0 to 4', () => {
      assert.strictEqual(Object.keys(EPISTEMIC_TIERS).length, 5);
      assert.strictEqual(EPISTEMIC_TIERS.L0.tier, 0);
      assert.strictEqual(EPISTEMIC_TIERS.L1.tier, 1);
      assert.strictEqual(EPISTEMIC_TIERS.L2.tier, 2);
      assert.strictEqual(EPISTEMIC_TIERS.L3.tier, 3);
      assert.strictEqual(EPISTEMIC_TIERS.L4.tier, 4);
    });

    it('test 2: exports VALID_TIER_IDS containing exactly [L0, L1, L2, L3, L4]', () => {
      assert.deepStrictEqual(Array.from(VALID_TIER_IDS), ['L0', 'L1', 'L2', 'L3', 'L4']);
    });

    it('test 3: normalizes canonical aliases to standardized tier identifiers', () => {
      assert.strictEqual(normalizeTier('formal_proof'), 'L1');
      assert.strictEqual(normalizeTier('executable_invariant'), 'L2');
      assert.strictEqual(normalizeTier('statistical_evidence'), 'L3');
      assert.strictEqual(normalizeTier('statistical_claim'), 'L3');
      assert.strictEqual(normalizeTier('production_evidence'), 'L4');
      assert.strictEqual(normalizeTier('unverified'), 'L0');
    });

    it('test 4: normalizes case-insensitively and falls back to L0 for invalid inputs', () => {
      assert.strictEqual(normalizeTier('l1'), 'L1');
      assert.strictEqual(normalizeTier('L3'), 'L3');
      assert.strictEqual(normalizeTier('UNKNOWN_TIER'), 'L0');
      assert.strictEqual(normalizeTier(null), 'L0');
      assert.strictEqual(normalizeTier(''), 'L0');
    });

    it('test 5: exports STUB_ABSTRACTION_RULES covering all 7 canonical abstraction categories', () => {
      assert.strictEqual(STUB_ABSTRACTION_RULES.length, 7);
      const categories = STUB_ABSTRACTION_RULES.map(r => r.category);
      assert.ok(categories.includes('solver_stub'));
      assert.ok(categories.includes('test_mock_framework'));
      assert.ok(categories.includes('identifier_stub'));
      assert.ok(categories.includes('environment_clock'));
      assert.ok(categories.includes('environment_network'));
      assert.ok(categories.includes('environment_filesystem'));
      assert.ok(categories.includes('bounded_unwind'));
    });
  });

  // ── 2. Anti-Pseudo-Proof Scanner ───────────────────────────────────────────
  describe('Anti-Pseudo-Proof Scanner', () => {
    it('test 6: rejects unit test runner node --test claiming formal proof (L1)', () => {
      const claim = {
        claimed_tier: 'L1',
        verification_command: 'node --test tests/unit/test-something.mjs',
        statement: 'Claimed mathematical theorem verified by unit test'
      };
      const result = detectPseudoProof(claim);
      assert.strictEqual(result.isPseudoProof, true);
      assert.strictEqual(result.recommendedTier, 'L2');
      assert.ok(result.reasons.some(r => r.includes('unit/integration test runner')));
    });

    it('test 7: rejects external test frameworks (jest, pytest, cargo test) claiming L1', () => {
      const runners = [
        'jest --runInBand',
        'pytest tests/',
        'cargo test --lib',
        'vitest run'
      ];
      for (const cmd of runners) {
        const result = detectPseudoProof({
          claimed_tier: 'L1',
          verification_command: cmd
        });
        assert.strictEqual(result.isPseudoProof, true, `Expected ${cmd} to be flagged as pseudo-proof`);
      }
    });

    it('test 8: rejects L1 claims lacking formal solver artifacts or UNSAT tokens', () => {
      const claim = {
        claimed_tier: 'L1',
        verification_command: 'node scripts/harness/custom-solver.mjs',
        artifacts: ['docs/report.txt'],
        solver_output: 'Execution finished with exit code 0'
      };
      const result = detectPseudoProof(claim);
      assert.strictEqual(result.isPseudoProof, true);
      assert.ok(result.reasons.some(r => r.includes('zero formal solver artifacts')));
    });

    it('test 9: rejects L1 claims where solver output contains SAT (counterexample found)', () => {
      const claim = {
        claimed_tier: 'L1',
        verification_command: 'z3 model.smt2',
        artifacts: ['model.smt2'],
        solver_output: 'sat\n(model (define-fun x () Int 42))'
      };
      const result = detectPseudoProof(claim);
      assert.strictEqual(result.isPseudoProof, true);
      assert.strictEqual(result.recommendedTier, 'L0');
      assert.ok(result.reasons.some(r => r.includes('SAT (counterexample discovered)')));
    });

    it('test 10: accepts genuine formal proof with .smt2 artifact and UNSAT solver output', () => {
      const claim = {
        claimed_tier: 'L1',
        verification_command: 'z3 -smt2 verification/theorem1.smt2',
        artifacts: ['verification/theorem1.smt2'],
        solver_output: 'unsat\nproof validated'
      };
      const result = detectPseudoProof(claim);
      assert.strictEqual(result.isPseudoProof, false);
      assert.strictEqual(result.reasons.length, 0);
      assert.strictEqual(result.recommendedTier, 'L1');
    });

    it('test 11: rejects L4 claim with synthetic data violating Epistemic Demarcation', () => {
      const claim = {
        claimed_tier: 'L4',
        statement: 'Simulated latency telemetry across 500 synthetic nodes',
        synthetic: true
      };
      const result = detectPseudoProof(claim);
      assert.strictEqual(result.isPseudoProof, true);
      assert.ok(result.reasons.some(r => r.includes('Epistemic Demarcation Violation')));
      assert.strictEqual(result.recommendedTier, 'L2');
    });

    it('test 12: accepts genuine L4 operational telemetry without synthetic markers', () => {
      const claim = {
        claimed_tier: 'L4',
        statement: 'Production API Gateway P99 latency SLA verified from cluster telemetry',
        synthetic: false,
        simulated: false
      };
      const result = detectPseudoProof(claim);
      assert.strictEqual(result.isPseudoProof, false);
      assert.strictEqual(result.recommendedTier, 'L4');
    });
  });

  // ── 3. Tier Classification Rules ───────────────────────────────────────────
  describe('Tier Classification Rules', () => {
    it('test 13: classifies evidence with sample_count >= 1000 or Wilson score as L3', () => {
      const ev1 = { sample_count: 10000, passed: true };
      assert.strictEqual(classifyEvidence(ev1).verifiedTier, 'L3');

      const ev2 = { wilson_score: { lower: 0.95, upper: 0.99 }, passed: true };
      assert.strictEqual(classifyEvidence(ev2).verifiedTier, 'L3');
    });

    it('test 14: classifies evidence with Expected Calibration Error (ECE) bounds as L3', () => {
      const ev = { ece: 0.035, sample_count: 500, passed: true };
      assert.strictEqual(classifyEvidence(ev).verifiedTier, 'L3');
    });

    it('test 15: classifies green unit/property verification with exit_code 0 as L2', () => {
      const ev = {
        verification_command: 'node scripts/harness/property-invariant-harness.mjs',
        passed: true,
        exit_code: 0
      };
      const res = classifyEvidence(ev);
      assert.strictEqual(res.verifiedTier, 'L2');
    });

    it('test 16: classifies deterministic invariant assertions as L2', () => {
      const ev = {
        invariant_checked: true,
        statement: 'Minor-unit integer conservation holds under partition'
      };
      const res = classifyEvidence(ev);
      assert.strictEqual(res.verifiedTier, 'L2');
    });

    it('test 17: classifies failed, unexecuted, or empty claims as L0', () => {
      const ev1 = { passed: false, exit_code: 1 };
      assert.strictEqual(classifyEvidence(ev1).verifiedTier, 'L0');

      const ev2 = {};
      assert.strictEqual(classifyEvidence(ev2).verifiedTier, 'L0');
    });

    it('test 18: correctly flags tierSatisfied=false and tierDowngraded=true on pseudo-proof claims', () => {
      const ev = {
        claimed_tier: 'L1',
        verification_command: 'node --test tests/unit/test-proof.mjs',
        passed: true,
        exit_code: 0
      };
      const res = classifyEvidence(ev);
      assert.strictEqual(res.verifiedTier, 'L2');
      assert.strictEqual(res.tierSatisfied, false);
      assert.strictEqual(res.tierDowngraded, true);
      assert.strictEqual(res.details.pseudoProofDetected, true);
    });
  });

  // ── 4. Abstraction Boundary Disclosure Auditor ─────────────────────────────
  describe('Abstraction Boundary Disclosure Auditor', () => {
    it('test 19: code with zero abstractions passes audit cleanly', () => {
      const code = `
        export function add(a, b) {
          return a + b;
        }
      `;
      const audit = auditAbstractionBoundaries({ sourceCode: code, filePath: 'src/math.mjs' });
      assert.strictEqual(audit.compliant, true);
      assert.strictEqual(audit.detectedAbstractions.length, 0);
      assert.strictEqual(audit.undisclosedAbstractions.length, 0);
    });

    it('test 20: flags undisclosed kani::stub fail-closed with exact line location', () => {
      const code = [
        'fn verify_system() {',
        '    kani::stub(external_network_call, real_network);',
        '    assert!(true);',
        '}'
      ].join('\n');

      const audit = auditAbstractionBoundaries({ sourceCode: code, filePath: 'proofs/system.rs' });
      assert.strictEqual(audit.compliant, false);
      assert.strictEqual(audit.detectedAbstractions.length, 1);
      assert.strictEqual(audit.undisclosedAbstractions.length, 1);
      assert.strictEqual(audit.undisclosedAbstractions[0].line, 2);
      assert.strictEqual(audit.undisclosedAbstractions[0].category, 'solver_stub');
    });

    it('test 21: passes when kani::stub is explicitly declared in disclosures manifest', () => {
      const code = [
        'fn verify_system() {',
        '    kani::stub(external_network_call, real_network);',
        '    assert!(true);',
        '}'
      ].join('\n');

      const disclosures = [
        'Disclosed solver_stub for external_network_call to isolate pure invariants'
      ];

      const audit = auditAbstractionBoundaries({
        sourceCode: code,
        filePath: 'proofs/system.rs',
        disclosures
      });
      assert.strictEqual(audit.compliant, true);
      assert.strictEqual(audit.detectedAbstractions.length, 1);
      assert.strictEqual(audit.undisclosedAbstractions.length, 0);
      assert.strictEqual(audit.disclosedCount, 1);
    });

    it('test 22: flags test double mock functions without disclosure', () => {
      const code = `
        const paymentGateway = createMock();
      `;
      const audit = auditAbstractionBoundaries({ sourceCode: code, filePath: 'test/gateway.mjs' });
      assert.strictEqual(audit.compliant, false);
      assert.strictEqual(audit.undisclosedAbstractions[0].category, 'test_mock_framework');
    });

    it('test 23: flags environment clock manipulations (fake timers) without disclosure', () => {
      const code = `
        clock.useFakeTimers();
      `;
      const audit = auditAbstractionBoundaries({ sourceCode: code, filePath: 'test/time.mjs' });
      assert.strictEqual(audit.compliant, false);
      assert.strictEqual(audit.undisclosedAbstractions[0].category, 'environment_clock');
    });

    it('test 24: flags bounded loop unwinds without disclosure, but passes with assumptions', () => {
      const code = `
        // Configuration for bounded model checking
        const loop_bound = 10;
      `;
      const unverified = auditAbstractionBoundaries({ sourceCode: code, filePath: 'bmc.mjs' });
      assert.strictEqual(unverified.compliant, false);

      const verified = auditAbstractionBoundaries({
        sourceCode: code,
        filePath: 'bmc.mjs',
        assumptions: ['Bounded model check loop_bound = 10 iterations']
      });
      assert.strictEqual(verified.compliant, true);
      assert.strictEqual(verified.disclosedCount, 1);
    });
  });

  // ── 5. Goal Contract Epistemics & Cross-File Audits ─────────────────────────
  describe('Goal Contract Epistemics & Cross-File Audits', () => {
    it('test 25: audits clean goal contract markdown with declared disclosures', () => {
      const markdown = `
---
goal_contract:
  id: G-TEST-001
  proof_level: L2
  profiles:
    - epistemic_classification
profiles:
  epistemic_classification:
    claimed_level: L2
    assumptions:
      - "Standard Node.js runtime"
    abstraction_disclosures:
      - "Pure deterministic logic"
---
# G-TEST-001: Test Goal
## Touch map
- scripts/lib/epistemic-classifier.mjs
      `;

      const audit = auditGoalContractEpistemics(markdown);
      assert.strictEqual(audit.valid, true);
      assert.strictEqual(audit.goalId, 'G-TEST-001');
      assert.strictEqual(audit.claimedTier, 'L2');
      assert.strictEqual(audit.abstractionAudit.compliant, true);
    });

    it('test 26: returns fail-closed result for non-existent goal file', () => {
      const audit = auditGoalContractEpistemics('docs/07-backlog/goals/G-NONEXISTENT.md');
      assert.strictEqual(audit.valid, false);
      assert.ok(audit.errors.some(e => e.includes('Goal card file not found')));
    });

    it('test 27: audits active G-PROOF-009 goal card cleanly', () => {
      const goalPath = fs.existsSync('docs/07-backlog/goals/G-PROOF-009.md')
        ? 'docs/07-backlog/goals/G-PROOF-009.md'
        : 'docs/07-backlog/goals/_archived/G-PROOF-009.md';

      const audit = auditGoalContractEpistemics(goalPath);
      assert.strictEqual(audit.valid, true);
      assert.strictEqual(audit.goalId, 'G-PROOF-009');
      assert.strictEqual(audit.abstractionAudit.compliant, true);
    });

    it('test 28: extracts touch map files and audits them against declared disclosures', () => {
      const markdown = `
# G-TEST-002: Dynamic Audit
## Touch map
- scripts/lib/epistemic-classifier.mjs
- scripts/harness/epistemic-classification-gate.mjs
      `;
      const audit = auditGoalContractEpistemics(markdown);
      assert.strictEqual(audit.valid, true);
      assert.strictEqual(audit.abstractionAudit.compliant, true);
    });
  });

  // ── 6. Proof Receipt Generation & Cryptographic Binding ───────────────────
  describe('Proof Receipt Generation & Cryptographic Binding', () => {
    it('test 29: generates schema_version=1 receipt with active git commit SHA', () => {
      const receipt = generateEpistemicProofReceipt({
        goalId: 'G-PROOF-009',
        classification: 'executable_invariant',
        invariants: [
          {
            id: 'INV-1',
            statement: 'Epistemic classifier operates fail-closed with zero stubs',
            verification_command: 'node scripts/harness/epistemic-classification-gate.mjs'
          }
        ],
        sourceFiles: ['scripts/lib/epistemic-classifier.mjs']
      });

      assert.strictEqual(receipt.schema_version, 1);
      assert.strictEqual(receipt.goal_id, 'G-PROOF-009');
      assert.strictEqual(receipt.certification, 'PASS');
      assert.match(receipt.source_revision, /^[0-9a-f]{40}$/i);
    });

    it('test 30: binds actual physical disk SHA-256 byte hashes of declared files', () => {
      const targetFile = 'scripts/lib/epistemic-classifier.mjs';
      const expectedDigest = crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex');

      const receipt = generateEpistemicProofReceipt({
        goalId: 'G-PROOF-009',
        classification: 'executable_invariant',
        invariants: [
          {
            id: 'INV-1',
            statement: 'Hash binding check',
            verification_command: 'node scripts/harness/epistemic-classification-gate.mjs'
          }
        ],
        sourceFiles: [targetFile]
      });

      assert.strictEqual(receipt.source_files.length, 1);
      assert.strictEqual(receipt.source_files[0].path, targetFile);
      assert.strictEqual(receipt.source_files[0].sha256, expectedDigest);
    });

    it('test 31: generated receipt passes official proof-receipt-validator.mjs', () => {
      const receipt = generateEpistemicProofReceipt({
        goalId: 'G-PROOF-009',
        classification: 'executable_invariant',
        invariants: [
          {
            id: 'INV-009-TEST',
            statement: 'Test invariant passes validator',
            verification_command: 'node scripts/harness/epistemic-classification-gate.mjs'
          }
        ],
        sourceFiles: [
          'scripts/harness/epistemic-classification-gate.mjs',
          'scripts/lib/epistemic-classifier.mjs'
        ]
      });

      const validation = validateProofReceipt(receipt);
      assert.strictEqual(validation.valid, true, `Receipt validation failed: ${validation.errors.join('; ')}`);
      assert.strictEqual(validation.errors.length, 0);
    });
  });

  // ── 7. CLI Runner & Argument Parsing ───────────────────────────────────────
  describe('CLI Runner & Argument Parsing', () => {
    it('test 32: parses all supported CLI flags and positional arguments', () => {
      const args = [
        '--target', 'my-goal.md',
        '--tier=L2',
        '--audit-stubs',
        '--output-receipt=receipt.json',
        '--json',
        '--verbose'
      ];
      const parsed = parseArgs(args);
      assert.strictEqual(parsed.target, 'my-goal.md');
      assert.strictEqual(parsed.tier, 'L2');
      assert.strictEqual(parsed.auditStubs, true);
      assert.strictEqual(parsed.outputReceipt, 'receipt.json');
      assert.strictEqual(parsed.json, true);
      assert.strictEqual(parsed.verbose, true);
    });

    it('test 33: runEpistemicGate returns exitCode=0 on valid target', () => {
      const outcome = runEpistemicGate({
        target: 'scripts/lib/epistemic-classifier.mjs'
      });
      assert.strictEqual(outcome.exitCode, 0);
      assert.strictEqual(outcome.valid, true);
      assert.strictEqual(outcome.errors.length, 0);
    });

    it('test 34: runEpistemicGate returns exitCode=1 on non-existent target', () => {
      const outcome = runEpistemicGate({
        target: 'non-existent-target-file.xyz'
      });
      assert.strictEqual(outcome.exitCode, 1);
      assert.strictEqual(outcome.valid, false);
      assert.ok(outcome.errors[0].includes('Target file not found'));
    });

    it('test 35: runEpistemicGate emits certified proof receipt JSON to designated path', () => {
      const tmpReceiptPath = 'artifacts/proofs/test-temp-receipt.json';
      const outcome = runEpistemicGate({
        target: 'scripts/lib/epistemic-classifier.mjs',
        outputReceipt: tmpReceiptPath
      });

      assert.strictEqual(outcome.exitCode, 0);
      assert.ok(fs.existsSync(tmpReceiptPath), 'Expected temporary receipt to be written');

      const readBack = JSON.parse(fs.readFileSync(tmpReceiptPath, 'utf8'));
      assert.strictEqual(readBack.goal_id, 'G-PROOF-009');
      assert.strictEqual(readBack.certification, 'PASS');

      // Cleanup temp test receipt
      fs.unlinkSync(tmpReceiptPath);
    });
  });

});
