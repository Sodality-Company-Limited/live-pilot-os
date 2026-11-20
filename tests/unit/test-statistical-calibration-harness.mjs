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

describe('G-UX-020: Statistical Calibration Verification Harness', () => {
  describe('AUROC Computation', () => {
    it('computes AUROC = 1.0 on perfectly separated predictions', () => {
      const confidences = [0.95, 0.90, 0.85, 0.30, 0.20, 0.10];
      const outcomes = [1, 1, 1, 0, 0, 0];
      const auroc = computeAuroc(confidences, outcomes);
      assert.equal(auroc, 1.0);
    });

    it('computes AUROC = 0.5 on uninformative random predictions', () => {
      const confidences = [0.5, 0.5, 0.5, 0.5];
      const outcomes = [1, 0, 1, 0];
      const auroc = computeAuroc(confidences, outcomes);
      assert.equal(auroc, 0.5);
    });

    it('computes AUROC accurately with tied scores', () => {
      const confidences = [0.9, 0.8, 0.8, 0.2];
      const outcomes = [1, 1, 0, 0];
      const auroc = computeAuroc(confidences, outcomes);
      assert.ok(auroc > 0.8 && auroc < 1.0);
    });

    it('throws on mismatched or empty array inputs', () => {
      assert.throws(() => computeAuroc([], []), /RangeError/);
      assert.throws(() => computeAuroc([0.5], [1, 0]), /RangeError/);
    });
  });

  describe('Wilson Score Confidence Interval', () => {
    it('computes valid 95% Wilson interval containing point estimate', () => {
      const res = computeWilsonScoreInterval(5, 500, 0.95);
      assert.equal(res.point, 0.01);
      assert.ok(res.lower < res.point);
      assert.ok(res.upper > res.point);
      assert.ok(res.lower >= 0.0);
      assert.ok(res.upper <= 1.0);
    });

    it('handles zero events gracefully', () => {
      const res = computeWilsonScoreInterval(0, 100, 0.95);
      assert.equal(res.point, 0.0);
      assert.equal(res.lower, 0.0);
      assert.ok(res.upper > 0.0);
    });
  });

  describe('Vectorized Calibration Metrics & Brier Score', () => {
    it('calculates 10-bin ECE and strictly proper Brier score', () => {
      const records = [
        { confidence: 0.95, correct: true },
        { confidence: 0.85, correct: true },
        { confidence: 0.75, correct: true },
        { confidence: 0.25, correct: false },
        { confidence: 0.15, correct: false },
        { confidence: 0.05, correct: false }
      ];
      const metrics = computeCalibrationMetrics(records, null, { bins: 10 });
      assert.equal(metrics.sampleCount, 6);
      assert.ok(metrics.ece >= 0.0 && metrics.ece <= 1.0);
      assert.ok(metrics.brier >= 0.0 && metrics.brier <= 1.0);
      assert.equal(metrics.highConfidenceErrorRate, 0.0);
      assert.equal(metrics.auroc, 1.0);
    });

    it('penalizes high-confidence errors correctly (HCER)', () => {
      const records = [
        { confidence: 0.95, correct: false }, // high-confidence error!
        { confidence: 0.90, correct: true },
        { confidence: 0.85, correct: true },
        { confidence: 0.30, correct: false }
      ];
      const metrics = computeCalibrationMetrics(records, null, { bins: 10, hcerThreshold: 0.80 });
      assert.equal(metrics.highConfidenceCount, 3);
      assert.equal(metrics.highConfidenceErrors, 1);
      assert.equal(Number(metrics.highConfidenceErrorRate.toFixed(4)), 0.3333);
    });
  });

  describe('Bootstrap Calibration & Invariant Verification Gate', () => {
    it('passes full G-UX-020 gate on calibrated test distribution', () => {
      const dataset = generateCalibratedTestDistribution({ n: 1000, seed: 42 });
      const verdict = evaluateStatisticalCalibrationGate(dataset, {
        eceMax: 0.050,
        brierMax: 0.150,
        aurocMin: 0.880,
        hcerMax: 0.010,
        iterations: 200,
        seed: 42
      });

      assert.equal(verdict.passed, true);
      assert.equal(verdict.verdict, 'PASS_CALIBRATION_GATE');
      assert.ok(verdict.metrics.ece <= 0.050, `ECE ${verdict.metrics.ece} should be <= 0.050`);
      assert.ok(verdict.metrics.brier <= 0.150, `Brier ${verdict.metrics.brier} should be <= 0.150`);
      assert.ok(verdict.metrics.auroc >= 0.880, `AUROC ${verdict.metrics.auroc} should be >= 0.880`);
      assert.ok(verdict.metrics.highConfidenceErrorRate <= 0.010, `HCER ${verdict.metrics.highConfidenceErrorRate} should be <= 0.010`);
      assert.ok(verdict.bootstrap.ece.ciUpper <= 0.055, `ECE CI Upper ${verdict.bootstrap.ece.ciUpper} should be <= 0.055`);
    });

    it('fails closed when overconfidence or calibration thresholds are violated', () => {
      // Overconfident miscalibrated data: high confidence on errors
      const badData = [
        { confidence: 0.99, correct: false },
        { confidence: 0.95, correct: false },
        { confidence: 0.90, correct: false },
        { confidence: 0.85, correct: false },
        { confidence: 0.10, correct: true }
      ];
      const verdict = evaluateStatisticalCalibrationGate(badData, {
        eceMax: 0.050,
        brierMax: 0.150,
        aurocMin: 0.880,
        hcerMax: 0.010,
        iterations: 50
      });
      assert.equal(verdict.passed, false);
      assert.equal(verdict.verdict, 'FAIL_CALIBRATION_GATE');
      assert.ok(verdict.checks.some(c => !c.passed));
    });
  });
});
