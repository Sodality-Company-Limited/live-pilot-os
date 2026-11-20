"""
Unit and integration tests for Calibration-Aware RL (CARL) & "Rewarding Doubt" Loss.

Goal Reference: G-UX-017
Epic: UX (Multimodal UX/UI Design Decision Making Layer)
"""

import os
import sys
import pytest
import torch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.carl_loss import (
    CARLConfig,
    CARLLossOutput,
    CARLLoss,
)


def test_carl_loss_forward_and_backward():
    carl = CARLLoss()
    conf = torch.tensor([0.90, 0.85, 0.30, 0.20], requires_grad=True)
    targets = torch.tensor([1.0, 1.0, 0.0, 0.0])
    actions = ["PROCEED", "PROCEED", "DEFER", "DEFER"]
    is_ambiguous = torch.tensor([False, False, True, True])

    output = carl(conf, targets, actions=actions, is_ambiguous=is_ambiguous)

    assert isinstance(output, CARLLossOutput)
    assert not torch.isnan(output.loss)
    assert isinstance(output.loss.item(), float)

    # Test backward gradient propagation
    output.backward()
    assert conf.grad is not None
    assert not torch.isnan(conf.grad).any()


def test_asymmetric_10x_overconfidence_penalty():
    carl = CARLLoss()

    # Case 1: Wrong prediction with high confidence (c = 0.90 >= 0.75, y = 0)
    conf_bad = torch.tensor([0.90])
    targets_bad = torch.tensor([0.0])
    out_bad = carl(conf_bad, targets_bad)
    expected_penalty = 10.0 * (0.90 ** 2)
    assert abs(out_bad.overconfidence_penalty.item() - expected_penalty) < 1e-4

    # Case 2: Correct prediction with high confidence (c = 0.90, y = 1) -> penalty = 0
    conf_good = torch.tensor([0.90])
    targets_good = torch.tensor([1.0])
    out_good = carl(conf_good, targets_good)
    assert out_good.overconfidence_penalty.item() == 0.0

    # Case 3: Wrong prediction with low confidence (c = 0.60 < 0.75, y = 0) -> penalty = 0
    conf_low = torch.tensor([0.60])
    targets_low = torch.tensor([0.0])
    out_low = carl(conf_low, targets_low)
    assert out_low.overconfidence_penalty.item() == 0.0


def test_rewarding_justified_doubt():
    carl = CARLLoss()

    # Defer on ambiguous input
    conf = torch.tensor([0.30])
    targets = torch.tensor([0.0])
    out_defer = carl(conf, targets, actions=["DEFER"], is_ambiguous=torch.tensor([True]))
    assert out_defer.doubt_reward.item() > 0.0, "Doubt reward should be positive for DEFER on ambiguous input"

    # Proceed on ambiguous input
    out_proceed = carl(conf, targets, actions=["PROCEED"], is_ambiguous=torch.tensor([True]))
    assert out_proceed.doubt_reward.item() < 0.0, "Doubt reward should be negative (penalty) for PROCEED on ambiguous input"


def test_statistical_calibration_metrics():
    carl = CARLLoss()

    # Perfect predictions: confidence matches outcome exactly
    conf = torch.tensor([0.95, 0.95, 0.05, 0.05])
    targets = torch.tensor([1.0, 1.0, 0.0, 0.0])

    brier = carl.compute_brier(conf, targets)
    assert brier < 0.01

    ece = carl.compute_ece(conf, targets, n_bins=10)
    assert ece < 0.06

    auroc = carl.compute_auroc(conf, targets)
    assert auroc == 1.0

    hcer = carl.compute_hcer(conf, targets, threshold=0.80)
    assert hcer == 0.0


def test_calibration_battery_evaluation_pass():
    carl = CARLLoss()

    # Synthesize distribution satisfying all 4 invariants
    # 700 high confidence samples (c = 0.96) with 5 errors -> HCER = 5/700 = 0.0071 <= 0.010, acc = 0.9928, |acc-conf| = 0.0328 <= 0.050
    high_conf = torch.full((700,), 0.96)
    high_targets = torch.ones(700)
    high_targets[:5] = 0.0

    med_high_conf = torch.full((100,), 0.70)
    med_high_targets = torch.zeros(100)
    med_high_targets[:70] = 1.0

    med_conf = torch.full((100,), 0.50)
    med_targets = torch.zeros(100)
    med_targets[:50] = 1.0

    low_conf = torch.full((100,), 0.20)
    low_targets = torch.zeros(100)
    low_targets[:20] = 1.0

    all_conf = torch.cat([high_conf, med_high_conf, med_conf, low_conf])
    all_targets = torch.cat([high_targets, med_high_targets, med_targets, low_targets])

    eval_res = carl.evaluate_calibration(all_conf, all_targets)

    assert eval_res["brier"] <= 0.150
    assert eval_res["ece"] <= 0.050
    assert eval_res["auroc"] >= 0.880
    assert eval_res["hcer"] <= 0.010
    assert eval_res["passed"] is True
