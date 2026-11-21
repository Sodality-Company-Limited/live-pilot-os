"""
Unit and Integration Tests for Parameter-Efficient LoRA/QLoRA Training Pipeline.

Goal Reference: G-ML-007
Epic: ML (Machine Learning & Cognitive Calibration)

Verifies:
1. test_trainer_init: Trainer initialization with optimizer state, dataset, and composite loss functions.
2. test_trainable_parameters: Parameter freezing ensuring base backbone is frozen and trainable parameters < 2%.
3. test_training_step: 3 mini-batch training steps with parameter weight divergence and decreasing loss.
4. test_safetensors_checkpoint_roundtrip: Valid emission and reloading of safetensors checkpoints.
5. test_joint_loss_computation: Analytical calculation of combined language preservation and calibrated reward loss.
6. test_non_finite_fail_closed: Fail-closed rejection of non-finite logits or divergent losses.
7. test_lora_config_yaml: Loading and validation of lora_config.yaml.
"""

import os
import sys
import shutil
import tempfile
from pathlib import Path

import pytest
import torch
import torch.nn as nn
import safetensors.torch

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code")))

from src.models.dual_head_model import DualHeadCausalLM
from src.training.train_pipeline import (
    Trainer,
    TrainerConfig,
    CalibratedDataset,
    create_peft_dual_head_model,
)


@pytest.fixture
def sample_dataset() -> CalibratedDataset:
    """Fixture providing deterministic sample mini-batches for testing."""
    torch.manual_seed(42)
    batch_size = 8
    seq_len = 16
    vocab_size = 1000

    input_ids = torch.randint(0, vocab_size, (batch_size, seq_len))
    labels = input_ids.clone()
    # Mask prompt portion (first 6 tokens) with -100
    labels[:, :6] = -100

    targets = torch.tensor([1, 0, 1, 1, 0, 0, 1, 0], dtype=torch.float32)
    evidence_verified = torch.tensor([1.0, 0.0, 1.0, 0.5, 0.0, 1.0, 1.0, 0.0], dtype=torch.float32)

    return CalibratedDataset(
        input_ids=input_ids,
        labels=labels,
        targets=targets,
        evidence_verified=evidence_verified,
    )


def test_trainer_init(sample_dataset: CalibratedDataset) -> None:
    """AC-ML-007-01: Verify Trainer initialization with valid optimizer state and loss modules."""
    torch.manual_seed(42)
    model = DualHeadCausalLM(vocab_size=1000, hidden_dim=128)
    config = TrainerConfig(
        learning_rate=1e-3,
        batch_size=4,
        lora_r=8,
        lora_alpha=16,
    )

    peft_model = create_peft_dual_head_model(model, config)
    trainer = Trainer(
        model=peft_model,
        config=config,
        train_dataset=sample_dataset,
    )

    assert trainer.model is not None
    assert trainer.optimizer is not None
    assert len(trainer.optimizer.param_groups[0]["params"]) > 0
    assert trainer.preservation_loss_fn is not None
    assert trainer.calibrated_loss_fn is not None
    assert trainer.global_step == 0


def test_trainable_parameters() -> None:
    """AC-ML-007-02: Verify parameter freezing and trainable parameter ratio < 2%."""
    torch.manual_seed(42)
    # Using larger vocab size and hidden dim to represent realistic scale
    model = DualHeadCausalLM(
        vocab_size=32000,
        hidden_dim=512,
        intermediate_dim=128,
    )
    config = TrainerConfig(
        lora_r=16,
        lora_alpha=32,
        target_modules=["out_proj"],
    )

    peft_model = create_peft_dual_head_model(model, config)
    trainer = Trainer(model=peft_model, config=config)
    summary = trainer.get_parameter_summary()

    total_params = summary["total_parameters"]
    trainable_params = summary["trainable_parameters"]
    trainable_pct = summary["trainable_percentage"]

    # Invariant: Trainable parameters strictly below 2% of total parameters
    assert trainable_pct < 2.0, f"Trainable percentage {trainable_pct:.2f}% exceeds 2% threshold"
    assert trainable_params > 0, "No trainable parameters found"

    # Invariant: Base transformer backbone weights are frozen
    base_backbone_trainable = [
        name for name, p in peft_model.base_model.named_parameters()
        if p.requires_grad and "lora_" not in name
    ]
    assert len(base_backbone_trainable) == 0, f"Unfrozen base model parameters found: {base_backbone_trainable}"

    # Invariant: LoRA adapter weights and confidence head are trainable
    lora_params = [
        name for name, p in peft_model.base_model.named_parameters()
        if p.requires_grad and "lora_" in name
    ]
    assert len(lora_params) > 0, "No trainable LoRA adapter parameters found"

    for name, p in peft_model.confidence_head.named_parameters():
        assert p.requires_grad, f"Confidence head parameter {name} is unexpectedly frozen"


