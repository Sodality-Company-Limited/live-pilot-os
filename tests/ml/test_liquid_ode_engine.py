"""
Tests for Continuous-Time Liquid Neural Network ODE Dynamics Engine.
Run via: conda run -n py310 pytest tests/ml/test_liquid_ode_engine.py
"""
import pytest
import torch
import os
import sys
import json
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from scripts.ml.dataset_liquid_trajectories import LiquidTrajectorySequenceDataset
from scripts.ml.models.liquid_neural_ode import LiquidNeuralODE
from scripts.ml.train_liquid_ode_trajectories import train_liquid_ode_epoch
from scripts.ml.benchmark_liquid_latency import benchmark_liquid_step_latency

def test_dataset_sequence_construction():
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

        dataset = LiquidTrajectorySequenceDataset(train_file, state_dim=32, seq_len=4)
        assert len(dataset) == 1
        item = dataset[0]
        assert item["inputs"].shape == (4, 32)
        assert item["targets"].shape == (4, 32)
        assert item["timestamps"].shape == (4,)

def test_liquid_ode_forward_pass():
    model = LiquidNeuralODE(state_dim=32, hidden_dim=64)
    inputs = torch.randn(2, 4, 32)  # (batch=2, seq_len=4, state_dim=32)

    outputs = model(inputs, dt=0.1)
    assert outputs.shape == (2, 4, 32)
    assert not torch.isnan(outputs).any()

def test_ode_training_epoch():
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
            for i in range(8)
        ]
        with open(train_file, "w") as f:
            for r in records:
                f.write(json.dumps(r) + "\n")

        dataset = LiquidTrajectorySequenceDataset(train_file, state_dim=32, seq_len=3)
        dataloader = torch.utils.data.DataLoader(dataset, batch_size=2, shuffle=True)

        model = LiquidNeuralODE(state_dim=32, hidden_dim=64)
        optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)

        loss = train_liquid_ode_epoch(model, dataloader, optimizer, dt=0.1)
        assert isinstance(loss, float)
        assert loss >= 0.0

def test_latency_sla_sub_3ms():
    model = LiquidNeuralODE(state_dim=32, hidden_dim=64)
    bench = benchmark_liquid_step_latency(model, iterations=100)

    assert bench["iterations"] == 100
    assert bench["mean_latency_ms"] <= 3.0
    assert bench["sla_passed"] is True
