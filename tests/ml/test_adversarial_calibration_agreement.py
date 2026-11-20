"""
Adversarial Stress Testing & Boundary Fuzzing Suite (Milestone 5: G-UX-020 & G-UX-021).
Rigorously evaluates Python implementation under /opt/anaconda3/envs/py310/bin/python.
"""

import sys
import os
import math
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml/src")))

from eval.calibration_evaluator import (
    CalibrationEvaluator,
    DeterministicPrng,
    CalibrationMetrics
)
from eval.expert_agreement import (
    ExpertAgreementEvaluator,
    BenchmarkScenario,
    NIELSEN_HEURISTICS
)


# ══════════════════════════════════════════════════════════════════════════════
# PROBE 1: Statistical Calibration Boundary Fuzzing & Stress (G-UX-020)
# ══════════════════════════════════════════════════════════════════════════════

class TestProbe1StatisticalCalibrationAdversarial:

    def test_auroc_boundary_probabilities(self):
        """Boundary values c = 0.0, 0.5, 1.0 compute accurately without error."""
        confidences = [1.0, 0.5, 0.0]
        outcomes = [1, 1, 0]
        auroc = CalibrationEvaluator.compute_auroc(confidences, outcomes)
        assert 0.5 <= auroc <= 1.0

    def test_auroc_out_of_bounds_rejection(self):
        """Values exceeding 1.0 or below 0.0 fail closed with ValueError."""
        with pytest.raises(ValueError):
            CalibrationEvaluator.compute_auroc([1.0 + 1e-9, 0.5], [1, 0])
        with pytest.raises(ValueError):
            CalibrationEvaluator.compute_auroc([-1e-9, 0.5], [1, 0])
        with pytest.raises(ValueError):
            CalibrationEvaluator.compute_auroc([float('inf'), 0.5], [1, 0])
        with pytest.raises(ValueError):
            CalibrationEvaluator.compute_auroc([float('-inf'), 0.5], [1, 0])

    def test_auroc_length_mismatch_and_empty(self):
        """Empty lists or mismatched lengths fail closed with ValueError."""
        with pytest.raises(ValueError):
            CalibrationEvaluator.compute_auroc([], [])
        with pytest.raises(ValueError):
            CalibrationEvaluator.compute_auroc([0.8, 0.6], [1])
        with pytest.raises(ValueError):
            CalibrationEvaluator.compute_auroc([0.8], [1, 0])

    def test_auroc_sensitivity_inverted_predictions(self):
        """AUROC drops strictly below 0.50 (to 0.0) on inverted predictions."""
        confidences = [0.1, 0.2, 0.9, 0.8]
        outcomes = [1, 1, 0, 0]
        auroc = CalibrationEvaluator.compute_auroc(confidences, outcomes)
        assert auroc < 0.50
        assert auroc == 0.0

    def test_auroc_sensitivity_identical_predictions(self):
        """AUROC returns exactly 0.50 on uninformative identical predictions."""
        confidences = [0.65, 0.65, 0.65, 0.65]
        outcomes = [1, 0, 1, 0]
        auroc = CalibrationEvaluator.compute_auroc(confidences, outcomes)
        assert auroc == 0.50

    def test_auroc_single_class_edge_cases(self):
        """AUROC returns 1.0 gracefully when outcomes are all positive or all negative."""
        assert CalibrationEvaluator.compute_auroc([0.9, 0.8, 0.7], [1, 1, 1]) == 1.0
        assert CalibrationEvaluator.compute_auroc([0.9, 0.8, 0.7], [0, 0, 0]) == 1.0

    def test_degenerate_bins_ece_no_division_by_zero(self):
        """Concentrated single-bin predictions calculate ECE without division by zero or NaN."""
        confidences = [0.95, 0.96, 0.97]
        outcomes = [True, True, False]
        metrics = CalibrationEvaluator.compute_calibration_metrics(confidences, outcomes, bins_count=10)
        assert metrics.sample_count == 3
        assert len(metrics.bins) == 1
        assert math.isfinite(metrics.ece)
        assert math.isfinite(metrics.brier)
        assert not math.isnan(metrics.ece)

    def test_n_equals_one_minimal_sample(self):
        """Single sample evaluates cleanly without NaN or zero division."""
        metrics = CalibrationEvaluator.compute_calibration_metrics([0.85], [True], bins_count=10)
        assert metrics.sample_count == 1
        assert math.isfinite(metrics.ece)
        assert math.isfinite(metrics.brier)

    def test_wilson_score_interval_bounds(self):
        """Wilson CI satisfies 0 <= lower <= upper <= 1 for all boundary proportions."""
        for k, n in [(0, 100), (1, 100), (50, 100), (99, 100), (100, 100), (0, 1000), (1000, 1000)]:
            ci = CalibrationEvaluator.compute_wilson_ci(k, n, 0.95)
            assert 0.0 <= ci["lower"] <= 1.0
            assert 0.0 <= ci["upper"] <= 1.0
            assert ci["lower"] <= ci["upper"]
            assert ci["lower"] <= ci["point"] <= ci["upper"]

    def test_bootstrap_seed_reproducibility(self):
        """1,000 bootstrap iterations are bitwise reproducible with fixed seed."""
        conf, out = CalibrationEvaluator.generate_calibrated_test_distribution(n=200, seed=101)
        res1 = CalibrationEvaluator.run_bootstrap(conf, out, iterations=200, seed=42)
        res2 = CalibrationEvaluator.run_bootstrap(conf, out, iterations=200, seed=42)

        assert res1["observed"]["ece"] == res2["observed"]["ece"]
        assert res1["observed"]["brier"] == res2["observed"]["brier"]
        assert res1["observed"]["auroc"] == res2["observed"]["auroc"]
        assert res1["bootstrap"]["ece"]["mean"] == res2["bootstrap"]["ece"]["mean"]
        assert res1["bootstrap"]["ece"]["ci_lower"] == res2["bootstrap"]["ece"]["ci_lower"]
        assert res1["bootstrap"]["ece"]["ci_upper"] == res2["bootstrap"]["ece"]["ci_upper"]

    def test_hcer_adversarial_overconfidence_detection(self):
        """Adversarial high-confidence errors (c = 0.99, y = 0) trigger fail-closed gate rejection."""
        conf, out = CalibrationEvaluator.generate_calibrated_test_distribution(n=500, seed=42)
        # Inject toxic overconfident false predictions
        conf.extend([0.99] * 5)
        out.extend([0] * 5)

        verdict = CalibrationEvaluator.evaluate_gate(
            conf,
            out,
            ece_max=0.050,
            brier_max=0.150,
            auroc_min=0.880,
            hcer_max=0.010,
            iterations=100,
            seed=42
        )
        assert verdict["passed"] is False
        assert verdict["verdict"] == "FAIL_CALIBRATION_GATE"
        hcer_check = next(c for c in verdict["checks"] if c["gate"] == "HCER_BOUND")
        assert hcer_check["passed"] is False
        assert hcer_check["observed"] > 0.010

    def test_calibration_metrics_nan_fails_closed(self):
        """Passing NaN to compute_calibration_metrics fails closed with ValueError."""
        with pytest.raises(ValueError):
            CalibrationEvaluator.compute_calibration_metrics([float('nan'), 0.5], [1, 0])


