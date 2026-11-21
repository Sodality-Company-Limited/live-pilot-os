"""
Unit and integration tests for Multimodal Direct Preference Optimization (DPO) Trainer.

Goal Reference: G-UX-016
Epic: UX (Multimodal UX/UI Design Decision Making Layer)
"""

import os
import sys
import math
import pytest
import torch
import torch.nn as nn

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.dpo_trainer import (
    DPOTrainerConfig,
    DPOLoss,
    PreferenceDataset,
    collate_preference_batch,
    DPOTrainer,
)


class SimpleDPOBackbone(nn.Module):
    """Simple language model backbone for testing DPO trainer."""

    def __init__(self, vocab_size=256, hidden_dim=32):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, hidden_dim)
        self.head = nn.Linear(hidden_dim, vocab_size)

    def forward(self, input_ids, attention_mask=None, **kwargs):
        h = self.embed(input_ids)
        return self.head(h)


def test_dpo_loss_module():
    loss_fn = DPOLoss(beta=0.20)

    # Policy prefers chosen
    policy_chosen = torch.tensor([-5.0, -6.0])
    policy_rejected = torch.tensor([-15.0, -14.0])
    ref_chosen = torch.tensor([-10.0, -10.0])
    ref_rejected = torch.tensor([-10.0, -10.0])

    loss, metrics = loss_fn(policy_chosen, policy_rejected, ref_chosen, ref_rejected)
    assert isinstance(loss, torch.Tensor)
    assert not torch.isnan(loss)
    assert loss.item() < 0.693  # log(2)
    assert metrics["accuracy"].item() == 1.0
    assert metrics["reward_margin"].item() > 0.0


def test_dpo_loss_rejects_invalid_beta():
    with pytest.raises(ValueError, match="beta must be strictly positive"):
        DPOLoss(beta=-0.1)


def test_preference_dataset_and_collate():
    pairs = [
        {
            "pair_id": "PAIR-001",
            "prompt": "Design CTA button",
            "chosen": {"text": "<PrimaryButton>Submit</PrimaryButton>"},
            "rejected": {"text": "<button>Submit</button>"},
        },
        {
            "pair_id": "PAIR-002",
            "prompt": "Accessible Modal dialog",
            "chosen": {"text": "<Modal aria-modal='true'>Content</Modal>"},
            "rejected": {"text": "<div class='modal'>Content</div>"},
        },
    ]

    dataset = PreferenceDataset(pairs, max_seq_length=128)
    assert len(dataset) == 2

    item = dataset[0]
    assert "chosen_input_ids" in item
    assert "rejected_input_ids" in item
    assert item["prompt_length"] > 0

    batch = collate_preference_batch([dataset[0], dataset[1]])
    assert batch["chosen_input_ids"].shape[0] == 2
    assert batch["rejected_input_ids"].shape[0] == 2
    assert batch["prompt_lengths"].shape[0] == 2


def test_reference_model_freeze():
    policy = SimpleDPOBackbone()
    ref = SimpleDPOBackbone()

    trainer = DPOTrainer(policy_model=policy, reference_model=ref)

    # Reference model parameters must be completely frozen
    for p in trainer.reference_model.parameters():
        assert p.requires_grad is False
    assert trainer.reference_model.training is False

    # Policy model parameters must be trainable
    has_trainable = any(p.requires_grad for p in trainer.policy_model.parameters())
    assert has_trainable is True


def test_dpo_train_step():
    policy = SimpleDPOBackbone()
    ref = SimpleDPOBackbone()
    config = DPOTrainerConfig(beta=0.20, learning_rate=1e-3, device="cpu")
    trainer = DPOTrainer(policy_model=policy, reference_model=ref, config=config)

    pairs = [
        {
            "pair_id": "PAIR-001",
            "prompt": "Design prompt",
            "chosen": {"text": "Good decision"},
            "rejected": {"text": "Bad decision"},
        }
    ]
    dataset = PreferenceDataset(pairs, max_seq_length=64)
    batch = collate_preference_batch([dataset[0]])

    optimizer = torch.optim.AdamW(policy.parameters(), lr=config.learning_rate)
    step_metrics = trainer.train_step(batch, optimizer)

    assert "loss" in step_metrics
    assert not math.isnan(step_metrics["loss"])
    assert "reward_margin" in step_metrics


def test_win_rate_evaluation_threshold():
    trainer = DPOTrainer()
    test_pairs = [
        {
            "preference_delta": {"contrast_margin": 8.0, "accessibility_score_delta": 0.4}
        }
        for _ in range(100)
    ]
    # Add a few low scoring pairs to test margin calculation
    test_pairs.extend([
        {
            "preference_delta": {"contrast_margin": -5.0, "accessibility_score_delta": -0.8}
        }
        for _ in range(20)
    ] )

    eval_result = trainer.evaluate_win_rate(test_pairs)
    assert eval_result["total"] == 120
    assert eval_result["wins"] >= 80
    assert eval_result["win_rate"] >= 0.680
    assert eval_result["passed"] is True
