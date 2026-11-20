"""
Soda OS ML Defer-Policy Optimization and Verification Routing Engine.

Goal Reference: G-ML-008
Epic: ML (Machine Learning & Cognitive Calibration)
Profile: ml_research

This module provides:
1. ActionPolicy: Discrete canonical decision actions (proceed, verify, defer, human_review).
2. CostMatrix: Risk-weighted asymmetric penalties for cost-sensitive empirical risk minimization.
3. PolicyThresholds: Calibrated dual-threshold configuration (tau_low, tau_high).
4. DecisionRouter: Deterministic routing kernel executing the canonical truth table.
5. DeferPolicyOptimizer: Empirical risk grid search and Pareto threshold optimizer with YAML persistence.
"""

from __future__ import annotations

import math
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import yaml


class ActionPolicy(str, Enum):
    """Discrete canonical agent action policies."""
    PROCEED = "proceed"
    VERIFY = "verify"
    DEFER = "defer"
    HUMAN_REVIEW = "human_review"


@dataclass
class CostMatrix:
    """
    Risk-weighted cost matrix penalizing catastrophic errors asymmetrically.
    
    Invariants:
    - false_accept_cost >= 10.0 * false_deferral_cost (confident incorrect decision penalized >= 10x higher).
    - All cost entries must be finite, non-negative floating-point values.
    """
    false_accept_cost: float = 10.0
    false_deferral_cost: float = 1.0
    proceed_cost: float = 0.0
    verify_cost: float = 0.2
    defer_cost: float = 1.0
    human_review_cost: float = 2.0

    def __post_init__(self) -> None:
        for attr, val in asdict(self).items():
            if not isinstance(val, (int, float)) or math.isnan(val) or math.isinf(val):
                raise ValueError(f"Cost '{attr}' must be a finite float, got {val}")
            if val < 0.0:
                raise ValueError(f"Cost '{attr}' must be non-negative, got {val}")
        
        if self.false_accept_cost < 10.0 * self.false_deferral_cost:
            raise ValueError(
                f"false_accept_cost ({self.false_accept_cost}) must be at least 10x "
                f"higher than false_deferral_cost ({self.false_deferral_cost})"
            )


@dataclass
class PolicyThresholds:
    """
    Dual-threshold boundary configuration.
    
    Invariants:
    - 0.0 <= tau_low < tau_high <= 1.0
    - All threshold entries are finite floats.
    """
    tau_low: float = 0.65
    tau_high: float = 0.85
    cost_matrix: CostMatrix = field(default_factory=CostMatrix)
    max_false_accept_rate: float = 0.01
    max_false_deferral_rate: float = 0.05

    def __post_init__(self) -> None:
        for name, val in [("tau_low", self.tau_low), ("tau_high", self.tau_high)]:
            if not isinstance(val, (int, float)) or math.isnan(val) or math.isinf(val):
                raise ValueError(f"Threshold '{name}' must be a finite float, got {val}")
            if val < 0.0 or val > 1.0:
                raise ValueError(f"Threshold '{name}' must be bounded in [0.0, 1.0], got {val}")
        
        if self.tau_low >= self.tau_high:
            raise ValueError(
                f"tau_low ({self.tau_low}) must be strictly less than tau_high ({self.tau_high})"
            )
        
        for name, rate in [("max_false_accept_rate", self.max_false_accept_rate),
                           ("max_false_deferral_rate", self.max_false_deferral_rate)]:
            if not isinstance(rate, (int, float)) or math.isnan(rate) or rate < 0.0 or rate > 1.0:
                raise ValueError(f"Constraint '{name}' must be bounded in [0.0, 1.0], got {rate}")


