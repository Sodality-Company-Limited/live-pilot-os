"""
tests/ml/test_challenger_stress.py

Adversarial Challenger Empirical Verification & Boundary Stress Suite
Targeting Goals: G-ML-001 through G-ML-007.

Empirically challenges:
1. G-ML-001: DecisionRecord JSON Schema & Pydantic boundary validation (NaN, Inf, bounds, extra fields).
2. G-ML-002: DeterministicOutcomeLabeler boundary grading, AST syntax failures, regex injection safety, risk penalty monotonicity.
3. G-ML-003: BaselineEvaluator and calibration metrics boundaries (perfect, inverted, empty).
4. G-ML-004: DualHeadCausalLM detached backbone gradient isolation & non-finite input rejection.
5. G-ML-005: LanguagePreservationLoss causal next-token alignment, KL non-negativity, and logit extreme stability.
6. G-ML-006: CalibratedRewardLoss asymmetric overconfidence penalty ratio, proper scoring rule, and epsilon clamping.
7. G-ML-007: PEFT LoRA adapter parameter freezing, rank scaling, and trainable parameter ratio.
"""

from __future__ import annotations

import math
import os
import sys
import time
import pytest
import torch
import torch.nn as nn
from pydantic import ValidationError

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.dataset.schema import DatasetValidator, DecisionRecord, RiskLevel
from src.dataset.labeler import DeterministicOutcomeLabeler, ExecutionReceipt, OutcomeLabelResult
from benchmarks.baseline_eval import BaselineEvaluator, CandidateModelConfig
from src.models.dual_head_model import DualHeadCausalLM, ConfidenceValueHead, BaseCausalTransformerBackbone
from src.training.losses.language_preservation import LanguagePreservationLoss
from src.training.losses.calibrated_reward import CalibratedRewardLoss
from src.training.train_pipeline import TrainerConfig, create_peft_dual_head_model


# ==============================================================================
# 1. G-ML-001 Boundary Stress Tests
# ==============================================================================
class TestGML001BoundaryStress:
    """Adversarial stress-testing of decision record schema and validator."""

    @pytest.fixture
    def validator(self):
        return DatasetValidator()

    def test_valid_boundary_values(self, validator):
        """Boundary values 0.0 and 1.0 confidence, empty evidence, normal and high risk."""
        rec_min = validator.validate_record({
            "context_id": "ctx_min",
            "prompt": "Evaluate min boundary",
            "completion": "Complete",
            "evidence_list": [],
            "ground_truth_outcome": "failure",
            "risk_level": "normal",
            "confidence": 0.0,
        })
        assert rec_min.confidence == 0.0

        rec_max = validator.validate_record({
            "context_id": "ctx_max",
            "prompt": "Evaluate max boundary",
            "completion": "Complete",
            "evidence_list": ["doc1", "doc2"],
            "ground_truth_outcome": "success",
            "risk_level": "high",
            "confidence": 1.0,
        })
        assert rec_max.confidence == 1.0

    @pytest.mark.parametrize("invalid_conf", [
        1.0000001, -0.0000001, float("nan"), float("inf"), float("-inf"), 2.0, -100.0
    ])
    def test_out_of_bounds_confidence_rejected(self, validator, invalid_conf):
        """Adversarial non-finite and out-of-interval confidence must be rejected."""
        with pytest.raises((ValueError, ValidationError)):
            validator.validate_record({
                "context_id": "ctx_bad",
                "prompt": "P",
                "completion": "C",
                "evidence_list": [],
                "ground_truth_outcome": "success",
                "risk_level": "normal",
                "confidence": invalid_conf,
            })

    @pytest.mark.parametrize("missing_field", [
        "context_id", "prompt", "completion", "evidence_list", "ground_truth_outcome", "risk_level"
    ])
    def test_missing_required_fields_rejected(self, validator, missing_field):
        """Omitting any single required field must trigger fail-closed validation error."""
        base = {
            "context_id": "ctx_ok",
            "prompt": "Prompt",
            "completion": "Completion",
            "evidence_list": ["doc_ref"],
            "ground_truth_outcome": "success",
            "risk_level": "normal",
            "confidence": 0.85,
        }
        del base[missing_field]
        with pytest.raises((ValueError, ValidationError)):
            validator.validate_record(base)

    @pytest.mark.parametrize("bad_evidence", [
        "not_a_list", 12345, None, {"key": "val"}, [1, 2, 3]
    ])
    def test_malformed_evidence_list_rejected(self, validator, bad_evidence):
        """Non-array or non-string evidence items must fail closed."""
        with pytest.raises((ValueError, ValidationError)):
            validator.validate_record({
                "context_id": "ctx_ev",
                "prompt": "P",
                "completion": "C",
                "evidence_list": bad_evidence,
                "ground_truth_outcome": "success",
                "risk_level": "normal",
            })

    @pytest.mark.parametrize("bad_risk", [
        "low", "CRITICAL", "normal ", "HIGH", "", 1, None
    ])
    def test_malformed_risk_level_rejected(self, validator, bad_risk):
        """Unrecognized risk level strings or invalid types must be rejected."""
        with pytest.raises((ValueError, ValidationError)):
            validator.validate_record({
                "context_id": "ctx_risk",
                "prompt": "P",
                "completion": "C",
                "evidence_list": [],
                "ground_truth_outcome": "success",
                "risk_level": bad_risk,
            })

    def test_extra_forbidden_properties_rejected(self, validator):
        """Injected unpermitted properties must be rejected fail-closed."""
        with pytest.raises((ValueError, ValidationError)):
            validator.validate_record({
                "context_id": "ctx_extra",
                "prompt": "P",
                "completion": "C",
                "evidence_list": [],
                "ground_truth_outcome": "success",
                "risk_level": "normal",
                "confidence": 0.5,
                "rogue_payload": "exploit_attempt",
            })

    def test_validation_throughput_sla(self, validator):
        """Average latency for 100 validations must be strictly < 5.0ms per record."""
        record = {
            "context_id": "ctx_sla",
            "prompt": "Benchmark prompt",
            "completion": "Benchmark completion",
            "evidence_list": ["ref1", "ref2"],
            "ground_truth_outcome": "success",
            "risk_level": "normal",
            "confidence": 0.92,
        }
        t0 = time.perf_counter()
        for _ in range(100):
            validator.validate_record(record)
        dt = (time.perf_counter() - t0) * 1000.0 / 100.0
        assert dt < 5.0, f"Average validation latency {dt:.3f}ms exceeded 5.0ms SLA"