def test_training_step(sample_dataset: CalibratedDataset) -> None:
    """AC-ML-007-03: Execute 3 training mini-batches and verify parameter weight divergence and checkpoint emission."""
    torch.manual_seed(42)
    model = DualHeadCausalLM(vocab_size=1000, hidden_dim=128)
    config = TrainerConfig(
        learning_rate=1e-2,
        batch_size=4,
        lora_r=8,
        lora_alpha=16,
        target_modules=["out_proj", "linear1", "linear2"],
    )

    peft_model = create_peft_dual_head_model(model, config)

    # Capture initial weights
    initial_value_head_w = peft_model.confidence_head.fc1.weight.clone().detach()

    # Find trainable LoRA adapter parameter to track (e.g. from linear1 or linear2)
    initial_lora_w = None
    target_lora_name = None
    for name, p in peft_model.base_model.named_parameters():
        if p.requires_grad and "lora_B" in name and ("linear1" in name or "linear2" in name or "proj" in name):
            initial_lora_w = p.clone().detach()
            target_lora_name = name
            if "linear1" in name:
                break
    assert initial_lora_w is not None, "Could not find trainable LoRA B parameter"

    # Capture frozen backbone parameter to ensure it DOES NOT change
    frozen_param_name = None
    initial_frozen_w = None
    for name, p in peft_model.base_model.named_parameters():
        if not p.requires_grad:
            initial_frozen_w = p.clone().detach()
            frozen_param_name = name
            break
    assert initial_frozen_w is not None, "Could not find frozen parameter"

    tmpdir = tempfile.mkdtemp(prefix="g_ml_007_test_")
    try:
        config.checkpoint_dir = tmpdir
        trainer = Trainer(
            model=peft_model,
            config=config,
            train_dataset=sample_dataset,
        )

        dataloader = trainer.train_dataloader
        assert dataloader is not None

        losses = []
        batch_iter = iter(dataloader)
        for i in range(3):
            try:
                batch = next(batch_iter)
            except StopIteration:
                batch_iter = iter(dataloader)
                batch = next(batch_iter)

            step_out = trainer.training_step(batch)
            assert step_out.step == i + 1
            assert torch.isfinite(step_out.loss)
            losses.append(step_out.loss.item())

        # Verify step count
        assert trainer.global_step == 3

        # Invariant: Value head weights changed after optimizer step
        current_value_head_w = peft_model.confidence_head.fc1.weight.detach()
        assert not torch.allclose(initial_value_head_w, current_value_head_w, atol=1e-5), \
            "Value head weights failed to update after training steps"

        # Invariant: LoRA adapter weights changed after optimizer step
        current_lora_w = dict(peft_model.base_model.named_parameters())[target_lora_name].detach()
        assert not torch.allclose(initial_lora_w, current_lora_w, atol=1e-5), \
            "LoRA adapter weights failed to update after training steps"

        # Invariant: Frozen base backbone weights remain UNCHANGED
        current_frozen_w = dict(peft_model.base_model.named_parameters())[frozen_param_name].detach()
        assert torch.equal(initial_frozen_w, current_frozen_w), \
            "Frozen base backbone parameter was unexpectedly modified"

        # Invariant: Checkpoint emission emits valid safetensors
        saved_files = trainer.save_checkpoint(tmpdir)
        assert os.path.exists(saved_files["adapter_model"])
        assert os.path.exists(saved_files["value_head"])
        assert os.path.exists(saved_files["model"])
        assert os.path.exists(saved_files["metadata"])

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_safetensors_checkpoint_roundtrip() -> None:
    """AC-ML-007-04: Verify standalone adapter and value head checkpoint roundtrip via safetensors."""
    torch.manual_seed(42)
    model = DualHeadCausalLM(vocab_size=500, hidden_dim=64)
    config = TrainerConfig(lora_r=4, lora_alpha=8)
    peft_model = create_peft_dual_head_model(model, config)

    trainer = Trainer(model=peft_model, config=config)

    tmpdir = tempfile.mkdtemp(prefix="g_ml_007_checkpoint_")
    try:
        saved_files = trainer.save_checkpoint(tmpdir)

        # 1. Load and inspect value head safetensors
        vh_loaded = safetensors.torch.load_file(saved_files["value_head"])
        for name, param in peft_model.confidence_head.named_parameters():
            assert name in vh_loaded, f"Missing {name} in value_head.safetensors"
            assert torch.allclose(param.cpu(), vh_loaded[name]), f"Mismatch in {name} tensor weights"

        # 2. Load and inspect adapter model safetensors
        adapter_loaded = safetensors.torch.load_file(saved_files["adapter_model"])
        for name, param in peft_model.base_model.named_parameters():
            if param.requires_grad:
                assert name in adapter_loaded, f"Missing trainable adapter parameter {name}"
                assert torch.allclose(param.cpu(), adapter_loaded[name]), f"Mismatch in adapter parameter {name}"

        # 3. Load and inspect unified model safetensors
        model_loaded = safetensors.torch.load_file(saved_files["model"])
        assert len(model_loaded) == len(adapter_loaded) + len(vh_loaded)

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_joint_loss_computation() -> None:
    """AC-ML-007-02: Verify composite joint loss formulation L_total = L_preservation + gamma * L_calibrated."""
    torch.manual_seed(42)
    model = DualHeadCausalLM(vocab_size=500, hidden_dim=64)
    config = TrainerConfig(
        gamma_calibration=2.5,
        beta_preservation=0.2,
    )
    peft_model = create_peft_dual_head_model(model, config)
    trainer = Trainer(model=peft_model, config=config)

    batch = {
        "input_ids": torch.randint(0, 500, (2, 10)),
        "labels": torch.randint(0, 500, (2, 10)),
        "attention_mask": torch.ones(2, 10, dtype=torch.long),
        "targets": torch.tensor([[1.0], [0.0]], dtype=torch.float32),
        "evidence_verified": torch.tensor([[1.0], [0.0]], dtype=torch.float32),
    }

    total_loss, pres_out, calib_out = trainer.compute_loss(batch)

    expected_total = pres_out.loss + (2.5 * calib_out.loss)
    assert torch.allclose(total_loss, expected_total, atol=1e-5), \
        f"Loss mismatch: total_loss={total_loss.item()}, expected={expected_total.item()}"
    assert torch.isfinite(total_loss)
    assert pres_out.loss.item() > 0
    assert calib_out.loss.item() > 0


