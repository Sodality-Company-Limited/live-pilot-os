"""
Adversarial Empirical Retest & Fuzzing Suite for Milestone 4 Remediation.

Agent: challenger_wave4_retest (Empirical Challenger)
Target Goals: G-UX-015 (SFT Trainer) & G-UX-016 (DPO Trainer)

Verification Battery:
1. G-UX-015 SFT: UXDecisionDataset sequence length fuzzing (0, 1, 10, 2047, 2048, 2049, 4096)
   - Labels tensor always present and matches input_ids shape.
   - Prompt tokens masked to -100, completion tokens preserved.
   - Zero UnboundLocalError exceptions.
2. G-UX-015 SFT: compute_loss with all-masked batches (labels = -100)
   - Finite tensor 0.0 returned, zero NaN/Inf.
   - Backward pass produces finite gradients.
3. G-UX-015 SFT: validate_schema fail-closed property on empty strings "" and unexpected fields.
4. G-UX-016 DPO: evaluate_win_rate neural forward pass instrumentation via PyTorch Forward Hooks.
   - Empirical proof that forward calls execute through both policy_model and reference_model.
5. G-UX-016 DPO: train_step multi-sample batches (batch_size = 4, 8, 16)
   - Zero RuntimeError: a Tensor with elements cannot be converted to Scalar.
6. Zero-mock constitutional compliance in test_dpo_trainer.py and dpo_trainer.py.
"""

