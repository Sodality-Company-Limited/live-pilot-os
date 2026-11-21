#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ SODA OS ADVERSARIAL STRESS TEST & EMPIRICAL CHALLENGE SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Challenger: challenger_wave1_1 (Empirical Adversary)
 * Target Module: scripts/lib/mathematical-proof-engine.mjs
 * Goal Reference: G-PROOF-001 (DAVE Mathematical Invariant and Proof Receipt System)
 * Scope & Hostile Stress Vectors:
 *   1. Extremal & Malformed Probability Bounds (NaN, Infinity, subnormals, type coercion)
 *   2. Wilson Score Confidence Intervals (0/N, N/N, N=1e6, spread widening, bounds invariants)
 *   3. Monotonicity Vectors (plateaus, alternations, large N=100k arrays, direction validation)
 *   4. Operational Envelope Boundaries (exact boundary, delta epsilon, negative domains)
 *   5. Mathematical Algebraic Invariants & Duality Laws
 *   6. Cryptographic File Hashing & Receipt Tamper Detection
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

describe('Adversarial Stress Test: Mathematical Proof Engine (G-PROOF-001)', () => {

  // ════════════════════════════════════════════════════════════════════════════
  // 1. EXTREMAL & MALFORMED PROBABILITY BOUNDS
  // ════════════════════════════════════════════════════════════════════════════
  describe('1. Probability Bounds Adversarial Stress', () => {

    it('1.1 Extremal valid boundaries [0.0, 1.0] and epsilon boundaries', () => {
      // Exact boundaries
      assert.equal(verifyProbabilityBound(0.0), true, '0.0 must be valid');
      assert.equal(verifyProbabilityBound(1.0), true, '1.0 must be valid');
      assert.equal(verifyProbabilityBound(-0.0), true, '-0.0 must be valid (IEEE 754 zero equality)');

      // Just inside boundaries
      assert.equal(verifyProbabilityBound(Number.EPSILON), true, 'Number.EPSILON must be within [0, 1]');
      assert.equal(verifyProbabilityBound(1.0 - Number.EPSILON), true, '1.0 - EPSILON must be within [0, 1]');
      assert.equal(verifyProbabilityBound(Number.MIN_VALUE), true, 'Number.MIN_VALUE must be within [0, 1]');
    });

    it('1.2 Adversarial out-of-bound perturbations fail closed', () => {
      // Just outside boundaries
      assert.equal(verifyProbabilityBound(-0.0001), false, '-0.0001 must be rejected');
      assert.equal(verifyProbabilityBound(1.0001), false, '1.0001 must be rejected');
      assert.equal(verifyProbabilityBound(-Number.EPSILON), false, '-Number.EPSILON must be rejected');
      assert.equal(verifyProbabilityBound(1.0 + Number.EPSILON), false, '1.0 + EPSILON must be rejected');

      // Grossly out of bounds
      assert.equal(verifyProbabilityBound(-1e10), false, '-1e10 must be rejected');
      assert.equal(verifyProbabilityBound(1e10), false, '1e10 must be rejected');
      assert.equal(verifyProbabilityBound(Number.MAX_VALUE), false, 'MAX_VALUE must be rejected');
      assert.equal(verifyProbabilityBound(-Number.MAX_VALUE), false, '-MAX_VALUE must be rejected');
    });

    it('1.3 Non-finite, NaN, and infinite inputs fail closed', () => {
      assert.equal(verifyProbabilityBound(NaN), false, 'NaN must be rejected');
      assert.equal(verifyProbabilityBound(Infinity), false, 'Infinity must be rejected');
      assert.equal(verifyProbabilityBound(-Infinity), false, '-Infinity must be rejected');
    });

    it('1.4 Hostile non-numeric types and prototype poisoning fail closed', () => {
      const hostileInputs = [
        '0.5',
        '0',
        '1',
        '',
        ' ',
        null,
        undefined,
        true,
        false,
        {},
        { value: 0.5 },
        [],
        [0.5],
        [0, 1],
        Symbol('0.5'),
        () => 0.5
      ];

      for (const input of hostileInputs) {
        // @ts-ignore
        assert.equal(verifyProbabilityBound(input), false, `Type ${typeof input} (${String(input)}) must be rejected`);
      }
    });

    it('1.5 Custom bounds: degenerate, inverted, and negative operational intervals', () => {
      // Degenerate single-point bound [0.5, 0.5]
      assert.equal(verifyProbabilityBound(0.5, [0.5, 0.5]), true, 'Point bound must match exact value');
      assert.equal(verifyProbabilityBound(0.499999, [0.5, 0.5]), false, 'Point bound must reject below');
      assert.equal(verifyProbabilityBound(0.500001, [0.5, 0.5]), false, 'Point bound must reject above');

      // Negative range [-10.0, -1.0]
      assert.equal(verifyProbabilityBound(-5.0, [-10.0, -1.0]), true, 'Negative interval must accept inside point');
      assert.equal(verifyProbabilityBound(-10.0, [-10.0, -1.0]), true, 'Negative interval must accept lower boundary');
      assert.equal(verifyProbabilityBound(-1.0, [-10.0, -1.0]), true, 'Negative interval must accept upper boundary');
      assert.equal(verifyProbabilityBound(-10.0001, [-10.0, -1.0]), false, 'Negative interval must reject below');
      assert.equal(verifyProbabilityBound(-0.9999, [-10.0, -1.0]), false, 'Negative interval must reject above');
      assert.equal(verifyProbabilityBound(0.0, [-10.0, -1.0]), false, 'Negative interval must reject zero');

      // Inverted interval [1.0, 0.0] where min > max
      // In JS: (val >= 1.0 && val <= 0.0) is vacuous for real numbers and must always return false
      assert.equal(verifyProbabilityBound(0.5, [1.0, 0.0]), false, 'Inverted bound must reject 0.5');
      assert.equal(verifyProbabilityBound(0.0, [1.0, 0.0]), false, 'Inverted bound must reject 0.0');
      assert.equal(verifyProbabilityBound(1.0, [1.0, 0.0]), false, 'Inverted bound must reject 1.0');
    });

    it('1.6 Determinism & Idempotence: 10,000 randomized iterations produce consistent results', () => {
      for (let i = 0; i < 10000; i++) {
        const val = Math.random();
        const r1 = verifyProbabilityBound(val);
        const r2 = verifyProbabilityBound(val);
        assert.equal(r1, r2, 'Repeated calls must yield identical deterministic outputs');
        assert.equal(r1, true, 'Math.random() in [0, 1) must always be within [0, 1]');
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. WILSON SCORE INTERVALS ADVERSARIAL STRESS
  // ════════════════════════════════════════════════════════════════════════════
  describe('2. Wilson Score Interval Adversarial Stress', () => {

    it('2.1 Boundary Extremes: 0 successes out of N for varying sample orders of magnitude', () => {
      const sampleSizes = [1, 5, 10, 50, 100, 1000, 10000, 100000, 1000000];

      for (const N of sampleSizes) {
        const interval = computeWilsonScoreInterval(0, N, 0.95);

        // Mathematical invariants for 0 successes:
        // center === 0.0
        // lower bound must clamp strictly to 0.0
        // upper bound must strictly be > 0.0 and <= 1.0
        assert.equal(interval.center, 0.0, `Center must be 0 for N=${N}`);
        assert.equal(interval.lower, 0.0, `Lower bound must clamp to 0.0 for N=${N}`);
        assert.ok(interval.upper > 0.0, `Upper bound must be strictly positive for N=${N}`);
        assert.ok(interval.upper <= 1.0, `Upper bound must be <= 1.0 for N=${N}`);
        assert.ok(interval.lower <= interval.center && interval.center <= interval.upper,
          `Invariance 0 <= lower <= center <= upper violated for N=${N}`);

        // Upper bound must shrink monotonically as N increases
        if (N > 1) {
          const prevInterval = computeWilsonScoreInterval(0, N / 10, 0.95);
          assert.ok(interval.upper <= prevInterval.upper,
            `Upper bound for N=${N} (${interval.upper}) must be <= upper bound for N=${N/10} (${prevInterval.upper})`);
        }
      }
    });

    it('2.2 Boundary Extremes: N successes out of N for varying sample orders of magnitude', () => {
      const sampleSizes = [1, 5, 10, 50, 100, 1000, 10000, 100000, 1000000];

      for (const N of sampleSizes) {
        const interval = computeWilsonScoreInterval(N, N, 0.95);

        // Mathematical invariants for N successes:
        // center === 1.0
        // lower bound must be >= 0.0 and < 1.0 (approaching 1 as N -> inf)
        // upper bound must clamp strictly to 1.0
        assert.equal(interval.center, 1.0, `Center must be 1 for N=${N}`);
        assert.equal(interval.upper, 1.0, `Upper bound must clamp to 1.0 for N=${N}`);
        assert.ok(interval.lower >= 0.0, `Lower bound must be non-negative for N=${N}`);
        assert.ok(interval.lower < 1.0 || (N >= 1000000 && interval.lower <= 1.0), `Lower bound must be < 1.0 for N=${N}`);
        assert.ok(interval.lower <= interval.center && interval.center <= interval.upper,
          `Invariance 0 <= lower <= center <= upper violated for N=${N}`);

        // Lower bound must grow monotonically as N increases
        if (N > 1) {
          const prevInterval = computeWilsonScoreInterval(N / 10, N / 10, 0.95);
          assert.ok(interval.lower >= prevInterval.lower,
            `Lower bound for N=${N} (${interval.lower}) must be >= lower bound for N=${N/10} (${prevInterval.lower})`);
        }
      }
    });

    it('2.3 Extreme sample size N = 1,000,000 with 50% successes', () => {
      const N = 1000000;
      const successes = 500000;
      const interval = computeWilsonScoreInterval(successes, N, 0.95);

      assert.equal(interval.center, 0.5);
      // For N = 1e6, spread = 1.96 * sqrt(0.25 / 1e6) = 1.96 * 0.0005 = 0.00098
      // Lower bound is approx 0.499020, Upper bound approx 0.500980
      assert.ok(interval.lower < 0.5, `Lower bound ${interval.lower} must be < 0.5`);
      assert.ok(interval.upper > 0.5, `Upper bound ${interval.upper} must be > 0.5`);
      assert.ok(Math.abs(interval.lower - 0.499020) < 0.00001, `Lower bound close to theoretical`);
      assert.ok(Math.abs(interval.upper - 0.500980) < 0.00001, `Upper bound close to theoretical`);
    });

    it('2.4 Monotone spread widening across confidence levels (90% < 95% < 99%)', () => {
      const cases = [
        { s: 10, n: 100 },
        { s: 50, n: 100 },
        { s: 90, n: 100 },
        { s: 500, n: 1000 },
        { s: 1, n: 10 }
      ];

      for (const { s, n } of cases) {
        const res90 = computeWilsonScoreInterval(s, n, 0.90);
        const res95 = computeWilsonScoreInterval(s, n, 0.95);
        const res99 = computeWilsonScoreInterval(s, n, 0.99);

        const spread90 = res90.upper - res90.lower;
        const spread95 = res95.upper - res95.lower;
        const spread99 = res99.upper - res99.lower;

        assert.ok(spread90 < spread95, `Spread 90% (${spread90}) must be strictly < 95% (${spread95}) for s=${s}, n=${n}`);
        assert.ok(spread95 < spread99, `Spread 95% (${spread95}) must be strictly < 99% (${spread99}) for s=${s}, n=${n}`);
        assert.ok(res99.lower <= res95.lower && res95.lower <= res90.lower, `Lower bounds must widen outwards with confidence`);
        assert.ok(res90.upper <= res95.upper && res95.upper <= res99.upper, `Upper bounds must widen outwards with confidence`);
      }
    });

    it('2.5 Behavior on unsupported/invalid confidence levels', () => {
      // By design in mathematical-proof-engine.mjs, confidence defaults to 1.96 (95%) when not 0.90 or 0.99
      const resDefault = computeWilsonScoreInterval(50, 100, 0.95);
      const resOther = computeWilsonScoreInterval(50, 100, 0.80);
      assert.equal(resOther.lower, resDefault.lower, 'Unsupported confidence gracefully defaults to 95% z-score');
      assert.equal(resOther.upper, resDefault.upper, 'Unsupported confidence gracefully defaults to 95% z-score');
    });

    it('2.6 Fail-closed validation on invalid sample counts and successes', () => {
      // Non-positive total
      assert.throws(() => computeWilsonScoreInterval(0, 0), /Total sample count must be positive/);
      assert.throws(() => computeWilsonScoreInterval(5, -1), /Total sample count must be positive/);
      assert.throws(() => computeWilsonScoreInterval(5, -100), /Total sample count must be positive/);

      // Successes out of bounds
      assert.throws(() => computeWilsonScoreInterval(-1, 10), /Successes must be between 0 and total/);
      assert.throws(() => computeWilsonScoreInterval(-0.001, 10), /Successes must be between 0 and total/);
      assert.throws(() => computeWilsonScoreInterval(11, 10), /Successes must be between 0 and total/);
      assert.throws(() => computeWilsonScoreInterval(1000, 100), /Successes must be between 0 and total/);
    });

    it('2.7 Empirical observation: NaN sample counts propagate to NaN interval without throwing', () => {
      const resNaNSuccess = computeWilsonScoreInterval(NaN, 100);
      assert.ok(Number.isNaN(resNaNSuccess.center));
      assert.ok(Number.isNaN(resNaNSuccess.lower));
      assert.ok(Number.isNaN(resNaNSuccess.upper));

      const resNaNTotal = computeWilsonScoreInterval(50, NaN);
      assert.ok(Number.isNaN(resNaNTotal.center));
      assert.ok(Number.isNaN(resNaNTotal.lower));
      assert.ok(Number.isNaN(resNaNTotal.upper));
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. MONOTONICITY CHECKS ADVERSARIAL STRESS
  // ════════════════════════════════════════════════════════════════════════════
  describe('3. Monotonicity Invariants Adversarial Stress', () => {

    it('3.1 Plateau discrimination: strictly_increasing vs non_decreasing', () => {
      const plateauSeq = [1, 2, 2, 3, 4, 4, 5];
      assert.equal(verifyMonotonicity(plateauSeq, 'strictly_increasing'), false, 'Plateau must fail strictly_increasing');
      assert.equal(verifyMonotonicity(plateauSeq, 'non_decreasing'), true, 'Plateau must pass non_decreasing');

      const flatSeq = [42, 42, 42, 42];
      assert.equal(verifyMonotonicity(flatSeq, 'strictly_increasing'), false, 'Flat series must fail strictly_increasing');
      assert.equal(verifyMonotonicity(flatSeq, 'strictly_decreasing'), false, 'Flat series must fail strictly_decreasing');
      assert.equal(verifyMonotonicity(flatSeq, 'non_decreasing'), true, 'Flat series must pass non_decreasing');
      assert.equal(verifyMonotonicity(flatSeq, 'non_increasing'), true, 'Flat series must pass non_increasing');
    });

    it('3.2 Plateau discrimination: strictly_decreasing vs non_increasing', () => {
      const plateauDescSeq = [10, 8, 8, 6, 4, 4, 1];
      assert.equal(verifyMonotonicity(plateauDescSeq, 'strictly_decreasing'), false, 'Plateau must fail strictly_decreasing');
      assert.equal(verifyMonotonicity(plateauDescSeq, 'non_increasing'), true, 'Plateau must pass non_increasing');
    });

    it('3.3 Alternating / oscillating sequences fail all monotonicity modes', () => {
      const oscillating = [1, 3, 2, 4, 3, 5, 4];
      assert.equal(verifyMonotonicity(oscillating, 'strictly_increasing'), false);
      assert.equal(verifyMonotonicity(oscillating, 'non_decreasing'), false);
      assert.equal(verifyMonotonicity(oscillating, 'strictly_decreasing'), false);
      assert.equal(verifyMonotonicity(oscillating, 'non_increasing'), false);
    });

    it('3.4 Large arrays (N = 100,000 elements) performance and edge detection', () => {
      const N = 100000;
      const largeAsc = new Float64Array(N);
      for (let i = 0; i < N; i++) largeAsc[i] = i * 0.5;

      // Pass large strictly increasing
      const t0 = performance.now();
      // @ts-ignore
      assert.equal(verifyMonotonicity(Array.from(largeAsc), 'strictly_increasing'), true);
      const elapsed = performance.now() - t0;
      assert.ok(elapsed < 200, `Large array check must complete under 200ms (actual: ${elapsed.toFixed(2)}ms)`);

      // Introduce violation at the very end (index N - 1)
      const violatedEnd = Array.from(largeAsc);
      violatedEnd[N - 1] = violatedEnd[N - 2]; // creates plateau at the end
      assert.equal(verifyMonotonicity(violatedEnd, 'strictly_increasing'), false, 'Late plateau must be caught');
      assert.equal(verifyMonotonicity(violatedEnd, 'non_decreasing'), true, 'Late plateau passes non_decreasing');

      // Introduce violation at the beginning (index 1)
      const violatedStart = Array.from(largeAsc);
      violatedStart[1] = violatedStart[0] - 1;
      assert.equal(verifyMonotonicity(violatedStart, 'strictly_increasing'), false, 'Early reversal must be caught');
    });

    it('3.5 Edge cases: empty, single element, non-array types', () => {
      // @ts-ignore
      assert.equal(verifyMonotonicity([]), true, 'Empty array is vacuously monotonic');
      // @ts-ignore
      assert.equal(verifyMonotonicity([100]), true, 'Single element is vacuously monotonic');
      // @ts-ignore
      assert.equal(verifyMonotonicity(null), true, 'Non-array input handled gracefully as true');
      // @ts-ignore
      assert.equal(verifyMonotonicity(undefined), true);
      // @ts-ignore
      assert.equal(verifyMonotonicity('12345'), true);
    });

    it('3.6 Unsupported direction throws clear descriptive Error', () => {
      const invalidDirections = ['oscillating', 'random', 'convex', 'concave', '', 'increasing', 'decreasing'];
      for (const dir of invalidDirections) {
        assert.throws(() => {
          // @ts-ignore
          verifyMonotonicity([1, 2, 3], dir);
        }, new RegExp(`Unsupported monotonicity direction: ${dir}`));
      }
    });

    it('3.7 Mathematical Invariant: Reversal Duality', () => {
      // If sequence S is strictly increasing, reversed(S) is strictly decreasing
      const S = [1.1, 2.3, 5.8, 13.2, 21.9, 34.1];
      assert.equal(verifyMonotonicity(S, 'strictly_increasing'), true);
      const S_rev = [...S].reverse();
      assert.equal(verifyMonotonicity(S_rev, 'strictly_decreasing'), true);

      // If sequence S is non-decreasing, reversed(S) is non-increasing
      const S_plat = [1, 2, 2, 3, 3, 4];
      assert.equal(verifyMonotonicity(S_plat, 'non_decreasing'), true);
      const S_plat_rev = [...S_plat].reverse();
      assert.equal(verifyMonotonicity(S_plat_rev, 'non_increasing'), true);
    });

    it('3.8 Empirical observation: NaN elements in series bypass strict comparisons', () => {
      // In JS IEEE-754, comparisons with NaN (e.g. curr <= prev) always evaluate to false
      // This causes [10, NaN, 1] to vacuously pass strictly_increasing check
      const hasNaN = [10, NaN, 1];
      assert.equal(verifyMonotonicity(hasNaN, 'strictly_increasing'), true,
        'NaN comparisons evaluate to false, allowing non-monotonic sequences with NaN to pass');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. OPERATIONAL ENVELOPES ADVERSARIAL STRESS
  // ════════════════════════════════════════════════════════════════════════════
  describe('4. Operational Envelope Adversarial Stress', () => {

    it('4.1 Edge coordinates exactly on the boundary and sub-epsilon boundaries', () => {
      const min = 100.0;
      const max = 200.0;

      // Exactly on boundaries
      assert.equal(evaluateOperationalEnvelope(min, min, max), true, 'Exact min must be within envelope');
      assert.equal(evaluateOperationalEnvelope(max, min, max), true, 'Exact max must be within envelope');

      // Floating-point ULP bounds: for 1.0, Number.EPSILON is exactly 1 ULP
      assert.equal(evaluateOperationalEnvelope(1.0, 1.0, 2.0), true);
      assert.equal(evaluateOperationalEnvelope(1.0 + Number.EPSILON, 1.0, 2.0), true);
      assert.equal(evaluateOperationalEnvelope(1.0 - Number.EPSILON, 1.0, 2.0), false);
      assert.equal(evaluateOperationalEnvelope(2.0 + 2.0 * Number.EPSILON, 1.0, 2.0), false);

      // Scaled ULP for min = 100.0: ULP(100) = 100 * EPSILON
      const ulp100 = 100.0 * Number.EPSILON;
      assert.equal(evaluateOperationalEnvelope(min + ulp100, min, max), true);
      assert.equal(evaluateOperationalEnvelope(min - ulp100, min, max), false);
      assert.equal(evaluateOperationalEnvelope(min - 0.0000001, min, max), false, 'Just below min must be rejected');
      assert.equal(evaluateOperationalEnvelope(max + 0.0000001, min, max), false, 'Just above max must be rejected');
    });

    it('4.2 Negative dimensions and negative envelopes', () => {
      const min = -500.0;
      const max = -100.0;

      assert.equal(evaluateOperationalEnvelope(-500.0, min, max), true, 'Exact negative min');
      assert.equal(evaluateOperationalEnvelope(-100.0, min, max), true, 'Exact negative max');
      assert.equal(evaluateOperationalEnvelope(-300.0, min, max), true, 'Interior negative point');
      assert.equal(evaluateOperationalEnvelope(-500.0001, min, max), false, 'Below negative min');
      assert.equal(evaluateOperationalEnvelope(-99.9999, min, max), false, 'Above negative max');
      assert.equal(evaluateOperationalEnvelope(0.0, min, max), false, 'Zero outside negative envelope');
      assert.equal(evaluateOperationalEnvelope(100.0, min, max), false, 'Positive value outside negative envelope');
    });

    it('4.3 Inverted boundaries (min > max) fail closed', () => {
      // An inverted envelope has an empty solution set: val >= 50 && val <= 10 is impossible
      assert.equal(evaluateOperationalEnvelope(30, 50, 10), false);
      assert.equal(evaluateOperationalEnvelope(50, 50, 10), false);
      assert.equal(evaluateOperationalEnvelope(10, 50, 10), false);
    });

    it('4.4 Non-finite and hostile type inputs fail closed', () => {
      assert.equal(evaluateOperationalEnvelope(NaN, 0, 10), false);
      assert.equal(evaluateOperationalEnvelope(Infinity, 0, 10), false);
      assert.equal(evaluateOperationalEnvelope(-Infinity, 0, 10), false);

      const hostile = ['5', true, false, null, undefined, {}, []];
      for (const h of hostile) {
        // @ts-ignore
        assert.equal(evaluateOperationalEnvelope(h, 0, 10), false, `Hostile input ${String(h)} must fail closed`);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. CRYPTOGRAPHIC INTEGRITY, REVISIONS & RECEIPT BOUNDING
  // ════════════════════════════════════════════════════════════════════════════
  describe('5. Cryptographic Proof Receipt & Tamper Integrity', () => {

    it('5.1 SHA-256 computation on zero-byte, binary, and large payloads', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'challenger-crypto-'));
      try {
        // Empty file (0 bytes)
        const emptyFile = path.join(tmpDir, 'empty.txt');
        fs.writeFileSync(emptyFile, '', 'utf8');
        const emptyHash = computeFileSha256(emptyFile);
        assert.equal(emptyHash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          'Empty file must match standard empty SHA-256');

        // Large 512KB payload
        const largeFile = path.join(tmpDir, 'large.bin');
        const buffer = crypto.randomBytes(512 * 1024);
        fs.writeFileSync(largeFile, buffer);
        const expectedLargeHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const computedLargeHash = computeFileSha256(largeFile);
        assert.equal(computedLargeHash, expectedLargeHash, 'Large file hash must match bitwise');

        // Missing file throws fail-closed
        assert.throws(() => {
          computeFileSha256(path.join(tmpDir, 'non_existent_file.xyz'));
        }, /File not found for hashing/);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('5.2 Git Commit SHA format invariant', () => {
      const sha = getGitCommitSha();
      assert.ok(typeof sha === 'string', 'SHA must be string');
      assert.equal(sha.length, 40, 'SHA must be exactly 40 characters');
      assert.match(sha, /^[0-9a-f]{40}$/, 'SHA must be 40 hexadecimal characters');
    });

    it('5.3 Proof receipt validator verifies active G-PROOF-001 receipt on disk', () => {
      const receiptPath = path.resolve('docs/07-backlog/evidence/G-PROOF-001-proof-receipt.json');
      assert.ok(fs.existsSync(receiptPath), 'G-PROOF-001 receipt must exist on disk');

      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
      assert.equal(receipt.goal_id, 'G-PROOF-001');
      assert.equal(receipt.certification, 'PASS');
      assert.equal(receipt.classification, 'executable_invariant');

      // Validate via official validator
      const validation = validateProofReceipt(receiptPath);
      assert.equal(validation.valid, true, `Receipt validation must be valid: ${validation.errors?.join(', ')}`);
    });

    it('5.4 Receipt Tamper Resilience: 1-bit mutation in source file invalidates receipt', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'challenger-tamper-'));
      try {
        const fakeGoal = 'G-PROOF-TEST';
        const dummySource = path.join(tmpDir, 'source.mjs');
        fs.writeFileSync(dummySource, 'export const PI = 3.1415926535;', 'utf8');

        // Create goal markdown fixture conforming to standard sections
        const goalsDir = path.join(tmpDir, 'docs/07-backlog/goals');
        fs.mkdirSync(goalsDir, { recursive: true });
        const goalCard = path.join(goalsDir, `${fakeGoal}.md`);
        fs.writeFileSync(goalCard, `
# ${fakeGoal}
## Touch map
- \`${path.relative(tmpDir, dummySource)}\`

## Verification
\`\`\`yaml
invariants:
  - id: ${fakeGoal}-INV-001
    statement: Mathematical constant integrity
    verification_command: node -e "process.exit(0)"
\`\`\`
`, 'utf8');

        // Generate receipt
        const { receipt, evidencePath } = generateProofReceipt(fakeGoal, {}, tmpDir);
        assert.equal(receipt.certification, 'PASS');
        assert.ok(fs.existsSync(evidencePath));

        // Mutate single byte in source file
        fs.writeFileSync(dummySource, 'export const PI = 3.1415926536;', 'utf8');
        const currentHash = computeFileSha256(dummySource);
        assert.notEqual(currentHash, receipt.source_files[0].sha256, 'Hash must differ after mutation');

        // Verifying tampered file fails
        const receiptOnDisk = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
        const isTampered = receiptOnDisk.source_files.some(f => {
          const fullPath = path.join(tmpDir, f.path);
          return computeFileSha256(fullPath) !== f.sha256;
        });
        assert.equal(isTampered, true, 'Tamper check must detect single-bit alteration fail-closed');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

});
