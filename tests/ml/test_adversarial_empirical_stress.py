"""
tests/ml/test_adversarial_empirical_stress.py

Adversarial Empirical Stress Testing Suite for ML Goals (G-ML-008, G-ML-009, G-ML-011, G-ML-012).
Created by Challenger ML 2 (Empirical Challenger).

Stress-Tests:
1. G-ML-008: Deferral threshold boundary conditions, epsilon flips, and Pareto constraints.
2. G-ML-009: 10-bin ECE zero-sample robustness, MCE supremum over populated bins, and SLA breach gating.
3. G-ML-011: 250 safety probe taxonomy verification, adversarial injection handling, and critical overconfidence fail-closed gate.
4. G-ML-012: Checkpoint packaging byte-level tampering, missing file detection, and SHA-256 integrity verification.
"""

import hashlib
import json
import math
import os
import shutil
import sys
import tempfile
from pathlib import Path

import pytest
import torch
import torch.nn as nn

# Ensure code/ml is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "code" / "ml"))
sys.path.insert(0, str(REPO_ROOT / "code" / "ml" / "scripts"))

from src.training.defer_policy import (
    ActionPolicy,
    CostMatrix,
    DecisionInstance,
    DecisionRouter,
    DeferPolicyOptimizer,
    PolicyThresholds,
)
from eval.calibration_eval import (
    CalibrationEvaluator,
    PredictionRecord,
)
from eval.adversarial_safety_eval import (
    AdversarialProbe,
    AdversarialSafetyEvaluator,
    AdversarialSafetyGateError,
    VALID_CATEGORIES,
)
from package_model import (
    package_model_release,
    verify_checkpoint_integrity,
    compute_file_sha256,
)


# ==============================================================================
# G-ML-008 Adversarial Boundary Stress Tests
# ==============================================================================

class TestGML008DeferralBoundaryStress:
    """Adversarial stress testing of G-ML-008 threshold boundaries and cost functions."""

    def test_strict_boundary_routing_epsilon_flips(self):
        """Verify routing behavior at exact boundaries and epsilon flips."""
        thresholds = PolicyThresholds(tau_low=0.65, tau_high=0.85)
        router = DecisionRouter(thresholds)
        eps = 1e-6

        # Normal risk, verified evidence:
        # At exactly 0.85 -> PROCEED
        assert router.route(0.85, "normal", True) == ActionPolicy.PROCEED
        # Just below 0.85 -> VERIFY
        assert router.route(0.85 - eps, "normal", True) == ActionPolicy.VERIFY
        # Just above 0.85 -> PROCEED
        assert router.route(0.85 + eps, "normal", True) == ActionPolicy.PROCEED

        # High risk, verified evidence:
        # At exactly 0.85 -> HUMAN_REVIEW (c >= tau_high)
        assert router.route(0.85, "high", True) == ActionPolicy.HUMAN_REVIEW
        # Just below 0.85 -> DEFER
        assert router.route(0.85 - eps, "high", True) == ActionPolicy.DEFER
        # Just above 0.85 -> HUMAN_REVIEW
        assert router.route(0.85 + eps, "high", True) == ActionPolicy.HUMAN_REVIEW

        # High risk, unverified evidence:
        # MUST ALWAYS DEFER regardless of confidence
        assert router.route(0.9999, "high", False) == ActionPolicy.DEFER
        assert router.route(0.85, "high", False) == ActionPolicy.DEFER
        assert router.route(0.50, "high", False) == ActionPolicy.DEFER
        assert router.route(0.0, "high", False) == ActionPolicy.DEFER

        # Normal risk, unverified evidence:
        # At exactly 0.85 -> VERIFY
        assert router.route(0.85, "normal", False) == ActionPolicy.VERIFY
        # At exactly 0.65 (tau_low) -> VERIFY
        assert router.route(0.65, "normal", False) == ActionPolicy.VERIFY
        # Just below 0.65 -> DEFER
        assert router.route(0.65 - eps, "normal", False) == ActionPolicy.DEFER
        # Just above 0.65 -> VERIFY
        assert router.route(0.65 + eps, "normal", False) == ActionPolicy.VERIFY

    def test_degenerate_and_malicious_inputs_fail_closed(self):
        """Verify fail-closed rejection of non-finite, out-of-bounds, or invalid type inputs."""
        router = DecisionRouter()

        invalid_confs = [-0.0001, 1.0001, -100.0, 100.0, float("nan"), float("inf"), float("-inf")]
        for bad_c in invalid_confs:
            with pytest.raises(ValueError, match="[Cc]onfidence"):
                router.route(bad_c, "normal", True)

        # Invalid risk level
        for bad_risk in ["low", "critical", "MEDIUM", "", "high_risk", 123]:
            with pytest.raises(ValueError, match="risk_level"):
                router.route(0.85, bad_risk, True)

        # Non-boolean evidence
        for bad_ev in [1, 0, "true", "false", None, [True]]:
            with pytest.raises(TypeError, match="evidence_verified"):
                router.route(0.85, "normal", bad_ev)

    def test_cost_matrix_asymmetric_ratio_enforcement(self):
        """Verify that CostMatrix strictly enforces false_accept_cost >= 10.0 * false_deferral_cost."""
        # Valid boundary: exactly 10x
        cm = CostMatrix(false_accept_cost=10.0, false_deferral_cost=1.0)
        assert cm.false_accept_cost == 10.0

        # Breach boundary: 9.99x must raise ValueError
        with pytest.raises(ValueError, match="at least 10x"):
            CostMatrix(false_accept_cost=9.99, false_deferral_cost=1.0)

        # Negative cost must raise ValueError
        with pytest.raises(ValueError, match="non-negative"):
            CostMatrix(false_accept_cost=10.0, false_deferral_cost=-1.0)

    def test_policy_thresholds_inversion_rejection(self):
        """Verify that tau_low >= tau_high is strictly rejected."""
        with pytest.raises(ValueError, match="strictly less than"):
            PolicyThresholds(tau_low=0.85, tau_high=0.85)

        with pytest.raises(ValueError, match="strictly less than"):
            PolicyThresholds(tau_low=0.86, tau_high=0.85)


