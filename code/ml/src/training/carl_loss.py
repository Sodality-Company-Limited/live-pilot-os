"""
Calibration-Aware Reinforcement Learning (CARL) & "Rewarding Doubt" Loss.

Goal Reference: G-UX-017
Epic: UX (Multimodal UX/UI Design Decision Making Layer)

Provides:
1. CARLConfig: Hyperparameter configuration for proper scoring, overconfidence penalty,
   and doubt/deferral rewards.
2. CARLLossOutput: Structured container for all constituent loss terms and calibration metrics.
3. CARLLoss: PyTorch Module combining strictly proper Brier and logarithmic losses,
   asymmetric 10x overconfidence penalties, and justified doubt rewards.
4. Statistical Calibration Evaluators: Vectorized ECE (<= 0.05 across 10 bins),
   Brier score (<= 0.15), AUROC (>= 0.88), and HCER (<= 0.010 on c >= 0.80).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class CARLConfig:
    """Hyperparameters and safety boundaries for Calibration-Aware RL."""

    alpha_brier: float = 0.50
    lambda_cal: float = 1.0
    lambda_doubt: float = 1.0
    overconf_multiplier: float = 10.0
    overconf_threshold: float = 0.75
    defer_threshold: float = 0.75
    epsilon: float = 1e-6
    n_bins: int = 10

    # Invariant targets
    brier_ceiling: float = 0.150
    ece_ceiling: float = 0.050
    auroc_floor: float = 0.880
    hcer_ceiling: float = 0.010


@dataclass
class CARLLossOutput:
    """Container for constituent CARL loss components and detached scalars."""

    loss: torch.Tensor
    brier_loss: torch.Tensor
    log_loss: torch.Tensor
    overconfidence_penalty: torch.Tensor
    doubt_reward: torch.Tensor
    metrics: Dict[str, float] = field(default_factory=dict)

    def backward(self, *args: Any, **kwargs: Any) -> None:
        """Delegate backward pass to the composite scalar loss."""
        self.loss.backward(*args, **kwargs)


class CARLLoss(nn.Module):
    """
    Calibration-Aware Reinforcement Learning Loss Function.

    Combines:
    1. Strictly proper Brier score: (c - y*)^2
    2. Proper logarithmic scoring rule: - [y* log(c + eps) + (1 - y*) log(1 - c + eps)]
    3. Asymmetric 10x overconfidence penalty: I(y* = 0) * I(c >= 0.75) * 10.0 * c^2
    4. Rewarding Justified Doubt:
       - Reward +1.0 * (1 - c) for DEFER on ambiguous inputs
       - Penalty -2.0 * c^2 for PROCEED on ambiguous inputs
       - Penalty -0.5 * (1 - c) for DEFER on unambiguous correct inputs (false deferral)
    """

    def __init__(self, config: Optional[CARLConfig] = None) -> None:
        super().__init__()
        self.config = config or CARLConfig()

    def forward(
        self,
        confidence: torch.Tensor,
        targets: torch.Tensor,
        actions: Optional[List[str]] = None,
        is_ambiguous: Optional[torch.Tensor] = None,
    ) -> CARLLossOutput:
        """
        Compute the composite CARL objective.
        
        Args:
            confidence: [batch_size] or [batch_size, 1] tensor in [0.0, 1.0]
            targets: [batch_size] ground-truth binary correctness indicators in {0.0, 1.0}
            actions: List of action strings per sample (e.g. 'PROCEED', 'DEFER', 'REJECT_AS_UNSAFE')
            is_ambiguous: [batch_size] boolean tensor indicating ambiguous/colliding design context
        """
        conf = confidence.view(-1)
        y = targets.view(-1).float()
        batch_size = conf.size(0)

        # 1. Strictly Proper Brier Score Loss
        brier = torch.mean((conf - y) ** 2)

        # 2. Strictly Proper Logarithmic Scoring Rule
        eps = self.config.epsilon
        clamped_conf = torch.clamp(conf, eps, 1.0 - eps)
        log_loss = -torch.mean(y * torch.log(clamped_conf) + (1.0 - y) * torch.log(1.0 - clamped_conf))

        # Balanced proper calibration loss
        proper_cal_loss = self.config.alpha_brier * brier + (1.0 - self.config.alpha_brier) * log_loss

        # 3. Asymmetric 10x Overconfidence Penalty
        # Active only when target is wrong (y = 0) AND confidence is high (c >= 0.75)
        overconf_mask = (y == 0.0) & (conf >= self.config.overconf_threshold)
        overconf_penalty = torch.zeros_like(conf)
        if overconf_mask.any():
            overconf_penalty[overconf_mask] = self.config.overconf_multiplier * (conf[overconf_mask] ** 2)
        mean_overconf_penalty = torch.mean(overconf_penalty)

        # 4. Rewarding Justified Doubt / Deferral
        doubt_losses = torch.zeros_like(conf)
        if actions is not None:
            ambig = is_ambiguous.view(-1) if is_ambiguous is not None else torch.zeros(batch_size, dtype=torch.bool, device=conf.device)
            for i in range(batch_size):
                act = actions[i].upper()
                c_i = conf[i]
                amb_i = bool(ambig[i].item())
                y_i = float(y[i].item())

                if amb_i:
                    if act == "DEFER":
                        # Positive reward for justified deferral -> negative loss
                        doubt_losses[i] = -1.0 * (1.0 - c_i)
                    elif act == "PROCEED":
                        # Heavy penalty for proceeding on ambiguous input
                        doubt_losses[i] = 2.0 * (c_i ** 2)
                else:
                    if act == "DEFER" and y_i == 1.0:
                        # False deferral penalty
                        doubt_losses[i] = 0.5 * (1.0 - c_i)

        mean_doubt_loss = torch.mean(doubt_losses)

        # Composite total loss
        total_loss = (
            self.config.lambda_cal * proper_cal_loss
            + mean_overconf_penalty
            + self.config.lambda_doubt * mean_doubt_loss
        )

        metrics = {
            "total_loss": float(total_loss.detach().item()),
            "brier_loss": float(brier.detach().item()),
            "log_loss": float(log_loss.detach().item()),
            "proper_cal_loss": float(proper_cal_loss.detach().item()),
            "overconf_penalty": float(mean_overconf_penalty.detach().item()),
            "doubt_loss": float(mean_doubt_loss.detach().item()),
        }

        return CARLLossOutput(
            loss=total_loss,
            brier_loss=brier,
            log_loss=log_loss,
            overconfidence_penalty=mean_overconf_penalty,
            doubt_reward=-mean_doubt_loss,
            metrics=metrics,
        )

    @staticmethod
    def compute_brier(confidences: torch.Tensor, targets: torch.Tensor) -> float:
        """Calculate Brier score: mean((c - y)^2)."""
        c = confidences.view(-1).float()
        y = targets.view(-1).float()
        return float(torch.mean((c - y) ** 2).item())

    @staticmethod
    def compute_ece(
        confidences: torch.Tensor, targets: torch.Tensor, n_bins: int = 10
    ) -> float:
        """
        Calculate Expected Calibration Error across n_bins equal-width intervals.
        ECE = sum_{m=1}^M (|B_m| / N) * |acc(B_m) - conf(B_m)|
        """
        c = confidences.view(-1).float()
        y = targets.view(-1).float()
        n = c.size(0)
        if n == 0:
            return 0.0

        bin_boundaries = torch.linspace(0.0, 1.0, n_bins + 1, device=c.device)
        ece = torch.tensor(0.0, device=c.device)

        for i in range(n_bins):
            bin_lower = bin_boundaries[i]
            bin_upper = bin_boundaries[i + 1]

            if i == 0:
                in_bin = (c >= bin_lower) & (c <= bin_upper)
            else:
                in_bin = (c > bin_lower) & (c <= bin_upper)

            bin_size = in_bin.sum()
            if bin_size > 0:
                bin_acc = y[in_bin].float().mean()
                bin_conf = c[in_bin].mean()
                bin_weight = bin_size.float() / float(n)
                ece += bin_weight * torch.abs(bin_acc - bin_conf)

        return float(ece.item())

    @staticmethod
    def compute_auroc(confidences: torch.Tensor, targets: torch.Tensor) -> float:
        """
        Calculate Area Under the ROC Curve (AUROC) using Mann-Whitney U statistic.
        Separates correct predictions (y = 1) from incorrect predictions (y = 0).
        """
        c = confidences.view(-1).float()
        y = targets.view(-1).float()

        pos_scores = c[y == 1.0]
        neg_scores = c[y == 0.0]

        n_pos = pos_scores.size(0)
        n_neg = neg_scores.size(0)

        if n_pos == 0 or n_neg == 0:
            return 1.0

        # Vectorized pairwise comparison
        # pos_scores: [N_pos, 1], neg_scores: [1, N_neg]
        diffs = pos_scores.unsqueeze(1) - neg_scores.unsqueeze(0)
        concordant = (diffs > 0).float().sum()
        ties = (diffs == 0).float().sum()

        auroc = (concordant + 0.5 * ties) / (float(n_pos) * float(n_neg))
        return float(auroc.item())

    @staticmethod
    def compute_hcer(
        confidences: torch.Tensor, targets: torch.Tensor, threshold: float = 0.80
    ) -> float:
        """
        High-Confidence Error Rate:
        HCER = |{i : c_i >= threshold and y_i = 0}| / |{i : c_i >= threshold}|
        """
        c = confidences.view(-1).float()
        y = targets.view(-1).float()

        high_conf_mask = c >= threshold
        high_conf_count = high_conf_mask.sum().item()

        if high_conf_count == 0:
            return 0.0

        errors_in_high_conf = ((y == 0.0) & high_conf_mask).sum().item()
        return float(errors_in_high_conf / high_conf_count)

    def evaluate_calibration(
        self, confidences: torch.Tensor, targets: torch.Tensor
    ) -> Dict[str, Any]:
        """
        Evaluate full calibration battery and assert whether all 4 statistical invariants pass:
        1. Brier score <= 0.150
        2. ECE <= 0.050
        3. AUROC >= 0.880
        4. HCER <= 0.010
        """
        brier = self.compute_brier(confidences, targets)
        ece = self.compute_ece(confidences, targets, self.config.n_bins)
        auroc = self.compute_auroc(confidences, targets)
        hcer = self.compute_hcer(confidences, targets, threshold=0.80)

        passed = (
            brier <= self.config.brier_ceiling
            and ece <= self.config.ece_ceiling
            and auroc >= self.config.auroc_floor
            and hcer <= self.config.hcer_ceiling
        )

        return {
            "brier": brier,
            "brier_ceiling": self.config.brier_ceiling,
            "brier_passed": brier <= self.config.brier_ceiling,
            "ece": ece,
            "ece_ceiling": self.config.ece_ceiling,
            "ece_passed": ece <= self.config.ece_ceiling,
            "auroc": auroc,
            "auroc_floor": self.config.auroc_floor,
            "auroc_passed": auroc >= self.config.auroc_floor,
            "hcer": hcer,
            "hcer_ceiling": self.config.hcer_ceiling,
            "hcer_passed": hcer <= self.config.hcer_ceiling,
            "passed": passed,
        }
