"""
Liquid Neural Network ODE Training Engine.
Trains continuous-time differential dynamics on sequential CLI trajectory streams.
"""
from typing import Tuple
import torch
import torch.nn as nn

def train_liquid_ode_epoch(
    model: nn.Module,
    dataloader: torch.utils.data.DataLoader,
    optimizer: torch.optim.Optimizer,
    dt: float = 0.1
) -> float:
    model.train()
    total_loss = 0.0
    batches = 0
    criterion = nn.MSELoss()

    for batch in dataloader:
        inputs = batch["inputs"]      # (batch, seq_len, state_dim)
        targets = batch["targets"]    # (batch, seq_len, state_dim)

        optimizer.zero_grad()
        predictions = model(inputs, dt=dt)

        loss = criterion(predictions, targets)
        loss.backward()

        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_loss += loss.item()
        batches += 1

    return total_loss / max(1, batches)