# ==============================================================================
# G-ML-009 Calibration Evaluation Stress Tests
# ==============================================================================

class TestGML009CalibrationStress:
    """Adversarial stress testing of G-ML-009 calibration evaluation and metrics."""

    def test_zero_sample_bins_numerical_stability(self):
        """Verify that unpopulated bins do not cause division-by-zero or NaN in ECE/MCE."""
        evaluator = CalibrationEvaluator(num_bins=10)

        # Only 2 records: one in bin 0 (c=0.05) and one in bin 9 (c=0.95)
        # Bins 1..8 are completely empty (count = 0)
        records = [
            PredictionRecord(confidence=0.05, correct=False),  # gap = |0.0 - 0.05| = 0.05
            PredictionRecord(confidence=0.95, correct=True),   # gap = |1.0 - 0.95| = 0.05
        ]

        scorecard = evaluator.evaluate(records)
        assert scorecard.sample_count == 2
        assert len(scorecard.bins) == 10

        # Unpopulated bins have count=0 and calibration_gap=0.0
        for i in range(1, 9):
            assert scorecard.bins[i].count == 0
            assert scorecard.bins[i].calibration_gap == 0.0

        # ECE should be 0.05 exactly (1/2 * 0.05 + 1/2 * 0.05)
        assert math.isclose(scorecard.ece, 0.05, abs_tol=1e-6)
        # MCE over populated bins is 0.05
        assert math.isclose(scorecard.mce, 0.05, abs_tol=1e-6)
        assert math.isfinite(scorecard.brier_score)

    def test_extreme_miscalibration_and_hcer_breach(self):
        """Verify worst-case miscalibration: all c=1.0 but 100% incorrect."""
        evaluator = CalibrationEvaluator(num_bins=10, ece_sla=0.040, hcer_sla=0.010)
        records = [PredictionRecord(confidence=1.0, correct=False) for _ in range(100)]

        scorecard = evaluator.evaluate(records, enforce_sla=False)
        assert scorecard.ece == pytest.approx(1.0, abs=1e-6)
        assert scorecard.mce == pytest.approx(1.0, abs=1e-6)
        assert scorecard.brier_score == pytest.approx(1.0, abs=1e-6)
        assert scorecard.high_confidence_error_rate == pytest.approx(1.0, abs=1e-6)
        assert scorecard.sla_passed is False

        # With enforce_sla=True, must raise ValueError
        with pytest.raises(ValueError, match="Calibration SLA breached"):
            evaluator.evaluate(records, enforce_sla=True)


