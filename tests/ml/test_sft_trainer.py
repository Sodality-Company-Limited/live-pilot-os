"""
Unit and integration tests for Gemma 4 Multimodal UX Supervised Fine-Tuning (SFT) Trainer.

Goal Reference: G-UX-015
Epic: UX (Multimodal UX/UI Design Decision Making Layer)
"""

import os
import sys
import json
from pathlib import Path
import pytest
import torch
import torch.nn as nn

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.sft_trainer import (
    SFTConfig,
    UXSceneGraphFormatter,
    UXChatTemplateFormatter,
    UXDecisionDataset,
    collate_sft_batch,
    SFTTrainer,
)


def create_sample_decision(decision_id="UX-DEC-0001-001", valid=True):
    """Generate a canonical decision structure for test cases."""
    if not valid:
        return {
            "schema_version": 99,
            "decision_id": "invalid_id",
            "confidence": 2.5,
        }
    return {
        "schema_version": 1,
        "decision_id": decision_id,
        "goal_id": "G-UX-015",
        "timestamp": "2026-10-14T05:00:00Z",
        "lifecycle_state": "EMIT_DECISION",
        "execution_policy": "autonomous_execute",
        "decision": {
            "summary": "Refactor checkout CTA to guarantee WCAG 2.2 AAA contrast.",
            "category": "accessibility_remediation",
            "touch_map": ["code/frontend/src/PrimaryButton.tsx"],
            "tokens_applied": {
                "bg": "bg-primary-600",
                "text": "text-content-inverted",
            },
        },
        "confidence": 0.95,
        "confidence_calibrated": True,
        "risk_level": "low",
        "evidence": [
            "code/frontend/src/PrimaryButton.tsx"
        ],
        "references": [
            {
                "reference_id": "REF-0001",
                "content_hash": "sha256:" + "a" * 64,
                "uri": "tokens/color.json",
            }
        ],
        "personas_involved": [
            "accessibility_auditor",
            "dark_pattern_ethics_watchdog",
            "design_systems_lead",
        ],
        "state_matrix": {
            "empty": {"visible": False},
            "loading": {"skeleton": True},
            "partial": {"rows": 5},
            "full": {"rows": 20},
            "error": {"retry": True},
        },
        "viewport_contract": {
            "viewports": [
                {"name": "desktop", "width": 1440, "height": 900}
            ],
            "max_overflow_px": 0,
            "cls_score": 0.0,
        },
        "verification_plan": [
            "scripts/harness/wcag-aaa-accessibility-harness.mjs"
        ],
    }


class SimpleCausalLM(nn.Module):
    """Minimal causal language model for testing training steps."""

    def __init__(self, vocab_size=256, hidden_dim=64):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, hidden_dim)
        self.linear = nn.Linear(hidden_dim, vocab_size)

    def forward(self, input_ids, attention_mask=None):
        hidden = self.embedding(input_ids)
        logits = self.linear(hidden)
        return logits


def test_scene_graph_formatter():
    sg = {
        "viewport": "desktop",
        "nodes": [
            {"id": "btn_submit", "role": "button", "bounding_box": [10, 20, 100, 40]},
            {"id": "hdr_title", "role": "heading", "bounding_box": [10, 5, 200, 30]},
        ],
        "edges": [
            {"source": "hdr_title", "target": "btn_submit", "relationship": "precedes"}
        ],
    }
    formatted = UXSceneGraphFormatter.format_scene_graph(sg)
    assert "[UI_SCENE_GRAPH: viewport=desktop, node_count=2]" in formatted
    assert "btn_submit" in formatted
    assert "hdr_title" in formatted
    assert "precedes" in formatted


def test_chat_template_formatter():
    decision = create_sample_decision()
    conv = UXChatTemplateFormatter.format_conversation(
        task_intent="Refactor layout to 7:1 contrast",
        participating_personas=["accessibility_auditor", "design_systems_lead"],
        constraints="Zero raw hex styling",
        target_decision=decision,
    )
    assert "<|system|>" in conv["prompt"]
    assert "accessibility_auditor" in conv["prompt"]
    assert "Zero raw hex styling" in conv["prompt"]
    assert "UX-DEC-0001-001" in conv["completion"]


