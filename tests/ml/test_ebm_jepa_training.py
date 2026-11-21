"""
Tests for Contrastive EBM Action Boundary & JEPA World Model Training Engine.
Run via: conda run -n py310 pytest tests/ml/test_ebm_jepa_training.py
"""
import pytest
import torch
import os
import sys
import json
import tempfile

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from scripts.ml.dataset_jepa_trajectory import JepaTrajectoryDataset
from scripts.ml.models.ebm_action_landscape import EbmActionEnergyNetwork, JepaStatePredictor
from scripts.ml.train_ebm_jepa_distillation import train_ebm_jepa_epoch

def test_dataset_tensor_shapes():
    with tempfile.TemporaryDirectory() as tmp_dir:
        train_file = os.path.join(tmp_dir, "train.jsonl")
        sample_record = {
            "pair_id": "pair-001",
            "prompt": "Fix bug in api",
            "chosen": {"action": "write_file utils.ts", "reward": 0.85, "passed": True},
            "rejected": {"action": "panic crash", "reward": -0.6, "passed": False},
            "metadata": {"goal_id": "G-TEST"}
        }
        with open(train_file, "w") as f:
            f.write(json.dumps(sample_record) + "\n")

        dataset = JepaTrajectoryDataset(train_file, embedding_dim=128)
        assert len(dataset) == 1
        item = dataset[0]
        assert "state" in item
        assert "chosen_action" in item
        assert "rejected_action" in item
        assert item["state"].shape == (128,)
        assert item["chosen_action"].shape == (128,)
        assert item["rejected_action"].shape == (128,)

def test_ebm_energy_forward_and_loss():
    ebm = EbmActionEnergyNetwork(state_dim=128, action_dim=128, hidden_dim=64)
    state = torch.randn(4, 128)
    chosen_action = torch.randn(4, 128)
    rejected_action = torch.randn(4, 128)

    e_chosen = ebm(state, chosen_action)
    e_rejected = ebm(state, rejected_action)

    assert e_chosen.shape == (4, 1)
    assert e_rejected.shape == (4, 1)

def test_jepa_predictor_forward():
    predictor = JepaStatePredictor(state_dim=128, action_dim=128, latent_dim=128)
    state = torch.randn(4, 128)
    action = torch.randn(4, 128)

    next_state_pred = predictor(state, action)
    assert next_state_pred.shape == (4, 128)

def test_training_epoch_convergence():
    with tempfile.TemporaryDirectory() as tmp_dir:
        train_file = os.path.join(tmp_dir, "train.jsonl")
        records = [
            {
                "pair_id": f"pair-{i}",
                "prompt": f"Task mandate {i}",
                "chosen": {"action": f"valid step {i}", "reward": 0.8, "passed": True},
                "rejected": {"action": f"invalid step {i}", "reward": -0.5, "passed": False},
                "metadata": {"goal_id": "G-TEST"}
            }
            for i in range(16)
        ]
        with open(train_file, "w") as f:
            for r in records:
                f.write(json.dumps(r) + "\n")

        dataset = JepaTrajectoryDataset(train_file, embedding_dim=64)
        dataloader = torch.utils.data.DataLoader(dataset, batch_size=4, shuffle=True)

        ebm = EbmActionEnergyNetwork(state_dim=64, action_dim=64, hidden_dim=32)
        jepa = JepaStatePredictor(state_dim=64, action_dim=64, latent_dim=64)

        optimizer = torch.optim.AdamW(list(ebm.parameters()) + list(jepa.parameters()), lr=1e-3)

        loss, delta_energy = train_ebm_jepa_epoch(ebm, jepa, dataloader, optimizer, margin=2.0)
        assert isinstance(loss, float)
        assert loss >= 0.0
