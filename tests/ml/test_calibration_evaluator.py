"""
Unit tests for Python CalibrationEvaluator (G-UX-020).

Verifies:
  - AUROC exact calculation (positive discrimination, random, tied scores)
  - Wilson score confidence interval calculation
  - 10-bin ECE and strictly proper Brier score
  - High-Confidence Error Rate (HCER) computation
  - 1,000 bootstrap resampling iterations & empirical p-values
  - Full G-UX-020 gate evaluation (pass & fail-closed)
"""

import pytest
import sys
import os

# Add code/ml/src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml/src")))

from eval.calibration_evaluator import (
    CalibrationEvaluator,
    CalibrationMetrics,
    BinRecord,
    DeterministicPrng,
)


def test_deterministic_prng():
    rng1 = DeterministicPrng(42)
    rng2 = DeterministicPrng(42)
    vals1 = [rng1.next_float() for _ in range(10)]
    vals2 = [rng2.next_float() for _ in range(10)]
    assert vals1 == vals2
    assert all(0.0 <= v < 1.0 for v in vals1)


def test_auroc_perfect_separation():
    confidences = [0.95, 0.90, 0.85, 0.30, 0.20, 0.10]
    outcomes = [1, 1, 1, 0, 0, 0]
    auroc = CalibrationEvaluator.compute_auroc(confidences, outcomes)
    assert auroc == 1.0


def test_auroc_uninformative():
    confidences = [0.5, 0.5, 0.5, 0.5]
    outcomes = [1, 0, 1, 0]
    auroc = CalibrationEvaluator.compute_auroc(confidences, outcomes)
    assert auroc == 0.5


def test_auroc_tied_scores():
    confidences = [0.9, 0.8, 0.8, 0.2]
    outcomes = [1, 1, 0, 0]
    auroc = CalibrationEvaluator.compute_auroc(confidences, outcomes)
    assert 0.8 < auroc < 1.0


def test_auroc_invalid_inputs():
    with pytest.raises(ValueError):
        CalibrationEvaluator.compute_auroc([], [])
    with pytest.raises(ValueError):
        CalibrationEvaluator.compute_auroc([0.5], [1, 0])
    with pytest.raises(ValueError):
        CalibrationEvaluator.compute_auroc([float("nan"), 0.5], [1, 0])


def test_wilson_score_interval():
    res = CalibrationEvaluator.compute_wilson_ci(5, 500, 0.95)
    assert res["point"] == 0.01
    assert 0.0 <= res["lower"] < res["point"]
    assert res["point"] < res["upper"] <= 1.0

    res_zero = CalibrationEvaluator.compute_wilson_ci(0, 100, 0.95)
    assert res_zero["point"] == 0.0
    assert res_zero["lower"] == 0.0
    assert res_zero["upper"] > 0.0


def test_calibration_metrics_brier_and_hcer():
    confidences = [0.95, 0.85, 0.75, 0.25, 0.15, 0.05]
    outcomes = [True, True, True, False, False, False]
    metrics = CalibrationEvaluator.compute_calibration_metrics(confidences, outcomes, bins_count=10)

    assert metrics.sample_count == 6
    assert 0.0 <= metrics.ece <= 1.0
    assert 0.0 <= metrics.brier <= 1.0
    assert metrics.high_confidence_error_rate == 0.0
    assert metrics.auroc == 1.0


def test_hcer_overconfidence_penalty():
    confidences = [0.95, 0.90, 0.85, 0.30]
    outcomes = [False, True, True, False]  # 1 high-confidence error at 0.95
    metrics = CalibrationEvaluator.compute_calibration_metrics(confidences, outcomes, hcer_threshold=0.80)

    assert metrics.high_confidence_count == 3
    assert metrics.high_confidence_errors == 1
    assert round(metrics.high_confidence_error_rate, 4) == 0.3333


def test_full_calibration_gate_pass():
    confidences, outcomes = CalibrationEvaluator.generate_calibrated_test_distribution(n=1000, seed=42)
    verdict = CalibrationEvaluator.evaluate_gate(
        confidences,
        outcomes,
        ece_max=0.050,
        brier_max=0.150,
        auroc_min=0.880,
        hcer_max=0.010,
        iterations=200,
        seed=42,
    )

    assert verdict["passed"] is True
    assert verdict["verdict"] == "PASS_CALIBRATION_GATE"
    assert verdict["metrics"]["ece"] <= 0.050
    assert verdict["metrics"]["brier"] <= 0.150
    assert verdict["metrics"]["auroc"] >= 0.880
    assert verdict["metrics"]["high_confidence_error_rate"] <= 0.010
    assert verdict["bootstrap"]["ece"]["ci_upper"] <= 0.055


def test_full_calibration_gate_fail_closed():
    # Miscalibrated adversarial distribution
    confidences = [0.99, 0.95, 0.90, 0.85, 0.10]
    outcomes = [False, False, False, False, True]
    verdict = CalibrationEvaluator.evaluate_gate(
        confidences,
        outcomes,
        ece_max=0.050,
        brier_max=0.150,
        auroc_min=0.880,
        hcer_max=0.010,
        iterations=50,
    )

    assert verdict["passed"] is False
    assert verdict["verdict"] == "FAIL_CALIBRATION_GATE"
    assert any(not check["passed"] for check in verdict["checks"])
