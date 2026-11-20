"""
Unit and Integration Test Suite for Calibrated RLCD Reward and Asymmetric Loss Function.

Goal Reference: G-ML-006
Epic: ML (Machine Learning & Cognitive Calibration)

Verifies:
1. Step 1: Forward computation, proper scoring loss, component decomposition, and reductions.
2. Step 2: Monotonicity and asymmetric penalty scaling (>= 5x at c=0.95 vs c=0.20 for wrong answers).
3. Step 3: Autograd stability, finite backward gradients, and torch.autograd.gradcheck.
4. Boundary condition numerical stability (c in {0.0, 1.0}) with zero NaN/Inf.
5. Evidence penalty scaling and monotonic downward reward under missing evidence.
6. Fail-closed rejection of non-finite, out-of-bounds, or empty batch inputs.
"""

import math
import os
import sys
import pytest
import torch
import torch.nn as nn
from torch.autograd import gradcheck

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.losses import CalibratedRewardLoss, CalibratedRewardOutput


class TestCalibratedRewardLoss:
    """Test suite covering all operational invariants of CalibratedRewardLoss."""

    def test_loss_forward(self):
        """
        Step 1 Verification Gate:
        Forward pass computes valid finite float32 outputs across all components.
        """
        loss_fn = CalibratedRewardLoss(
            alpha_overconfidence=2.0,
            lambda_brier=0.1,
            lambda_evidence=0.5,
            reduction="mean",
        )

        confidence = torch.tensor([0.2, 0.8, 0.6, 0.95], dtype=torch.float32)
        targets = torch.tensor([0.0, 1.0, 0.0, 1.0], dtype=torch.float32)
        evidence = torch.tensor([1.0, 1.0, 0.0, 1.0], dtype=torch.float32)

        output = loss_fn(confidence, targets, evidence_verified=evidence)

        assert isinstance(output, CalibratedRewardOutput)
        assert torch.is_tensor(output.loss)
        assert output.loss.numel() == 1
        assert torch.isfinite(output.loss)
        assert not torch.isnan(output.loss)
        assert output.loss.item() > 0.0

        # Component decomposition verification
        assert torch.isfinite(output.proper_loss)
        assert torch.isfinite(output.overconfidence_penalty)
        assert torch.isfinite(output.brier_loss)
        assert torch.isfinite(output.evidence_penalty)
        assert torch.isfinite(output.reward)
        assert torch.allclose(output.reward, -output.loss)

        # Dictionary representation verification
        d = output.as_dict()
        assert "loss" in d
        assert "proper_loss" in d
        assert "overconfidence_penalty" in d
        assert "brier_loss" in d
        assert "evidence_penalty" in d
        assert "reward" in d
        assert math.isclose(d["reward"], -d["loss"], rel_tol=1e-5)

        # Indexing access verification
        assert torch.equal(output["loss"], output.loss)
        assert torch.equal(output["total_loss"], output.loss)
        assert torch.equal(output["proper_loss"], output.proper_loss)
        assert torch.equal(output["overconfidence_penalty"], output.overconfidence_penalty)
        assert torch.equal(output["brier_loss"], output.brier_loss)
        assert torch.equal(output["evidence_penalty"], output.evidence_penalty)
        assert torch.equal(output["reward"], output.reward)

    def test_reduction_modes(self):
        """Verify mean, sum, and none reductions."""
        confidence = torch.tensor([0.3, 0.7], dtype=torch.float32)
        targets = torch.tensor([0.0, 1.0], dtype=torch.float32)

        loss_mean = CalibratedRewardLoss(reduction="mean")(confidence, targets)
        loss_sum = CalibratedRewardLoss(reduction="sum")(confidence, targets)
        loss_none = CalibratedRewardLoss(reduction="none")(confidence, targets)

        assert loss_mean.loss.numel() == 1
        assert loss_sum.loss.numel() == 1
        assert loss_none.loss.shape == (2,)
        assert torch.allclose(loss_mean.loss, loss_none.loss.mean())
        assert torch.allclose(loss_sum.loss, loss_none.loss.sum())

    def test_asymmetric_penalty(self):
        """
        Step 2 Verification Gate:
        1. Loss monotonically increases for incorrect answers as confidence approaches 1.0.
        2. Assert that incorrect loss at c = 0.95 is at least 5x higher than at c = 0.20.
        """
        loss_fn = CalibratedRewardLoss(
            alpha_overconfidence=2.0,
            lambda_brier=0.1,
            lambda_evidence=0.0,
            reduction="none",
        )

        # Evaluate across increasing confidence on incorrect answers (y* = 0)
        conf_values = [0.05, 0.10, 0.20, 0.40, 0.60, 0.80, 0.90, 0.95, 0.99]
        conf_tensor = torch.tensor(conf_values, dtype=torch.float32)
        wrong_targets = torch.zeros_like(conf_tensor)

        output = loss_fn(conf_tensor, wrong_targets)
        losses = output.loss.tolist()

        # Invariant 1: Strict Monotonicity
        for i in range(len(losses) - 1):
            assert losses[i + 1] > losses[i], (
                f"Monotonicity breach on incorrect answers: c={conf_values[i+1]} loss={losses[i+1]} "
                f"<= c={conf_values[i]} loss={losses[i]}"
            )

        # Invariant 2: 5x Penalty Ratio at c=0.95 vs c=0.20
        idx_020 = conf_values.index(0.20)
        idx_095 = conf_values.index(0.95)
        loss_020 = losses[idx_020]
        loss_095 = losses[idx_095]

        ratio = loss_095 / loss_020
        assert ratio >= 5.0, (
            f"Overconfidence penalty ratio must be >= 5x, got {ratio:.2f}x "
            f"(loss@0.95={loss_095:.4f}, loss@0.20={loss_020:.4f})"
        )

    def test_autograd_stability(self):
        """
        Step 3 Verification Gate:
        1. Backward pass computes finite, non-zero gradients on parameters.
        2. torch.autograd.gradcheck passes on double precision tensors with precision <= 1e-5.
        """
        # 1. Backward pass test on trainable weights feeding confidence
        linear = nn.Linear(8, 1)
        optimizer = torch.optim.SGD(linear.parameters(), lr=0.01)

        x = torch.randn(4, 8)
        logits = linear(x).squeeze(-1)
        confidence = torch.sigmoid(logits)  # Bounded in (0, 1)
        targets = torch.tensor([1.0, 0.0, 1.0, 0.0], dtype=torch.float32)

        loss_fn = CalibratedRewardLoss()
        output = loss_fn(confidence, targets)

        optimizer.zero_grad()
        output.backward()

        for name, param in linear.named_parameters():
            assert param.grad is not None, f"Parameter {name} received null gradient"
            assert torch.isfinite(param.grad).all(), f"Parameter {name} received non-finite gradient"
            assert not torch.allclose(param.grad, torch.zeros_like(param.grad)), f"Parameter {name} received zero gradient"

        # 2. torch.autograd.gradcheck
        loss_fn_eval = CalibratedRewardLoss(
            alpha_overconfidence=2.0,
            lambda_brier=0.1,
            lambda_evidence=0.5,
            reduction="sum",
        )

        def loss_forward_wrapper(conf_tensor, target_tensor):
            return loss_fn_eval(conf_tensor, target_tensor).loss

        c_double = torch.tensor([0.25, 0.45, 0.70, 0.85], dtype=torch.float64, requires_grad=True)
        y_double = torch.tensor([0.0, 1.0, 0.0, 1.0], dtype=torch.float64)

        gradcheck_passed = gradcheck(
            loss_forward_wrapper,
            (c_double, y_double),
            eps=1e-6,
            atol=1e-5,
            rtol=1e-4,
        )
        assert gradcheck_passed is True, "torch.autograd.gradcheck failed analytical gradient precision check."

    def test_boundary_numerical_stability(self):
        """
        Boundary Condition Gate:
        Confidence values at exact boundaries {0.0, 1.0} produce finite float outputs with zero NaN/Inf.
        """
        loss_fn = CalibratedRewardLoss(reduction="none")

        extreme_c = torch.tensor([0.0, 1.0, 0.0, 1.0], dtype=torch.float32)
        targets = torch.tensor([0.0, 0.0, 1.0, 1.0], dtype=torch.float32)

        output = loss_fn(extreme_c, targets)

        assert torch.isfinite(output.loss).all(), "Non-finite loss on boundary values"
        assert not torch.isnan(output.loss).any(), "NaN loss on boundary values"
        assert torch.isfinite(output.proper_loss).all()
        assert torch.isfinite(output.overconfidence_penalty).all()
        assert torch.isfinite(output.brier_loss).all()
        assert torch.isfinite(output.reward).all()

        # At c=1.0 and y=1.0 with e=1.0, loss should be virtually 0 (epsilon bounded)
        loss_perfect = output.loss[3].item()
        assert loss_perfect < 1e-4, f"Loss at c=1, y=1 should be close to 0, got {loss_perfect}"

    def test_evidence_penalty_scaling(self):
        """
        Evidence Scaling Gate:
        Absence of verified evidence scales the reward downwards monotonically.
        """
        loss_fn = CalibratedRewardLoss(
            lambda_evidence=0.5,
            reduction="none",
        )

        c = torch.tensor([0.85, 0.85], dtype=torch.float32)
        y = torch.tensor([1.0, 1.0], dtype=torch.float32)

        evid_verified = torch.tensor([1.0, 0.0], dtype=torch.float32)
        output = loss_fn(c, y, evidence_verified=evid_verified)

        loss_with_evid = output.loss[0].item()
        loss_without_evid = output.loss[1].item()
        reward_with_evid = output.reward[0].item()
        reward_without_evid = output.reward[1].item()

        # Loss must be strictly higher without evidence
        assert loss_without_evid > loss_with_evid, (
            f"Loss without evidence ({loss_without_evid}) must exceed loss with evidence ({loss_with_evid})"
        )

        # Reward must be strictly lower without evidence
        assert reward_without_evid < reward_with_evid, (
            f"Reward without evidence ({reward_without_evid}) must be lower than with evidence ({reward_with_evid})"
        )

        # Evidence penalty component for verified evidence must be 0.0
        assert output.evidence_penalty[0].item() == 0.0
        assert output.evidence_penalty[1].item() > 0.0

    def test_fail_closed_validation(self):
        """
        Fail-Closed Security Gate:
        Rejects non-finite inputs, out-of-range bounds, and empty tensors.
        """
        loss_fn = CalibratedRewardLoss()

        # Empty batch rejection
        with pytest.raises(ValueError, match="Empty batch"):
            loss_fn(torch.tensor([]), torch.tensor([]))

        # NaN in confidence rejection
        with pytest.raises(ValueError, match="non-finite"):
            loss_fn(torch.tensor([float("nan")]), torch.tensor([1.0]))

        # Inf in confidence rejection
        with pytest.raises(ValueError, match="non-finite"):
            loss_fn(torch.tensor([float("inf")]), torch.tensor([1.0]))

        # NaN in targets rejection
        with pytest.raises(ValueError, match="non-finite"):
            loss_fn(torch.tensor([0.5]), torch.tensor([float("nan")]))

        # Out-of-bounds confidence (c < 0)
        with pytest.raises(ValueError, match="bounded in \\[0.0, 1.0\\]"):
            loss_fn(torch.tensor([-0.05]), torch.tensor([1.0]))

        # Out-of-bounds confidence (c > 1)
        with pytest.raises(ValueError, match="bounded in \\[0.0, 1.0\\]"):
            loss_fn(torch.tensor([1.05]), torch.tensor([1.0]))

        # Out-of-bounds targets (y < 0)
        with pytest.raises(ValueError, match="targets values must be bounded"):
            loss_fn(torch.tensor([0.5]), torch.tensor([-1.0]))

        # Out-of-bounds targets (y > 1)
        with pytest.raises(ValueError, match="targets values must be bounded"):
            loss_fn(torch.tensor([0.5]), torch.tensor([2.0]))

        # Non-finite evidence
        with pytest.raises(ValueError, match="non-finite"):
            loss_fn(torch.tensor([0.5]), torch.tensor([1.0]), evidence_verified=torch.tensor([float("nan")]))

        # Out-of-bounds evidence
        with pytest.raises(ValueError, match="evidence_verified values must be bounded"):
            loss_fn(torch.tensor([0.5]), torch.tensor([1.0]), evidence_verified=torch.tensor([1.5]))

        # Non-tensor types
        with pytest.raises(TypeError, match="must both be torch.Tensor"):
            loss_fn([0.5], [1.0])