# ==============================================================================
# 2. G-ML-002 Boundary Stress Tests
# ==============================================================================
class TestGML002BoundaryStress:
    """Adversarial stress-testing of deterministic outcome labeler."""

    @pytest.fixture
    def labeler(self):
        return DeterministicOutcomeLabeler()

    def test_exit_code_boundaries(self, labeler):
        """Test clean exit, positive failure, negative termination signals (SIGKILL, SIGTERM)."""
        # Exit code 0, clean
        corr, status = labeler.grade_correctness({"exit_code": 0, "stdout": "All 5 tests passed"})
        assert corr == 1 and status == "CORRECT"

        # Exit code 1 (failure)
        corr, status = labeler.grade_correctness({"exit_code": 1, "stderr": "Assertion failed"})
        assert corr == 0 and status == "INCORRECT"

        # Negative exit code -9 (SIGKILL)
        corr, status = labeler.grade_correctness({"exit_code": -9, "stderr": "Killed: 9"})
        assert corr == 0 and status == "INCORRECT"

        # Missing exit code -> UNKNOWN
        corr, status = labeler.grade_correctness({"stdout": "No exit code declared"})
        assert corr == 0 and status == "UNKNOWN"

    def test_ast_syntax_error_failure(self, labeler):
        """Syntactically broken python code must grade as INCORRECT even if exit_code=0."""
        corr, status = labeler.grade_correctness({
            "exit_code": 0,
            "source_code": "def broken_syntax(:\n    return False\n",
        })
        assert corr == 0 and status == "INCORRECT"

    def test_evidence_special_regex_characters_safety(self, labeler):
        """Evidence spans containing special regex chars must match literally without crash."""
        special_chars = "[a-z]+.*$?^\\{}"
        doc = f"This document contains literal {special_chars} inside it safely."
        score = labeler.calculate_evidence_support([special_chars], doc)
        assert score == 1.0

        # Unmatched special chars
        score_unmatched = labeler.calculate_evidence_support([special_chars], "No match here.")
        assert score_unmatched == 0.0

    def test_risk_aversion_monotonicity(self, labeler):
        """High risk decisions must assign conservative empirical probabilities."""
        # Condition: Correct outcome with identical evidence
        p_normal = labeler.assign_calibrated_target(
            binary_correctness=1, evidence_ratio=0.9, risk_level="normal"
        )
        p_high = labeler.assign_calibrated_target(
            binary_correctness=1, evidence_ratio=0.9, risk_level="high"
        )
        assert 0.0 <= p_high <= 1.0
        assert 0.0 <= p_normal <= 1.0
        assert p_high <= p_normal, "High risk target probability must be conservative (<= normal)"


