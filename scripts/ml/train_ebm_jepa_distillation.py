"""
EBM and JEPA Joint Distillation Training Engine.
Trains contrastive energy basins and latent representation prediction on CLI agent trajectories.
"""
from typing import Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F

def contrastive_margin_loss(e_chosen: torch.Tensor, e_rejected: torch.Tensor, margin: float = 2.0) -> torch.Tensor:
    """
    L_ebm = E(s, a_chosen) + max(0, margin - E(s, a_rejected))
    Pulls chosen actions toward 0 energy; pushes rejected actions above margin.
    """
    loss_chosen = torch.mean(e_chosen)
    loss_rejected = torch.mean(F.relu(margin - e_rejected))
    return loss_chosen + loss_rejected

def train_ebm_jepa_epoch(
    ebm: nn.Module,
    jepa: nn.Module,
    dataloader: torch.utils.data.DataLoader,
    optimizer: torch.optim.Optimizer,
    margin: float = 2.0
) -> Tuple[float, float]:
    ebm.train()
    jepa.train()

    total_loss = 0.0
    total_delta = 0.0
    batches = 0

    for batch in dataloader:
        state = batch["state"]
        chosen_action = batch["chosen_action"]
        rejected_action = batch["rejected_action"]

        optimizer.zero_grad()

        # 1. Forward EBM on chosen and rejected
        e_chosen = ebm(state, chosen_action)
        e_rejected = ebm(state, rejected_action)

        loss_ebm = contrastive_margin_loss(e_chosen, e_rejected, margin=margin)

        # 2. Forward JEPA State Predictor
        # For teacher distillation, next state is approximated as the state conditioned on chosen action
        pred_next_state = jepa(state, chosen_action)
        # Cosine embedding loss against actual chosen representation
        loss_jepa = 1.0 - F.cosine_similarity(pred_next_state, chosen_action, dim=-1).mean()

        total_batch_loss = loss_ebm + loss_jepa
        total_batch_loss.backward()

        nn.utils.clip_grad_norm_(list(ebm.parameters()) + list(jepa.parameters()), max_norm=1.0)
        optimizer.step()

        total_loss += total_batch_loss.item()
        total_delta += (e_rejected.mean() - e_chosen.mean()).item()
        batches += 1

    mean_loss = total_loss / max(1, batches)
    mean_delta = total_delta / max(1, batches)
    return mean_loss, mean_delta
