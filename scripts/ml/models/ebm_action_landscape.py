"""
EBM Action Landscape and JEPA State Predictor Neural Architectures.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F

class EbmActionEnergyNetwork(nn.Module):
    """
    Energy-Based Model computing scalar energy E(s, a) for state-action pairs.
    Low energy represents verified, valid actions; high energy represents invalid/destructive actions.
    """
    def __init__(self, state_dim: int = 128, action_dim: int = 128, hidden_dim: int = 64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim + action_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, 1)
        )

    def forward(self, state: torch.Tensor, action: torch.Tensor) -> torch.Tensor:
        x = torch.cat([state, action], dim=-1)
        # Enforce soft non-negativity using softplus
        return F.softplus(self.net(x))

class JepaStatePredictor(nn.Module):
    """
    Joint-Embedding Predictive Architecture predicting future latent states
    s_{t+1} from current state s_t and chosen action a_t without text token decoding.
    """
    def __init__(self, state_dim: int = 128, action_dim: int = 128, latent_dim: int = 128):
        super().__init__()
        self.predictor = nn.Sequential(
            nn.Linear(state_dim + action_dim, latent_dim * 2),
            nn.LayerNorm(latent_dim * 2),
            nn.GELU(),
            nn.Linear(latent_dim * 2, latent_dim),
            nn.LayerNorm(latent_dim)
        )

    def forward(self, state: torch.Tensor, action: torch.Tensor) -> torch.Tensor:
        x = torch.cat([state, action], dim=-1)
        return self.predictor(x)
