"""
Low-Latency Benchmarking Engine for Continuous-Time Liquid Neural ODE.
Certifies sub-3ms single-step inference latency SLA.
"""
import time
from typing import Dict
import torch
from scripts.ml.models.liquid_neural_ode import LiquidNeuralODE

def benchmark_liquid_step_latency(model: LiquidNeuralODE, iterations: int = 500) -> Dict[str, float]:
    model.eval()
    device = next(model.parameters()).device
    dummy_input = torch.randn(1, 1, model.state_dim, device=device)

    # Warmup
    with torch.no_grad():
        for _ in range(20):
            _ = model(dummy_input)

    times_ms = []
    with torch.no_grad():
        for _ in range(iterations):
            t0 = time.perf_counter()
            _ = model(dummy_input)
            t1 = time.perf_counter()
            times_ms.append((t1 - t0) * 1000.0)

    times_ms.sort()
    mean_latency = sum(times_ms) / len(times_ms)
    p95_latency = times_ms[int(len(times_ms) * 0.95)]
    p99_latency = times_ms[int(len(times_ms) * 0.99)]

    return {
        "iterations": iterations,
        "mean_latency_ms": round(mean_latency, 4),
        "p95_latency_ms": round(p95_latency, 4),
        "p99_latency_ms": round(p99_latency, 4),
        "sla_passed": mean_latency <= 3.0,
    }
