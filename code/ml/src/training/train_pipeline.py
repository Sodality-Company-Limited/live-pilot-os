"""
Parameter-Efficient LoRA/QLoRA Training Pipeline Orchestrator.

Goal Reference: G-ML-007
Epic: ML (Machine Learning & Cognitive Calibration)

Provides:
1. TrainerConfig: Configuration schema for PEFT LoRA adapter injection and dual-objective optimization.
2. CalibratedDataset: PyTorch Dataset for tokenized sequences, completion labels, and calibrated target outcomes.
3. Trainer: End-to-end training orchestrator coordinating data loading, PEFT LoRA parameter freezing,
   joint objective computation (Language Preservation + Calibrated RLCD Reward), gradient backpropagation,
   and safetensors checkpoint persistence.
4. create_peft_dual_head_model: Factory function attaching PEFT LoRA adapters to attention projection layers
   while keeping base transformer backbone frozen and value head trainable.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import yaml
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import safetensors.torch
from peft import LoraConfig, get_peft_model, PeftModel

try:
    from ..models.dual_head_model import DualHeadCausalLM, DualHeadOutput
    from .losses.language_preservation import LanguagePreservationLoss, LanguagePreservationOutput
    from .losses.calibrated_reward import CalibratedRewardLoss, CalibratedRewardOutput
except (ImportError, ValueError):
    from src.models.dual_head_model import DualHeadCausalLM, DualHeadOutput
    from src.training.losses.language_preservation import LanguagePreservationLoss, LanguagePreservationOutput
    from src.training.losses.calibrated_reward import CalibratedRewardLoss, CalibratedRewardOutput


@dataclass
class TrainerConfig:
    """Configuration dataclass for parameter-efficient dual-head training."""

    # Optimization parameters
    learning_rate: float = 1e-4
    weight_decay: float = 0.01
    max_grad_norm: float = 1.0
    warmup_steps: int = 0
    batch_size: int = 4
    gradient_accumulation_steps: int = 1

    # LoRA PEFT parameters
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: List[str] = field(
        default_factory=lambda: [
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "out_proj",
            "linear1",
            "linear2",
        ]
    )
    bias: str = "none"

    # Multi-task objective balancing weights
    gamma_calibration: float = 1.0
    beta_preservation: float = 0.1
    alpha_overconfidence: float = 2.0
    lambda_brier: float = 0.1
    lambda_evidence: float = 0.5
    epsilon: float = 1e-7

    # Precision & Execution environment
    device: str = "cpu"
    mixed_precision: str = "float32"  # 'float32', 'bfloat16', 'float16'
    checkpoint_dir: str = "checkpoints/g-ml-007"
    save_safetensors: bool = True

    def __post_init__(self) -> None:
        if self.learning_rate <= 0.0:
            raise ValueError(f"learning_rate must be positive, got {self.learning_rate}")
        if self.weight_decay < 0.0:
            raise ValueError(f"weight_decay must be non-negative, got {self.weight_decay}")
        if self.lora_r <= 0:
            raise ValueError(f"lora_r must be positive integer, got {self.lora_r}")
        if self.lora_alpha <= 0:
            raise ValueError(f"lora_alpha must be positive integer, got {self.lora_alpha}")
        if not (0.0 <= self.lora_dropout < 1.0):
            raise ValueError(f"lora_dropout must be in [0.0, 1.0), got {self.lora_dropout}")
        if self.gamma_calibration < 0.0:
            raise ValueError(f"gamma_calibration must be non-negative, got {self.gamma_calibration}")

    @classmethod
    def from_yaml(cls, yaml_path: Union[str, Path]) -> "TrainerConfig":
        """Load configuration from a YAML file."""
        p = Path(yaml_path)
        if not p.is_file():
            raise FileNotFoundError(f"Configuration file not found: {yaml_path}")

        with open(p, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if not isinstance(data, dict):
            raise ValueError(f"Invalid YAML config format in {yaml_path}")

        lora_cfg = data.get("peft_lora", {})
        train_cfg = data.get("training", {})

        return cls(
            learning_rate=float(train_cfg.get("learning_rate", 1e-4)),
            weight_decay=float(train_cfg.get("weight_decay", 0.01)),
            max_grad_norm=float(train_cfg.get("max_grad_norm", 1.0)),
            batch_size=int(train_cfg.get("batch_size", 4)),
            gradient_accumulation_steps=int(train_cfg.get("gradient_accumulation_steps", 1)),
            lora_r=int(lora_cfg.get("r", 16)),
            lora_alpha=int(lora_cfg.get("lora_alpha", 32)),
            lora_dropout=float(lora_cfg.get("lora_dropout", 0.05)),
            target_modules=list(
                lora_cfg.get(
                    "target_modules",
                    ["q_proj", "k_proj", "v_proj", "o_proj", "out_proj", "linear1", "linear2"],
                )
            ),
            bias=str(lora_cfg.get("bias", "none")),
            gamma_calibration=float(train_cfg.get("gamma_calibration", 1.0)),
            checkpoint_dir=str(train_cfg.get("checkpoint_dir", "checkpoints/g-ml-007")),
            save_safetensors=bool(train_cfg.get("save_safetensors", True)),
        )


@dataclass
class TrainingStepOutput:
    """Structured container for single training mini-batch step results."""
    loss: torch.Tensor
    preservation_loss: torch.Tensor
    calibration_loss: torch.Tensor
    nll_loss: torch.Tensor
    kl_loss: torch.Tensor
    proper_loss: torch.Tensor
    overconfidence_penalty: torch.Tensor
    brier_loss: torch.Tensor
    evidence_penalty: torch.Tensor
    learning_rate: float
    step: int

    def as_dict(self) -> Dict[str, Any]:
        return {
            "loss": float(self.loss.detach().item()),
            "preservation_loss": float(self.preservation_loss.detach().item()),
            "calibration_loss": float(self.calibration_loss.detach().item()),
            "nll_loss": float(self.nll_loss.detach().item()),
            "kl_loss": float(self.kl_loss.detach().item()),
            "proper_loss": float(self.proper_loss.detach().item()),
            "overconfidence_penalty": float(self.overconfidence_penalty.detach().item()),
            "brier_loss": float(self.brier_loss.detach().item()),
            "evidence_penalty": float(self.evidence_penalty.detach().item()),
            "learning_rate": self.learning_rate,
            "step": self.step,
        }


class CalibratedDataset(Dataset):
    """
    In-memory dataset for tokenized causal LM sequences and calibration labels.
    """

    def __init__(
        self,
        input_ids: torch.Tensor,
        labels: torch.Tensor,
        targets: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        evidence_verified: Optional[torch.Tensor] = None,
    ) -> None:
        if input_ids.dim() != 2:
            raise ValueError(f"input_ids must be 2D tensor [batch, seq_len], got {input_ids.shape}")
        if labels.dim() != 2:
            raise ValueError(f"labels must be 2D tensor [batch, seq_len], got {labels.shape}")
        if input_ids.shape != labels.shape:
            raise ValueError(f"Shape mismatch: input_ids={input_ids.shape}, labels={labels.shape}")

        num_samples = input_ids.size(0)
        if targets.dim() == 1:
            targets = targets.unsqueeze(-1)
        if targets.size(0) != num_samples:
            raise ValueError(f"targets count {targets.size(0)} does not match samples {num_samples}")

        self.input_ids = input_ids.long()
        self.labels = labels.long()
        self.targets = targets.float()

        if attention_mask is not None:
            if attention_mask.shape != input_ids.shape:
                raise ValueError("attention_mask shape must match input_ids")
            self.attention_mask = attention_mask.long()
        else:
            self.attention_mask = torch.ones_like(input_ids, dtype=torch.long)

        if evidence_verified is not None:
            if evidence_verified.dim() == 1:
                evidence_verified = evidence_verified.unsqueeze(-1)
            if evidence_verified.size(0) != num_samples:
                raise ValueError("evidence_verified size mismatch")
            self.evidence_verified = evidence_verified.float()
        else:
            self.evidence_verified = torch.ones_like(self.targets, dtype=torch.float32)

    def __len__(self) -> int:
        return self.input_ids.size(0)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        return {
            "input_ids": self.input_ids[idx],
            "labels": self.labels[idx],
            "attention_mask": self.attention_mask[idx],
            "targets": self.targets[idx],
            "evidence_verified": self.evidence_verified[idx],
        }


def create_peft_dual_head_model(
    model: DualHeadCausalLM,
    config: Optional[TrainerConfig] = None,
) -> DualHeadCausalLM:
    """
    Attaches PEFT LoRA adapters to linear projections of the base causal transformer
    while keeping the base backbone parameters completely frozen and the auxiliary
    confidence/value head fully trainable.

    Args:
        model: Concrete DualHeadCausalLM instance.
        config: Optional TrainerConfig specifying LoRA rank, alpha, dropout, and targets.

    Returns:
        DualHeadCausalLM with injected LoRA adapters and configured gradient flags.
    """
    if config is None:
        config = TrainerConfig()

    # Discover candidate target modules present in model.base_model
    existing_module_names = set()
    for name, module in model.base_model.named_modules():
        if isinstance(module, (nn.Linear,)):
            mod_suffix = name.split(".")[-1]
            existing_module_names.add(mod_suffix)

    # Filter targets to those actually present in base model
    applicable_targets = [t for t in config.target_modules if t in existing_module_names]
    if not applicable_targets:
        # Fallback to any linear module in transformer layers
        applicable_targets = list(existing_module_names)

    peft_lora_config = LoraConfig(
        r=config.lora_r,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        target_modules=applicable_targets,
        bias=config.bias,
    )

    # Wrap the base model with PEFT LoraModel
    peft_base = get_peft_model(model.base_model, peft_lora_config)
    model.base_model = peft_base

    # Strictly enforce parameter freezing:
    # 1. Base model weights: requires_grad = False
    # 2. LoRA weights: requires_grad = True
    # 3. Confidence value head: requires_grad = True
    for name, param in model.base_model.named_parameters():
        if "lora_" in name:
            param.requires_grad = True
        else:
            param.requires_grad = False

    for param in model.confidence_head.parameters():
        param.requires_grad = True

    return model


class Trainer:
    """
    End-to-end Parameter-Efficient Training Pipeline Orchestrator.
    
    Coordinates:
    - Data loading via PyTorch DataLoader
    - DualHead forward pass execution
    - Composite objective calculation (Language Preservation + Calibrated Reward)
    - Gradient backpropagation with gradient clipping
    - Optimizer and learning rate scheduling
    - Checkpoint emission and atomic safetensors saving
    """

    def __init__(
        self,
        model: DualHeadCausalLM,
        config: Optional[TrainerConfig] = None,
        train_dataset: Optional[Dataset] = None,
        reference_model: Optional[nn.Module] = None,
        optimizer: Optional[torch.optim.Optimizer] = None,
        lr_scheduler: Optional[Any] = None,
    ) -> None:
        self.config = config or TrainerConfig()
        self.model = model
        self.reference_model = reference_model

        # Ensure model is on requested device
        self.device = torch.device(self.config.device)
        self.model.to(self.device)
        if self.reference_model is not None:
            self.reference_model.to(self.device)
            self.reference_model.eval()
            for p in self.reference_model.parameters():
                p.requires_grad = False

        # Loss modules
        self.preservation_loss_fn = LanguagePreservationLoss(
            beta=self.config.beta_preservation,
            reduction="mean",
        )
        self.calibrated_loss_fn = CalibratedRewardLoss(
            alpha_overconfidence=self.config.alpha_overconfidence,
            lambda_brier=self.config.lambda_brier,
            lambda_evidence=self.config.lambda_evidence,
            epsilon=self.config.epsilon,
            reduction="mean",
        )

        # Datasets & Loaders
        self.train_dataset = train_dataset
        self.train_dataloader = None
        if self.train_dataset is not None:
            self.train_dataloader = DataLoader(
                self.train_dataset,
                batch_size=self.config.batch_size,
                shuffle=True,
            )

        # Optimizer setup: collect only active trainable parameters
        trainable_params = [p for p in self.model.parameters() if p.requires_grad]
        if not trainable_params:
            raise ValueError("No trainable parameters found in model. Ensure LoRA or value head has requires_grad=True.")

        if optimizer is not None:
            self.optimizer = optimizer
        else:
            self.optimizer = torch.optim.AdamW(
                trainable_params,
                lr=self.config.learning_rate,
                weight_decay=self.config.weight_decay,
            )

        self.lr_scheduler = lr_scheduler
        self.global_step = 0

    def compute_loss(
        self,
        batch: Dict[str, torch.Tensor],
    ) -> Tuple[torch.Tensor, LanguagePreservationOutput, CalibratedRewardOutput]:
        """
        Computes the composite training loss for a single batch:
            L_total = L_preservation + gamma * L_calibrated
        """
        input_ids = batch["input_ids"].to(self.device)
        labels = batch["labels"].to(self.device)
        attention_mask = batch.get("attention_mask")
        if attention_mask is not None:
            attention_mask = attention_mask.to(self.device)
        targets = batch["targets"].to(self.device)
        evidence_verified = batch.get("evidence_verified")
        if evidence_verified is not None:
            evidence_verified = evidence_verified.to(self.device)

        # Forward pass on trainable student dual-head model
        student_output: DualHeadOutput = self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
        )

        # Fail-closed numerical checks
        if not torch.isfinite(student_output.logits).all():
            raise FloatingPointError("Non-finite logits (NaN or Inf) detected in model forward pass.")
        if not torch.isfinite(student_output.confidence).all():
            raise FloatingPointError("Non-finite confidence values (NaN or Inf) detected in model forward pass.")

        # Reference model forward pass if provided
        reference_logits = None
        if self.reference_model is not None:
            with torch.no_grad():
                ref_out = self.reference_model(input_ids=input_ids, attention_mask=attention_mask)
                if isinstance(ref_out, tuple):
                    reference_logits = ref_out[0]
                elif hasattr(ref_out, "logits"):
                    reference_logits = ref_out.logits

        # Compute Language Preservation loss
        preservation_out = self.preservation_loss_fn(
            student_logits=student_output.logits,
            labels=labels,
            reference_logits=reference_logits,
            attention_mask=attention_mask,
        )

        # Compute Calibrated RLCD loss
        calibrated_out = self.calibrated_loss_fn(
            confidence=student_output.confidence,
            targets=targets,
            evidence_verified=evidence_verified,
        )

        # Total combined loss
        total_loss = preservation_out.loss + (self.config.gamma_calibration * calibrated_out.loss)

        if not torch.isfinite(total_loss):
            raise FloatingPointError(f"Non-finite total loss: {total_loss.item()}")

        return total_loss, preservation_out, calibrated_out

    def training_step(self, batch: Dict[str, torch.Tensor]) -> TrainingStepOutput:
        """
        Executes a single optimization step on a mini-batch:
        Forward -> Composite Loss -> Backward -> Gradient Clip -> Optimizer Step.
        """
        self.model.train()
        self.optimizer.zero_grad()

        total_loss, pres_out, calib_out = self.compute_loss(batch)

        total_loss.backward()

        # Gradient clipping
        if self.config.max_grad_norm > 0:
            torch.nn.utils.clip_grad_norm_(
                [p for p in self.model.parameters() if p.requires_grad],
                self.config.max_grad_norm,
            )

        self.optimizer.step()
        if self.lr_scheduler is not None:
            self.lr_scheduler.step()

        self.global_step += 1
        current_lr = self.optimizer.param_groups[0]["lr"]

        return TrainingStepOutput(
            loss=total_loss,
            preservation_loss=pres_out.loss,
            calibration_loss=calib_out.loss,
            nll_loss=pres_out.nll_loss,
            kl_loss=pres_out.kl_loss,
            proper_loss=calib_out.proper_loss,
            overconfidence_penalty=calib_out.overconfidence_penalty,
            brier_loss=calib_out.brier_loss,
            evidence_penalty=calib_out.evidence_penalty,
            learning_rate=current_lr,
            step=self.global_step,
        )

    def train_epochs(self, num_epochs: int = 1) -> List[TrainingStepOutput]:
        """Runs complete training epochs across the dataloader."""
        if self.train_dataloader is None:
            raise ValueError("train_dataset or train_dataloader must be provided for train_epochs")

        history: List[TrainingStepOutput] = []
        for epoch in range(num_epochs):
            for batch in self.train_dataloader:
                step_out = self.training_step(batch)
                history.append(step_out)

        return history

    def save_checkpoint(self, output_dir: Optional[Union[str, Path]] = None) -> Dict[str, str]:
        """
        Persists standalone adapter weights and auxiliary value head parameters in safetensors format.

        Emits:
        - adapter_model.safetensors: Trainable LoRA adapter parameter tensors.
        - value_head.safetensors: Auxiliary confidence value head parameter tensors.
        - model.safetensors: Complete set of trainable parameter tensors.
        - checkpoint_metadata.json: Audit metadata including step, loss metrics, and architecture info.

        Returns:
            Dictionary mapping artifact names to their absolute file paths.
        """
        save_dir = Path(output_dir or self.config.checkpoint_dir)
        save_dir.mkdir(parents=True, exist_ok=True)

        emitted_files: Dict[str, str] = {}

        # 1. Extract LoRA adapter state dict (parameters with requires_grad in base_model)
        adapter_state: Dict[str, torch.Tensor] = {}
        for name, param in self.model.base_model.named_parameters():
            if param.requires_grad or "lora_" in name:
                adapter_state[name] = param.detach().cpu().contiguous()

        adapter_path = save_dir / "adapter_model.safetensors"
        safetensors.torch.save_file(adapter_state, str(adapter_path))
        emitted_files["adapter_model"] = str(adapter_path.resolve())

        # 2. Extract Confidence Value Head state dict
        value_head_state: Dict[str, torch.Tensor] = {
            name: param.detach().cpu().contiguous()
            for name, param in self.model.confidence_head.named_parameters()
        }
        value_head_path = save_dir / "value_head.safetensors"
        safetensors.torch.save_file(value_head_state, str(value_head_path))
        emitted_files["value_head"] = str(value_head_path.resolve())

        # 3. Extract Unified Trainable Weights
        all_trainable_state: Dict[str, torch.Tensor] = {
            name: param.detach().cpu().contiguous()
            for name, param in self.model.named_parameters()
            if param.requires_grad
        }
        model_path = save_dir / "model.safetensors"
        safetensors.torch.save_file(all_trainable_state, str(model_path))
        emitted_files["model"] = str(model_path.resolve())

        # 4. Save metadata audit json
        meta = {
            "goal_id": "G-ML-007",
            "step": self.global_step,
            "lora_r": self.config.lora_r,
            "lora_alpha": self.config.lora_alpha,
            "gamma_calibration": self.config.gamma_calibration,
            "device": str(self.device),
            "files": list(emitted_files.keys()),
        }
        meta_path = save_dir / "checkpoint_metadata.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
        emitted_files["metadata"] = str(meta_path.resolve())

        return emitted_files

    def get_parameter_summary(self) -> Dict[str, Any]:
        """Computes parameter counts and trainable ratio."""
        total_params = sum(p.numel() for p in self.model.parameters())
        trainable_params = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        frozen_params = total_params - trainable_params
        ratio = (trainable_params / total_params) if total_params > 0 else 0.0

        return {
            "total_parameters": total_params,
            "trainable_parameters": trainable_params,
            "frozen_parameters": frozen_params,
            "trainable_ratio": ratio,
            "trainable_percentage": ratio * 100.0,
        }
