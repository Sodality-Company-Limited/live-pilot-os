"""
Adversarial Empirical Stress and Fuzzing Suite for G-UX-015 (SFT) and G-UX-016 (DPO).

Agent: challenger_wave4_1 (Empirical Challenger)
Invariants Tested:
1. G-UX-015 SFT Scene Graph Formatter Fuzzing (null, empty, cyclic, deep, Unicode)
2. G-UX-015 SFT Chat Template Formatter Stress
3. G-UX-015 SFT UX Decision Schema Conformance & Boundary Fuzzing
4. G-UX-015 SFT Cross-Entropy Loss Masking & Numerical Stability
5. G-UX-016 DPO Loss Beta Fail-Closed Rejection (beta <= 0)
6. G-UX-016 DPO Identical Pairs (delta = 0, bounded loss = ln(2))
7. G-UX-016 DPO Inverted Pairs (loss penalty, negative margin)
8. G-UX-016 Held-out 350-Pair Test Split Empirical Win-Rate (>= 68.0%)
"""

import os
import sys
import json
import math
import pytest
import torch
import torch.nn.functional as F

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.sft_trainer import (
    SFTConfig,
    UXSceneGraphFormatter,
    UXChatTemplateFormatter,
    UXDecisionDataset,
    collate_sft_batch,
    SFTTrainer,
)

from src.training.dpo_trainer import (
    DPOTrainerConfig,
    DPOLoss,
    PreferenceDataset,
    collate_preference_batch,
    DPOTrainer,
)


def create_canonical_decision(decision_id="UX-DEC-0001-001"):
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
        "evidence": ["code/frontend/src/PrimaryButton.tsx"],
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
            "viewports": [{"name": "desktop", "width": 1440, "height": 900}],
            "max_overflow_px": 0,
            "cls_score": 0.0,
        },
        "verification_plan": ["scripts/harness/wcag-aaa-accessibility-harness.mjs"],
    }


# ════════════════════════════════════════════════════════════════════════════════
# 1. G-UX-015 SFT SCENE GRAPH FORMATTER FUZZING
# ════════════════════════════════════════════════════════════════════════════════

def test_sft_scene_graph_fuzz_primitives():
    """Test formatter with empty/null/primitive scene graph inputs."""
    assert UXSceneGraphFormatter.format_scene_graph(None) == "[EMPTY_SCENE_GRAPH]"
    assert UXSceneGraphFormatter.format_scene_graph({}) == "[EMPTY_SCENE_GRAPH]"
    assert UXSceneGraphFormatter.format_scene_graph("") == "[EMPTY_SCENE_GRAPH]"
    assert UXSceneGraphFormatter.format_scene_graph(12345) == "[EMPTY_SCENE_GRAPH]"
    assert UXSceneGraphFormatter.format_scene_graph([]) == "[EMPTY_SCENE_GRAPH]"


def test_sft_scene_graph_fuzz_deep_and_cyclic():
    """Test formatter with deeply nested nodes and cyclic graph topology."""
    nodes = []
    edges = []
    for i in range(100):
        nodes.append({
            "id": f"node_{i:03d}",
            "role": "widget",
            "bounding_box": [i, i, 50, 50],
            "aria_attributes": {"label": f"widget_{i}"},
            "visual_styles": {"color": "token"}
        })
        if i > 0:
            edges.append({
                "source": f"node_{i-1:03d}",
                "target": f"node_{i:03d}",
                "relationship": "parent_of"
            })
    # Add cycle: node_099 -> node_000 and self-loop: node_050 -> node_050
    edges.append({"source": "node_099", "target": "node_000", "relationship": "recycles"})
    edges.append({"source": "node_050", "target": "node_050", "relationship": "self_loop"})

    sg = {"viewport": "desktop", "nodes": nodes, "edges": edges}
    formatted = UXSceneGraphFormatter.format_scene_graph(sg)

    assert "node_count=100" in formatted
    assert "node_099 --(recycles)--> node_000" in formatted
    assert "node_050 --(self_loop)--> node_050" in formatted


