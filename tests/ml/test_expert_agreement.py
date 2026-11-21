"""
Unit tests for Python ExpertAgreementEvaluator (G-UX-021).

Verifies:
  - 100 benchmark scenarios across Nielsen's 10 heuristics
  - Cohen's Kappa exact calculation (identical ratings, low agreement, bounds)
  - Quadratic Weighted Kappa calculation and properties
  - Full 5x5 confusion matrix generation
  - G-UX-021 evaluation gate (pass on calibrated ratings, fail-closed on noise)
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml/src")))

from eval.expert_agreement import (
    ExpertAgreementEvaluator,
    BenchmarkScenario,
    NIELSEN_HEURISTICS,
)


def test_benchmark_scenarios_composition():
    scenarios = ExpertAgreementEvaluator.get_benchmark_scenarios()
    assert len(scenarios) == 100
    assert len(NIELSEN_HEURISTICS) == 10

    for heur in NIELSEN_HEURISTICS:
        matching = [s for s in scenarios if s.heuristic_id == heur.id]
        assert len(matching) == 10

    for sev in range(5):
        matching = [s for s in scenarios if s.severity == sev]
        assert len(matching) == 20


def test_cohens_kappa_perfect_and_random():
    r1 = [0, 1, 2, 3, 4] * 4
    r2 = [0, 1, 2, 3, 4] * 4
    kappa = ExpertAgreementEvaluator.compute_cohens_kappa(r1, r2, categories_count=5)
    kappa_quad = ExpertAgreementEvaluator.compute_quadratic_weighted_kappa(r1, r2, categories_count=5)
    assert kappa == 1.0
    assert kappa_quad == 1.0


def test_quadratic_weighted_kappa_adjacent_penalty():
    # 8 exact matches, 2 adjacent errors (0->1, 1->2)
    r1 = [1, 2, 3, 4, 1, 2, 3, 4, 0, 1]
    r2 = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2]
    kappa = ExpertAgreementEvaluator.compute_cohens_kappa(r1, r2, categories_count=5)
    kappa_quad = ExpertAgreementEvaluator.compute_quadratic_weighted_kappa(r1, r2, categories_count=5)

    assert kappa >= 0.70
    assert kappa_quad > kappa


def test_ratings_bounds_and_type_validation():
    # Negative ratings must raise ValueError (no wrap-around)
    with pytest.raises(ValueError):
        ExpertAgreementEvaluator.compute_cohens_kappa([-1, 0], [0, 0], categories_count=5)
    with pytest.raises(ValueError):
        ExpertAgreementEvaluator.compute_quadratic_weighted_kappa([-1, 0], [0, 0], categories_count=5)
    with pytest.raises(ValueError):
        ExpertAgreementEvaluator.build_confusion_matrix([-1, 0], [0, 0], categories_count=5)

    # Out of bounds ratings (>= k)
    with pytest.raises(ValueError):
        ExpertAgreementEvaluator.compute_quadratic_weighted_kappa([5, 0], [0, 0], categories_count=5)
    with pytest.raises(ValueError):
        ExpertAgreementEvaluator.build_confusion_matrix([5, 0], [0, 0], categories_count=5)

    # Non-integer / float ratings
    with pytest.raises(ValueError):
        ExpertAgreementEvaluator.compute_quadratic_weighted_kappa([2.5, 0], [0, 0], categories_count=5)


def test_confusion_matrix_dimensions():
    r1 = [0, 1, 2, 3, 4]
    r2 = [0, 1, 2, 3, 4]
    mat = ExpertAgreementEvaluator.build_confusion_matrix(r1, r2, categories_count=5)
    assert len(mat) == 5
    assert len(mat[0]) == 5
    for i in range(5):
        assert mat[i][i] == 1


def test_benchmark_evaluation_gate_pass():
    scenarios = ExpertAgreementEvaluator.get_benchmark_scenarios()
    ratings = ExpertAgreementEvaluator.simulate_calibrated_model_ratings(scenarios, seed=42)

    report = ExpertAgreementEvaluator.evaluate_benchmark(
        scenarios,
        ratings,
        kappa_min=0.800,
        kappa_quad_min=0.850,
    )

    assert report["passed"] is True
    assert report["verdict"] == "PASS_EXPERT_AGREEMENT_BENCHMARK"
    assert report["cohens_kappa"] >= 0.800
    assert report["quadratic_weighted_kappa"] >= 0.850
    assert report["overall_accuracy"] >= 0.85


def test_benchmark_evaluation_gate_fail_closed():
    scenarios = ExpertAgreementEvaluator.get_benchmark_scenarios()
    bad_ratings = [i % 5 for i in range(len(scenarios))]

    report = ExpertAgreementEvaluator.evaluate_benchmark(
        scenarios,
        bad_ratings,
        kappa_min=0.800,
        kappa_quad_min=0.850,
    )

    assert report["passed"] is False
    assert report["verdict"] == "FAIL_EXPERT_AGREEMENT_BENCHMARK"
    assert any(not c["passed"] for c in report["checks"])
