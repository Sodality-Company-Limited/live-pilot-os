"""
Unit and Integration Test Suite for G-ML-004: Dual-Head Architecture and Value/Confidence Projection Module.

Covers:
1. ConfidenceValueHead forward pass, shape verification, probability bounding, and autograd backpropagation.
2. DualHeadCausalLM wrapper forward pass, logits and confidence tensor shapes, and terminal pooling.
3. Gradient isolation and zero leakage to frozen/detached language model backbone.
4. Autoregressive causal text generation preservation.
5. Fail-closed non-finite tensor rejection and padding mask pooling.
"""

import sys
import os
import pytest
import torch
import torch.nn as nn
import torch.nn.functional as F

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.models.dual_head_model import (
    ConfidenceValueHead,
    DualHeadCausalLM,
    DualHeadOutput,
    BaseCausalTransformerBackbone,
)


def test_head_forward():
    """Step 1 Verification: ConfidenceValueHead MLP module forward pass produces scalar output in [0.0, 1.0]."""
    torch.manual_seed(42)
    hidden_dim = 128
    intermediate_dim = 64
    head = ConfidenceValueHead(hidden_dim=hidden_dim, intermediate_dim=intermediate_dim, dropout_prob=0.0)

    # Test single batch and multi-batch inputs
    for batch_size in [1, 4, 16]:
        hidden_states = torch.randn(batch_size, hidden_dim)
        confidence = head(hidden_states)

        assert confidence.shape == (batch_size, 1), f"Expected shape {(batch_size, 1)}, got {confidence.shape}"
        assert torch.isfinite(confidence).all(), "Confidence tensor contains non-finite values"
        assert (confidence >= 0.0).all() and (confidence <= 1.0).all(), (
            f"Confidence values out of range: min={confidence.min().item()}, max={confidence.max().item()}"
        )

    # Test backward pass through head
    target = torch.ones(batch_size, 1)
    loss = F.mse_loss(confidence, target)
    loss.backward()

    for name, param in head.named_parameters():
        assert param.grad is not None, f"Parameter {name} has no gradient"
        assert torch.isfinite(param.grad).all(), f"Parameter {name} has non-finite gradient"


def test_dual_head_shapes():
    """Step 2 Verification: DualHeadCausalLM forward pass produces logits and scalar confidence."""
    torch.manual_seed(42)
    vocab_size = 500
    hidden_dim = 64
    model = DualHeadCausalLM(vocab_size=vocab_size, hidden_dim=hidden_dim)

    # Test various batch sizes and sequence lengths
    test_cases = [
        (1, 8),
        (2, 16),
        (4, 24),
    ]

    for batch_size, seq_len in test_cases:
        input_ids = torch.randint(0, vocab_size, (batch_size, seq_len))
        output = model(input_ids)

        assert isinstance(output, DualHeadOutput), "Output is not a DualHeadOutput"
        assert output["logits"].shape == (batch_size, seq_len, vocab_size), (
            f"Logits shape mismatch: expected {(batch_size, seq_len, vocab_size)}, got {output['logits'].shape}"
        )
        assert output["confidence"].shape == (batch_size, 1), (
            f"Confidence shape mismatch: expected {(batch_size, 1)}, got {output['confidence'].shape}"
        )
        assert output.terminal_hidden.shape == (batch_size, hidden_dim), (
            f"Terminal hidden shape mismatch: expected {(batch_size, hidden_dim)}, got {output.terminal_hidden.shape}"
        )
        assert (output.confidence >= 0.0).all() and (output.confidence <= 1.0).all(), (
            "Confidence values outside [0.0, 1.0]"
        )


