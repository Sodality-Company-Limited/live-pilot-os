"""
Unit and integration tests for Multi-Agent Policy LoRA Adapters & Merging Engine.

Goal Reference: G-UX-018
Epic: UX (Multimodal UX/UI Design Decision Making Layer)
"""

import os
import sys
import pytest
import torch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.lora_merger import (
    LoRAConfig,
    LoRAAdapter,
    linear_merge,
    ties_merge,
    dare_merge,
    PersonaLoRAManager,
    CANONICAL_PERSONAS,
)


def test_lora_adapter_zero_initialization():
    config = LoRAConfig(r=16, alpha=32)
    adapter = LoRAAdapter("test_adapter", in_features=64, out_features=64, config=config)

    # Invariant: B is identically 0
    assert torch.all(adapter.lora_B == 0.0)

    # Invariant: Delta W = (alpha/r) * B @ A is identically 0 at step 0
    delta_w = adapter.compute_delta_w()
    assert torch.all(delta_w == 0.0)

    # Forward pass on zero delta produces zero outputs
    x = torch.randn(2, 64)
    out = adapter(x)
    assert torch.all(out == 0.0)


def test_linear_merge():
    config = LoRAConfig(r=2, alpha=4)
    a1 = LoRAAdapter("a1", in_features=4, out_features=4, config=config)
    a2 = LoRAAdapter("a2", in_features=4, out_features=4, config=config)

    # Set non-zero parameters for testing
    with torch.no_grad():
        a1.lora_B[0, 0] = 1.0
        a1.lora_A[0, 0] = 1.0  # delta = (4/2) * (1*1) = 2.0
        a2.lora_B[0, 0] = 3.0
        a2.lora_A[0, 0] = 1.0  # delta = (4/2) * (3*1) = 6.0

    merged = linear_merge([a1, a2], weights=[0.5, 0.5])
    assert abs(merged[0, 0].item() - 4.0) < 1e-5


def test_ties_merge():
    config = LoRAConfig(r=4, alpha=8)
    a1 = LoRAAdapter("a1", in_features=8, out_features=8, config=config)
    a2 = LoRAAdapter("a2", in_features=8, out_features=8, config=config)

    with torch.no_grad():
        a1.lora_B.normal_(0.0, 0.5)
        a2.lora_B.normal_(0.0, 0.5)

    merged = ties_merge([a1, a2], density=0.25)
    assert merged.shape == (8, 8)
    assert not torch.isnan(merged).any()


def test_dare_merge():
    config = LoRAConfig(r=4, alpha=8)
    a1 = LoRAAdapter("a1", in_features=8, out_features=8, config=config)

    with torch.no_grad():
        a1.lora_B.fill_(1.0)

    merged = dare_merge([a1], drop_rate=0.50, seed=42)
    assert merged.shape == (8, 8)
    assert not torch.isnan(merged).any()


def test_persona_lora_manager():
    manager = PersonaLoRAManager(in_features=32, out_features=32)

    # Must contain all 12 canonical personas
    assert len(manager.adapters) == 12
    for p in CANONICAL_PERSONAS:
        adapter = manager.get_adapter(p)
        assert adapter.name == p

    # Synthesize team policy
    team = [
        "dark_pattern_ethics_watchdog",
        "accessibility_auditor",
        "design_systems_lead",
    ]

    # Synthesize with different strategies
    merged_linear = manager.synthesize_team_adapter(team, strategy="linear")
    assert merged_linear.shape == (32, 32)

    merged_ties = manager.synthesize_team_adapter(team, strategy="ties", density=0.20)
    assert merged_ties.shape == (32, 32)

    merged_dare = manager.synthesize_team_adapter(team, strategy="dare", drop_rate=0.50)
    assert merged_dare.shape == (32, 32)
