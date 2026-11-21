"""
Unit and Integration Test Suite for Goal G-ML-005:
Autoregressive Language-Preservation Objective Specification.

Verifies:
1. Masked negative log-likelihood token loss and prompt masking invariants.
2. Reference model KL divergence regularization and identity preservation (D_KL(P||P) = 0).
3. Numerical stability and analytical gradient backpropagation under float32 and bfloat16.
4. Causal next-token shift alignment.
5. Fail-closed rejection of non-finite inputs (NaN / Inf) and empty batches.
"""

import os
import sys
import pytest
import torch
import torch.nn as nn
import torch.nn.functional as F

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.losses.language_preservation import (
    LanguagePreservationLoss,
    LanguagePreservationOutput,
)


def test_nll_loss():
    """Verify masked negative log-likelihood cross-entropy loss computation."""
    torch.manual_seed(42)
    batch_size = 2
    seq_len = 8
    vocab_size = 32

    loss_fn = LanguagePreservationLoss(beta=0.0)

    # Trainable student logits
    student_logits = nn.Parameter(torch.randn(batch_size, seq_len, vocab_size))
    labels = torch.randint(0, vocab_size, (batch_size, seq_len))

    # Prompt mask: first 3 tokens are prompt, remaining 5 are completion
    prompt_mask = torch.zeros(batch_size, seq_len, dtype=torch.bool)
    prompt_mask[:, :3] = True

    output = loss_fn(
        student_logits=student_logits,
        labels=labels,
        prompt_mask=prompt_mask,
    )

    assert isinstance(output, LanguagePreservationOutput)
    assert output.loss.dim() == 0  # scalar
    assert output.loss.item() > 0.0
    assert output.nll_loss.item() == output.loss.item()
    assert output.kl_loss.item() == 0.0

    # Backward pass
    output.loss.backward()

    assert student_logits.grad is not None
    assert torch.isfinite(student_logits.grad).all()

    # Invariant: prompt positions (indices 0 and 1 predicting indices 1 and 2)
    # in shifted logits (indices 0, 1) predict prompt tokens (labels[1] and labels[2]).
    # Because prompt_mask[:, 1] and prompt_mask[:, 2] are True, shift_labels at 0 and 1 are ignored!
    # Therefore, gradients at token position 0 and 1 for prompt tokens should be 0.0!
    assert torch.allclose(student_logits.grad[:, :2, :], torch.zeros_like(student_logits.grad[:, :2, :]), atol=1e-6)

    # Gradients for completion predictions (indices 2 through 6 predicting tokens 3 through 7) must be non-zero!
    assert (student_logits.grad[:, 2:7, :].abs() > 0.0).any()


def test_kl_divergence():
    """Verify reference model KL divergence regularization and identity preservation."""
    torch.manual_seed(42)
    batch_size = 2
    seq_len = 6
    vocab_size = 16

    loss_fn = LanguagePreservationLoss(beta=0.5, temperature=1.0)

    student_logits = torch.randn(batch_size, seq_len, vocab_size)
    labels = torch.randint(0, vocab_size, (batch_size, seq_len))

    # Case 1: Identical distributions (reference_logits == student_logits)
    # Invariant: D_KL(P || P) MUST BE EXACTLY 0.0
    output_identical = loss_fn(
        student_logits=student_logits,
        labels=labels,
        reference_logits=student_logits.clone(),
    )

    assert abs(output_identical.kl_loss.item()) < 1e-6
    assert torch.isclose(output_identical.loss, output_identical.nll_loss, atol=1e-6)

    # Case 2: Divergent reference logits
    ref_logits = torch.randn(batch_size, seq_len, vocab_size)
    output_divergent = loss_fn(
        student_logits=student_logits,
        labels=labels,
        reference_logits=ref_logits,
    )

    assert output_divergent.kl_loss.item() > 0.0
    expected_total = output_divergent.nll_loss.item() + 0.5 * output_divergent.kl_loss.item()
    assert abs(output_divergent.loss.item() - expected_total) < 1e-5

    # Case 3: Scaling with beta
    loss_fn_high_beta = LanguagePreservationLoss(beta=2.0, temperature=1.0)
    output_high_beta = loss_fn_high_beta(
        student_logits=student_logits,
        labels=labels,
        reference_logits=ref_logits,
    )

    assert torch.isclose(output_high_beta.kl_loss, output_divergent.kl_loss)
    expected_high_total = output_divergent.nll_loss.item() + 2.0 * output_divergent.kl_loss.item()
    assert abs(output_high_beta.loss.item() - expected_high_total) < 1e-5


