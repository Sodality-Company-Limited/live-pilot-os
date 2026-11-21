"""
Language Preservation Loss Module for Soda OS Cognitive Models.

Goal Reference: G-ML-005
Implements composite autoregressive loss objective combining:
1. Masked negative log-likelihood (NLL) token cross-entropy on completion spans.
2. Reference model Kullback-Leibler (KL) divergence regularization term.

Guarantees that fine-tuning auxiliary confidence heads or adapters does not
induce catastrophic forgetting or degrade causal language generation capabilities.
"""

from dataclasses import dataclass
from typing import Optional, Union, Dict, Any
import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class LanguagePreservationOutput:
    """Structured container for language preservation loss components."""
    loss: torch.Tensor
    nll_loss: torch.Tensor
    kl_loss: torch.Tensor

    def __getitem__(self, item: str) -> torch.Tensor:
        if item == "loss" or item == "total_loss":
            return self.loss
        elif item == "nll_loss":
            return self.nll_loss
        elif item == "kl_loss":
            return self.kl_loss
        raise KeyError(f"Unknown key: {item}")

    def as_dict(self) -> Dict[str, float]:
        return {
            "loss": float(self.loss.detach().item()),
            "nll_loss": float(self.nll_loss.detach().item()),
            "kl_loss": float(self.kl_loss.detach().item()),
        }


