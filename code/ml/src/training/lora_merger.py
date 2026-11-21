"""
Multi-Agent Policy LoRA Adapters & Merging Engine.

Goal Reference: G-UX-018
Epic: UX (Multimodal UX/UI Design Decision Making Layer)

Provides:
1. LoRAConfig: Hyperparameters for parameter-efficient adaptation (r=16, alpha=32).
2. LoRAAdapter: Parameter container enforcing the zero-initialization invariant:
   B = 0, A ~ N(0, 1/sqrt(r)) ==> Delta W = (alpha/r) * B @ A == 0 at step 0.
3. Merging Strategies:
   - Linear Weighted Average
   - TIES-Merging (Trimming, Elect Sign, Disjoint Merge)
   - DARE (Drop and REScale)
4. PersonaLoRAManager: Pre-registered 12 persona adapters with dynamic runtime routing
   and sub-50ms adapter synthesis.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.functional as F

CANONICAL_PERSONAS = [
    "dark_pattern_ethics_watchdog",
    "accessibility_auditor",
    "design_systems_lead",
    "ergonomics_cognitive_critic",
    "enterprise_info_architect",
    "typography_scale_architect",
    "visual_balance_density",
    "interaction_choreographer",
    "motion_haptics_engineer",
    "color_contrast_specialist",
    "microcopy_tone_specialist",
    "i18n_multilocale_stylist",
]


@dataclass
class LoRAConfig:
    """Hyperparameters for LoRA adapters."""

    r: int = 16
    alpha: int = 32
    target_modules: List[str] = field(
        default_factory=lambda: ["q_proj", "k_proj", "v_proj", "out_proj", "confidence_head"]
    )
    dropout: float = 0.05

    @property
    def scaling(self) -> float:
        return self.alpha / float(self.r)


class LoRAAdapter(nn.Module):
    """
    Low-Rank Adaptation (LoRA) module.
    
    Invariant:
      Delta W = (alpha / r) * (B @ A)
      B initialized to 0, A initialized from N(0, 1/sqrt(r)).
      At initialization: Delta W is identically zero.
    """

    def __init__(
        self,
        name: str,
        in_features: int,
        out_features: int,
        config: Optional[LoRAConfig] = None,
        generator: Optional[torch.Generator] = None,
    ) -> None:
        super().__init__()
        self.name = name
        self.in_features = in_features
        self.out_features = out_features
        self.config = config or LoRAConfig()

        r = self.config.r
        self.scaling = self.config.scaling

        # Weight matrices
        # A: [r, in_features]
        # B: [out_features, r]
        self.lora_A = nn.Parameter(torch.empty(r, in_features))
        self.lora_B = nn.Parameter(torch.zeros(out_features, r))

        self.reset_parameters(generator=generator)

    def reset_parameters(self, generator: Optional[torch.Generator] = None) -> None:
        """Initialize weights: A ~ N(0, 1/sqrt(r)), B = 0."""
        r = self.config.r
        std = 1.0 / math.sqrt(r)
        if generator is not None:
            self.lora_A.data.normal_(0.0, std, generator=generator)
        else:
            nn.init.normal_(self.lora_A, mean=0.0, std=std)
        # Strict zero-initialization invariant for B
        nn.init.zeros_(self.lora_B)

    def compute_delta_w(self) -> torch.Tensor:
        """Compute Delta W = (alpha / r) * (B @ A) [out_features, in_features]."""
        return self.scaling * (self.lora_B @ self.lora_A)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass: x @ Delta W^T = (x @ A^T) @ B^T * scaling."""
        return (F.linear(x, self.lora_A) @ self.lora_B.t()) * self.scaling


def linear_merge(
    adapters: List[LoRAAdapter], weights: Optional[List[float]] = None
) -> torch.Tensor:
    """
    Linear weighted average of adapter parameter deltas:
    Delta W_merged = sum_i w_i * Delta W_i
    """
    if not adapters:
        raise ValueError("Cannot merge empty adapter list")

    n = len(adapters)
    if weights is None:
        w = [1.0 / n] * n
    else:
        if len(weights) != n:
            raise ValueError(f"Weight count {len(weights)} does not match adapter count {n}")
        total = sum(weights)
        if total <= 0:
            raise ValueError("Sum of weights must be positive")
        w = [x / total for x in weights]

    merged = torch.zeros_like(adapters[0].compute_delta_w())
    for adapter, weight in zip(adapters, w):
        merged = merged + weight * adapter.compute_delta_w()

    return merged


