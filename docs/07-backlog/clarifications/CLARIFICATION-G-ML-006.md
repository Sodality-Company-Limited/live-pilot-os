# 🔄 Socratic Clarification State Machine: Goal G-ML-006 Calibrated RLCD Reward and Asymmetric Loss Function

> **Goal ID:** `G-ML-006`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-ML-006](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-ML-006.md)  
> **Created At:** `2026-09-30T08:45:00+07:00`  
> **Updated At:** `2026-09-30T08:45:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Calibrated RLCD Reward Loss Module)** -> Confirmed Option 1.1: Implement a standalone PyTorch loss module (`CalibratedRewardLoss`) combining proper logarithmic scoring, Brier distance regularization, asymmetric quadratic overconfidence penalties for erroneous assertions, and evidence penalty scaling, providing the optimization gradient that trains agent uncertainty heads.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: Enforce at least 5x higher loss for incorrect decisions at confidence 0.95 vs 0.20 ($L(c=0.95) \ge 5 \times L(c=0.20)$ for $y^* = 0$), finite values without NaN or Inf at boundary bounds $c \in \{0.0, 1.0\}$, analytical gradient check precision $\le 10^{-5}$ via `torch.autograd.gradcheck`, monotonic reward reduction upon absent evidence, and sub-250ms execution latency.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Python PyTorch module in `code/ml/src/training/losses/calibrated_reward.py` exposing `CalibratedRewardLoss` and `CalibratedRewardOutput` with callable signature `forward(confidence, targets, evidence_verified=None)` returning a structured container with `loss`, `proper_loss`, `overconfidence_penalty`, `brier_loss`, `evidence_penalty`, and `reward`.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Seamless autograd backward execution supporting standard PyTorch optimizers, configurable penalty coefficients (`alpha_overconfidence \ge 0.0`, `lambda_brier \ge 0.0`, `lambda_evidence \ge 0.0`), numerical stability clamping $\epsilon = 10^{-7}$, and reduction options (`mean`, `sum`, `none`).
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Fail-closed boundary guards; non-finite confidence or targets trigger fatal `ValueError`; empty batch inputs trigger fatal `ValueError`; confidence outside $[0.0, 1.0]$ or invalid target values outside $\{0, 1\}$ trigger fatal `ValueError`; numerical stability guaranteed under extreme bounds via epsilon clamping.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Provenance)** -> Confirmed Option 6.1: Sub-250ms per decision latency budget, 100% concrete PyTorch neural network tensor implementation without mock objects or dummy returns, verifiable via `pytest tests/ml/test_calibrated_loss.py`, `mathematical-invariant-proof-harness.mjs G-ML-006`, and `goal-template-conformance-harness.mjs G-ML-006`.

---

## 🏛️ Context & Problem Statement

Current language model training optimizes for binary correctness, encouraging overconfident hallucinations in autonomous agent workflows. This goal implements the RLCD loss objective that severely penalizes confident wrong decisions:
1. **Overconfidence Crisis in Agent Decisions:** Uncalibrated agents asserting erroneous code or destructive actions with high confidence bypass safety gates and corrupt production environments.
2. **Proper Scoring Rule Guarantees:** Logarithmic scoring and Brier regularization incentivize models to output strictly honest probabilistic forecasts reflecting true underlying empirical uncertainty.
3. **Asymmetric Penalty Mechanics:** Symmetric loss functions treat confident errors identically to cautious errors; an asymmetric loss must impose severe quadratic penalties on incorrect decisions asserted with high certainty ($c \to 1.0$).

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Capability Coverage)
- [x] **Option 1.1: Calibrated RLCD Reward Loss Scope**
  - Author `code/ml/src/training/losses/calibrated_reward.py` (`CalibratedRewardLoss`, `CalibratedRewardOutput`).
  - Export via `code/ml/src/training/losses/__init__.py`.
  - Author unit and integration tests: `tests/ml/test_calibrated_loss.py`.
  - Verify property tests: `node scripts/harness/property-tests/test-calibrated-loss.mjs`.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Metrics and Mathematical Bounds**
  - Loss outputs: finite non-negative scalars.
  - Asymmetric penalty: $L(c=0.95, y^*=0) \ge 5 \times L(c=0.20, y^*=0)$.
  - Analytical gradient precision: `torch.autograd.gradcheck` passes with precision $\le 10^{-5}$.
  - Boundary stability: zero NaN or Infinity at $c \in \{0.0, 1.0\}$.
  - Zero mock objects or dummy return values.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Python/PyTorch API Contract**
  - `CalibratedRewardLoss(alpha_overconfidence=2.0, lambda_brier=0.1, lambda_evidence=0.5, epsilon=1e-7, reduction='mean')`
  - Returns `CalibratedRewardOutput` containing `loss`, `proper_loss`, `overconfidence_penalty`, `brier_loss`, `evidence_penalty`, `reward`.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Forward & Backward Execution Lifecycle**
  - Logarithmic proper scoring: $- [y^* \log(c) + (1 - y^*) \log(1 - c)]$.
  - Asymmetric penalty: $\alpha \cdot \mathbb{I}[y^* = 0] \cdot c^2$.
  - Brier regularization: $\lambda_{\text{brier}} \cdot (c - y^*)^2$.
  - Evidence scaling: $\lambda_{\text{evidence}} \cdot (1 - e) \cdot c$.
  - Backpropagation: analytical gradients without NaN or Inf under float32 and float64.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Fail-Closed Boundary Handling**
  - Non-finite inputs (`NaN`, `Inf` in tensors) trigger immediate `ValueError`.
  - Empty batch tensor inputs trigger immediate `ValueError`.
  - Targets outside $[0, 1]$ or confidence outside $[0.0, 1.0]$ trigger immediate `ValueError`.

### Dimension 6: Codebase Grounding & Provenance
- [x] **Option 6.1: Full Zero-Mock Grounding & Exact-HEAD Provenance**
  - Physical SHA-256 hashes recorded across all touch map files.
  - Conformance verified via `goal-template-conformance-harness.mjs G-ML-006`.
  - Mathematical invariant proof verified via `mathematical-invariant-proof-harness.mjs G-ML-006`.

---

## 🔒 State Machine Declaration

```text
[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]
All 6 Socratic architectural dimensions are 100% resolved and locked.
Zero open questions remain.
Unlocked for immediate implementation strictly within the declared Touch map.
```