class LanguagePreservationLoss(nn.Module):
    """
    Composite language preservation loss module.

    Computes:
        L_total = L_NLL + beta * L_KL

    Args:
        beta: Regularization weight for the KL divergence term (default: 0.1).
        temperature: Softmax temperature for KL divergence computation (default: 1.0).
        ignore_index: Target index to ignore in NLL cross-entropy loss (default: -100).
        reduction: Reduction method ('mean', 'sum', 'none') (default: 'mean').
        kl_scale_by_temp_squared: Whether to multiply KL by temperature^2 (default: True).
    """

    def __init__(
        self,
        beta: float = 0.1,
        temperature: float = 1.0,
        ignore_index: int = -100,
        reduction: str = "mean",
        kl_scale_by_temp_squared: bool = True,
    ):
        super().__init__()
        if beta < 0.0:
            raise ValueError(f"beta must be non-negative, got {beta}")
        if temperature <= 0.0:
            raise ValueError(f"temperature must be strictly positive, got {temperature}")
        if reduction not in ("mean", "sum", "none"):
            raise ValueError(f"Unsupported reduction: {reduction}. Must be 'mean', 'sum', or 'none'.")

        self.beta = beta
        self.temperature = temperature
        self.ignore_index = ignore_index
        self.reduction = reduction
        self.kl_scale_by_temp_squared = kl_scale_by_temp_squared

    def forward(
        self,
        student_logits: torch.Tensor,
        labels: torch.Tensor,
        reference_logits: Optional[torch.Tensor] = None,
        prompt_mask: Optional[torch.Tensor] = None,
        completion_mask: Optional[torch.Tensor] = None,
        attention_mask: Optional[torch.Tensor] = None,
    ) -> LanguagePreservationOutput:
        """
        Forward pass computing masked NLL token loss and optional reference KL penalty.

        Args:
            student_logits: Tensor of shape [batch, seq_len, vocab_size].
            labels: Tensor of shape [batch, seq_len] with target token IDs.
            reference_logits: Optional Tensor of shape [batch, seq_len, vocab_size] from frozen base model.
            prompt_mask: Optional boolean or {0,1} Tensor of shape [batch, seq_len] where True indicates prompt tokens.
            completion_mask: Optional boolean or {0,1} Tensor of shape [batch, seq_len] where True indicates completion tokens.
            attention_mask: Optional boolean or {0,1} Tensor of shape [batch, seq_len] where 0 indicates padding.

        Returns:
            LanguagePreservationOutput with loss, nll_loss, and kl_loss.
        """
        # 1. Fail-closed input shape and boundary validation
        if student_logits.dim() != 3:
            raise ValueError(f"student_logits must be 3D [batch, seq_len, vocab_size], got {student_logits.shape}")
        if labels.dim() != 2:
            raise ValueError(f"labels must be 2D [batch, seq_len], got {labels.shape}")

        batch_size, seq_len, vocab_size = student_logits.shape
        if batch_size == 0 or seq_len <= 1:
            raise ValueError(f"Invalid sequence dimensions: batch={batch_size}, seq_len={seq_len}. seq_len must be > 1.")
        if labels.shape[0] != batch_size or labels.shape[1] != seq_len:
            raise ValueError(
                f"Shape mismatch: student_logits={student_logits.shape}, labels={labels.shape}"
            )

        # 2. Check for non-finite values in student_logits
        if not torch.isfinite(student_logits).all():
            raise ValueError("student_logits contains non-finite values (NaN or Inf).")

        # 3. Reference logits validation
        if reference_logits is not None:
            if reference_logits.shape != student_logits.shape:
                raise ValueError(
                    f"Shape mismatch: reference_logits shape {reference_logits.shape} != student_logits shape {student_logits.shape}"
                )
            if not torch.isfinite(reference_logits).all():
                raise ValueError("reference_logits contains non-finite values (NaN or Inf).")

        # 4. Perform Causal Token Shift
        # Logits at position t predict token at position t+1
        shift_logits = student_logits[:, :-1, :].contiguous()
        shift_labels = labels[:, 1:].contiguous().clone()

        # 5. Apply Token Masking
        # Mask out prompt tokens and padding positions
        if prompt_mask is not None:
            if prompt_mask.shape != labels.shape:
                raise ValueError(f"prompt_mask shape {prompt_mask.shape} != labels shape {labels.shape}")
            shift_prompt_mask = prompt_mask[:, 1:].contiguous().bool()
            shift_labels[shift_prompt_mask] = self.ignore_index

        if completion_mask is not None:
            if completion_mask.shape != labels.shape:
                raise ValueError(f"completion_mask shape {completion_mask.shape} != labels shape {labels.shape}")
            shift_completion_mask = completion_mask[:, 1:].contiguous().bool()
            shift_labels[~shift_completion_mask] = self.ignore_index

        if attention_mask is not None:
            if attention_mask.shape != labels.shape:
                raise ValueError(f"attention_mask shape {attention_mask.shape} != labels shape {labels.shape}")
            shift_attention_mask = attention_mask[:, 1:].contiguous().bool()
            shift_labels[~shift_attention_mask] = self.ignore_index

        # Active completion token mask
        valid_tokens = (shift_labels != self.ignore_index)
        valid_token_count = valid_tokens.sum()
        if valid_token_count == 0:
            raise ValueError("No active completion tokens to compute loss. Entire batch is masked.")

        # 6. Compute Masked Negative Log-Likelihood (NLL) Cross-Entropy Loss
        flat_logits = shift_logits.view(-1, vocab_size)
        flat_labels = shift_labels.view(-1)
        nll_loss = F.cross_entropy(
            flat_logits,
            flat_labels,
            ignore_index=self.ignore_index,
            reduction=self.reduction,
        )

        # 7. Compute Reference Model KL Divergence Regularization Term
        if reference_logits is not None and self.beta > 0.0:
            # Shift reference logits to match student sequence alignment and detach reference graph
            shift_ref = reference_logits[:, :-1, :].contiguous().detach()

            # Apply temperature scaling
            scaled_student = shift_logits / self.temperature
            scaled_ref = shift_ref / self.temperature

            # Numerically stable forward KL divergence: D_KL(P_student || P_ref) = sum(P_student * (log P_student - log P_ref))
            log_p_student = F.log_softmax(scaled_student, dim=-1)
            log_p_ref = F.log_softmax(scaled_ref, dim=-1)
            p_student = F.softmax(scaled_student, dim=-1)

            # Token-level KL divergence: [batch, seq_len - 1]
            kl_per_token = torch.sum(p_student * (log_p_student - log_p_ref), dim=-1)

            # Ensure strict non-negativity due to float rounding
            kl_per_token = torch.clamp(kl_per_token, min=0.0)

            # Scale by temperature^2 if configured
            if self.kl_scale_by_temp_squared:
                kl_per_token = kl_per_token * (self.temperature ** 2)

            # Mask KL divergence to only valid completion tokens
            masked_kl = kl_per_token * valid_tokens.to(dtype=kl_per_token.dtype)
            if self.reduction == "mean":
                kl_loss = masked_kl.sum() / valid_token_count.clamp(min=1).to(dtype=kl_per_token.dtype)
            elif self.reduction == "sum":
                kl_loss = masked_kl.sum()
            else:  # none
                kl_loss = masked_kl
        else:
            kl_loss = torch.tensor(0.0, device=student_logits.device, dtype=student_logits.dtype)

        # 8. Compute Total Composite Loss
        total_loss = nll_loss + self.beta * kl_loss

        return LanguagePreservationOutput(
            loss=total_loss,
            nll_loss=nll_loss,
            kl_loss=kl_loss,
        )