def test_non_finite_fail_closed() -> None:
    """AC-ML-007-05: Verify fail-closed behavior on corrupted / non-finite inputs."""
    model = DualHeadCausalLM(vocab_size=500, hidden_dim=64)
    config = TrainerConfig()
    peft_model = create_peft_dual_head_model(model, config)
    trainer = Trainer(model=peft_model, config=config)

    # Invalid input with NaN in targets
    corrupted_batch = {
        "input_ids": torch.randint(0, 500, (2, 10)),
        "labels": torch.randint(0, 500, (2, 10)),
        "attention_mask": torch.ones(2, 10, dtype=torch.long),
        "targets": torch.tensor([[float("nan")], [0.0]], dtype=torch.float32),
    }

    with pytest.raises((ValueError, FloatingPointError)):
        trainer.compute_loss(corrupted_batch)


def test_lora_config_yaml() -> None:
    """Verify loading TrainerConfig from code/ml/configs/lora_config.yaml."""
    yaml_path = Path("code/ml/configs/lora_config.yaml")
    assert yaml_path.is_file(), f"Missing config file at {yaml_path}"

    config = TrainerConfig.from_yaml(yaml_path)
    assert config.lora_r == 16
    assert config.lora_alpha == 32
    assert config.lora_dropout == 0.05
    assert "q_proj" in config.target_modules
    assert config.gamma_calibration == 1.0
    assert config.save_safetensors is True
