# 🔄 Socratic Clarification State Machine: Goal G-ML-005 Autoregressive Language-Preservation Objective Specification

> **Goal ID:** `G-ML-005`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-ML-005](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-ML-005.md)  
> **Created At:** `2026-09-30T06:58:00+07:00`  
> **Updated At:** `2026-09-30T06:58:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Language Preservation Loss Module)** -> Confirmed Option 1.1: Implement a standalone PyTorch loss module (`LanguagePreservationLoss`) combining prompt-masked negative log-likelihood causal cross-entropy with a reference model Kullback-Leibler divergence penalty term, preventing catastrophic forgetting during adapter or auxiliary head tuning.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: Enforce zero KL divergence when student and reference logits are identical ($D_{KL}(P \parallel P) = 0.0$), non-negative KL values ($D_{KL} \ge 0.0$), causal shift alignment (`logits[:-1]` predicting `labels[1:]`), prompt token masking (zero gradient on prompt tokens), non-finite input rejection (`ValueError` on NaN/Inf), and sub-250ms execution latency.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Python PyTorch module in `code/ml/src/training/losses/language_preservation.py` exposing `LanguagePreservationLoss` with callable signature `forward(student_logits, labels, reference_logits=None, prompt_mask=None, completion_mask=None, attention_mask=None)` returning a structured loss object with `total_loss`, `nll_loss`, and `kl_loss`.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Seamless autograd backward execution supporting standard optimizers, configurable KL regularizer coefficient `beta \ge 0.0`, temperature scaling `temperature > 0.0`, and reduction options (`mean`, `sum`, `none`).
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Fail-closed boundary guards; non-finite logits or targets trigger fatal `ValueError`; empty batch inputs trigger fatal `ValueError`; numerical stability under extreme logit distributions enforced via log-sum-exp formulations.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Provenance)** -> Confirmed Option 6.1: Sub-250ms per decision latency budget, 100% concrete PyTorch neural network implementation without mock objects or dummy returns, verifiable via `pytest tests/ml/test_language_preservation.py` and `goal-template-conformance-harness.mjs G-ML-005`.

---

## 🏛️ Context & Problem Statement

Preserving core language generation capabilities while tuning auxiliary uncertainty projection heads (G-ML-004) or parameter-efficient adapters (G-ML-007) requires a formal composite loss objective:
1. **Catastrophic Forgetting Risk:** Fine-tuning language models on specialized decision trajectories often causes severe degradation in general fluency, grammar, and reasoning logic.
2. **Distributional Drift from Base Models:** Unconstrained optimization permits student model policy representations to drift arbitrarily far from base model distributions.
3. **Exact Token Attribution:** Standard loss functions fail to isolate completion tokens from input prompt context, causing models to waste capacity optimizing predictable user prompts rather than generation quality.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Capability Coverage)
- [x] **Option 1.1: Language Preservation Objective Scope**
  - Author `code/ml/src/training/losses/__init__.py`.
  - Author `code/ml/src/training/losses/language_preservation.py` (`LanguagePreservationLoss`, `LanguagePreservationOutput`).
  - Author unit and integration tests: `tests/ml/test_language_preservation.py`.
  - Verify property tests: `python3 scripts/harness/property-tests/test-autoregressive-preservation.py`.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Metrics and Mathematical Bounds**
  - Loss outputs: finite non-negative scalars.
  - KL divergence: strictly non-negative $D_{KL} \ge 0.0$; equals 0.0 when student == reference.
  - Prompt tokens receive 0 loss contribution and 0 gradient.
  - Zero mock objects or dummy return values.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Python/PyTorch API Contract**
  - `LanguagePreservationLoss(beta=0.1, temperature=1.0, ignore_index=-100, reduction='mean')`
  - Returns `LanguagePreservationOutput` containing `loss`, `nll_loss`, and `kl_loss`.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Forward & Backward Execution Lifecycle**
  - Causal shift: aligns token $t$ to target token $t+1$.
  - Masking: applies `prompt_mask` or `ignore_index` to exclude non-completion tokens.
  - Regularization: computes forward KL divergence from reference logits scaled by `beta`.
  - Backpropagation: computes analytical gradients without NaN or Inf under float32 and bfloat16.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Fail-Closed Boundary Handling**
  - Non-finite inputs (`NaN`, `Inf` in logits) trigger immediate `ValueError`.
  - Empty batch tensor inputs trigger immediate `ValueError`.
  - Dimension mismatches between student and reference logits trigger immediate `ValueError`.

### Dimension 6: Codebase Grounding & Provenance
- [x] **Option 6.1: Full Zero-Mock Grounding & Exact-HEAD Provenance**
  - Physical SHA-256 hashes recorded across all touch map files.
  - Conformance verified via `goal-template-conformance-harness.mjs G-ML-005`.
  - Mathematical invariant proof verified via `mathematical-invariant-proof-harness.mjs G-ML-005`.

---

## 🔒 State Machine Declaration

```text
[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]
All 6 Socratic architectural dimensions are 100% resolved and locked.
Zero open questions remain.
Unlocked for immediate implementation strictly within the declared Touch map.
```
