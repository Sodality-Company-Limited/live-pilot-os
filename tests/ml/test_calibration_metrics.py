"""
Unit and Integration Test Suite for Calibration Evaluation Suite (G-ML-009).

Tests:
1. Exact formula calculation for 10-bin ECE, MCE, and Brier Score
2. ASCII reliability diagram and scorecard JSON artifact emission
3. Calibration SLA validation gates and High-Confidence Error Rate (HCER) bounds
4. Fail-closed error handling on degenerate, empty, or non-finite inputs
"""

import os
import sys
import json
import math
import pytest
from pathlib import Path

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from eval.calibration_eval import (
    PredictionRecord,
    CalibrationBin,
    CalibrationScorecard,
    CalibrationEvaluator,
)


def test_metric_formulas():
    """Verify ECE, MCE, and Brier score on analytically known synthetic distributions."""
    evaluator = CalibrationEvaluator(num_bins=10)

    # Case A: Perfectly calibrated synthetic dataset
    # For each bin [m/10, (m+1)/10), create 100 samples with average confidence 0.05 + 0.1*m
    # Exactly int(round(avg_conf * 100)) are correct.
    records_perfect = []
    for m in range(10):
        c = 0.05 + 0.1 * m
        correct_count = int(round(c * 100))
        for i in range(100):
            records_perfect.append(PredictionRecord(confidence=c, correct=(i < correct_count)))

    scorecard_perfect = evaluator.evaluate(records_perfect)
    assert scorecard_perfect.sample_count == 1000
    assert scorecard_perfect.num_bins == 10
    # In perfectly calibrated data, empirical accuracy matches avg confidence exactly
    assert scorecard_perfect.ece == pytest.approx(0.0, abs=1e-6)
    assert scorecard_perfect.mce == pytest.approx(0.0, abs=1e-6)

    # Verify Brier Score formula: sum((c - y)^2) / N
    manual_brier = sum(
        (r.confidence - (1.0 if r.correct else 0.0)) ** 2 for r in records_perfect
    ) / len(records_perfect)
    assert scorecard_perfect.brier_score == pytest.approx(manual_brier, abs=1e-6)

    # Case B: Completely miscalibrated dataset (Overconfident wrong answers)
    # Confidence 1.0, but all correct=False
    records_inverted = [PredictionRecord(confidence=1.0, correct=False) for _ in range(50)]
    scorecard_inverted = evaluator.evaluate(records_inverted)
    assert scorecard_inverted.ece == pytest.approx(1.0, abs=1e-6)
    assert scorecard_inverted.mce == pytest.approx(1.0, abs=1e-6)
    assert scorecard_inverted.brier_score == pytest.approx(1.0, abs=1e-6)
    assert scorecard_inverted.high_confidence_error_rate == pytest.approx(1.0, abs=1e-6)


