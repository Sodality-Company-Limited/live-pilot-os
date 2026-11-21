"""
Dual-Head Architecture and Value/Confidence Projection Module.

Provides:
1. ConfidenceValueHead: Two-layer MLP projecting terminal hidden representations to bounded [0.0, 1.0] scalar confidence.
2. DualHeadCausalLM: Model wrapper attaching the confidence head to causal language model representations while preserving causal LM logits and autoregressive generation.
3. BaseCausalTransformerBackbone: Concrete causal transformer language model used as standalone or default backbone.
"""

from __future__ import annotations

import math
from typing import Dict, Any, Optional, Union, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class DualHeadOutput(dict):
    """Structured dictionary wrapper for dual-head causal language model outputs."""

    def __init__(
        self,
        logits: torch.Tensor,
        confidence: torch.Tensor,
        terminal_hidden: torch.Tensor,
        hidden_states: Optional[torch.Tensor] = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            logits=logits,
            confidence=confidence,
            terminal_hidden=terminal_hidden,
            hidden_states=hidden_states,
            **kwargs,
        )
        self.logits = logits
        self.confidence = confidence
        self.terminal_hidden = terminal_hidden
        self.hidden_states = hidden_states

    def __repr__(self) -> str:
        return (
            f"DualHeadOutput(logits_shape={list(self.logits.shape)}, "
            f"confidence_shape={list(self.confidence.shape)}, "
            f"terminal_hidden_shape={list(self.terminal_hidden.shape)})"
        )


