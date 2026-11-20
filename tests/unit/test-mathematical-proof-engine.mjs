#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UNIT TEST SUITE: MATHEMATICAL PROOF ENGINE & RECEIPT SYSTEM
 * ════════════════════════════════════════════════════════════════════════════════
 * Goal Reference: G-PROOF-001 (DAVE Mathematical Invariant and Proof Receipt System)
 * Invariants Verified:
 *   - Article I: Zero Mocks, Zero Stubs, Zero String Simulations
 *   - Canonical Proof Classification & Bound Relations Immutability
 *   - Bounded Probability Verification & Operational Envelope Satisfaction
 *   - Wilson Score Binomial Confidence Interval Precision & Conservation
 *   - Monotonicity Verification (Strict & Non-Strict, Directional Invariants)
 *   - Cryptographic SHA-256 Digest Invariance & Fail-Closed Tamper Detection
 *   - Git Commit SHA Extraction & Provenance Binding
 *   - Goal Markdown Specification Extraction (Invariants & Touch Maps)
 *   - Epistemic Proof Receipt Generation & Machine-Readable Validation
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import {
  CANONICAL_PROOF_CLASSES,
  BOUND_RELATIONS,
  verifyProbabilityBound,
  computeWilsonScoreInterval,
  verifyMonotonicity,
  evaluateOperationalEnvelope,
  computeFileSha256,
  getGitCommitSha,
  extractGoalSpec,
  generateProofReceipt
} from '../../scripts/lib/mathematical-proof-engine.mjs';