def test_gradient_isolation():
    """Step 3 Verification: Gradient isolation ensures zero gradient leakage into frozen backbone layers."""
    torch.manual_seed(42)
    vocab_size = 500
    hidden_dim = 64
    model = DualHeadCausalLM(vocab_size=vocab_size, hidden_dim=hidden_dim)

    # Case A: Frozen backbone
    model.freeze_backbone()
    for param in model.base_model.parameters():
        assert not param.requires_grad

    input_ids = torch.randint(0, vocab_size, (2, 12))
    output = model(input_ids)
    target = torch.tensor([[1.0], [0.0]])
    loss = F.mse_loss(output.confidence, target)
    loss.backward()

    # Verify confidence head received valid finite gradients
    for name, param in model.confidence_head.named_parameters():
        assert param.grad is not None, f"Confidence head param {name} missing gradient"
        assert torch.isfinite(param.grad).all(), f"Confidence head param {name} gradient non-finite"

    # Verify frozen base model has ZERO gradient leakage
    for name, param in model.base_model.named_parameters():
        assert param.grad is None, f"Gradient leakage: Frozen base model param {name} received grad {param.grad}"

    # Case B: Detach backbone mode with un-frozen backbone
    model.zero_grad()
    model.unfreeze_backbone()
    for param in model.base_model.parameters():
        assert param.requires_grad

    output_detached = model(input_ids, detach_backbone=True)
    loss_detached = F.mse_loss(output_detached.confidence, target)
    loss_detached.backward()

    # Verify confidence head has grads
    for name, param in model.confidence_head.named_parameters():
        assert param.grad is not None
        assert torch.isfinite(param.grad).all()

    # Verify backbone parameters still retain grad is None because terminal_hidden was detached!
    for name, param in model.base_model.named_parameters():
        assert param.grad is None, f"Gradient leakage under detach_backbone=True in param {name}"


def test_causal_generation_preservation():
    """Verifies that autoregressive causal text generation is preserved identically."""
    torch.manual_seed(42)
    vocab_size = 300
    hidden_dim = 64
    model = DualHeadCausalLM(vocab_size=vocab_size, hidden_dim=hidden_dim)

    input_ids = torch.randint(0, vocab_size, (1, 6))

    # Generate 5 new tokens via wrapper generate
    generated = model.generate(input_ids, max_new_tokens=5, temperature=0.0)
    assert generated.shape == (1, 11), f"Expected shape (1, 11), got {generated.shape}"

    # Verify prompt prefix is unchanged
    assert torch.equal(generated[:, :6], input_ids), "Prompt prefix altered during generation"

    # Verify generate matches base_model generate directly
    direct_generated = model.base_model.generate(input_ids, max_new_tokens=5, temperature=0.0)
    assert torch.equal(generated, direct_generated), "Wrapper generate diverged from base model generate"


def test_terminal_token_pooling_with_mask():
    """Verifies that terminal token pooling extracts active tokens using attention_mask."""
    torch.manual_seed(42)
    vocab_size = 200
    hidden_dim = 32
    model = DualHeadCausalLM(vocab_size=vocab_size, hidden_dim=hidden_dim)

    # Batch of 2: seq 0 has length 4, seq 1 has length 6 (padded to 6)
    input_ids = torch.randint(0, vocab_size, (2, 6))
    attention_mask = torch.tensor([
        [1, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 1],
    ])

    output = model(input_ids, attention_mask=attention_mask)
    terminal_hidden = output.terminal_hidden
    hidden_states = output.hidden_states

    # Seq 0 should pool from index 3 (4th token)
    expected_seq0 = hidden_states[0, 3, :]
    assert torch.allclose(terminal_hidden[0], expected_seq0, atol=1e-5), "Padding-aware pooling failed for seq 0"

    # Seq 1 should pool from index 5 (6th token)
    expected_seq1 = hidden_states[1, 5, :]
    assert torch.allclose(terminal_hidden[1], expected_seq1, atol=1e-5), "Padding-aware pooling failed for seq 1"


def test_non_finite_rejection():
    """Fail-closed boundary: Non-finite inputs (NaN or Inf) raise fatal ValueError."""
    head = ConfidenceValueHead(hidden_dim=32, intermediate_dim=16)

    # NaN input
    nan_tensor = torch.full((2, 32), float("nan"))
    with pytest.raises(ValueError, match="non-finite"):
        head(nan_tensor)

    # Inf input
    inf_tensor = torch.full((2, 32), float("inf"))
    with pytest.raises(ValueError, match="non-finite"):
        head(inf_tensor)

    # Model wrapper with non-finite input_ids
    model = DualHeadCausalLM(vocab_size=100, hidden_dim=32)
    nan_ids = torch.tensor([[float("nan"), 1.0]])
    with pytest.raises(ValueError):
        model(nan_ids)