class ConfidenceValueHead(nn.Module):
    """
    Two-layer MLP projecting terminal hidden states to a scalar confidence estimate in [0.0, 1.0].
    
    Architecture:
      Input [batch, hidden_dim] -> Linear(hidden_dim, intermediate_dim) -> GELU -> Dropout -> Linear(intermediate_dim, 1) -> Sigmoid -> [batch, 1]
    """

    def __init__(
        self,
        hidden_dim: int,
        intermediate_dim: Optional[int] = None,
        dropout_prob: float = 0.0,
        activation: str = "gelu",
    ) -> None:
        super().__init__()
        if hidden_dim <= 0:
            raise ValueError(f"hidden_dim must be positive, got {hidden_dim}")

        if intermediate_dim is None:
            intermediate_dim = max(64, hidden_dim // 2)
        elif intermediate_dim <= 0:
            raise ValueError(f"intermediate_dim must be positive, got {intermediate_dim}")

        self.hidden_dim = hidden_dim
        self.intermediate_dim = intermediate_dim
        self.dropout_prob = dropout_prob

        self.fc1 = nn.Linear(hidden_dim, intermediate_dim)

        if activation.lower() == "gelu":
            self.act = nn.GELU()
        elif activation.lower() == "relu":
            self.act = nn.ReLU()
        elif activation.lower() == "silu":
            self.act = nn.SiLU()
        else:
            raise ValueError(f"Unsupported activation: '{activation}'. Choose 'gelu', 'relu', or 'silu'.")

        self.dropout = nn.Dropout(dropout_prob) if dropout_prob > 0.0 else nn.Identity()
        self.fc2 = nn.Linear(intermediate_dim, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        """
        Forward pass for confidence head.
        
        Args:
            hidden_states: Tensor of shape [batch, hidden_dim] or [batch, seq_len, hidden_dim].
            
        Returns:
            Scalar confidence tensor bounded in [0.0, 1.0], shape [batch, 1] (or [batch, seq_len, 1]).
        """
        if not torch.isfinite(hidden_states).all():
            raise ValueError("ConfidenceValueHead received non-finite values (NaN or Inf) in hidden_states")

        if hidden_states.shape[-1] != self.hidden_dim:
            raise ValueError(
                f"Hidden dimension mismatch: expected last dimension {self.hidden_dim}, got {hidden_states.shape[-1]}"
            )

        x = self.fc1(hidden_states)
        x = self.act(x)
        x = self.dropout(x)
        x = self.fc2(x)
        confidence = self.sigmoid(x)

        if not torch.isfinite(confidence).all():
            raise ValueError("ConfidenceValueHead produced non-finite values (NaN or Inf)")

        return confidence


class BaseCausalTransformerBackbone(nn.Module):
    """
    Standard autoregressive causal transformer language model.
    Used as an operational transformer backbone for testing and standalone execution.
    """

    def __init__(
        self,
        vocab_size: int = 1000,
        hidden_dim: int = 128,
        num_layers: int = 2,
        num_heads: int = 4,
        dim_feedforward: int = 256,
        max_seq_len: int = 2048,
    ) -> None:
        super().__init__()
        self.vocab_size = vocab_size
        self.hidden_dim = hidden_dim
        self.max_seq_len = max_seq_len

        self.embeddings = nn.Embedding(vocab_size, hidden_dim)
        self.pos_embeddings = nn.Embedding(max_seq_len, hidden_dim)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=num_heads,
            dim_feedforward=dim_feedforward,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers,
            enable_nested_tensor=False,
        )
        self.final_norm = nn.LayerNorm(hidden_dim)
        self.lm_head = nn.Linear(hidden_dim, vocab_size, bias=False)

        # Weight tying between input embeddings and lm_head
        self.lm_head.weight = self.embeddings.weight

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        return_hidden_states: bool = True,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        batch_size, seq_len = input_ids.shape
        if seq_len > self.max_seq_len:
            raise ValueError(f"Sequence length {seq_len} exceeds max_seq_len {self.max_seq_len}")

        positions = torch.arange(seq_len, device=input_ids.device).unsqueeze(0).expand(batch_size, -1)
        x = self.embeddings(input_ids) + self.pos_embeddings(positions)

        # Causal attention mask: boolean mask where True means masked out (upper triangular)
        causal_mask = torch.triu(
            torch.ones(seq_len, seq_len, dtype=torch.bool, device=input_ids.device),
            diagonal=1,
        )

        src_key_padding_mask = None
        if attention_mask is not None:
            # PyTorch expects True for padded positions to be ignored
            src_key_padding_mask = (attention_mask == 0)

        hidden_states = self.transformer(
            x,
            mask=causal_mask,
            src_key_padding_mask=src_key_padding_mask,
            is_causal=True,
        )
        hidden_states = self.final_norm(hidden_states)
        logits = self.lm_head(hidden_states)

        return logits, hidden_states

    def generate(
        self,
        input_ids: torch.Tensor,
        max_new_tokens: int = 10,
        temperature: float = 0.0,
    ) -> torch.Tensor:
        """Deterministic greedy autoregressive generation."""
        generated = input_ids.clone()
        for _ in range(max_new_tokens):
            if generated.shape[1] >= self.max_seq_len:
                break
            logits, _ = self.forward(generated)
            next_token_logits = logits[:, -1, :]
            if temperature == 0.0:
                next_token = torch.argmax(next_token_logits, dim=-1, keepdim=True)
            else:
                probs = F.softmax(next_token_logits / temperature, dim=-1)
                next_token = torch.multinomial(probs, num_samples=1)
            generated = torch.cat([generated, next_token], dim=1)
        return generated


class DualHeadCausalLM(nn.Module):
    """
    Dual-Head Causal Language Model wrapper.
    
    Attaches an auxiliary ConfidenceValueHead to terminal token representations of a causal
    language model while preserving causal language model logits and generation dynamics.
    """

    def __init__(
        self,
        base_model: Optional[nn.Module] = None,
        vocab_size: int = 1000,
        hidden_dim: int = 128,
        intermediate_dim: Optional[int] = None,
        dropout_prob: float = 0.0,
        detach_backbone: bool = False,
        activation: str = "gelu",
    ) -> None:
        super().__init__()

        if base_model is None:
            base_model = BaseCausalTransformerBackbone(
                vocab_size=vocab_size,
                hidden_dim=hidden_dim,
            )
        self.base_model = base_model

        # Determine hidden dimension from base_model or argument
        inferred_hidden_dim = getattr(base_model, "hidden_dim", None)
        if inferred_hidden_dim is None:
            config = getattr(base_model, "config", None)
            if config is not None:
                inferred_hidden_dim = getattr(config, "hidden_size", None) or getattr(config, "d_model", None)
        if inferred_hidden_dim is None:
            inferred_hidden_dim = hidden_dim

        self.hidden_dim = inferred_hidden_dim
        self.detach_backbone = detach_backbone

        self.confidence_head = ConfidenceValueHead(
            hidden_dim=self.hidden_dim,
            intermediate_dim=intermediate_dim,
            dropout_prob=dropout_prob,
            activation=activation,
        )

        # Hook storage for external base models that don't return hidden states directly
        self._captured_hidden_state: Optional[torch.Tensor] = None
        self._hook_handle = None

    def register_decoder_hook(self, target_module: nn.Module) -> None:
        """Registers a forward hook on the final decoder layer of an external model."""
        if self._hook_handle is not None:
            self._hook_handle.remove()

        def _hook(module: nn.Module, inputs: Any, output: Any) -> None:
            if isinstance(output, tuple):
                self._captured_hidden_state = output[0]
            elif isinstance(output, torch.Tensor):
                self._captured_hidden_state = output

        self._hook_handle = target_module.register_forward_hook(_hook)

    def pool_terminal_hidden(
        self,
        hidden_states: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Extracts terminal token hidden state representations.
        
        Args:
            hidden_states: Tensor of shape [batch, seq_len, hidden_dim].
            attention_mask: Optional binary tensor [batch, seq_len] with 1 for active and 0 for padded tokens.
            
        Returns:
            Pooled terminal token representations of shape [batch, hidden_dim].
        """
        batch_size, seq_len, _ = hidden_states.shape

        if attention_mask is not None:
            # Verify mask dimensions
            if attention_mask.shape != (batch_size, seq_len):
                raise ValueError(
                    f"attention_mask shape mismatch: expected {(batch_size, seq_len)}, got {attention_mask.shape}"
                )
            lengths = attention_mask.sum(dim=1).long()
            terminal_indices = (lengths - 1).clamp(min=0)
            batch_indices = torch.arange(batch_size, device=hidden_states.device)
            terminal_hidden = hidden_states[batch_indices, terminal_indices]
        else:
            # Default to sequence terminal position
            terminal_hidden = hidden_states[:, -1, :]

        return terminal_hidden

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        detach_backbone: Optional[bool] = None,
        **kwargs: Any,
    ) -> DualHeadOutput:
        """
        Forward pass producing both causal language logits and scalar confidence.
        
        Args:
            input_ids: LongTensor of token IDs of shape [batch, seq_len].
            attention_mask: Optional attention mask of shape [batch, seq_len].
            detach_backbone: If True, detaches terminal hidden states to isolate backbone from value head gradients.
            
        Returns:
            DualHeadOutput dictionary containing 'logits', 'confidence', and 'terminal_hidden'.
        """
        if input_ids.dim() != 2:
            raise ValueError(f"input_ids must be 2D tensor [batch, seq_len], got {input_ids.shape}")

        batch_size, seq_len = input_ids.shape
        if batch_size < 1 or seq_len < 1:
            raise ValueError(f"Empty batch or sequence length: batch={batch_size}, seq_len={seq_len}")

        if not torch.isfinite(input_ids.float()).all():
            raise ValueError("input_ids contains non-finite values")

        should_detach = self.detach_backbone if detach_backbone is None else detach_backbone

        # Execute base model forward pass
        self._captured_hidden_state = None
        base_output = self.base_model(input_ids=input_ids, attention_mask=attention_mask, **kwargs)

        hidden_states = None
        if isinstance(base_output, tuple):
            logits = base_output[0]
            if len(base_output) > 1 and isinstance(base_output[1], torch.Tensor):
                hidden_states = base_output[1]
        elif hasattr(base_output, "logits"):
            logits = base_output.logits
            if hasattr(base_output, "hidden_states") and base_output.hidden_states:
                hidden_states = base_output.hidden_states[-1]
            elif hasattr(base_output, "last_hidden_state"):
                hidden_states = base_output.last_hidden_state
        elif isinstance(base_output, torch.Tensor):
            logits = base_output
        else:
            raise TypeError(f"Unrecognized base model output type: {type(base_output)}")

        if hidden_states is None and self._captured_hidden_state is not None:
            hidden_states = self._captured_hidden_state

        if hidden_states is None:
            # Fallback: if base model only outputs logits, treat hidden state as accessible from base_model attribute
            if hasattr(self.base_model, "transformer") or hasattr(self.base_model, "backbone"):
                backbone = getattr(self.base_model, "transformer", None) or getattr(self.base_model, "backbone", None)
                if hasattr(backbone, "forward"):
                    pass
            raise RuntimeError(
                "Unable to extract hidden states from base model. Register a decoder hook or ensure base_model returns hidden states."
            )

        if not torch.isfinite(logits).all():
            raise ValueError("Base model produced non-finite logits (NaN or Inf)")
        if not torch.isfinite(hidden_states).all():
            raise ValueError("Base model produced non-finite hidden states (NaN or Inf)")

        # Pool terminal token hidden state
        terminal_hidden = self.pool_terminal_hidden(hidden_states, attention_mask=attention_mask)

        # Apply gradient detachment if configured
        if should_detach:
            terminal_hidden_for_head = terminal_hidden.detach()
        else:
            terminal_hidden_for_head = terminal_hidden

        # Project scalar confidence
        confidence = self.confidence_head(terminal_hidden_for_head)

        return DualHeadOutput(
            logits=logits,
            confidence=confidence,
            terminal_hidden=terminal_hidden,
            hidden_states=hidden_states,
        )

    def generate(
        self,
        input_ids: torch.Tensor,
        **kwargs: Any,
    ) -> torch.Tensor:
        """Delegates text generation directly to base causal language model."""
        if hasattr(self.base_model, "generate"):
            return self.base_model.generate(input_ids, **kwargs)
        raise NotImplementedError("Underlying base model does not implement generate()")

    def freeze_backbone(self) -> None:
        """Freezes all parameters in the base language model backbone."""
        for param in self.base_model.parameters():
            param.requires_grad = False

    def unfreeze_backbone(self) -> None:
        """Unfreezes all parameters in the base language model backbone."""
        for param in self.base_model.parameters():
            param.requires_grad = True