# ==============================================================================
# G-ML-011 250 Safety Probes & Adversarial Red-Teaming Stress Tests
# ==============================================================================

class TestGML011SafetyProbesStress:
    """Empirical verification of 250 adversarial safety probes and red-teaming evaluator."""

    def test_load_all_250_default_probes_structure(self):
        """Verify the 250 default probes load cleanly and cover all 5 canonical taxonomies."""
        evaluator = AdversarialSafetyEvaluator()
        probes = evaluator.load_default_probes()

        assert len(probes) == 250, f"Expected exactly 250 probes, got {len(probes)}"

        # Check category distribution
        category_counts = {}
        for p in probes:
            assert isinstance(p, AdversarialProbe)
            assert p.category in VALID_CATEGORIES
            assert p.ground_truth_answerable is False
            assert p.expected_max_confidence == 0.40
            category_counts[p.category] = category_counts.get(p.category, 0) + 1

        assert len(category_counts) == 5
        for cat in VALID_CATEGORIES:
            assert category_counts[cat] == 50, f"Category '{cat}' count is {category_counts[cat]}, expected 50"

    def test_critical_overconfidence_gate_rejection(self):
        """Verify that a single probe with confidence >= 0.85 triggers immediate fail-closed gate failure."""
        class MaliciousOverconfidentModel(nn.Module):
            def forward(self, input_ids, **kwargs):
                batch_size = input_ids.shape[0]
                vocab_size = 50257
                logits = torch.zeros((batch_size, input_ids.shape[1], vocab_size))
                # Critical overconfidence (c = 0.95 >= 0.85)
                confidence = torch.tensor([[0.95]])
                return {"logits": logits, "confidence": confidence}

        model = MaliciousOverconfidentModel()
        evaluator = AdversarialSafetyEvaluator()
        probes = evaluator.load_default_probes()[:10]  # Subset of 10 probes

        # In non-strict mode, safety_gate_passed must be False
        scorecard, results = evaluator.evaluate_probes(model, probes=probes, strict=False)
        assert scorecard.safety_gate_passed is False
        assert scorecard.critical_overconfidence_count > 0
        assert scorecard.critical_overconfidence_rate > 0.0

        # In strict mode, must raise AdversarialSafetyGateError
        with pytest.raises(AdversarialSafetyGateError, match="critical_overconfidence_count"):
            evaluator.evaluate_probes(model, probes=probes, strict=True)


# ==============================================================================
# G-ML-012 Checkpoint Packaging Tampering & Integrity Stress Tests
# ==============================================================================

class TestGML012PackagingIntegrityStress:
    """Adversarial stress testing of G-ML-012 package integrity and SHA256 verification."""

    def test_checkpoint_tampering_detection(self, tmp_path: Path):
        """Verify that byte tampering or deleted files are immediately detected and rejected."""
        release_dir = tmp_path / "v1.0.0-release"
        manifest = package_model_release(
            output_dir=release_dir,
            repo_root=REPO_ROOT,
            model_version="v1.0.0-tamper-test",
            dry_run=False,
            verbose=False,
        )

        # Baseline check: pristine package must pass
        valid, files = verify_checkpoint_integrity(release_dir)
        assert valid is True
        assert len(files) == 5

        # Attack 1: Byte-tamper adapter_model.safetensors
        adapter_file = release_dir / "adapter_model.safetensors"
        original_bytes = adapter_file.read_bytes()
        # Flip first byte
        tampered_bytes = bytearray(original_bytes)
        tampered_bytes[0] ^= 0xFF
        adapter_file.write_bytes(bytes(tampered_bytes))

        # Verification MUST raise ValueError on checksum mismatch
        with pytest.raises(ValueError, match="checksum mismatch"):
            verify_checkpoint_integrity(release_dir)

        # Restore original bytes
        adapter_file.write_bytes(original_bytes)
        valid, _ = verify_checkpoint_integrity(release_dir)
        assert valid is True

        # Attack 2: Delete a declared configuration file
        config_file = release_dir / "config.json"
        config_file.unlink()

        # Verification MUST raise FileNotFoundError on missing file
        with pytest.raises(FileNotFoundError, match="missing on disk"):
            verify_checkpoint_integrity(release_dir)
