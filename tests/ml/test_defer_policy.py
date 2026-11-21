"""
Unit and Integration Tests for Verification and Defer-Policy Optimization.

Goal Reference: G-ML-008
Epic: ML (Machine Learning & Cognitive Calibration)

Verifies:
1. test_cost_function: Asymmetric risk-weighted cost matrix penalizing confident errors 10x higher.
2. test_threshold_optimization: 2D Pareto grid search over validation split with safety bounds.
3. test_policy_bounds: 100% defer/verify enclosure for high-risk decisions with confidence < 0.85.
4. test_truth_table_cases: Exhaustive 8-case canonical routing truth table verification.
5. test_yaml_serialization: YAML configuration export, reloading, and file integrity check.
6. test_fail_closed_validation: Strict rejection of non-finite, out-of-bounds, or corrupt inputs.
"""

import math
import os
import sys
import tempfile
from pathlib import Path
from typing import List

import pytest
import yaml

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code")))

from src.training.defer_policy import (
    ActionPolicy,
    CostMatrix,
    DecisionInstance,
    DecisionRouter,
    DeferPolicyOptimizer,
    PolicyThresholds,
)


@pytest.fixture
def default_cost_matrix() -> CostMatrix:
    """Fixture providing standard calibrated cost matrix."""
    return CostMatrix(
        false_accept_cost=10.0,
        false_deferral_cost=1.0,
        proceed_cost=0.0,
        verify_cost=0.2,
        defer_cost=1.0,
        human_review_cost=2.0,
    )


@pytest.fixture
def default_thresholds(default_cost_matrix: CostMatrix) -> PolicyThresholds:
    """Fixture providing standard calibrated threshold boundaries."""
    return PolicyThresholds(
        tau_low=0.65,
        tau_high=0.85,
        cost_matrix=default_cost_matrix,
        max_false_accept_rate=0.01,
        max_false_deferral_rate=0.05,
    )


@pytest.fixture
def synthetic_validation_dataset() -> List[DecisionInstance]:
    """Fixture providing 500 deterministic validation decisions across risk/evidence conditions."""
    instances: List[DecisionInstance] = []
    
    # 1. 250 normal-risk, verified decisions (mostly correct with varied confidence)
    for i in range(250):
        conf = 0.50 + (i % 50) * 0.01  # 0.50 to 0.99
        gt = 1 if conf >= 0.70 else (0 if i % 4 == 0 else 1)
        instances.append(
            DecisionInstance(
                confidence=round(conf, 4),
                risk_level="normal",
                evidence_verified=True,
                ground_truth=gt,
            )
        )

    # 2. 100 normal-risk, unverified decisions
    for i in range(100):
        conf = 0.40 + (i % 60) * 0.01  # 0.40 to 0.99
        gt = 1 if conf >= 0.80 else 0
        instances.append(
            DecisionInstance(
                confidence=round(conf, 4),
                risk_level="normal",
                evidence_verified=False,
                ground_truth=gt,
            )
        )

    # 3. 150 high-risk decisions (adversarial distribution)
    for i in range(150):
        conf = 0.30 + (i % 70) * 0.01  # 0.30 to 0.99
        ev = (i % 2 == 0)
        gt = 1 if conf >= 0.85 and ev else 0
        instances.append(
            DecisionInstance(
                confidence=round(conf, 4),
                risk_level="high",
                evidence_verified=ev,
                ground_truth=gt,
            )
        )

    return instances


# ==============================================================================
# Step 1: Cost Function Verification
# ==============================================================================

