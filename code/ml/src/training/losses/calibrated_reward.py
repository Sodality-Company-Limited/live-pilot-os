"""
Calibrated RLCD Reward and Asymmetric Loss Function Module.

Goal Reference: G-ML-006
Epic: ML (Machine Learning & Cognitive Calibration)

Implements the mathematical loss class combining:
1. Proper logarithmic scoring loss: - [y* log(c) + (1 - y*) log(1 - c)]
2. Asymmetric quadratic overconfidence penalties: alpha * I[y* == 0] * c^2
3. Brier distance regularization: lambda_brier * (c - y*)^2
4. Evidence-penalty scaling: lambda_evidence * (1 - e) * c

Guarantees that autonomous agents are severely penalized for confident errors,
while being incentivized to output well-calibrated uncertainty estimates.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any, Union
import torch
import torch.nn as nn


@dataclass
class CalibratedRewardOutput:
    """Structured container for calibrated reward and loss components."""
    loss: torch.Tensor
    proper_loss: torch.Tensor
    overconfidence_penalty: torch.Tensor
    brier_loss: torch.Tensor
    evidence_penalty: torch.Tensor
    reward: torch.Tensor

    def __getitem__(self, item: str) -> torch.Tensor:
        if item in ("loss", "total_loss"):
            return self.loss
        elif item in ("proper_loss", "log_loss"):
            return self.proper_loss
        elif item in ("overconfidence_penalty", "penalty"):
            return self.overconfidence_penalty
        elif item in ("brier_loss", "brier"):
            return self.brier_loss
        elif item in ("evidence_penalty", "evidence"):
            return self.evidence_penalty
        elif item == "reward":
            return self.reward
        raise KeyError(f"Unknown key: {item}")

    def backward(self, *args, **kwargs):
        """Delegate backward pass directly to the scalar total loss."""
        return self.loss.backward(*args, **kwargs)

    def as_dict(self) -> Dict[str, float]:
        """Convert scalar loss components to a standard Python dictionary."""
        return {
            "loss": float(self.loss.detach().item()) if self.loss.numel() == 1 else [float(x) for x in self.loss.detach().cpu().numpy().flatten()],
            "proper_loss": float(self.proper_loss.detach().item()) if self.proper_loss.numel() == 1 else [float(x) for x in self.proper_loss.detach().cpu().numpy().flatten()],
            "overconfidence_penalty": float(self.overconfidence_penalty.detach().item()) if self.overconfidence_penalty.numel() == 1 else [float(x) for x in self.overconfidence_penalty.detach().cpu().numpy().flatten()],
            "brier_loss": float(self.brier_loss.detach().item()) if self.brier_loss.numel() == 1 else [float(x) for x in self.brier_loss.detach().cpu().numpy().flatten()],
            "evidence_penalty": float(self.evidence_penalty.detach().item()) if self.evidence_penalty.numel() == 1 else [float(x) for x in self.evidence_penalty.detach().cpu().numpy().flatten()],
            "reward": float(self.reward.detach().item()) if self.reward.numel() == 1 else [float(x) for x in self.reward.detach().cpu().numpy().flatten()],
        }


class CalibratedRewardLoss(nn.Module):
    """
    Calibrated RLCD Reward and Asymmetric Loss Function.

    Computes:
        L_total = L_proper + L_overconf + L_brier + L_evidence
        R_calib = - L_total

    Where:
        L_proper = - [y* log(c_clamped) + (1 - y*) log(1 - c_clamped)]
        L_overconf = alpha * (1 - y*) * c^2
        L_brier = lambda_brier * (c - y*)^2
        L_evidence = lambda_evidence * (1 - e) * c

    Args:
        alpha_overconfidence: Penalty weight for confident incorrect decisions (default: 2.0).
        lambda_brier: Weight for Brier quadratic distance regularization (default: 0.1).
        lambda_evidence: Weight for unverified evidence penalty (default: 0.5).
        epsilon: Epsilon clamping threshold to avoid log(0) numerical explosion (default: 1e-7).
        reduction: Loss reduction mode: 'mean', 'sum', or 'none' (default: 'mean').
    """

    def __init__(
        self,
        alpha_overconfidence: float = 2.0,
        lambda_brier: float = 0.1,
        lambda_evidence: float = 0.5,
        epsilon: float = 1e-7,
        reduction: str = "mean",
    ):
        super().__init__()
        if alpha_overconfidence < 0.0:
            raise ValueError(f"alpha_overconfidence must be non-negative, got {alpha_overconfidence}")
        if lambda_brier < 0.0:
            raise ValueError(f"lambda_brier must be non-negative, got {lambda_brier}")
        if lambda_evidence < 0.0:
            raise ValueError(f"lambda_evidence must be non-negative, got {lambda_evidence}")
        if epsilon <= 0.0 or epsilon >= 0.5:
            raise ValueError(f"epsilon must be in (0, 0.5), got {epsilon}")
        if reduction not in ("mean", "sum", "none"):
            raise ValueError(f"Unsupported reduction: {reduction}. Must be 'mean', 'sum', or 'none'.")

        self.alpha_overconfidence = float(alpha_overconfidence)
        self.lambda_brier = float(lambda_brier)
        self.lambda_evidence = float(lambda_evidence)
        self.epsilon = float(epsilon)
        self.reduction = reduction

    def forward(
        self,
        confidence: torch.Tensor,
        targets: torch.Tensor,
        evidence_verified: Optional[torch.Tensor] = None,
    ) -> CalibratedRewardOutput:
        """
        Forward pass computing proper scoring loss, asymmetric overconfidence penalty,
        Brier regularization, and evidence scaling.

        Args:
            confidence: Predicted probability tensor with values in [0.0, 1.0].
            targets: Target label tensor with values in {0, 1} or [0.0, 1.0].
            evidence_verified: Optional evidence verification tensor in {0, 1} or [0.0, 1.0].
                              Defaults to all 1.0 (verified).

        Returns:
            CalibratedRewardOutput containing loss components and equivalent reward.
        """
        if not isinstance(confidence, torch.Tensor) or not isinstance(targets, torch.Tensor):
            raise TypeError("confidence and targets must both be torch.Tensor instances.")

        if confidence.numel() == 0 or targets.numel() == 0:
            raise ValueError("Empty batch: confidence and targets must contain at least 1 element.")

        # Check for non-finite inputs
        if torch.isnan(confidence).any() or torch.isinf(confidence).any():
            raise ValueError("Input confidence tensor contains non-finite values (NaN or Inf).")
        if torch.isnan(targets).any() or torch.isinf(targets).any():
            raise ValueError("Input targets tensor contains non-finite values (NaN or Inf).")

        # Range validation: probabilities must be bounded in [0.0, 1.0]
        if (confidence < 0.0).any() or (confidence > 1.0).any():
            raise ValueError("confidence values must be strictly bounded in [0.0, 1.0].")
        if (targets < 0.0).any() or (targets > 1.0).any():
            raise ValueError("targets values must be bounded in [0.0, 1.0].")

        # Handle evidence validation if provided
        if evidence_verified is not None:
            if not isinstance(evidence_verified, torch.Tensor):
                raise TypeError("evidence_verified must be a torch.Tensor when provided.")
            if torch.isnan(evidence_verified).any() or torch.isinf(evidence_verified).any():
                raise ValueError("evidence_verified contains non-finite values (NaN or Inf).")
            if (evidence_verified < 0.0).any() or (evidence_verified > 1.0).any():
                raise ValueError("evidence_verified values must be bounded in [0.0, 1.0].")

        # Align shapes if needed
        if confidence.shape != targets.shape:
            confidence, targets = torch.broadcast_tensors(confidence, targets)

        # Clamping for strictly proper logarithmic scoring rule
        c_clamped = torch.clamp(confidence, min=self.epsilon, max=1.0 - self.epsilon)

        # 1. Proper logarithmic scoring loss (negative log-likelihood)
        proper_loss = - (targets * torch.log(c_clamped) + (1.0 - targets) * torch.log(1.0 - c_clamped))

        # 2. Asymmetric quadratic overconfidence penalty:
        # Applied to incorrect predictions (1 - targets) scaling with confidence^2
        overconfidence_penalty = self.alpha_overconfidence * (1.0 - targets) * (confidence ** 2)

        # 3. Brier distance regularization: (c - y*)^2
        brier_loss = self.lambda_brier * ((confidence - targets) ** 2)

        # 4. Evidence-penalty scaling:
        # Penalizes asserting confidence without verified evidence
        if evidence_verified is not None:
            if evidence_verified.shape != confidence.shape:
                evidence_verified, _ = torch.broadcast_tensors(evidence_verified.to(confidence.dtype), confidence)
            else:
                evidence_verified = evidence_verified.to(confidence.dtype)
            evidence_penalty = self.lambda_evidence * (1.0 - evidence_verified) * confidence
        else:
            evidence_penalty = torch.zeros_like(confidence)

        # Composite elementwise loss and scalar reward
        total_loss = proper_loss + overconfidence_penalty + brier_loss + evidence_penalty
        reward = - total_loss

        # Apply reduction
        if self.reduction == "mean":
            return CalibratedRewardOutput(
                loss=total_loss.mean(),
                proper_loss=proper_loss.mean(),
                overconfidence_penalty=overconfidence_penalty.mean(),
                brier_loss=brier_loss.mean(),
                evidence_penalty=evidence_penalty.mean(),
                reward=reward.mean(),
            )
        elif self.reduction == "sum":
            return CalibratedRewardOutput(
                loss=total_loss.sum(),
                proper_loss=proper_loss.sum(),
                overconfidence_penalty=overconfidence_penalty.sum(),
                brier_loss=brier_loss.sum(),
                evidence_penalty=evidence_penalty.sum(),
                reward=reward.sum(),
            )
        else:  # "none"
            return CalibratedRewardOutput(
                loss=total_loss,
                proper_loss=proper_loss,
                overconfidence_penalty=overconfidence_penalty,
                brier_loss=brier_loss,
                evidence_penalty=evidence_penalty,
                reward=reward,
            )
