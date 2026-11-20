import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

describe('G-UX-021: UX Expert Heuristic Agreement Benchmark', () => {
  describe('Benchmark Scenario Corpus', () => {
    it('curates exactly 100 benchmark scenarios across 10 Nielsen heuristics', () => {
      const scenarios = getGoldenBenchmarkScenarios();
      assert.equal(scenarios.length, 100);
      assert.equal(NIELSEN_HEURISTICS.length, 10);
      assert.equal(SEVERITY_TIERS.length, 5);

      // Verify each heuristic has exactly 10 scenarios
      for (const h of NIELSEN_HEURISTICS) {
        const matching = scenarios.filter(s => s.heuristicId === h.id);
        assert.equal(matching.length, 10, `Heuristic ${h.id} should have exactly 10 scenarios`);
      }

      // Verify severity tiers 0-4 are populated evenly
      for (let sev = 0; sev <= 4; sev++) {
        const matching = scenarios.filter(s => s.severity === sev);
        assert.equal(matching.length, 20, `Severity tier ${sev} should have exactly 20 scenarios`);
      }
    });

    it('validates scenario fields structure and integrity', () => {
      const scenarios = getGoldenBenchmarkScenarios();
      for (const s of scenarios) {
        assert.ok(s.scenarioId.startsWith('UX-SCN-'));
        assert.ok(s.title && s.title.length > 5);
        assert.ok(s.description && s.description.length > 10);
        assert.ok(s.rationale && s.rationale.length > 5);
        assert.ok(s.suggestedRemediation && s.suggestedRemediation.length > 3);
        assert.ok(s.severity >= 0 && s.severity <= 4);
      }
    });
  });

  describe('Cohen\'s Kappa & Quadratic Weighted Kappa Math', () => {
    it('returns kappa = 1.0 on identical ratings', () => {
      const r1 = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
      const r2 = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
      const kappa = computeCohensKappa(r1, r2, 5);
      const kappaQuad = computeQuadraticWeightedKappa(r1, r2, 5);
      assert.equal(kappa, 1.0);
      assert.equal(kappaQuad, 1.0);
    });

    it('returns kappa close to 0 on chance agreement', () => {
      // Uncorrelated random distributions
      const r1 = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4];
      const r2 = [4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0];
      const kappa = computeCohensKappa(r1, r2, 5);
      assert.ok(kappa < 0.1, `Expected low kappa on inverse/chance data, got ${kappa}`);
    });

    it('quadratic weighted kappa is higher than unweighted kappa when misclassifications are adjacent', () => {
      const r1 = [1, 2, 3, 4, 1, 2, 3, 4, 0, 1];
      const r2 = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2]; // 8 exact matches, 2 adjacent misclassifications (0->1, 1->2)
      const kappa = computeCohensKappa(r1, r2, 5);
      const kappaQuad = computeQuadraticWeightedKappa(r1, r2, 5);

      assert.ok(kappa >= 0.70);
      assert.ok(kappaQuad > kappa, `Quadratic weighted kappa (${kappaQuad}) should exceed standard kappa (${kappa}) for adjacent errors`);
    });

    it('builds full 5x5 confusion matrix accurately', () => {
      const r1 = [0, 1, 2, 3, 4];
      const r2 = [0, 1, 2, 3, 4];
      const matrix = buildConfusionMatrix(r1, r2, 5);
      assert.equal(matrix.length, 5);
      for (let i = 0; i < 5; i++) {
        assert.equal(matrix[i][i], 1);
        assert.equal(matrix[i].reduce((a, b) => a + b, 0), 1);
      }
    });
  });

  describe('Full Benchmark Execution Gate', () => {
    it('achieves kappa >= 0.800 and kappa_quad >= 0.850 on calibrated model ratings', () => {
      const scenarios = getGoldenBenchmarkScenarios();
      const modelRatings = simulateCalibratedModelRatings(scenarios, { seed: 42 });

      const report = evaluateExpertAgreementBenchmark(scenarios, modelRatings, {
        kappaMin: 0.800,
        kappaQuadMin: 0.850
      });

      assert.equal(report.passed, true);
      assert.equal(report.verdict, 'PASS_EXPERT_AGREEMENT_BENCHMARK');
      assert.ok(report.cohensKappa >= 0.800, `Expected kappa >= 0.800, got ${report.cohensKappa}`);
      assert.ok(report.quadraticWeightedKappa >= 0.850, `Expected quadratic kappa >= 0.850, got ${report.quadraticWeightedKappa}`);
      assert.ok(report.overallAccuracy >= 0.85, `Expected accuracy >= 0.85, got ${report.overallAccuracy}`);
      assert.equal(report.perHeuristicBreakdown.length, 10);
    });

    it('fails closed when agreement drops below threshold', () => {
      const scenarios = getGoldenBenchmarkScenarios();
      // Low-agreement noisy model ratings
      const badRatings = scenarios.map((_, i) => i % 5);
      const report = evaluateExpertAgreementBenchmark(scenarios, badRatings, {
        kappaMin: 0.800,
        kappaQuadMin: 0.850
      });

      assert.equal(report.passed, false);
      assert.equal(report.verdict, 'FAIL_EXPERT_AGREEMENT_BENCHMARK');
      assert.ok(report.checks.some(c => !c.passed));
    });
  });
});