def test_cost_function(default_cost_matrix: CostMatrix) -> None:
    """
    Step 1 Verification: Cost function penalizes confident incorrect decisions 10x higher
    than deferral costs, returns strictly non-negative values, and does not invert penalties.
    """
    # 1. Verify 10x penalty ratio invariant
    ratio = default_cost_matrix.false_accept_cost / default_cost_matrix.false_deferral_cost
    assert ratio >= 10.0, f"False accept penalty must be >= 10x deferral cost, got {ratio}"

    optimizer = DeferPolicyOptimizer(cost_matrix=default_cost_matrix)

    # 2. Cost of false accept (proceed on incorrect decision)
    fa_cost = optimizer.compute_instance_cost(
        action=ActionPolicy.PROCEED,
        ground_truth=0,
        risk_level="normal",
        evidence_verified=True,
        confidence=0.95,
        tau_high=0.85,
    )
    assert fa_cost == 10.0, f"Expected 10.0 for false accept, got {fa_cost}"

    # 3. Cost of high-risk false accept (escalated penalty)
    hr_fa_cost = optimizer.compute_instance_cost(
        action=ActionPolicy.PROCEED,
        ground_truth=0,
        risk_level="high",
        evidence_verified=True,
        confidence=0.95,
        tau_high=0.85,
    )
    assert hr_fa_cost >= 10.0, f"High-risk false accept must be >= 10.0, got {hr_fa_cost}"

    # 4. Cost of false deferral (deferring on correct high-confidence verified decision)
    fd_cost = optimizer.compute_instance_cost(
        action=ActionPolicy.DEFER,
        ground_truth=1,
        risk_level="normal",
        evidence_verified=True,
        confidence=0.95,
        tau_high=0.85,
    )
    assert fd_cost == 1.0, f"Expected 1.0 for false deferral, got {fd_cost}"
    assert fa_cost >= 10.0 * fd_cost, "False accept cost must be at least 10x false deferral cost"

    # 5. Correct proceed cost must be minimal (0.0)
    correct_cost = optimizer.compute_instance_cost(
        action=ActionPolicy.PROCEED,
        ground_truth=1,
        risk_level="normal",
        evidence_verified=True,
        confidence=0.95,
        tau_high=0.85,
    )
    assert correct_cost == 0.0, f"Expected 0.0 for correct proceed, got {correct_cost}"

    # 6. Reject invalid cost matrices
    with pytest.raises(ValueError, match="at least 10x higher"):
        CostMatrix(false_accept_cost=5.0, false_deferral_cost=1.0)

    with pytest.raises(ValueError, match="must be non-negative"):
        CostMatrix(false_accept_cost=-1.0)


# ==============================================================================
# Step 2: Threshold Optimization Verification
# ==============================================================================

def test_threshold_optimization(synthetic_validation_dataset: List[DecisionInstance]) -> None:
    """
    Step 2 Verification: Grid optimization identifies Pareto-optimal thresholds satisfying
    tau_low < tau_high with false accept rate < 1.0% and false deferral rate < 5.0%.
    """
    optimizer = DeferPolicyOptimizer()
    optimized_thresholds = optimizer.optimize(synthetic_validation_dataset, grid_resolution=25)

    # 1. Monotonicity and boundary checks
    assert 0.0 <= optimized_thresholds.tau_low < optimized_thresholds.tau_high <= 1.0, (
        f"Invalid threshold boundaries: tau_low={optimized_thresholds.tau_low}, "
        f"tau_high={optimized_thresholds.tau_high}"
    )

    # 2. Safety constraint checks on validation evaluation
    metrics = optimizer.evaluate(synthetic_validation_dataset)
    assert metrics["high_risk_false_accept_rate"] <= 0.01, (
        f"High-risk false accept rate must be <= 1.0%, got {metrics['high_risk_false_accept_rate']}"
    )
    assert metrics["false_deferral_rate"] <= 0.05, (
        f"False deferral rate must be <= 5.0%, got {metrics['false_deferral_rate']}"
    )
    assert metrics["high_risk_safe_ratio"] == 1.0, (
        f"100% of high-risk decisions with c < 0.85 must route to defer/verify, got {metrics['high_risk_safe_ratio']}"
    )
    assert metrics["expected_risk"] > 0.0, "Expected risk must be positive"
    assert math.isfinite(metrics["expected_risk"]), "Expected risk must be finite"


# ==============================================================================
# Step 3: Policy Safety Boundaries and Confusion Matrix
# ==============================================================================

def test_policy_bounds(default_thresholds: PolicyThresholds) -> None:
    """
    Step 3 Verification: Evaluate 100 edge-case test decisions asserting that 100%
    of high-risk decisions with confidence below 0.85 are routed to defer or verify.
    """
    router = DecisionRouter(default_thresholds)
    edge_cases: List[DecisionInstance] = []

    # 100 edge-case decisions: sweep confidences from 0.01 to 0.8499 under high risk
    for i in range(100):
        conf = round(0.01 + (i * 0.0083), 4)  # 0.01 to ~0.84
        ev = (i % 2 == 0)
        edge_cases.append(
            DecisionInstance(
                confidence=conf,
                risk_level="high",
                evidence_verified=ev,
                ground_truth=0,
            )
        )

    routed_actions = router.route_batch(edge_cases)

    # Assert 100% of high-risk decisions with c < 0.85 route to DEFER or VERIFY
    for idx, (inst, action) in enumerate(zip(edge_cases, routed_actions)):
        assert action in (ActionPolicy.DEFER, ActionPolicy.VERIFY), (
            f"Violation at index {idx}: high-risk decision with c={inst.confidence} "
            f"routed to {action}, expected DEFER or VERIFY"
        )
        assert action != ActionPolicy.PROCEED, "High-risk decision incorrectly routed to PROCEED"


# ==============================================================================
# Truth Table Exhaustive Testing
# ==============================================================================