def test_diagram_generation(tmp_path):
    """Verify ASCII diagram rendering and scorecard JSON artifact emission."""
    evaluator = CalibrationEvaluator(num_bins=10)
    records = [
        PredictionRecord(confidence=0.15, correct=False),
        PredictionRecord(confidence=0.45, correct=True),
        PredictionRecord(confidence=0.85, correct=True),
        PredictionRecord(confidence=0.95, correct=True),
    ]

    scorecard = evaluator.evaluate(records)

    # Verify ASCII rendering
    ascii_diagram = evaluator.generate_ascii_reliability_diagram(scorecard)
    assert "RELIABILITY DIAGRAM & CALIBRATION HISTOGRAM" in ascii_diagram
    assert "Samples: 4" in ascii_diagram
    assert "ECE:" in ascii_diagram
    assert "Brier:" in ascii_diagram
    assert "Bin" in ascii_diagram

    # Verify Scorecard JSON persistence
    out_file = tmp_path / "test_scorecard.json"
    saved_path = evaluator.save_scorecard(scorecard, filepath=out_file)
    assert saved_path.exists()

    with open(saved_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["sample_count"] == 4
    assert data["num_bins"] == 10
    assert "ece" in data
    assert "mce" in data
    assert "brier_score" in data
    assert "high_confidence_error_rate" in data
    assert len(data["bins"]) == 10

    # Verify Matplotlib diagram rendering
    plot_file = tmp_path / "reliability_diagram.png"
    img_path = evaluator.plot_reliability_diagram(scorecard, filepath=plot_file)
    if img_path is not None:
        assert img_path.exists()
        assert img_path.stat().st_size > 1000


def test_sla_enforcement():
    """Verify strict calibration SLA validation: ECE <= 0.040, Brier <= 0.080, HCER <= 0.010."""
    evaluator = CalibrationEvaluator(
        num_bins=10,
        ece_sla=0.040,
        brier_sla=0.080,
        hcer_sla=0.010,
        high_conf_threshold=0.80,
    )

    # Construct well-calibrated dataset meeting all SLAs
    # 500 records with well-calibrated predictions:
    # High confidence samples (c >= 0.80) are 100% correct -> HCER = 0.0 <= 0.010
    records_good = []
    for i in range(500):
        c = (i % 100) / 100.0
        # If c >= 0.80, correct is True (zero errors)
        if c >= 0.80:
            correct = True
        else:
            correct = (i % 10) < int(round(c * 10))
        records_good.append(PredictionRecord(confidence=c, correct=correct))

    scorecard_good = evaluator.evaluate(records_good, enforce_sla=False)
    # Assert high confidence error rate is 0.0
    assert scorecard_good.high_confidence_error_rate == 0.0
    assert scorecard_good.high_confidence_count > 0

    # Test breach condition: High confidence errors breach SLA (e.g. 10% errors among c >= 0.80)
    records_breach = list(records_good)
    records_breach.append(PredictionRecord(confidence=0.92, correct=False))
    records_breach.append(PredictionRecord(confidence=0.88, correct=False))

    scorecard_breach = evaluator.evaluate(records_breach, enforce_sla=False)
    assert scorecard_breach.high_confidence_error_rate > 0.010
    assert scorecard_breach.sla_passed is False

    with pytest.raises(ValueError, match="Calibration SLA breached"):
        evaluator.evaluate(records_breach, enforce_sla=True)


def test_boundary_conditions_and_fail_closed():
    """Verify fail-closed error handling on degenerate, empty, or non-finite inputs."""
    evaluator = CalibrationEvaluator(num_bins=10)

    # Empty records
    with pytest.raises(ValueError, match="records must be non-empty"):
        evaluator.evaluate([])

    # Out-of-bounds confidence (< 0.0 or > 1.0)
    with pytest.raises(ValueError, match="confidence must be between 0.0 and 1.0"):
        PredictionRecord(confidence=-0.05, correct=True)

    with pytest.raises(ValueError, match="confidence must be between 0.0 and 1.0"):
        PredictionRecord(confidence=1.05, correct=False)

    # Non-finite confidence (NaN, Inf)
    with pytest.raises(ValueError, match="confidence cannot be NaN or Infinite"):
        PredictionRecord(confidence=float("nan"), correct=True)

    with pytest.raises(ValueError, match="confidence cannot be NaN or Infinite"):
        PredictionRecord(confidence=float("inf"), correct=True)

    # Invalid correctness type
    with pytest.raises(TypeError, match="correct must be a boolean"):
        PredictionRecord(confidence=0.5, correct="invalid")  # type: ignore

    # Zero high-confidence samples evaluates cleanly to 0.0
    records_low = [PredictionRecord(confidence=0.3, correct=True) for _ in range(10)]
    scorecard_low = evaluator.evaluate(records_low)
    assert scorecard_low.high_confidence_count == 0
    assert scorecard_low.high_confidence_error_rate == 0.0

    # Normalization of tuples and dicts
    records_mixed = [
        (0.5, True),
        {"confidence": 0.85, "correct": False},
        PredictionRecord(confidence=0.95, correct=True),
    ]
    scorecard_mixed = evaluator.evaluate(records_mixed)
    assert scorecard_mixed.sample_count == 3
    assert scorecard_mixed.bins[min(9, int(0.5 * 10))].count >= 1

    # Exact boundary placement: 0.0 in bin 0, 1.0 in bin 9
    records_edge = [
        PredictionRecord(confidence=0.0, correct=False),
        PredictionRecord(confidence=1.0, correct=True),
    ]
    scorecard_edge = evaluator.evaluate(records_edge)
    assert scorecard_edge.bins[0].count == 1
    assert scorecard_edge.bins[9].count == 1
    assert sum(b.count for b in scorecard_edge.bins) == 2