def ties_merge(
    adapters: List[LoRAAdapter],
    density: float = 0.20,
    weights: Optional[List[float]] = None,
) -> torch.Tensor:
    """
    TIES-Merging (Trimming, Elect Sign, Disjoint Merge).
    
    1. Trimming: Retain top density fraction of parameters by magnitude per adapter.
    2. Elect Sign: Calculate coordinate-wise majority sign.
    3. Disjoint Merge: Average parameters that agree with the majority sign.
    """
    if not adapters:
        raise ValueError("Cannot merge empty adapter list")
    if not (0.0 < density <= 1.0):
        raise ValueError(f"density must be in (0.0, 1.0], got {density}")

    n = len(adapters)
    if weights is None:
        w = [1.0 / n] * n
    else:
        total = sum(weights)
        w = [x / total for x in weights]

    deltas = [a.compute_delta_w() for a in adapters]
    shape = deltas[0].shape

    # Step 1: Trimming (Top-k magnitude selection)
    trimmed_deltas = []
    for d in deltas:
        flat_d = d.view(-1)
        k = max(1, int(flat_d.numel() * density))
        threshold = torch.topk(torch.abs(flat_d), k=k).values[-1]
        mask = torch.abs(flat_d) >= threshold
        trimmed = torch.where(mask, flat_d, torch.zeros_like(flat_d))
        trimmed_deltas.append(trimmed.view(shape))

    # Step 2: Elect Sign
    # Coordinate-wise signed vote: sign(sum_i w_i * Delta W_i)
    accum = torch.zeros_like(deltas[0])
    for d, weight in zip(trimmed_deltas, w):
        accum = accum + weight * d
    majority_sign = torch.sign(accum)
    majority_sign[majority_sign == 0] = 1.0  # Tie breaker

    # Step 3: Disjoint Merge
    # For each coordinate, average weights that match the majority sign
    merged = torch.zeros_like(deltas[0])
    count_matching = torch.zeros_like(deltas[0])

    for d, weight in zip(trimmed_deltas, w):
        matches = torch.sign(d) == majority_sign
        valid_weights = torch.where(matches, d, torch.zeros_like(d))
        merged = merged + weight * valid_weights
        count_matching = count_matching + torch.where(matches, weight, 0.0)

    # Normalize by matching weight mass
    safe_denom = torch.where(count_matching > 0, count_matching, torch.ones_like(count_matching))
    merged = merged / safe_denom
    return merged


def dare_merge(
    adapters: List[LoRAAdapter],
    drop_rate: float = 0.50,
    weights: Optional[List[float]] = None,
    seed: Optional[int] = None,
) -> torch.Tensor:
    """
    DARE (Drop And REScale) adapter merging.
    
    1. Randomly drop parameters with probability drop_rate.
    2. Rescale surviving parameters by 1 / (1 - drop_rate).
    3. Merge via linear weighted average.
    """
    if not adapters:
        raise ValueError("Cannot merge empty adapter list")
    if not (0.0 <= drop_rate < 1.0):
        raise ValueError(f"drop_rate must be in [0.0, 1.0), got {drop_rate}")

    n = len(adapters)
    if weights is None:
        w = [1.0 / n] * n
    else:
        total = sum(weights)
        w = [x / total for x in weights]

    rescale_factor = 1.0 / (1.0 - drop_rate) if drop_rate > 0.0 else 1.0
    gen = None
    if seed is not None:
        gen = torch.Generator().manual_seed(seed)

    merged = torch.zeros_like(adapters[0].compute_delta_w())
    for adapter, weight in zip(adapters, w):
        delta = adapter.compute_delta_w()
        if drop_rate > 0.0:
            rand_mask = torch.rand(delta.shape, generator=gen) > drop_rate
            pruned_rescaled = delta * rand_mask.float() * rescale_factor
        else:
            pruned_rescaled = delta
        merged = merged + weight * pruned_rescaled

    return merged


class PersonaLoRAManager:
    """Registry and dynamic router for all 12 specialist persona LoRA adapters."""

    def __init__(
        self,
        in_features: int = 64,
        out_features: int = 64,
        config: Optional[LoRAConfig] = None,
    ) -> None:
        self.in_features = in_features
        self.out_features = out_features
        self.config = config or LoRAConfig()
        self.adapters: Dict[str, LoRAAdapter] = {}

        # Register all 12 canonical specialist personas
        for persona in CANONICAL_PERSONAS:
            self.register_adapter(persona)

    def register_adapter(self, persona_id: str) -> LoRAAdapter:
        """Register or retrieve a dedicated persona adapter."""
        if persona_id not in self.adapters:
            self.adapters[persona_id] = LoRAAdapter(
                name=persona_id,
                in_features=self.in_features,
                out_features=self.out_features,
                config=self.config,
            )
        return self.adapters[persona_id]

    def get_adapter(self, persona_id: str) -> LoRAAdapter:
        """Retrieve an active persona adapter."""
        if persona_id not in self.adapters:
            raise KeyError(f"Persona '{persona_id}' not found in registry")
        return self.adapters[persona_id]

    def synthesize_team_adapter(
        self,
        participating_personas: List[str],
        strategy: str = "ties",
        weights: Optional[List[float]] = None,
        density: float = 0.20,
        drop_rate: float = 0.50,
    ) -> torch.Tensor:
        """
        Dynamically synthesize composite adapter weights for multi-agent deliberation teams.
        Supports linear, ties, and dare merging strategies.
        """
        if not participating_personas:
            raise ValueError("participating_personas must not be empty")

        selected = [self.get_adapter(p) for p in participating_personas]
        strat = strategy.lower()

        if strat == "linear":
            return linear_merge(selected, weights=weights)
        elif strat == "ties":
            return ties_merge(selected, density=density, weights=weights)
        elif strat == "dare":
            return dare_merge(selected, drop_rate=drop_rate, weights=weights)
        else:
            raise ValueError(f"Unknown merging strategy: {strategy}. Choose 'linear', 'ties', or 'dare'.")