import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('DAVE Mathematical Proof Engine & Proof Receipt System (G-PROOF-001)', () => {

  describe('1. Canonical Classifications & Bound Relations Immutability', () => {
    it('CANONICAL_PROOF_CLASSES is frozen and contains all 8 canonical classifications', () => {
      assert.ok(Object.isFrozen(CANONICAL_PROOF_CLASSES), 'CANONICAL_PROOF_CLASSES must be frozen');
      assert.equal(CANONICAL_PROOF_CLASSES.length, 8);
      const expectedClasses = [
        'formal_invariant',
        'executable_property',
        'statistical_claim',
        'visual_claim',
        'operational_claim',
        'security_claim',
        'human_approval_claim',
        'model_claim'
      ];
      for (const cls of expectedClasses) {
        assert.ok(CANONICAL_PROOF_CLASSES.includes(cls), `Missing canonical class: ${cls}`);
      }
      assert.throws(() => {
        // @ts-ignore
        CANONICAL_PROOF_CLASSES.push('illegal_class');
      }, TypeError, 'Mutating frozen CANONICAL_PROOF_CLASSES must throw TypeError');
    });

    it('BOUND_RELATIONS is frozen and contains all 8 relation definitions', () => {
      assert.ok(Object.isFrozen(BOUND_RELATIONS), 'BOUND_RELATIONS must be frozen');
      assert.equal(BOUND_RELATIONS.length, 8);
      const expectedRelations = [
        'bounded',
        'strictly_increasing',
        'strictly_decreasing',
        'monotonic_non_decreasing',
        'monotonic_non_increasing',
        'constant',
        'deterministic',
        'exact_equality'
      ];
      for (const rel of expectedRelations) {
        assert.ok(BOUND_RELATIONS.includes(rel), `Missing bound relation: ${rel}`);
      }
      assert.throws(() => {
        // @ts-ignore
        BOUND_RELATIONS.push('illegal_relation');
      }, TypeError, 'Mutating frozen BOUND_RELATIONS must throw TypeError');
    });
  });

  describe('2. verifyProbabilityBound', () => {
    it('accepts valid probabilities within standard [0.0, 1.0] range', () => {
      assert.equal(verifyProbabilityBound(0.0), true);
      assert.equal(verifyProbabilityBound(1.0), true);
      assert.equal(verifyProbabilityBound(0.5), true);
      assert.equal(verifyProbabilityBound(0.000001), true);
      assert.equal(verifyProbabilityBound(0.999999), true);
    });

    it('rejects values strictly outside [0.0, 1.0] range', () => {
      assert.equal(verifyProbabilityBound(-0.0001), false);
      assert.equal(verifyProbabilityBound(1.0001), false);
      assert.equal(verifyProbabilityBound(-100), false);
      assert.equal(verifyProbabilityBound(100), false);
    });

    it('rejects non-numeric, NaN, and infinite inputs fail-closed', () => {
      assert.equal(verifyProbabilityBound(NaN), false);
      assert.equal(verifyProbabilityBound(Infinity), false);
      assert.equal(verifyProbabilityBound(-Infinity), false);
      // @ts-ignore
      assert.equal(verifyProbabilityBound('0.5'), false);
      // @ts-ignore
      assert.equal(verifyProbabilityBound(null), false);
      // @ts-ignore
      assert.equal(verifyProbabilityBound(undefined), false);
      // @ts-ignore
      assert.equal(verifyProbabilityBound({}), false);
    });

    it('supports custom valid bounds [min, max]', () => {
      assert.equal(verifyProbabilityBound(0.25, [0.2, 0.8]), true);
      assert.equal(verifyProbabilityBound(0.2, [0.2, 0.8]), true);
      assert.equal(verifyProbabilityBound(0.8, [0.2, 0.8]), true);
      assert.equal(verifyProbabilityBound(0.199, [0.2, 0.8]), false);
      assert.equal(verifyProbabilityBound(0.801, [0.2, 0.8]), false);
    });
  });

  describe('3. computeWilsonScoreInterval', () => {
    it('computes exact Wilson score interval at 95% confidence', () => {
      const res = computeWilsonScoreInterval(80, 100, 0.95);
      assert.equal(res.center, 0.8);
      assert.ok(res.lower > 0.70 && res.lower < 0.80, `Lower bound ${res.lower} must be in (0.70, 0.80)`);
      assert.ok(res.upper > 0.80 && res.upper < 0.90, `Upper bound ${res.upper} must be in (0.80, 0.90)`);
      assert.ok(res.lower < res.center && res.center < res.upper, 'Must satisfy lower < center < upper');
    });

    it('computes Wilson intervals at 90% and 99% confidence with monotone spread widening', () => {
      const res90 = computeWilsonScoreInterval(50, 100, 0.90);
      const res95 = computeWilsonScoreInterval(50, 100, 0.95);
      const res99 = computeWilsonScoreInterval(50, 100, 0.99);

      const spread90 = res90.upper - res90.lower;
      const spread95 = res95.upper - res95.lower;
      const spread99 = res99.upper - res99.lower;

      assert.ok(spread90 < spread95, '90% interval spread must be narrower than 95%');
      assert.ok(spread95 < spread99, '95% interval spread must be narrower than 99%');
    });

    it('handles extreme boundary cases: 0 successes and 100% successes', () => {
      const zeroSuccess = computeWilsonScoreInterval(0, 100, 0.95);
      assert.equal(zeroSuccess.center, 0);
      assert.equal(zeroSuccess.lower, 0);
      assert.ok(zeroSuccess.upper > 0 && zeroSuccess.upper < 0.1, 'Zero success upper bound must be > 0 and < 0.1');

      const allSuccess = computeWilsonScoreInterval(100, 100, 0.95);
      assert.equal(allSuccess.center, 1);
      assert.ok(allSuccess.lower > 0.9 && allSuccess.lower < 1.0, 'All success lower bound must be in (0.9, 1.0)');
      assert.equal(allSuccess.upper, 1);
    });

    it('throws errors on invalid inputs (non-positive total or successes out of range)', () => {
      assert.throws(() => computeWilsonScoreInterval(10, 0), /Total sample count must be positive/);
      assert.throws(() => computeWilsonScoreInterval(10, -5), /Total sample count must be positive/);
      assert.throws(() => computeWilsonScoreInterval(-1, 50), /Successes must be between 0 and total/);
      assert.throws(() => computeWilsonScoreInterval(51, 50), /Successes must be between 0 and total/);
    });
  });

  describe('4. verifyMonotonicity', () => {
    it('verifies strictly increasing sequences', () => {
      assert.equal(verifyMonotonicity([1, 2, 3, 4, 5], 'strictly_increasing'), true);
      assert.equal(verifyMonotonicity([0.1, 0.2, 0.25, 0.9], 'strictly_increasing'), true);
      assert.equal(verifyMonotonicity([1, 2, 2, 3], 'strictly_increasing'), false);
      assert.equal(verifyMonotonicity([3, 2, 1], 'strictly_increasing'), false);
    });

    it('verifies strictly decreasing sequences', () => {
      assert.equal(verifyMonotonicity([5, 4, 3, 2, 1], 'strictly_decreasing'), true);
      assert.equal(verifyMonotonicity([5, 4, 4, 1], 'strictly_decreasing'), false);
      assert.equal(verifyMonotonicity([1, 2, 3], 'strictly_decreasing'), false);
    });

    it('verifies non_decreasing sequences (allowing flat plateaus)', () => {
      assert.equal(verifyMonotonicity([1, 2, 2, 3, 3, 4], 'non_decreasing'), true);
      assert.equal(verifyMonotonicity([1, 1, 1], 'non_decreasing'), true);
      assert.equal(verifyMonotonicity([1, 2, 1], 'non_decreasing'), false);
    });

    it('verifies non_increasing sequences (allowing flat plateaus)', () => {
      assert.equal(verifyMonotonicity([5, 4, 4, 3, 1], 'non_increasing'), true);
      assert.equal(verifyMonotonicity([3, 3, 3], 'non_increasing'), true);
      assert.equal(verifyMonotonicity([5, 4, 6], 'non_increasing'), false);
    });

    it('handles empty or single-element series vacuously as true', () => {
      // @ts-ignore
      assert.equal(verifyMonotonicity([]), true);
      assert.equal(verifyMonotonicity([42]), true);
      // @ts-ignore
      assert.equal(verifyMonotonicity(null), true);
    });

    it('throws on unsupported monotonicity direction', () => {
      // @ts-ignore
      assert.throws(() => verifyMonotonicity([1, 2, 3], 'oscillating'), /Unsupported monotonicity direction: oscillating/);
    });
  });

  describe('5. evaluateOperationalEnvelope', () => {
    it('verifies values inside or on the boundaries of [min, max]', () => {
      assert.equal(evaluateOperationalEnvelope(5, 0, 10), true);
      assert.equal(evaluateOperationalEnvelope(0, 0, 10), true);
      assert.equal(evaluateOperationalEnvelope(10, 0, 10), true);
      assert.equal(evaluateOperationalEnvelope(-5, -10, 0), true);
    });

    it('rejects values outside the operational envelope', () => {
      assert.equal(evaluateOperationalEnvelope(-0.01, 0, 10), false);
      assert.equal(evaluateOperationalEnvelope(10.01, 0, 10), false);
      assert.equal(evaluateOperationalEnvelope(100, 0, 10), false);
    });

    it('rejects non-numeric and non-finite values fail-closed', () => {
      assert.equal(evaluateOperationalEnvelope(NaN, 0, 10), false);
      assert.equal(evaluateOperationalEnvelope(Infinity, 0, 10), false);
      assert.equal(evaluateOperationalEnvelope(-Infinity, 0, 10), false);
      // @ts-ignore
      assert.equal(evaluateOperationalEnvelope('5', 0, 10), false);
      // @ts-ignore
      assert.equal(evaluateOperationalEnvelope(null, 0, 10), false);
    });
  });

  describe('6. computeFileSha256', () => {
    it('computes exact SHA-256 matching node:crypto digest for a file on disk', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-sha256-'));
      try {
        const filePath = path.join(tmpDir, 'test-target.txt');
        const content = 'SODA OS MATHEMATICAL PROOF ENGINE INVARIANT DIGEST 2026';
        fs.writeFileSync(filePath, content, 'utf8');

        const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
        const computedHash = computeFileSha256(filePath);

        assert.equal(computedHash, expectedHash);
        assert.equal(computedHash.length, 64);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('throws fail-closed error if target file does not exist', () => {
      assert.throws(() => {
        computeFileSha256('/path/to/nonexistent/file/that/does/not/exist.xyz');
      }, /File not found for hashing/);
    });

    it('detects byte-level mutations and produces distinct digests (tamper detection)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-tamper-'));
      try {
        const filePath = path.join(tmpDir, 'source.js');
        fs.writeFileSync(filePath, 'const x = 1;', 'utf8');
        const originalHash = computeFileSha256(filePath);

        // Mutate single byte
        fs.writeFileSync(filePath, 'const x = 2;', 'utf8');
        const tamperedHash = computeFileSha256(filePath);

        assert.notEqual(originalHash, tamperedHash);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('7. getGitCommitSha', () => {
    it('retrieves active 40-character hexadecimal git commit SHA in valid git repo', () => {
      const sha = getGitCommitSha();
      assert.equal(typeof sha, 'string');
      assert.equal(sha.length, 40, `Git SHA length must be 40 chars, got: ${sha}`);
      assert.match(sha, /^[0-9a-f]{40}$/, 'Git SHA must be 40 hexadecimal characters');
    });

    it('returns 40 zeros in non-git directory fail-closed', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-git-dir-'));
      try {
        const sha = getGitCommitSha(tmpDir);
        assert.equal(sha, '0000000000000000000000000000000000000000');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('8. extractGoalSpec', () => {
    it('extracts invariants and touch map from an existing goal card', () => {
      // Test against G-PROOF-001 (can be active or archived)
      const spec = extractGoalSpec('G-PROOF-001');
      assert.ok(spec, 'Must extract spec for G-PROOF-001');
      assert.ok(Array.isArray(spec.invariants), 'invariants must be an array');
      assert.ok(spec.invariants.length > 0, 'invariants must not be empty');
      assert.ok(Array.isArray(spec.touchMap), 'touchMap must be an array');
      assert.ok(spec.touchMap.length > 0, 'touchMap must contain items');

      // Verify invariant item structure
      const inv = spec.invariants[0];
      assert.ok(inv.id, 'Invariant must have id');
      assert.ok(inv.statement, 'Invariant must have statement');
    });

    it('extracts specifications from custom synthetic goal cards in isolated directory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-goal-spec-'));
      try {
        const goalsDir = path.join(tmpDir, 'docs/07-backlog/goals');
        fs.mkdirSync(goalsDir, { recursive: true });

        const cardContent = `# G-TEST-999: Test Goal

## Touch map
- \`src/engine.js\`
- \`tests/unit/test-engine.mjs\`

## Acceptance criteria
- [x] Done

\`\`\`yaml
invariants:
  - id: G-TEST-999-INV-001
    statement: "Zero float math invariant"
    classification: executable_invariant
    verification_command: "node tests/unit/test-engine.mjs"
\`\`\`
`;
        fs.writeFileSync(path.join(goalsDir, 'G-TEST-999.md'), cardContent, 'utf8');

        const spec = extractGoalSpec('G-TEST-999', tmpDir);
        assert.equal(spec.touchMap.length, 2);
        assert.ok(spec.touchMap.includes('src/engine.js'));
        assert.ok(spec.touchMap.includes('tests/unit/test-engine.mjs'));

        assert.equal(spec.invariants.length, 1);
        assert.equal(spec.invariants[0].id, 'G-TEST-999-INV-001');
        assert.equal(spec.invariants[0].statement, 'Zero float math invariant');
        assert.equal(spec.invariants[0].classification, 'executable_invariant');
        assert.equal(spec.invariants[0].verification_command, 'node tests/unit/test-engine.mjs');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('throws error when goal card cannot be found', () => {
      assert.throws(() => {
        extractGoalSpec('G-NONEXISTENT-9999');
      }, /Goal card not found for ID: G-NONEXISTENT-9999/);
    });
  });

  describe('9. generateProofReceipt & Epistemic Verification', () => {
    it('generates a compliant, verifiable proof receipt bound to commit and source file hashes', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-receipt-gen-'));
      try {
        const goalsDir = path.join(tmpDir, 'docs/07-backlog/goals');
        fs.mkdirSync(goalsDir, { recursive: true });

        // Create sample source files
        const srcDir = path.join(tmpDir, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'logic.js'), 'export const active = true;', 'utf8');

        const cardContent = `# G-SYNTH-001: Synthetic Test Goal

## Touch map
- \`src/logic.js\`

## Acceptance criteria
- [x] Verified

\`\`\`yaml
invariants:
  - id: G-SYNTH-001-INV-001
    statement: "Logic is operational and verified"
    classification: executable_invariant
    verification_command: "node -e 'process.exit(0)'"
\`\`\`
`;
        fs.writeFileSync(path.join(goalsDir, 'G-SYNTH-001.md'), cardContent, 'utf8');

        const { receipt, outputPath, evidencePath } = generateProofReceipt('G-SYNTH-001', {
          classification: 'executable_invariant'
        }, tmpDir);

        assert.ok(fs.existsSync(outputPath), 'Output path file must exist');
        assert.ok(fs.existsSync(evidencePath), 'Evidence path file must exist');

        assert.equal(receipt.schema_version, 1);
        assert.equal(receipt.goal_id, 'G-SYNTH-001');
        assert.equal(receipt.classification, 'executable_invariant');
        assert.equal(receipt.certification, 'PASS');
        assert.ok(receipt.source_revision);
        assert.equal(receipt.invariants.length, 1);
        assert.equal(receipt.invariants[0].passed, true);
        assert.equal(receipt.invariants[0].exit_code, 0);

        assert.equal(receipt.source_files.length, 1);
        assert.equal(receipt.source_files[0].path, 'src/logic.js');
        assert.equal(receipt.source_files[0].sha256, crypto.createHash('sha256').update('export const active = true;').digest('hex'));

        // Validate via proof-receipt-validator under tmpDir
        const origCwd = process.cwd();
        try {
          process.chdir(tmpDir);
          const validation = validateProofReceipt(receipt);
          assert.equal(validation.valid, true, `Validation must pass: ${validation.errors.join('; ')}`);
        } finally {
          process.chdir(origCwd);
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('rejects tampered receipts with modified file SHA256 (fail-closed tamper check)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-tamper-check-'));
      try {
        const fileRelPath = 'scripts/test-file.js';
        const fileFullPath = path.join(tmpDir, fileRelPath);
        fs.mkdirSync(path.dirname(fileFullPath), { recursive: true });
        fs.writeFileSync(fileFullPath, 'const verified = true;', 'utf8');

        const realHash = crypto.createHash('sha256').update('const verified = true;').digest('hex');
        const tamperedHash = realHash.replace(/^[0-9a-f]/, c => c === 'a' ? 'b' : 'a');

        const receipt = {
          schema_version: 1,
          goal_id: 'G-TAMPER-001',
          classification: 'executable_invariant',
          source_revision: 'c960e7d8fb2daa110feaead40f33b785c7e345bd',
          invariants: [
            {
              id: 'INV-1',
              statement: 'Invariant statement',
              verification_command: 'node -e "process.exit(0)"',
              passed: true,
              exit_code: 0
            }
          ],
          source_files: [
            {
              path: fileRelPath,
              sha256: tamperedHash
            }
          ],
          certification: 'PASS'
        };

        // Validate against tmpDir cwd
        const origCwd = process.cwd();
        try {
          process.chdir(tmpDir);
          const validation = validateProofReceipt(receipt);
          assert.equal(validation.valid, false, 'Validation must fail when hash is tampered');
          assert.ok(validation.errors.some(e => e.includes('SHA256 mismatch')), 'Must report SHA256 mismatch');
        } finally {
          process.chdir(origCwd);
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('rejects receipts with failed invariants or invalid certification (fail-closed integrity)', () => {
      const baseReceipt = {
        schema_version: 1,
        goal_id: 'G-FAIL-001',
        classification: 'executable_invariant',
        source_revision: 'c960e7d8fb2daa110feaead40f33b785c7e345bd',
        invariants: [
          {
            id: 'INV-1',
            statement: 'Invariant statement',
            verification_command: 'node -e "process.exit(0)"',
            passed: false, // FAILED INVARIANT
            exit_code: 1
          }
        ],
        source_files: [],
        certification: 'PASS'
      };

      const failValidation = validateProofReceipt(baseReceipt);
      assert.equal(failValidation.valid, false);
      assert.ok(failValidation.errors.some(e => e.includes('passed flag is not true')));

      const badCertReceipt = {
        ...baseReceipt,
        invariants: [{ ...baseReceipt.invariants[0], passed: true, exit_code: 0 }],
        certification: 'FAIL' // BAD CERTIFICATION
      };
      const badCertValidation = validateProofReceipt(badCertReceipt);
      assert.equal(badCertValidation.valid, false);
      assert.ok(badCertValidation.errors.some(e => e.includes('certification must be "PASS"')));
    });
  });
});
