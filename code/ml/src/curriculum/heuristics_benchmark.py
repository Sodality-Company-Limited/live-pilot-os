"""
Stage 3 UX Heuristics & WCAG 2.2 AAA Benchmark (Python).

Curates and evaluates 1,200 scenarios mapping Nielsen's 10 heuristics (0-4 severity)
and WCAG 2.2 AAA accessibility standards. Computes statistical evaluation metrics (accuracy, Cohen's kappa).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple


@dataclass
class HeuristicScenario:
    scenario_id: str
    title: str
    category: str
    heuristic_id: str
    heuristic_name: str
    severity: int
    ui_context: Dict[str, Any]
    observed_pattern: str
    evaluation_rationale: str
    suggested_fix: Optional[str]
    violates_invariant: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class HeuristicsBenchmark:
    """Benchmark runner for UX heuristics and accessibility evaluation."""

    def __init__(self, benchmark_file: str) -> None:
        self.benchmark_file = benchmark_file
        self.scenarios: List[HeuristicScenario] = []
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.benchmark_file):
            raise FileNotFoundError(f"Benchmark file not found: {self.benchmark_file}")
        with open(self.benchmark_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                self.scenarios.append(HeuristicScenario(**item))

    def __len__(self) -> int:
        return len(self.scenarios)

    def __getitem__(self, idx: int) -> HeuristicScenario:
        return self.scenarios[idx]

    def get_by_category(self, category: str) -> List[HeuristicScenario]:
        return [s for s in self.scenarios if s.category == category]

    def get_by_severity(self, severity: int) -> List[HeuristicScenario]:
        return [s for s in self.scenarios if s.severity == severity]

    def compute_agreement(self, predictions: List[int]) -> Dict[str, float]:
        """Compute accuracy and Cohen's kappa against ground-truth severities."""
        if len(predictions) != len(self.scenarios):
            raise ValueError(f"Predictions length ({len(predictions)}) does not match scenarios ({len(self.scenarios)})")

        n = len(self.scenarios)
        correct = sum(1 for p, s in zip(predictions, self.scenarios) if p == s.severity)
        accuracy = correct / n

        # Cohen's Kappa calculation
        # Categories: 0, 1, 2, 3, 4
        categories = [0, 1, 2, 3, 4]
        gt_counts = {c: 0 for c in categories}
        pred_counts = {c: 0 for c in categories}

        for p, s in zip(predictions, self.scenarios):
            if s.severity in gt_counts:
                gt_counts[s.severity] += 1
            if p in pred_counts:
                pred_counts[p] += 1

        pe = sum((gt_counts[c] / n) * (pred_counts[c] / n) for c in categories)
        po = accuracy

        kappa = (po - pe) / (1.0 - pe) if pe < 1.0 else 1.0

        return {
            "accuracy": accuracy,
            "cohens_kappa": max(-1.0, min(1.0, kappa)),
            "total_evaluated": n,
        }