def test_truth_table_cases(default_thresholds: PolicyThresholds) -> None:
    """
    Exhaustively verify the 8 canonical cases from G-ML-008 routing_contract.
    """
    router = DecisionRouter(default_thresholds)

    # Case 1: normal, verified, high -> proceed
    assert router.route(confidence=0.90, risk_level="normal", evidence_verified=True) == ActionPolicy.PROCEED

    # Case 2: normal, verified, low -> verify
    assert router.route(confidence=0.70, risk_level="normal", evidence_verified=True) == ActionPolicy.VERIFY

    # Case 3: normal, unverified, high -> verify
    assert router.route(confidence=0.90, risk_level="normal", evidence_verified=False) == ActionPolicy.VERIFY

    # Case 4: normal, unverified, low -> defer
    assert router.route(confidence=0.50, risk_level="normal", evidence_verified=False) == ActionPolicy.DEFER

    # Case 5: high, verified, high -> human_review
    assert router.route(confidence=0.90, risk_level="high", evidence_verified=True) == ActionPolicy.HUMAN_REVIEW

    # Case 6: high, verified, low -> defer
    assert router.route(confidence=0.70, risk_level="high", evidence_verified=True) == ActionPolicy.DEFER

    # Case 7: high, unverified, high -> defer
    assert router.route(confidence=0.90, risk_level="high", evidence_verified=False) == ActionPolicy.DEFER

    # Case 8: high, unverified, low -> defer
    assert router.route(confidence=0.50, risk_level="high", evidence_verified=False) == ActionPolicy.DEFER


# ==============================================================================
# YAML Serialization and Roundtrip
# ==============================================================================

def test_yaml_serialization_and_roundtrip(default_thresholds: PolicyThresholds) -> None:
    """
    Verify YAML serialization and reloading roundtrip for calibrated policy parameters.
    """
    optimizer = DeferPolicyOptimizer(thresholds=default_thresholds)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        out_file = os.path.join(tmpdir, "policy_thresholds.yaml")
        optimizer.save_thresholds(out_file)

        assert os.path.exists(out_file), "YAML configuration was not written"

        reloaded = DeferPolicyOptimizer.load_from_yaml(out_file)
        assert reloaded.thresholds.tau_low == default_thresholds.tau_low
        assert reloaded.thresholds.tau_high == default_thresholds.tau_high
        assert reloaded.cost_matrix.false_accept_cost == default_thresholds.cost_matrix.false_accept_cost
        assert reloaded.cost_matrix.false_deferral_cost == default_thresholds.cost_matrix.false_deferral_cost

    # Also verify repo default config file
    repo_cfg = os.path.join(os.path.dirname(__file__), "../../code/ml/configs/policy_thresholds.yaml")
    assert os.path.exists(repo_cfg), f"Repo configuration missing: {repo_cfg}"
    loaded_repo_opt = DeferPolicyOptimizer.load_from_yaml(repo_cfg)
    assert loaded_repo_opt.thresholds.tau_low < loaded_repo_opt.thresholds.tau_high


# ==============================================================================
# Fail-Closed Input Validation
# ==============================================================================

def test_fail_closed_validation(default_thresholds: PolicyThresholds) -> None:
    """
    Verify strict fail-closed rejection of non-finite, out-of-bounds, or malformed inputs.
    """
    router = DecisionRouter(default_thresholds)

    # 1. Out-of-bounds confidence
    with pytest.raises(ValueError, match="out of bounds"):
        router.route(confidence=-0.1, risk_level="normal", evidence_verified=True)

    with pytest.raises(ValueError, match="out of bounds"):
        router.route(confidence=1.1, risk_level="normal", evidence_verified=True)

    # 2. Non-finite confidence
    with pytest.raises(ValueError, match="finite float"):
        router.route(confidence=float("nan"), risk_level="normal", evidence_verified=True)

    with pytest.raises(ValueError, match="finite float"):
        router.route(confidence=float("inf"), risk_level="normal", evidence_verified=True)

    # 3. Invalid risk level
    with pytest.raises(ValueError, match="Invalid risk_level"):
        router.route(confidence=0.8, risk_level="critical", evidence_verified=True)

    # 4. Invalid evidence flag type
    with pytest.raises(TypeError, match="evidence_verified must be bool"):
        router.route(confidence=0.8, risk_level="normal", evidence_verified="yes")  # type: ignore

    # 5. Degenerate thresholds (tau_low >= tau_high)
    with pytest.raises(ValueError, match="strictly less than"):
        PolicyThresholds(tau_low=0.90, tau_high=0.70)

    with pytest.raises(ValueError, match="strictly less than"):
        PolicyThresholds(tau_low=0.80, tau_high=0.80)

    # 6. Empty dataset evaluation
    optimizer = DeferPolicyOptimizer()
    with pytest.raises(ValueError, match="cannot be empty"):
        optimizer.evaluate([])