import os
import sys
import json
import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.sft_trainer import (
    SFTConfig,
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
    SimpleDPOBackbone,
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
# 1. G-UX-015 SFT FUZZING: UXDecisionDataset Sequence Lengths
# ════════════════════════════════════════════════════════════════════════════════

class SyntheticLengthTokenizer:
    """Deterministic mock-free tokenizer that yields exact token counts for testing."""
    def __init__(self, prompt_tokens_count: int, completion_tokens_count: int):
        self.prompt_tokens_count = prompt_tokens_count
        self.completion_tokens_count = completion_tokens_count
        self._call_count = 0

    def encode(self, text: str, add_special_tokens: bool = False):
        self._call_count += 1
        if self._call_count % 2 == 1:
            # 1st call per sample: Prompt tokens
            return [17] * self.prompt_tokens_count
        else:
            # 2nd call per sample: Completion tokens
            return [42] * self.completion_tokens_count


@pytest.mark.parametrize("total_len", [0, 1, 10, 2047, 2048, 2049, 4096])
def test_ux_decision_dataset_sequence_length_fuzzing(total_len):
    """
    Probe UXDecisionDataset across boundary sequence lengths: 0, 1, 10, 2047, 2048, 2049, 4096.
    Asserts:
    - Zero UnboundLocalError exceptions.
    - labels is always present.
    - labels matches input_ids shape.
    - Prompt tokens are masked to -100.
    """
    prompt_len = total_len // 4 if total_len >= 4 else total_len
    comp_len = total_len - prompt_len

    tok = SyntheticLengthTokenizer(prompt_len, comp_len)
    rec = {"intent": "test intent", "decision": {"summary": "valid summary"}}

    # Test under default max_seq_length = 2048
    dataset = UXDecisionDataset([rec], tokenizer=tok, max_seq_length=2048)
    
    # Must not raise UnboundLocalError
    item = dataset[0]

    input_ids = item["input_ids"]
    attention_mask = item["attention_mask"]
    labels = item["labels"]

    assert labels is not None, "labels tensor is None"
    assert input_ids.shape == labels.shape, (
        f"Shape mismatch: input_ids {input_ids.shape} vs labels {labels.shape}"
    )
    assert input_ids.shape == attention_mask.shape, "Attention mask shape mismatch"

    if total_len <= 2048:
        assert len(input_ids) == total_len, f"Expected {total_len}, got {len(input_ids)}"
    else:
        assert len(input_ids) == 2048, f"Expected truncated 2048, got {len(input_ids)}"

    # Check prompt masking
    expected_prompt_len = prompt_len
    if total_len > 2048:
        expected_prompt_len = max(16, 2048 // 4)
    
    masked_part = labels[:expected_prompt_len]
    assert (masked_part == -100).all(), "Prompt tokens were not masked to -100"


# ════════════════════════════════════════════════════════════════════════════════
# 2. G-UX-015 SFT FUZZING: compute_loss All-Masked Batches
# ════════════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("batch_size,seq_len", [(1, 1), (1, 2), (4, 10), (8, 512), (16, 2048)])
def test_sft_compute_loss_all_masked_batches(batch_size, seq_len):
    """
    Probe compute_loss with all-masked batches (labels = -100 everywhere).
    Asserts:
    - Returns finite scalar tensor 0.0.
    - Zero NaN or Inf values.
    - Backward pass produces finite gradients.
    """
    trainer = SFTTrainer()
    vocab_size = 256

    logits = torch.randn(batch_size, seq_len, vocab_size, requires_grad=True)
    labels = torch.full((batch_size, seq_len), -100, dtype=torch.long)

    loss = trainer.compute_loss(logits, labels)

    assert not torch.isnan(loss), "Loss must not be NaN"
    assert not torch.isinf(loss), "Loss must not be Inf"
    assert loss.item() == 0.0, f"Expected 0.0 for all-masked batch, got {loss.item()}"

    # Verify gradient computation is valid
    loss.backward()
    assert logits.grad is not None, "Logits gradient must be computed"
    assert torch.isfinite(logits.grad).all(), "Logits gradient must be finite"


# ════════════════════════════════════════════════════════════════════════════════
# 3. G-UX-015 SFT FUZZING: validate_schema Fail-Closed Property
# ════════════════════════════════════════════════════════════════════════════════

def test_sft_schema_empty_string_rejection():
    """
    Probe validate_schema with empty string "" on required fields and unexpected fields.
    Asserts 100% fail-closed rejection.
    """
    trainer = SFTTrainer()

    # Valid canonical decision must pass
    valid_dec = create_canonical_decision()
    valid, errs = trainer.validate_schema(valid_dec)
    assert valid, f"Valid decision unexpectedly rejected: {errs}"

    # Fuzz empty strings on top-level required fields
    for field in ["decision_id", "lifecycle_state", "risk_level"]:
        dec_empty = create_canonical_decision()
        dec_empty[field] = ""
        v, e = trainer.validate_schema(dec_empty)
        assert not v, f"Field '{field}' with empty string passed validation!"
        assert any(field in err for err in e), f"Error message missing '{field}': {e}"

    # Fuzz empty string on decision.summary
    dec_empty_summary = create_canonical_decision()
    dec_empty_summary["decision"]["summary"] = ""
    v, e = trainer.validate_schema(dec_empty_summary)
    assert not v, "Empty string decision.summary passed validation!"

    # Fuzz unexpected top-level property 'rationale'
    dec_unexpected_prop = create_canonical_decision()
    dec_unexpected_prop["rationale"] = "Some unexpected string"
    v, e = trainer.validate_schema(dec_unexpected_prop)
    assert not v, "Unexpected top-level property 'rationale' passed validation!"
    assert any("rationale" in err for err in e)


# ════════════════════════════════════════════════════════════════════════════════
# 4. G-UX-016 DPO FUZZING: evaluate_win_rate PyTorch Forward Hook Instrumentation
# ════════════════════════════════════════════════════════════════════════════════

def test_dpo_evaluate_win_rate_forward_hook_instrumentation():
    """
    Instrument evaluate_win_rate with PyTorch forward hooks to empirically prove
    that neural calls are executed through both policy_model and reference_model.
    """
    trainer = DPOTrainer()

    policy_forward_calls = []
    reference_forward_calls = []

    def policy_spy_hook(module, args, output):
        policy_forward_calls.append({
            "input_shape": list(args[0].shape),
            "output_shape": list(output.shape if isinstance(output, torch.Tensor) else output.logits.shape)
        })

    def reference_spy_hook(module, args, output):
        reference_forward_calls.append({
            "input_shape": list(args[0].shape),
            "output_shape": list(output.shape if isinstance(output, torch.Tensor) else output.logits.shape)
        })

    trainer.policy_model.register_forward_hook(policy_spy_hook)
    trainer.reference_model.register_forward_hook(reference_spy_hook)

    # 10 test preference pairs with batch_size=4 -> 3 batches (4, 4, 2)
    # Each batch executes 2 forward passes on policy_model (chosen, rejected)
    # and 2 forward passes on reference_model (chosen, rejected) = 6 passes each.
    pairs = [
        {
            "prompt": f"Redesign navigation bar for contrast {i}",
            "chosen": f"PrimaryButton bg-primary-600 focus-visible:ring-2 {i}",
            "rejected": f"button style color #fff bg #00f outline-none {i}",
            "preference_delta": {"contrast_margin": 4.5, "accessibility_score_delta": 0.8}
        }
        for i in range(10)
    ]

    result = trainer.evaluate_win_rate(pairs)

    assert result["total"] == 10
    assert result["passed"] is True

    # Empirically verify hook invocations
    assert len(policy_forward_calls) == 6, (
        f"Expected 6 policy forward calls for 3 batches (2 per batch), got {len(policy_forward_calls)}"
    )
    assert len(reference_forward_calls) == 6, (
        f"Expected 6 reference forward calls for 3 batches (2 per batch), got {len(reference_forward_calls)}"
    )

    # Verify input tensors passed to hooks are non-empty
    for call in policy_forward_calls:
        assert call["input_shape"][0] > 0
        assert call["output_shape"][0] > 0

    for call in reference_forward_calls:
        assert call["input_shape"][0] > 0
        assert call["output_shape"][0] > 0


# ════════════════════════════════════════════════════════════════════════════════
# 5. G-UX-016 DPO FUZZING: train_step Multi-Sample Batches
# ════════════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("batch_size", [4, 8, 16])
def test_dpo_train_step_multi_sample_batches(batch_size):
    """
    Probe train_step with multi-sample batches (batch_size = 4, 8, 16).
    Asserts:
    - Zero RuntimeError: a Tensor with elements cannot be converted to Scalar.
    - All return metrics are valid Python float scalars.
    """
    trainer = DPOTrainer()
    optimizer = torch.optim.AdamW(trainer.policy_model.parameters(), lr=1e-3)

    pairs = [
        {
            "prompt": f"UI accessibility prompt {i}",
            "chosen": f"Chosen tokens bg-primary-600 focus-visible:ring-2 {i}",
            "rejected": f"Rejected raw hex #333 #f00 outline-none {i}",
            "preference_delta": {"contrast_margin": 4.0, "accessibility_score_delta": 0.75}
        }
        for i in range(batch_size)
    ]

    dataset = PreferenceDataset(pairs)
    loader = DataLoader(dataset, batch_size=batch_size, collate_fn=collate_preference_batch)
    batch = next(iter(loader))

    metrics = trainer.train_step(batch, optimizer)

    required_keys = ["loss", "chosen_rewards", "rejected_rewards", "reward_margin", "accuracy", "logits"]
    for key in required_keys:
        assert key in metrics, f"Missing metric key: {key}"
        assert isinstance(metrics[key], float), f"Metric {key} must be float scalar, got {type(metrics[key])}"
        assert not (metrics[key] != metrics[key]), f"Metric {key} is NaN"


# ════════════════════════════════════════════════════════════════════════════════
# 6. CONSTITUTIONAL ARTICLE I ZERO-MOCK COMPLIANCE
# ════════════════════════════════════════════════════════════════════════════════

def test_zero_mock_compliance_in_dpo_files():
    """
    Inspect test_dpo_trainer.py and dpo_trainer.py to guarantee zero occurrences of 'mock'.
    """
    test_dpo_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "test_dpo_trainer.py")
    )
    src_dpo_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../code/ml/src/training/dpo_trainer.py")
    )

    with open(test_dpo_path, "r", encoding="utf-8") as f:
        test_content = f.read()

    with open(src_dpo_path, "r", encoding="utf-8") as f:
        src_content = f.read()

    # Case-insensitive search for 'mock'
    import re
    test_matches = re.findall(r"\bmock\w*", test_content, re.IGNORECASE)
    src_matches = re.findall(r"\bmock\w*", src_content, re.IGNORECASE)

    assert len(test_matches) == 0, f"Found mock occurrences in test_dpo_trainer.py: {test_matches}"
    assert len(src_matches) == 0, f"Found mock occurrences in dpo_trainer.py: {src_matches}"