@dataclass
class DecisionInstance:
    """A single evaluation or inference decision instance."""
    confidence: float
    risk_level: str  # "normal" or "high"
    evidence_verified: bool
    ground_truth: Optional[int] = None  # 1 for correct, 0 for incorrect

    def __post_init__(self) -> None:
        if not isinstance(self.confidence, (int, float)) or math.isnan(self.confidence) or math.isinf(self.confidence):
            raise ValueError(f"confidence must be a finite float, got {self.confidence}")
        if self.confidence < 0.0 or self.confidence > 1.0:
            raise ValueError(f"confidence must be in [0.0, 1.0], got {self.confidence}")
        if self.risk_level not in ("normal", "high"):
            raise ValueError(f"risk_level must be 'normal' or 'high', got '{self.risk_level}'")
        if not isinstance(self.evidence_verified, bool):
            raise TypeError(f"evidence_verified must be bool, got {type(self.evidence_verified).__name__}")
        if self.ground_truth is not None and self.ground_truth not in (0, 1):
            raise ValueError(f"ground_truth must be 0, 1, or None, got {self.ground_truth}")


class DecisionRouter:
    """
    Deterministic action policy router implementing the canonical G-ML-008 truth table.
    
    Truth Table:
    - normal risk, verified evidence, high confidence (c >= tau_high) -> PROCEED
    - normal risk, verified evidence, low confidence (c < tau_high)   -> VERIFY
    - normal risk, unverified evidence, high confidence (c >= tau_high) -> VERIFY
    - normal risk, unverified evidence, low confidence (c < tau_low)   -> DEFER
    - normal risk, unverified evidence, mid confidence (tau_low <= c < tau_high) -> VERIFY
    - high risk, verified evidence, high confidence (c >= tau_high)   -> HUMAN_REVIEW
    - high risk, verified evidence, low confidence (c < tau_high)     -> DEFER
    - high risk, unverified evidence, high confidence                 -> DEFER
    - high risk, unverified evidence, low confidence                  -> DEFER
    """

    def __init__(self, thresholds: Optional[PolicyThresholds] = None) -> None:
        self.thresholds = thresholds or PolicyThresholds()

    def route(self, confidence: float, risk_level: str, evidence_verified: bool) -> ActionPolicy:
        """Route a single decision based on continuous confidence and risk context."""
        # Fail-closed input validations
        if not isinstance(confidence, (int, float)) or math.isnan(confidence) or math.isinf(confidence):
            raise ValueError(f"Invalid confidence score: {confidence}. Must be a finite float in [0.0, 1.0].")
        if confidence < 0.0 or confidence > 1.0:
            raise ValueError(f"Confidence score {confidence} out of bounds [0.0, 1.0].")
        if risk_level not in ("normal", "high"):
            raise ValueError(f"Invalid risk_level: '{risk_level}'. Expected 'normal' or 'high'.")
        if not isinstance(evidence_verified, bool):
            raise TypeError(f"evidence_verified must be bool, got {type(evidence_verified).__name__}.")

        tau_low = self.thresholds.tau_low
        tau_high = self.thresholds.tau_high

        is_high_conf = (confidence >= tau_high)

        if risk_level == "normal":
            if evidence_verified:
                if is_high_conf:
                    return ActionPolicy.PROCEED
                else:
                    return ActionPolicy.VERIFY
            else:
                # Unverified evidence
                if is_high_conf:
                    return ActionPolicy.VERIFY
                elif confidence >= tau_low:
                    return ActionPolicy.VERIFY
                else:
                    return ActionPolicy.DEFER
        else:
            # risk_level == "high"
            if evidence_verified and is_high_conf:
                return ActionPolicy.HUMAN_REVIEW
            else:
                return ActionPolicy.DEFER

    def route_instance(self, instance: DecisionInstance) -> ActionPolicy:
        """Route a DecisionInstance dataclass."""
        return self.route(
            confidence=instance.confidence,
            risk_level=instance.risk_level,
            evidence_verified=instance.evidence_verified,
        )

    def route_batch(self, instances: List[DecisionInstance]) -> List[ActionPolicy]:
        """Route a batch of DecisionInstances."""
        return [self.route_instance(inst) for inst in instances]


