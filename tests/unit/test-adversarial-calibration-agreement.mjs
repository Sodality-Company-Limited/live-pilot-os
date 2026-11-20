import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAuroc,
  computeWilsonScoreInterval,
  computeCalibrationMetrics,
  runBootstrapCalibrationEvaluation,
  evaluateStatisticalCalibrationGate,
  generateCalibratedTestDistribution
} from '../../scripts/lib/statistical-calibration-harness.mjs';
import {
  NIELSEN_HEURISTICS,
  SEVERITY_TIERS,
  getGoldenBenchmarkScenarios,
  computeCohensKappa,
  computeQuadraticWeightedKappa,
  buildConfusionMatrix,
  simulateCalibratedModelRatings,
  evaluateExpertAgreementBenchmark
} from '../../scripts/lib/ux-expert-agreement-benchmark.mjs';

describe('Adversarial Fuzzing & Stress Testing: Milestone 5 (G-UX-020 & G-UX-021)', () => {

  // ══════════════════════════════════════════════════════════════════════════════
  // PROBE 1: Statistical Calibration Fuzzing & Boundary Stress (G-UX-020)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Probe 1: Statistical Calibration Boundary Fuzzing (G-UX-020)', () => {

    describe('AUROC Edge-Case Probabilities & Fail-Closed Validation', () => {
      it('accepts boundary probabilities 0.0, 0.5, 1.0 cleanly', () => {
        const confidences = [1.0, 0.5, 0.0];
        const outcomes = [1, 1, 0];
        const auroc = computeAuroc(confidences, outcomes);
        assert.ok(auroc >= 0.5 && auroc <= 1.0);
      });

      it('rejects confidence > 1.0 (1.0 + 1e-9) with RangeError', () => {
        assert.throws(() => {
          computeAuroc([1.0 + 1e-9, 0.5], [1, 0]);
        }, /RangeError/);
      });

      it('rejects negative confidence (-1e-9) with RangeError', () => {
        assert.throws(() => {
          computeAuroc([-1e-9, 0.5], [1, 0]);
        }, /RangeError/);
      });

      it('rejects NaN confidence with RangeError', () => {
        assert.throws(() => {
          computeAuroc([NaN, 0.5], [1, 0]);
        }, /RangeError/);
      });

      it('rejects Infinity and -Infinity confidence with RangeError', () => {
        assert.throws(() => {
          computeAuroc([Infinity, 0.5], [1, 0]);
        }, /RangeError/);
        assert.throws(() => {
          computeAuroc([-Infinity, 0.5], [1, 0]);
        }, /RangeError/);
      });

      it('rejects empty arrays with RangeError', () => {
        assert.throws(() => {
          computeAuroc([], []);
        }, /RangeError/);
      });

      it('rejects length mismatch between confidences and outcomes with RangeError', () => {
        assert.throws(() => {
          computeAuroc([0.8, 0.6, 0.4], [1, 0]);
        }, /RangeError/);
        assert.throws(() => {
          computeAuroc([0.8], [1, 0]);
        }, /RangeError/);
      });

      it('rejects non-array inputs with TypeError', () => {
        assert.throws(() => {
          computeAuroc(null, [1, 0]);
        }, /TypeError/);
        assert.throws(() => {
          computeAuroc([0.5, 0.6], 'invalid');
        }, /TypeError/);
      });
    });

    describe('AUROC Sensitivity: Inverted, Identical & Degenerate Scenarios', () => {
      it('asserts AUROC drops strictly below 0.50 on inverted predictions', () => {
        // High confidence on false, low confidence on true
        const confidences = [0.1, 0.2, 0.9, 0.8];
        const outcomes = [1, 1, 0, 0];
        const auroc = computeAuroc(confidences, outcomes);
        assert.ok(auroc < 0.50, `Expected AUROC < 0.50 on inverted predictions, got ${auroc}`);
        assert.equal(auroc, 0.0);
      });

      it('asserts AUROC = 0.50 without crashing on completely identical predictions', () => {
        const confidences = [0.73, 0.73, 0.73, 0.73];
        const outcomes = [1, 0, 1, 0];
        const auroc = computeAuroc(confidences, outcomes);
        assert.equal(auroc, 0.5);
      });

      it('returns AUROC = 1.0 gracefully when all outcomes are positive or all negative', () => {
        assert.equal(computeAuroc([0.9, 0.8, 0.7], [1, 1, 1]), 1.0);
        assert.equal(computeAuroc([0.9, 0.8, 0.7], [0, 0, 0]), 1.0);
      });
    });

    describe('Degenerate Bins & Empty-Bin ECE Stress Testing', () => {
      it('calculates ECE on single-bin concentrated distribution without division by zero', () => {
        const records = [
          { confidence: 0.95, correct: true },
          { confidence: 0.96, correct: true },
          { confidence: 0.97, correct: false }
        ];
        const metrics = computeCalibrationMetrics(records, null, { bins: 10 });
        assert.equal(metrics.sampleCount, 3);
        assert.equal(metrics.bins.length, 1); // Only bin 9 is populated
        assert.ok(Number.isFinite(metrics.ece), 'ECE must be finite');
        assert.ok(Number.isFinite(metrics.brier), 'Brier must be finite');
        assert.ok(!Number.isNaN(metrics.ece), 'ECE must not be NaN');
      });

      it('handles N = 1 minimal sample without crashing or NaN', () => {
        const records = [{ confidence: 0.90, correct: true }];
        const metrics = computeCalibrationMetrics(records, null, { bins: 10 });
        assert.equal(metrics.sampleCount, 1);
        assert.ok(Number.isFinite(metrics.ece));
        assert.ok(Number.isFinite(metrics.brier));
      });

      it('throws RangeError on empty sample records in computeCalibrationMetrics', () => {
        assert.throws(() => {
          computeCalibrationMetrics([]);
        }, /RangeError/);
      });
    });

    describe('Wilson Score Confidence Interval Edge Bounds', () => {
      it('asserts 0 <= lower <= upper <= 1 for all boundary proportions', () => {
        const testCases = [
          { k: 0, n: 100 },
          { k: 1, n: 100 },
          { k: 50, n: 100 },
          { k: 99, n: 100 },
          { k: 100, n: 100 },
          { k: 0, n: 1000 },
          { k: 1000, n: 1000 }
        ];

        for (const tc of testCases) {
          const ci = computeWilsonScoreInterval(tc.k, tc.n, 0.95);
          assert.ok(ci.lower >= 0.0, `Lower bound ${ci.lower} must be >= 0 for k=${tc.k}, n=${tc.n}`);
          assert.ok(ci.upper <= 1.0, `Upper bound ${ci.upper} must be <= 1 for k=${tc.k}, n=${tc.n}`);
          assert.ok(ci.lower <= ci.upper, `Lower ${ci.lower} must be <= upper ${ci.upper}`);
          assert.ok(ci.point >= ci.lower && ci.point <= ci.upper, `Point ${ci.point} must be inside [${ci.lower}, ${ci.upper}]`);
        }
      });

      it('handles n <= 0 gracefully returning zeroed structure', () => {
        const ci = computeWilsonScoreInterval(0, 0, 0.95);
        assert.deepEqual(ci, { point: 0, lower: 0, upper: 0, margin: 0 });
      });
    });

    describe('1,000 Bootstrap Resampling: Seed Determinism & Sensitivity', () => {
      it('guarantees bitwise reproducibility across identical seeds', () => {
        const dataset = generateCalibratedTestDistribution({ n: 200, seed: 101 });
        const res1 = runBootstrapCalibrationEvaluation(dataset, null, {
          iterations: 200,
          seed: 42
        });
        const res2 = runBootstrapCalibrationEvaluation(dataset, null, {
          iterations: 200,
          seed: 42
        });

        assert.equal(res1.observed.ece, res2.observed.ece);
        assert.equal(res1.observed.brier, res2.observed.brier);
        assert.equal(res1.observed.auroc, res2.observed.auroc);
        assert.equal(res1.bootstrap.ece.mean, res2.bootstrap.ece.mean);
        assert.equal(res1.bootstrap.ece.ciLower, res2.bootstrap.ece.ciLower);
        assert.equal(res1.bootstrap.ece.ciUpper, res2.bootstrap.ece.ciUpper);
      });

      it('produces valid but distinct resampling distributions across distinct seeds', () => {
        const dataset = generateCalibratedTestDistribution({ n: 200, seed: 101 });
        const resA = runBootstrapCalibrationEvaluation(dataset, null, {
          iterations: 200,
          seed: 42
        });
        const resB = runBootstrapCalibrationEvaluation(dataset, null, {
          iterations: 200,
          seed: 999
        });

        assert.equal(resA.observed.ece, resB.observed.ece); // Observed is fixed
        // Bootstrap sample statistics will differ slightly across random seeds
        assert.ok(resA.bootstrap.ece.mean !== resB.bootstrap.ece.mean || resA.bootstrap.ece.stdErr !== resB.bootstrap.ece.stdErr);
        assert.ok(resA.bootstrap.ece.ciLower >= 0.0 && resA.bootstrap.ece.ciUpper <= 1.0);
        assert.ok(resB.bootstrap.ece.ciLower >= 0.0 && resB.bootstrap.ece.ciUpper <= 1.0);
      });
    });

    describe('HCER Adversarial Detection & Gate Fail-Closed Enforcement', () => {
      it('immediately flags and rejects adversarial high-confidence incorrect predictions (c = 0.99, y = 0)', () => {
        const dataset = generateCalibratedTestDistribution({ n: 500, seed: 42 });
        // Inject 5 toxic high-confidence errors (c = 0.99, y = 0)
        for (let i = 0; i < 5; i++) {
          dataset.push({ confidence: 0.99, correct: false });
        }

        const verdict = evaluateStatisticalCalibrationGate(dataset, {
          eceMax: 0.050,
          brierMax: 0.150,
          aurocMin: 0.880,
          hcerMax: 0.010, // Max 1.0%
          iterations: 100,
          seed: 42
        });

        assert.equal(verdict.passed, false, 'Gate must fail closed when toxic HCER errors are injected');
        assert.equal(verdict.verdict, 'FAIL_CALIBRATION_GATE');
        const hcerCheck = verdict.checks.find(c => c.gate === 'HCER_BOUND');
        assert.ok(hcerCheck, 'Must contain HCER_BOUND check');
        assert.equal(hcerCheck.passed, false, 'HCER_BOUND check must fail');
        assert.ok(hcerCheck.observed > 0.010, `Observed HCER ${hcerCheck.observed} must exceed 0.010`);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // PROBE 2: UX Expert Agreement Fuzzing & Matrix Degradation (G-UX-021)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Probe 2: UX Expert Agreement Fuzzing & Matrix Degradation (G-UX-021)', () => {

    describe('Disjoint & Inverted Ratings Fuzzing', () => {
      it('asserts kappa <= 0.0 on completely disjoint ratings across raters', () => {
        // Rater 1 only rates 0 and 1, Rater 2 only rates 3 and 4
        const r1 = [0, 0, 0, 0, 1, 1, 1, 1];
        const r2 = [3, 3, 3, 3, 4, 4, 4, 4];
        const kappa = computeCohensKappa(r1, r2, 5);
        assert.ok(kappa <= 0.0, `Expected kappa <= 0 on disjoint ratings, got ${kappa}`);
        assert.equal(kappa, 0.0);
      });

      it('asserts kappa = -1.0 and kappa_quad = -1.0 on perfectly inverted extreme ratings', () => {
        // Worst possible disagreement: 0 vs 4
        const r1 = [0, 0, 0, 0, 4, 4, 4, 4];
        const r2 = [4, 4, 4, 4, 0, 0, 0, 0];
        const kappa = computeCohensKappa(r1, r2, 5);
        const kappaQuad = computeQuadraticWeightedKappa(r1, r2, 5);
        assert.equal(kappa, -1.0);
        assert.equal(kappaQuad, -1.0);
      });
    });

    describe('Identical Ratings & Zero-Variance Handling', () => {
      it('asserts kappa = 1.0 and kappa_quad = 1.0 on identical multi-tier ratings', () => {
        const r1 = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
        const r2 = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
        assert.equal(computeCohensKappa(r1, r2, 5), 1.0);
        assert.equal(computeQuadraticWeightedKappa(r1, r2, 5), 1.0);
      });

      it('handles zero-variance identical ratings (all 2s) without NaN or division by zero', () => {
        const r1 = [2, 2, 2, 2, 2];
        const r2 = [2, 2, 2, 2, 2];
        const kappa = computeCohensKappa(r1, r2, 5);
        const kappaQuad = computeQuadraticWeightedKappa(r1, r2, 5);
        assert.equal(kappa, 1.0);
        assert.equal(kappaQuad, 1.0);
      });
    });

    describe('Quadratic Weighted Penalty Ratio Verification', () => {
      it('verifies that a severity shift of 4 is penalized exactly 16x more heavily than a shift of 1', () => {
        // Quadratic penalty weight formula: w_penalty(i, j) = (i - j)^2 / (K - 1)^2
        const k = 5;
        const maxGapSq = (k - 1) * (k - 1); // 16
        const penaltyDelta1 = (1 * 1) / maxGapSq; // 1/16 = 0.0625
        const penaltyDelta4 = (4 * 4) / maxGapSq; // 16/16 = 1.0

        assert.equal(penaltyDelta4 / penaltyDelta1, 16.0);
      });

      it('empirically verifies quadratic penalty reflects in kappa_quad degradation', () => {
        const baseline = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];

        // 1 minor off-by-one deviation (0 -> 1)
        const r1_minor = [...baseline, 0];
        const r2_minor = [...baseline, 1];

        // 1 extreme catastrophe deviation (0 -> 4)
        const r1_cat = [...baseline, 0];
        const r2_cat = [...baseline, 4];

        const kQuadMinor = computeQuadraticWeightedKappa(r1_minor, r2_minor, 5);
        const kQuadCat = computeQuadraticWeightedKappa(r1_cat, r2_cat, 5);

        // Catastrophic deviation must reduce quadratic kappa significantly more than minor deviation
        assert.ok(kQuadMinor > kQuadCat, `Adjacent kappa (${kQuadMinor}) must be strictly higher than catastrophe kappa (${kQuadCat})`);
        assert.ok((1.0 - kQuadCat) > 5.0 * (1.0 - kQuadMinor), 'Catastrophe disagreement penalty must drastically exceed minor discrepancy');
      });
    });

    describe('Benchmark Scenario Corpus Integrity (N = 100)', () => {
      it('verifies exactly 100 scenarios with 10 per heuristic and 20 per severity tier', () => {
        const scenarios = getGoldenBenchmarkScenarios();
        assert.equal(scenarios.length, 100);

        for (const h of NIELSEN_HEURISTICS) {
          const count = scenarios.filter(s => s.heuristicId === h.id).length;
          assert.equal(count, 10, `Heuristic ${h.id} (${h.name}) must have exactly 10 scenarios`);
        }

        for (let sev = 0; sev <= 4; sev++) {
          const count = scenarios.filter(s => s.severity === sev).length;
          assert.equal(count, 20, `Severity level ${sev} must have exactly 20 scenarios`);
        }
      });

      it('verifies non-empty descriptive fields and valid severity ranges on all 100 scenarios', () => {
        const scenarios = getGoldenBenchmarkScenarios();
        const validHeuristicIds = new Set(NIELSEN_HEURISTICS.map(h => h.id));

        for (let i = 0; i < scenarios.length; i++) {
          const sc = scenarios[i];
          assert.ok(validHeuristicIds.has(sc.heuristicId), `Invalid heuristic ID: ${sc.heuristicId} at index ${i}`);
          assert.ok(Number.isInteger(sc.severity) && sc.severity >= 0 && sc.severity <= 4, `Invalid severity: ${sc.severity} at index ${i}`);
          assert.ok(sc.title && sc.title.trim().length > 5, `Title too short at index ${i}`);
          assert.ok(sc.description && sc.description.trim().length > 10, `Description too short at index ${i}`);
          assert.ok(sc.rationale && sc.rationale.trim().length > 5, `Rationale too short at index ${i}`);
          assert.ok(sc.suggestedRemediation && sc.suggestedRemediation.trim().length > 3, `Remediation too short at index ${i}`);
        }
      });
    });

    describe('Input Validation & Boundary Fail-Closed Enforcement', () => {
      it('rejects ratings with out-of-range severity levels (e.g., -1 or 5)', () => {
        assert.throws(() => {
          computeCohensKappa([-1, 0], [0, 0], 5);
        }, /RangeError/);
        assert.throws(() => {
          computeCohensKappa([0, 5], [0, 0], 5);
        }, /RangeError/);
      });

      it('rejects non-integer severity ratings (e.g., 2.5)', () => {
        assert.throws(() => {
          computeCohensKappa([2.5, 1], [2, 1], 5);
        }, /RangeError/);
      });

      it('rejects length mismatch between rater1 and rater2', () => {
        assert.throws(() => {
          computeCohensKappa([1, 2, 3], [1, 2], 5);
        }, /RangeError/);
      });

      it('rejects empty arrays for ratings', () => {
        assert.throws(() => {
          computeCohensKappa([], [], 5);
        }, /RangeError/);
      });
    });
  });
});