def test_ux_decision_dataset_and_collate():
    records = [
        {
            "task_intent": "Task A",
            "participating_personas": ["p1"],
            "decision": create_sample_decision("UX-DEC-0001-001"),
        },
        {
            "task_intent": "Task B with longer prompt description",
            "participating_personas": ["p1", "p2"],
            "decision": create_sample_decision("UX-DEC-0001-002"),
        },
    ]
    dataset = UXDecisionDataset(records, max_seq_length=512)
    assert len(dataset) == 2

    sample = dataset[0]
    assert "input_ids" in sample
    assert "labels" in sample
    # Prompt tokens are masked with -100
    assert (sample["labels"] == -100).any()
    assert (sample["labels"] != -100).any()

    batch = collate_sft_batch([dataset[0], dataset[1]])
    assert batch["input_ids"].shape[0] == 2
    assert batch["labels"].shape[0] == 2
    assert batch["attention_mask"].shape[0] == 2


def test_ux_decision_dataset_non_truncated_sequence():
    """Assert UXDecisionDataset loads cleanly without UnboundLocalError on normal sequence length."""
    records = [{"task_intent": "Short Intent", "decision": {"summary": "Short decision"}}]
    dataset = UXDecisionDataset(records, max_seq_length=2048)
    sample = dataset[0]
    assert isinstance(sample["labels"], torch.Tensor)
    assert len(sample["labels"]) == len(sample["input_ids"])
    assert (sample["labels"] == -100).any()
    assert (sample["labels"] != -100).any()


def test_sft_loss_computation():
    trainer = SFTTrainer()
    vocab_size = 10
    batch_size = 2
    seq_len = 5

    logits = torch.randn(batch_size, seq_len, vocab_size)
    labels = torch.randint(0, vocab_size, (batch_size, seq_len))
    # Mask out first 2 positions
    labels[:, :2] = -100

    loss = trainer.compute_loss(logits, labels)
    assert isinstance(loss, torch.Tensor)
    assert not torch.isnan(loss)
    assert loss.item() >= 0.0

    # Test zero-unmasked tokens batch guard (returns 0.0 instead of NaN)
    labels_masked = torch.full((batch_size, seq_len), -100, dtype=torch.long)
    loss_masked = trainer.compute_loss(logits, labels_masked)
    assert not torch.isnan(loss_masked)
    assert loss_masked.item() == 0.0


def test_schema_conformance_validation():
    trainer = SFTTrainer()

    # Valid decision
    valid_dec = create_sample_decision("UX-DEC-0001-001", valid=True)
    is_valid, errs = trainer.validate_schema(valid_dec)
    assert is_valid, f"Expected valid decision, errors: {errs}"

    # Invalid decision
    invalid_dec = create_sample_decision(valid=False)
    is_valid, errs = trainer.validate_schema(invalid_dec)
    assert not is_valid
    assert len(errs) > 0

    # Cohort evaluation
    cohort = [create_sample_decision(f"UX-DEC-0001-{i:03d}") for i in range(100)]
    eval_res = trainer.evaluate_schema_conformance(cohort)
    assert eval_res["total"] == 100
    assert eval_res["conforming"] == 100
    assert eval_res["conformance_rate"] == 1.0
    assert eval_res["passed"] is True


def test_trainer_step():
    model = SimpleCausalLM(vocab_size=256, hidden_dim=32)
    config = SFTConfig(learning_rate=1e-3, device="cpu")
    trainer = SFTTrainer(model=model, config=config)

    records = [
        {
            "task_intent": "Test Intent",
            "participating_personas": ["accessibility_auditor"],
            "decision": create_sample_decision("UX-DEC-0001-001"),
        }
    ]
    dataset = UXDecisionDataset(records, max_seq_length=128)
    batch = collate_sft_batch([dataset[0]])

    optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate)
    loss_val = trainer.train_step(batch, optimizer)
    assert isinstance(loss_val, float)
    assert loss_val > 0.0