class DeferPolicyOptimizer:
    """
    Risk-weighted threshold optimizer for discrete action routing.
    
    Tunes dual thresholds (tau_low, tau_high) to minimize empirical risk
    while strictly enforcing safety constraints:
    - High-risk false acceptance rate < max_false_accept_rate (default 1.0%)
    - False deferral rate < max_false_deferral_rate (default 5.0%)
    - 100% of high-risk decisions with confidence < 0.85 routed to defer or verify.
    """

    def __init__(
        self,
        cost_matrix: Optional[CostMatrix] = None,
        thresholds: Optional[PolicyThresholds] = None,
        max_false_accept_rate: float = 0.01,
        max_false_deferral_rate: float = 0.05,
    ) -> None:
        self.cost_matrix = cost_matrix or CostMatrix()
        self.thresholds = thresholds or PolicyThresholds(
            cost_matrix=self.cost_matrix,
            max_false_accept_rate=max_false_accept_rate,
            max_false_deferral_rate=max_false_deferral_rate,
        )
        self.max_false_accept_rate = max_false_accept_rate
        self.max_false_deferral_rate = max_false_deferral_rate
        self.router = DecisionRouter(self.thresholds)

    def compute_instance_cost(
        self,
        action: ActionPolicy,
        ground_truth: int,
        risk_level: str,
        evidence_verified: bool,
        confidence: float,
        tau_high: float,
    ) -> float:
        """
        Compute asymmetric risk cost for a single routed decision.
        
        Asymmetric penalties:
        - False accept (action == PROCEED when ground_truth == 0): penalize with false_accept_cost (10.0x).
        - False deferral (action == DEFER when ground_truth == 1, risk == 'normal', verified, high confidence):
          penalize with false_deferral_cost (1.0x).
        - Correct proceed: proceed_cost (0.0).
        - Verify: verify_cost (0.2).
        - Human review: human_review_cost (2.0).
        - Legitimate deferral: defer_cost (1.0).
        """
        if action == ActionPolicy.PROCEED:
            if ground_truth == 0:
                # Confident incorrect decision (catastrophic failure)
                risk_mult = 2.0 if risk_level == "high" else 1.0
                return self.cost_matrix.false_accept_cost * risk_mult
            return self.cost_matrix.proceed_cost

        elif action == ActionPolicy.DEFER:
            # Check if this was an unnecessary / false deferral
            if (
                ground_truth == 1
                and risk_level == "normal"
                and evidence_verified
                and confidence >= tau_high
            ):
                return self.cost_matrix.false_deferral_cost
            return self.cost_matrix.defer_cost

        elif action == ActionPolicy.VERIFY:
            return self.cost_matrix.verify_cost

        elif action == ActionPolicy.HUMAN_REVIEW:
            return self.cost_matrix.human_review_cost

        return self.cost_matrix.defer_cost

    def evaluate(
        self,
        dataset: List[DecisionInstance],
        tau_low: Optional[float] = None,
        tau_high: Optional[float] = None,
    ) -> Dict[str, float]:
        """
        Evaluate empirical risk, false acceptance rate, and false deferral rate on a dataset.
        """
        if not dataset:
            raise ValueError("Evaluation dataset cannot be empty.")

        t_low = self.thresholds.tau_low if tau_low is None else tau_low
        t_high = self.thresholds.tau_high if tau_high is None else tau_high

        eval_thresholds = PolicyThresholds(
            tau_low=t_low,
            tau_high=t_high,
            cost_matrix=self.cost_matrix,
            max_false_accept_rate=self.max_false_accept_rate,
            max_false_deferral_rate=self.max_false_deferral_rate,
        )
        router = DecisionRouter(eval_thresholds)

        total_cost = 0.0
        false_accept_count = 0
        high_risk_false_accept_count = 0
        false_deferral_count = 0
        action_counts = {policy: 0 for policy in ActionPolicy}

        high_risk_low_conf_count = 0
        high_risk_low_conf_safe_count = 0
        normal_high_conf_correct_count = 0
        total_incorrect = 0

        for inst in dataset:
            action = router.route_instance(inst)
            action_counts[action] += 1

            gt = inst.ground_truth if inst.ground_truth is not None else 1
            if gt == 0:
                total_incorrect += 1

            cost = self.compute_instance_cost(
                action=action,
                ground_truth=gt,
                risk_level=inst.risk_level,
                evidence_verified=inst.evidence_verified,
                confidence=inst.confidence,
                tau_high=t_high,
            )
            total_cost += cost

            # False accept detection
            if action == ActionPolicy.PROCEED and gt == 0:
                false_accept_count += 1
                if inst.risk_level == "high":
                    high_risk_false_accept_count += 1

            # False deferral detection on correct, verified normal-risk high-confidence decisions
            if (
                gt == 1
                and inst.risk_level == "normal"
                and inst.evidence_verified
                and inst.confidence >= t_high
            ):
                normal_high_conf_correct_count += 1
                if action == ActionPolicy.DEFER:
                    false_deferral_count += 1

            # High-risk confidence < 0.85 safety guard
            if inst.risk_level == "high" and inst.confidence < 0.85:
                high_risk_low_conf_count += 1
                if action in (ActionPolicy.DEFER, ActionPolicy.VERIFY):
                    high_risk_low_conf_safe_count += 1

        n = len(dataset)
        expected_risk = total_cost / n
        false_accept_rate = false_accept_count / max(1, total_incorrect) if total_incorrect > 0 else 0.0
        high_risk_fa_rate = high_risk_false_accept_count / max(1, total_incorrect) if total_incorrect > 0 else 0.0
        false_deferral_rate = (
            false_deferral_count / max(1, normal_high_conf_correct_count)
            if normal_high_conf_correct_count > 0
            else 0.0
        )
        high_risk_safe_ratio = (
            high_risk_low_conf_safe_count / max(1, high_risk_low_conf_count)
            if high_risk_low_conf_count > 0
            else 1.0
        )

        return {
            "sample_count": float(n),
            "expected_risk": expected_risk,
            "total_cost": total_cost,
            "false_accept_rate": false_accept_rate,
            "high_risk_false_accept_rate": high_risk_fa_rate,
            "false_deferral_rate": false_deferral_rate,
            "high_risk_safe_ratio": high_risk_safe_ratio,
            "proceed_rate": action_counts[ActionPolicy.PROCEED] / n,
            "verify_rate": action_counts[ActionPolicy.VERIFY] / n,
            "defer_rate": action_counts[ActionPolicy.DEFER] / n,
            "human_review_rate": action_counts[ActionPolicy.HUMAN_REVIEW] / n,
            "tau_low": t_low,
            "tau_high": t_high,
        }

    def optimize(
        self,
        val_dataset: List[DecisionInstance],
        grid_resolution: int = 40,
    ) -> PolicyThresholds:
        """
        Execute 2D grid search across Pareto-optimal threshold candidates.
        
        Identifies (tau_low, tau_high) minimizing empirical risk subject to:
        - high_risk_false_accept_rate < max_false_accept_rate (1.0%)
        - false_deferral_rate < max_false_deferral_rate (5.0%)
        - 100% of high-risk decisions with confidence < 0.85 routed to defer or verify.
        """
        if len(val_dataset) < 10:
            raise ValueError(f"Dataset too small for calibration grid search: {len(val_dataset)} < 10")

        # Candidate threshold sweeps
        tau_low_candidates = np.linspace(0.40, 0.75, grid_resolution)
        tau_high_candidates = np.linspace(0.80, 0.95, grid_resolution)

        best_risk = float("inf")
        best_thresholds: Optional[Tuple[float, float]] = None

        for t_low in tau_low_candidates:
            for t_high in tau_high_candidates:
                if t_low >= t_high:
                    continue

                metrics = self.evaluate(val_dataset, tau_low=float(t_low), tau_high=float(t_high))

                # Safety boundary assertions
                if metrics["high_risk_false_accept_rate"] > self.max_false_accept_rate:
                    continue
                if metrics["false_deferral_rate"] > self.max_false_deferral_rate:
                    continue
                if metrics["high_risk_safe_ratio"] < 1.0:
                    continue

                if metrics["expected_risk"] < best_risk:
                    best_risk = metrics["expected_risk"]
                    best_thresholds = (float(round(t_low, 4)), float(round(t_high, 4)))

        if best_thresholds is None:
            # Fallback to conservative default bounded thresholds
            best_thresholds = (0.65, 0.85)

        self.thresholds = PolicyThresholds(
            tau_low=best_thresholds[0],
            tau_high=best_thresholds[1],
            cost_matrix=self.cost_matrix,
            max_false_accept_rate=self.max_false_accept_rate,
            max_false_deferral_rate=self.max_false_deferral_rate,
        )
        self.router = DecisionRouter(self.thresholds)
        return self.thresholds

    def save_thresholds(self, filepath: str) -> None:
        """Serialize calibrated thresholds and cost matrix to YAML."""
        out_dir = os.path.dirname(filepath)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        config_dict = {
            "version": 1,
            "goal_id": "G-ML-008",
            "calibrated_at": datetime.now(timezone.utc).isoformat(),
            "tau_low": float(self.thresholds.tau_low),
            "tau_high": float(self.thresholds.tau_high),
            "cost_matrix": {
                "false_accept_cost": float(self.cost_matrix.false_accept_cost),
                "false_deferral_cost": float(self.cost_matrix.false_deferral_cost),
                "proceed_cost": float(self.cost_matrix.proceed_cost),
                "verify_cost": float(self.cost_matrix.verify_cost),
                "defer_cost": float(self.cost_matrix.defer_cost),
                "human_review_cost": float(self.cost_matrix.human_review_cost),
            },
            "constraints": {
                "max_false_accept_rate": float(self.max_false_accept_rate),
                "max_false_deferral_rate": float(self.max_false_deferral_rate),
                "high_risk_confidence_guard": 0.85,
            },
            "action_policies": [policy.value for policy in ActionPolicy],
        }

        with open(filepath, "w", encoding="utf-8") as f:
            yaml.safe_dump(config_dict, f, sort_keys=False)

    @classmethod
    def load_from_yaml(cls, filepath: str) -> DeferPolicyOptimizer:
        """Construct optimizer and router instance from a serialized YAML configuration."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Configuration file not found: {filepath}")

        with open(filepath, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        cm_dict = data.get("cost_matrix", {})
        cost_matrix = CostMatrix(
            false_accept_cost=float(cm_dict.get("false_accept_cost", 10.0)),
            false_deferral_cost=float(cm_dict.get("false_deferral_cost", 1.0)),
            proceed_cost=float(cm_dict.get("proceed_cost", 0.0)),
            verify_cost=float(cm_dict.get("verify_cost", 0.2)),
            defer_cost=float(cm_dict.get("defer_cost", 1.0)),
            human_review_cost=float(cm_dict.get("human_review_cost", 2.0)),
        )

        constraints = data.get("constraints", {})
        max_fa = float(constraints.get("max_false_accept_rate", 0.01))
        max_fd = float(constraints.get("max_false_deferral_rate", 0.05))

        thresholds = PolicyThresholds(
            tau_low=float(data["tau_low"]),
            tau_high=float(data["tau_high"]),
            cost_matrix=cost_matrix,
            max_false_accept_rate=max_fa,
            max_false_deferral_rate=max_fd,
        )

        return cls(
            cost_matrix=cost_matrix,
            thresholds=thresholds,
            max_false_accept_rate=max_fa,
            max_false_deferral_rate=max_fd,
        )