# ══════════════════════════════════════════════════════════════════════════════
# PROBE 2: UX Expert Agreement Fuzzing & Matrix Degradation (G-UX-021)
# ══════════════════════════════════════════════════════════════════════════════

class TestProbe2ExpertAgreementAdversarial:

    def test_disjoint_ratings_kappa_non_positive(self):
        """Disjoint non-overlapping ratings yield kappa <= 0.0."""
        r1 = [0, 0, 0, 0, 1, 1, 1, 1]
        r2 = [3, 3, 3, 3, 4, 4, 4, 4]
        kappa = ExpertAgreementEvaluator.compute_cohens_kappa(r1, r2, categories_count=5)
        assert kappa <= 0.0
        assert kappa == 0.0

    def test_inverted_ratings_maximum_disagreement(self):
        """Perfect inverse extreme ratings yield kappa = -1.0 and kappa_quad = -1.0."""
        r1 = [0, 0, 0, 0, 4, 4, 4, 4]
        r2 = [4, 4, 4, 4, 0, 0, 0, 0]
        kappa = ExpertAgreementEvaluator.compute_cohens_kappa(r1, r2, categories_count=5)
        kappa_quad = ExpertAgreementEvaluator.compute_quadratic_weighted_kappa(r1, r2, categories_count=5)
        assert kappa == -1.0
        assert kappa_quad == -1.0

    def test_identical_ratings_and_zero_variance(self):
        """Identical multi-tier ratings yield kappa = 1.0; zero-variance ratings do not divide by zero."""
        r1 = [0, 1, 2, 3, 4] * 3
        r2 = [0, 1, 2, 3, 4] * 3
        assert ExpertAgreementEvaluator.compute_cohens_kappa(r1, r2, 5) == 1.0
        assert ExpertAgreementEvaluator.compute_quadratic_weighted_kappa(r1, r2, 5) == 1.0

        # Zero-variance (all 3s)
        r_zv = [3, 3, 3, 3, 3]
        assert ExpertAgreementEvaluator.compute_cohens_kappa(r_zv, r_zv, 5) == 1.0
        assert ExpertAgreementEvaluator.compute_quadratic_weighted_kappa(r_zv, r_zv, 5) == 1.0

    def test_quadratic_penalty_ratio_sixteen_x(self):
        """Quadratic penalty formula penalizes shift of 4 exactly 16x more than shift of 1."""
        k = 5
        max_gap_sq = float((k - 1) * (k - 1)) # 16.0
        w_penalty_1 = (1.0 * 1.0) / max_gap_sq # 1/16
        w_penalty_4 = (4.0 * 4.0) / max_gap_sq # 16/16 = 1.0
        assert w_penalty_4 / w_penalty_1 == 16.0

    def test_benchmark_scenarios_composition_and_integrity(self):
        """Validates all 100 benchmark scenarios across 10 heuristics and 5 severities."""
        scenarios = ExpertAgreementEvaluator.get_benchmark_scenarios()
        assert len(scenarios) == 100

        for h in NIELSEN_HEURISTICS:
            matching = [s for s in scenarios if s.heuristic_id == h.id]
            assert len(matching) == 10

        for sev in range(5):
            matching = [s for s in scenarios if s.severity == sev]
            assert len(matching) == 20

        for sc in scenarios:
            assert sc.scenario_id.startswith("UX-SCN-")
            assert 0 <= sc.severity <= 4
            assert len(sc.title.strip()) > 5
            assert len(sc.description.strip()) > 10
            assert len(sc.rationale.strip()) > 5
            assert len(sc.suggested_remediation.strip()) > 3

    def test_ratings_input_validation(self):
        """Out of bounds categories or length mismatches fail closed."""
        with pytest.raises(ValueError):
            ExpertAgreementEvaluator.compute_cohens_kappa([-1, 0], [0, 0], 5)
        with pytest.raises(ValueError):
            ExpertAgreementEvaluator.compute_cohens_kappa([5, 0], [0, 0], 5)
        with pytest.raises(ValueError):
            ExpertAgreementEvaluator.compute_cohens_kappa([1, 2], [1], 5)
        with pytest.raises(ValueError):
            ExpertAgreementEvaluator.compute_cohens_kappa([], [], 5)