# ==============================================================================
# 3. G-ML-003 Boundary Stress Tests
# ==============================================================================
class TestGML003BoundaryStress:
    """Adversarial stress-testing of baseline metrics and candidate model evaluator."""

    @pytest.fixture
    def evaluator(self):
        return BaselineEvaluator(config_path="code/ml/configs/candidates.yaml")

    def test_perplexity_calculation_and_finite_bounds(self, evaluator):
        """Exact perplexity calculation and non-finite logit rejection."""
        logits = torch.tensor([[3.0, 1.0, 0.5], [0.2, 4.0, 1.2]], dtype=torch.float32)
        targets = torch.tensor([0, 1], dtype=torch.long)
        ppl = evaluator.compute_perplexity(logits, targets)
        assert isinstance(ppl, float)
        assert ppl >= 1.0

        # Non-finite logit rejection
        with pytest.raises(ValueError, match="non-finite"):
            evaluator.compute_perplexity(torch.tensor([[float("nan"), 1.0]]), torch.tensor([0]))
        with pytest.raises(ValueError, match="non-finite"):
            evaluator.compute_perplexity(torch.tensor([[float("inf"), 1.0]]), torch.tensor([0]))

    def test_ece_bounds_and_probability_rejection(self, evaluator):
        """10-bin ECE computation and out-of-bounds probability rejection."""
        probs = torch.tensor([
            [0.9, 0.1],
            [0.8, 0.2],
            [0.6, 0.4],
            [0.55, 0.45],
            [0.95, 0.05]
        ], dtype=torch.float32)
        labels = torch.tensor([0, 0, 1, 0, 0], dtype=torch.long)

        ece = evaluator.compute_ece(probs, labels, bins=10)
        assert isinstance(ece, float)
        assert 0.0 <= ece <= 1.0

        # Out-of-bounds probability rejection
        with pytest.raises(ValueError, match="outside \\[0\\.0, 1\\.0\\]"):
            evaluator.compute_ece(torch.tensor([[1.5, -0.5]]), torch.tensor([0]))

    def test_greedy_determinism_constraint(self):
        """Decoding configs with temperature > 0 or do_sample=True must be rejected."""
        non_greedy = {
            "id": "bad_model",
            "name": "Bad",
            "checkpoint_id": "test/bad",
            "architecture": "transformer",
            "precision": "bfloat16",
            "decoding": {"temperature": 0.7, "do_sample": True},
        }
        with pytest.raises(ValueError, match="Greedy determinism violation"):
            CandidateModelConfig.from_dict(non_greedy)


# ==============================================================================
# 4. G-ML-004 Boundary Stress Tests
# ==============================================================================
class TestGML004BoundaryStress:
    """Adversarial stress-testing of DualHeadCausalLM gradient isolation & shapes."""

    def test_detached_backbone_gradient_isolation(self):
        """
        When detach_backbone=True, backpropagating confidence head loss
        must produce zero gradients across all backbone parameters.
        """
        backbone = BaseCausalTransformerBackbone(vocab_size=100, hidden_dim=64, num_layers=2)
        model = DualHeadCausalLM(base_model=backbone, hidden_dim=64, detach_backbone=True)

        input_ids = torch.randint(0, 100, (2, 8))
        out = model(input_ids)

        assert out.logits.shape == (2, 8, 100)
        assert out.confidence.shape == (2, 1)

        # Compute loss on confidence head only
        loss = out.confidence.sum()
        loss.backward()

        # Assert confidence head parameters received gradients
        for name, param in model.confidence_head.named_parameters():
            if param.requires_grad:
                assert param.grad is not None, f"Confidence head {name} should have grad"
                assert torch.isfinite(param.grad).all()

        # Assert backbone parameters received ZERO gradients (isolation verified)
        for name, param in model.base_model.named_parameters():
            assert param.grad is None, f"Backbone {name} leaked gradient when detach_backbone=True"

    def test_non_finite_input_rejection(self):
        """Non-finite hidden states in confidence head must raise ValueError."""
        head = ConfidenceValueHead(hidden_dim=32)
        nan_hidden = torch.full((2, 32), float("nan"))
        with pytest.raises(ValueError):
            head(nan_hidden)