def test_numerical_stability():
    """Verify numerical stability under extreme logit distributions and mixed precision."""
    torch.manual_seed(42)
    batch_size = 2
    seq_len = 10
    vocab_size = 64

    loss_fn = LanguagePreservationLoss(beta=0.1, temperature=2.0)

    # 1. Extreme logit values (e.g. +/- 1000.0)
    extreme_logits = torch.randn(batch_size, seq_len, vocab_size) * 500.0
    extreme_logits = nn.Parameter(extreme_logits)
    labels = torch.randint(0, vocab_size, (batch_size, seq_len))
    ref_logits = torch.randn(batch_size, seq_len, vocab_size) * 500.0

    output = loss_fn(
        student_logits=extreme_logits,
        labels=labels,
        reference_logits=ref_logits,
    )

    assert torch.isfinite(output.loss).all()
    assert torch.isfinite(output.nll_loss).all()
    assert torch.isfinite(output.kl_loss).all()

    output.loss.backward()
    assert extreme_logits.grad is not None
    assert torch.isfinite(extreme_logits.grad).all()

    # 2. bfloat16 support
    if hasattr(torch, "bfloat16"):
        bf16_logits = nn.Parameter(torch.randn(batch_size, seq_len, vocab_size, dtype=torch.bfloat16))
        bf16_labels = torch.randint(0, vocab_size, (batch_size, seq_len))
        bf16_ref = torch.randn(batch_size, seq_len, vocab_size, dtype=torch.bfloat16)

        bf16_output = loss_fn(
            student_logits=bf16_logits,
            labels=bf16_labels,
            reference_logits=bf16_ref,
        )

        assert torch.isfinite(bf16_output.loss).all()
        bf16_output.loss.backward()
        assert bf16_logits.grad is not None
        assert torch.isfinite(bf16_logits.grad).all()


def test_causal_shift_alignment():
    """Verify that causal shift alignment strictly pairs position t logits with position t+1 labels."""
    torch.manual_seed(42)
    vocab_size = 10
    loss_fn = LanguagePreservationLoss(beta=0.0)

    # 2 tokens: seq_len = 2. Token 0 should predict Token 1.
    student_logits = torch.zeros(1, 2, vocab_size)
    student_logits[0, 0, 5] = 100.0  # At position 0, predict class 5 strongly
    student_logits[0, 1, 9] = 100.0  # At position 1, predict class 9 strongly

    # If target label at position 1 is 5, NLL loss should be approximately 0.0
    labels = torch.tensor([[0, 5]])
    output = loss_fn(student_logits=student_logits, labels=labels)
    assert output.nll_loss.item() < 1e-4

    # If target label at position 1 is NOT 5 (e.g. 7), NLL loss should be large
    wrong_labels = torch.tensor([[0, 7]])
    output_wrong = loss_fn(student_logits=student_logits, labels=wrong_labels)
    assert output_wrong.nll_loss.item() > 50.0


def test_fail_closed_validation():
    """Verify fail-closed boundary enforcement on invalid inputs."""
    loss_fn = LanguagePreservationLoss(beta=0.1)

    valid_logits = torch.randn(2, 4, 10)
    valid_labels = torch.randint(0, 10, (2, 4))

    # 1. Non-finite student logits (NaN)
    nan_logits = valid_logits.clone()
    nan_logits[0, 0, 0] = float("nan")
    with pytest.raises(ValueError, match="non-finite"):
        loss_fn(student_logits=nan_logits, labels=valid_labels)

    # 2. Non-finite student logits (Inf)
    inf_logits = valid_logits.clone()
    inf_logits[0, 0, 0] = float("inf")
    with pytest.raises(ValueError, match="non-finite"):
        loss_fn(student_logits=inf_logits, labels=valid_labels)

    # 3. Non-finite reference logits
    nan_ref = valid_logits.clone()
    nan_ref[0, 0, 0] = float("nan")
    with pytest.raises(ValueError, match="non-finite"):
        loss_fn(student_logits=valid_logits, labels=valid_labels, reference_logits=nan_ref)

    # 4. Empty batch
    empty_logits = torch.randn(0, 4, 10)
    empty_labels = torch.randint(0, 10, (0, 4))
    with pytest.raises(ValueError, match="Invalid sequence dimensions"):
        loss_fn(student_logits=empty_logits, labels=empty_labels)

    # 5. Sequence length <= 1 (cannot shift)
    short_logits = torch.randn(2, 1, 10)
    short_labels = torch.randint(0, 10, (2, 1))
    with pytest.raises(ValueError, match="Invalid sequence dimensions"):
        loss_fn(student_logits=short_logits, labels=short_labels)

    # 6. Entire batch masked out
    prompt_mask = torch.ones_like(valid_labels, dtype=torch.bool)
    with pytest.raises(ValueError, match="No active completion tokens"):
        loss_fn(student_logits=valid_logits, labels=valid_labels, prompt_mask=prompt_mask)


def test_optimizer_integration():
    """Verify integration with PyTorch AdamW optimizer."""
    torch.manual_seed(42)
    vocab_size = 20
    hidden_dim = 16

    # Simple linear student model
    student_layer = nn.Linear(hidden_dim, vocab_size)
    optimizer = torch.optim.AdamW(student_layer.parameters(), lr=1e-2)

    loss_fn = LanguagePreservationLoss(beta=0.2, temperature=1.0)

    inputs = torch.randn(2, 5, hidden_dim)
    labels = torch.randint(0, vocab_size, (2, 5))
    ref_logits = torch.randn(2, 5, vocab_size)

    initial_param = student_layer.weight.clone()

    for _ in range(5):
        optimizer.zero_grad()
        logits = student_layer(inputs)
        output = loss_fn(student_logits=logits, labels=labels, reference_logits=ref_logits)
        output.loss.backward()
        optimizer.step()

    # Parameters must have updated
    assert not torch.allclose(student_layer.weight, initial_param)
    assert torch.isfinite(student_layer.weight).all()
