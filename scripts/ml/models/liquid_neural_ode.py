"""
Continuous-Time Liquid Neural Network ODE Dynamics Model.
Implements nonlinear Ordinary Differential Equations:
dx/dt = - tau(I(t)) * x(t) + f(x(t), I(t), theta)
Solved via Runge-Kutta 4th Order (RK4) numerical ODE integration.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F

class LiquidNeuralODE(nn.Module):
    def __init__(self, state_dim: int = 64, hidden_dim: int = 128):
        super().__init__()
        self.state_dim = state_dim
        self.hidden_dim = hidden_dim

        # Variable time-constant tau(I) >= 0.1
        self.tau_net = nn.Sequential(
            nn.Linear(state_dim, hidden_dim // 2),
            nn.SiLU(),
            nn.Linear(hidden_dim // 2, state_dim),
            nn.Softplus()
        )

        # Nonlinear coupling dynamics f(x, I, theta)
        self.coupling_net = nn.Sequential(
            nn.Linear(state_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, state_dim)
        )

        # Readout decoder mapping latent ODE state to action parameters
        self.decoder = nn.Sequential(
            nn.Linear(state_dim, hidden_dim // 2),
            nn.SiLU(),
            nn.Linear(hidden_dim // 2, state_dim)
        )

    def ode_derivative(self, x: torch.Tensor, I: torch.Tensor) -> torch.Tensor:
        """
        Computes dx/dt = -tau(I) * x + f(x, I).
        """
        tau = self.tau_net(I) + 0.1  # Guarantee bounded strictly positive time-constant
        combined = torch.cat([x, I], dim=-1)
        coupling = self.coupling_net(combined)
        return -tau * x + coupling

    def rk4_step(self, x: torch.Tensor, I: torch.Tensor, dt: float) -> torch.Tensor:
        """
        Runge-Kutta 4th Order integration step.
        """
        k1 = self.ode_derivative(x, I)
        k2 = self.ode_derivative(x + 0.5 * dt * k1, I)
        k3 = self.ode_derivative(x + 0.5 * dt * k2, I)
        k4 = self.ode_derivative(x + dt * k3, I)
        return x + (dt / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)

    def forward(self, input_sequence: torch.Tensor, dt: float = 0.1) -> torch.Tensor:
        """
        Integrates forward across a batch of sequential inputs.
        input_sequence: (batch, seq_len, state_dim)
        Returns: (batch, seq_len, state_dim) decoded predictions.
        """
        batch_size, seq_len, _ = input_sequence.shape
        x = torch.zeros(batch_size, self.state_dim, device=input_sequence.device, dtype=input_sequence.dtype)

        outputs = []
        for t in range(seq_len):
            I_t = input_sequence[:, t, :]
            x = self.rk4_step(x, I_t, dt)
            y_t = self.decoder(x)
            outputs.append(y_t)

        return torch.stack(outputs, dim=1)