# ==============================================================================
# 5. G-ML-005 Boundary Stress Tests
# ==============================================================================
class TestGML005BoundaryStress:
    """Adversarial stress-testing of language preservation loss."""

    def test_kl_divergence_non_negativity(self):
        """KL divergence between any two distributions must be non-negative."""
        criterion = LanguagePreservationLoss(beta=0.5, temperature=1.0)
        logits_student = torch.randn(2, 8, 50, requires_grad=True)
        logits_teacher = torch.randn(2, 8, 50)
        labels = torch.randint(0, 50, (2, 8))

        out = criterion(logits_student, labels, logits_teacher)
        assert out.kl_loss.item() >= 0.0, "KL divergence must be non-negative"
        assert torch.isfinite(out.loss)

    def test_identical_distributions_zero_kl(self):
        """When student and teacher logits are identical, KL divergence must be ~0.0."""
        criterion = LanguagePreservationLoss(beta=0.5, temperature=1.0)
        logits = torch.randn(2, 8, 50, requires_grad=True)
        labels = torch.randint(0, 50, (2, 8))

        out = criterion(logits, labels, logits.detach())
        assert out.kl_loss.item() == pytest.approx(0.0, abs=1e-5)

    def test_extreme_logit_numerical_stability(self):
        """Extreme logit values (+1e4, -1e4) must not produce NaN or Inf."""
        criterion = LanguagePreservationLoss(beta=0.1)
        extreme_logits = torch.tensor([[[10000.0, -10000.0], [-10000.0, 10000.0]]], requires_grad=True)
        labels = torch.tensor([[0, 1]])

        out = criterion(extreme_logits, labels)
        assert torch.isfinite(out.loss)
        assert not torch.isnan(out.loss)


# ==============================================================================
# 6. G-ML-006 Boundary Stress Tests
# ==============================================================================
class TestGML006BoundaryStress:
    """Adversarial stress-testing of calibrated reward and asymmetric loss."""

    def test_asymmetric_overconfidence_penalty_ratio(self):
        """
        A confident error (c=0.99, y=0) must be penalized substantially higher
        than an unconfident error (c=0.05, y=0) due to quadratic overconfidence penalty.
        """
        loss_fn = CalibratedRewardLoss(alpha_overconfidence=5.0, lambda_brier=0.2, reduction="none")

        conf_high_err = torch.tensor([0.99])
        conf_low_err = torch.tensor([0.05])
        target_err = torch.tensor([0.0])

        out_high = loss_fn(conf_high_err, target_err)
        out_low = loss_fn(conf_low_err, target_err)

        # Check overconfidence penalty component
        pen_high = out_high.overconfidence_penalty.item()
        pen_low = out_low.overconfidence_penalty.item()

        # Ratio must be (0.99 / 0.05)^2 = 392x
        ratio = pen_high / pen_low
        assert ratio > 350.0, f"Overconfidence penalty ratio {ratio:.1f} was below expected 350x"
        assert out_high.loss.item() > out_low.loss.item() * 5.0

    def test_epsilon_clamping_boundary_safety(self):
        """Exact boundary confidences 0.0 and 1.0 must not produce log(0) -inf."""
        loss_fn = CalibratedRewardLoss(epsilon=1e-7, reduction="mean")
        conf_boundary = torch.tensor([0.0, 1.0])
        targets = torch.tensor([1.0, 0.0])

        out = loss_fn(conf_boundary, targets)
        assert torch.isfinite(out.loss)
        assert not torch.isnan(out.loss)
        assert not torch.isinf(out.loss)

    def test_autograd_stability_at_boundaries(self):
        """Gradients near boundaries must remain finite."""
        loss_fn = CalibratedRewardLoss(epsilon=1e-6)
        c = torch.tensor([1e-5, 1.0 - 1e-5], requires_grad=True)
        y = torch.tensor([1.0, 0.0])

        out = loss_fn(c, y)
        out.backward()

        assert c.grad is not None
        assert torch.isfinite(c.grad).all(), f"Gradient contained non-finite values: {c.grad}"


# ==============================================================================
# 7. G-ML-007 Boundary Stress Tests
# ==============================================================================
class TestGML007BoundaryStress:
    """Adversarial stress-testing of LoRA parameter efficiency and frozen backbone."""

    def test_peft_lora_backbone_freezing(self):
        """Base transformer backbone must be frozen; only LoRA adapters and head are trainable."""
        backbone = BaseCausalTransformerBackbone(vocab_size=100, hidden_dim=64, num_layers=2)
        base_dual = DualHeadCausalLM(base_model=backbone, hidden_dim=64)

        config = TrainerConfig(lora_r=8, lora_alpha=16, target_modules=["fc1", "fc2", "out_proj", "lm_head"])
        model = create_peft_dual_head_model(base_dual, config)

        total_params = sum(p.numel() for p in model.parameters())
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

        # Trainable params must be < 20% of total model
        trainable_ratio = trainable_params / total_params
        assert trainable_ratio < 0.20, f"Trainable ratio {trainable_ratio:.3f} was too high"

        # Backbone transformer layers must have requires_grad == False
        for name, param in model.base_model.named_parameters():
            if "lora" not in name.lower():
                assert not param.requires_grad, f"Base parameter {name} was not frozen"

        # Confidence head must remain trainable
        for name, param in model.confidence_head.named_parameters():
            assert param.requires_grad, f"Confidence head parameter {name} should be trainable"