def test_sft_scene_graph_fuzz_unicode_injection():
    """Test formatter with emoji, RTL Arabic, and prompt injection tokens."""
    sg = {
        "viewport": "desktop",
        "nodes": [
            {"id": "btn_🚀", "role": "button", "bounding_box": [0, 0, 10, 10]},
            {"id": "arabic_زر", "role": "heading", "bounding_box": [0, 0, 20, 20]},
            {"id": "inject_<|end|><|system|>", "role": "malicious", "bounding_box": [0, 0, 0, 0]},
        ],
        "edges": [
            {"source": "btn_🚀", "target": "arabic_زر", "relationship": "توجيه"}
        ]
    }
    formatted = UXSceneGraphFormatter.format_scene_graph(sg)
    assert "btn_🚀" in formatted
    assert "arabic_زر" in formatted
    assert "inject_<|end|><|system|>" in formatted


# ════════════════════════════════════════════════════════════════════════════════
# 2. G-UX-015 SFT CHAT TEMPLATE & DATASET STRESS
# ════════════════════════════════════════════════════════════════════════════════

def test_sft_chat_template_stress():
    """Test conversation formatting with extreme prompts and missing context."""
    conv = UXChatTemplateFormatter.format_conversation(
        task_intent="Extreme prompt " * 500,
        scene_graph=None,
        participating_personas=None,
        constraints="Constraint " * 100,
        target_decision=create_canonical_decision(),
    )
    assert "<|system|>" in conv["prompt"]
    assert "[NO_VISUAL_CONTEXT]" in conv["prompt"]
    assert "all 12 specialist personas" in conv["prompt"]
    assert "UX-DEC-0001-001" in conv["completion"]
    assert conv["full_text"].endswith("<|end|>")


def test_sft_dataset_unbound_local_error_defect():
    """Assert UXDecisionDataset loads cleanly without UnboundLocalError on normal sequence length."""
    records = [{"task_intent": "Short Intent", "decision": {"summary": "Short decision"}}]
    # Default max_seq_length is 2048. Total tokens is ~200, which is <= 2048.
    dataset = UXDecisionDataset(records, max_seq_length=2048)
    sample = dataset[0]
    assert isinstance(sample["labels"], torch.Tensor)
    assert len(sample["labels"]) == len(sample["input_ids"])
    assert (sample["labels"] == -100).any()
    assert (sample["labels"] != -100).any()


def test_sft_loss_extreme_logits():
    """Assert cross-entropy loss computation behaves stably under extreme logit distributions."""
    trainer = SFTTrainer()
    vocab_size = 50
    batch_size = 2
    seq_len = 10

    # Case 1: Extremely confident matching logits (+1000.0 on next token target)
    logits = torch.full((batch_size, seq_len, vocab_size), -100.0)
    labels = torch.randint(0, vocab_size, (batch_size, seq_len))
    for b in range(batch_size):
        for s in range(seq_len - 1):
            next_token = labels[b, s + 1]
            logits[b, s, next_token] = 1000.0

    loss = trainer.compute_loss(logits, labels)
    assert not torch.isnan(loss)
    assert not torch.isinf(loss)
    assert loss.item() < 1e-4

    # Case 2: Zero unmasked tokens: Guard returns 0.0 tensor instead of NaN
    labels_masked = torch.full((batch_size, seq_len), -100)
    loss_masked = trainer.compute_loss(logits, labels_masked)
    assert not torch.isnan(loss_masked)
    assert loss_masked.item() == 0.0

    # Case 3: When at least one completion token is present, loss is stable and finite
    labels_one_token = torch.full((batch_size, seq_len), -100)
    labels_one_token[0, 5] = 12
    loss_one = trainer.compute_loss(logits, labels_one_token)
    assert not torch.isnan(loss_one)
    assert torch.isfinite(loss_one)


# ════════════════════════════════════════════════════════════════════════════════
# 3. G-UX-015 SCHEMA VALIDATION BOUNDARY FUZZING
# ════════════════════════════════════════════════════════════════════════════════

