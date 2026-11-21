"""
Unit tests for Stage 3 UX Heuristics & WCAG 2.2 AAA Benchmark (Python).
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.curriculum.heuristics_benchmark import (
    HeuristicScenario,
    HeuristicsBenchmark,
)

BENCHMARK_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage3_heuristics/benchmark_1200.json")
)


def test_heuristics_benchmark_loading():
    bench = HeuristicsBenchmark(BENCHMARK_FILE)
    assert len(bench) == 1200

    nielsen = bench.get_by_category("nielsen")
    wcag = bench.get_by_category("wcag_aaa")
    clean = bench.get_by_category("clean")

    assert len(nielsen) == 600
    assert len(wcag) == 420
    assert len(clean) == 180


def test_heuristics_benchmark_scenario_structure():
    bench = HeuristicsBenchmark(BENCHMARK_FILE)
    s = bench[0]
    assert s.scenario_id.startswith("UX-BENCH-")
    assert s.severity in [0, 1, 2, 3, 4]
    assert len(s.evaluation_rationale) > 0
    if s.violates_invariant:
        assert s.suggested_fix is not None


def test_heuristics_benchmark_agreement_computation():
    bench = HeuristicsBenchmark(BENCHMARK_FILE)
    # Perfect agreement
    ground_truth = [s.severity for s in bench]
    agreement = bench.compute_agreement(ground_truth)
    assert agreement["accuracy"] == 1.0
    assert agreement["cohens_kappa"] == 1.0