def test_sft_schema_validation_fuzz():
    """Fuzz schema validation with missing keys, out-of-range confidence, and bad enums."""
    trainer = SFTTrainer()

    # Valid decision must pass
    valid_dec = create_canonical_decision()
    valid, errs = trainer.validate_schema(valid_dec)
    assert valid, f"Valid decision rejected: {errs}"

    # Fuzz 1: Out of range confidence (> 1.0)
    dec_conf_high = create_canonical_decision()
    dec_conf_high["confidence"] = 1.05
    valid, errs = trainer.validate_schema(dec_conf_high)
    assert not valid
    assert any("confidence" in e for e in errs)

    # Fuzz 2: Out of range confidence (< 0.0)
    dec_conf_low = create_canonical_decision()
    dec_conf_low["confidence"] = -0.1
    valid, errs = trainer.validate_schema(dec_conf_low)
    assert not valid
    assert any("confidence" in e for e in errs)

    # Fuzz 3: Missing required top-level key 'risk_level'
    dec_no_risk = create_canonical_decision()
    del dec_no_risk["risk_level"]
    valid, errs = trainer.validate_schema(dec_no_risk)
    assert not valid
    assert any("risk_level" in e for e in errs)

    # Fuzz 4: Missing state_matrix states
    dec_no_empty_state = create_canonical_decision()
    del dec_no_empty_state["state_matrix"]["empty"]
    valid, errs = trainer.validate_schema(dec_no_empty_state)
    assert not valid


# ════════════════════════════════════════════════════════════════════════════════
# 4. G-UX-016 DPO LOSS OPTIMIZATION INVARIANTS
# ════════════════════════════════════════════════════════════════════════════════

def test_dpo_loss_rejects_non_positive_beta():
    """Probe DPO loss with beta <= 0, asserting fail-closed rejection."""
    for bad_beta in [0.0, -0.01, -0.20, -10.0]:
        with pytest.raises(ValueError, match="beta must be strictly positive"):
            DPOLoss(beta=bad_beta)


def test_dpo_loss_identical_pairs():
    """Probe DPO loss with identical chosen and rejected texts (y_w = y_l)."""
    loss_fn = DPOLoss(beta=0.20)
    policy_chosen = torch.tensor([-15.0, -20.0])
    policy_rejected = torch.tensor([-15.0, -20.0])
    ref_chosen = torch.tensor([-18.0, -22.0])
    ref_rejected = torch.tensor([-18.0, -22.0])

    loss, metrics = loss_fn(policy_chosen, policy_rejected, ref_chosen, ref_rejected)

    # Loss must be ln(2) = 0.693147...
    expected_loss = math.log(2.0)
    assert abs(loss.item() - expected_loss) < 1e-5
    assert metrics["reward_margin"].item() == 0.0
    assert metrics["accuracy"].item() == 0.0  # logits == 0 -> accuracy (logits > 0) == 0


def test_dpo_loss_inverted_pairs():
    """Probe DPO loss with inverted pairs where policy prefers rejected over chosen."""
    loss_fn = DPOLoss(beta=0.20)
    policy_chosen = torch.tensor([-30.0, -28.0])   # Low log-probability on chosen
    policy_rejected = torch.tensor([-10.0, -12.0]) # High log-probability on rejected
    ref_chosen = torch.tensor([-15.0, -15.0])
    ref_rejected = torch.tensor([-15.0, -15.0])

    loss, metrics = loss_fn(policy_chosen, policy_rejected, ref_chosen, ref_rejected)

    # Inverted preferences must trigger loss penalty > ln(2) and negative reward margin
    assert loss.item() > math.log(2.0)
    assert metrics["reward_margin"].item() < 0.0
    assert metrics["accuracy"].item() == 0.0


# ════════════════════════════════════════════════════════════════════════════════
# 5. G-UX-016 HELD-OUT TEST SPLIT WIN-RATE EMPIRICAL BENCHMARK
# ════════════════════════════════════════════════════════════════════════════════

def test_dpo_win_rate_on_real_held_out_test_split():
    """Evaluate DPO win rate across all 350 held-out Stage 5 test split pairs."""
    test_split_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "../../artifacts/curriculum/stage5_preferences/splits/test.jsonl",
        )
    )
    assert os.path.exists(test_split_path), f"Test split missing at {test_split_path}"

    test_pairs = []
    with open(test_split_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                test_pairs.append(json.loads(line))

    assert len(test_pairs) == 350, f"Expected 350 test pairs, got {len(test_pairs)}"

    trainer = DPOTrainer()
    eval_result = trainer.evaluate_win_rate(test_pairs)

    assert eval_result["total"] == 350
    assert eval_result["win_rate"] >= 0.680, f"Win rate {eval_result['win_rate']} < 0.680"
    assert eval_result["passed"] is True
    assert eval_result["average_margin"] > 0.0
