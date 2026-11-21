# 🔄 Socratic Clarification State Machine: Goal G-ML-007 Parameter-Efficient LoRA/QLoRA Training Pipeline

> **Goal ID:** `G-ML-007`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-ML-007](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-ML-007.md)  
> **Created At:** `2026-09-30T10:15:00+07:00`  
> **Updated At:** `2026-09-30T10:15:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Parameter-Efficient LoRA/QLoRA Training Pipeline)** -> Confirmed Option 1.1: Implement an end-to-end parameter-efficient training pipeline orchestrator in `code/ml/src/training/train_pipeline.py` targeting attention projections (`q_proj`, `k_proj`, `v_proj`, `o_proj`) with PEFT LoRA while simultaneously updating auxiliary value head weights under combined language preservation and calibrated RLCD reward loss.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: Enforce trainable parameter ratio strictly below 2% of total model parameters when base model is frozen and LoRA adapter is attached, zero trainable parameters in base transformer backbone, decreasing loss across mini-batch training steps, verified safetensors checkpoint emission, and sub-250ms per step execution latency.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Python/PyTorch training pipeline in `code/ml/src/training/train_pipeline.py` exposing `Trainer`, `TrainerConfig`, `TrainingStepOutput`, and `create_peft_dual_head_model`, configured via YAML specification `code/ml/configs/lora_config.yaml`.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Seamless training step lifecycle coordinating mini-batch data loading, forward pass through dual-head causal LM, joint objective calculation ($L_{\text{joint}} = L_{\text{preservation}} + \gamma \cdot L_{\text{calibrated}}$), backward autograd pass, optimizer gradient stepping, learning rate scheduling, and atomic safetensors checkpointing.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Fail-closed boundary guards; non-finite gradients (NaN or Inf) trigger step abort and raise `FloatingPointError` or `ValueError`; parameter freezing verified before optimization begins; missing config fields reject with descriptive errors; empty dataset batches raise `ValueError`.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Provenance)** -> Confirmed Option 6.1: Sub-250ms per decision latency budget, 100% concrete PyTorch and PEFT neural network implementation without mock objects or dummy returns, verifiable via `pytest tests/ml/test_training_pipeline.py`, `mathematical-invariant-proof-harness.mjs G-ML-007`, and `goal-template-conformance-harness.mjs G-ML-007`.

---

## 🏛️ Context & Problem Statement

Training 8B parameter models requires computationally tractable infrastructure using LoRA/QLoRA adapters while updating the value head weights under joint language preservation and calibrated reward objectives:
1. **Computational Tractability:** Full parameter fine-tuning of 8B models is prohibitive on single-node GPU hardware; LoRA adapters freeze backbone weights and inject low-rank decomposition matrices into attention projection layers.
2. **Dual-Head Optimization Problem:** Auxiliary confidence heads require parameter updates alongside adapter weights while ensuring the base model representations do not suffer catastrophic forgetting.
3. **Joint Objective Convergence:** The training pipeline must compute a composite loss summing autoregressive token NLL loss, reference model KL divergence, logarithmic proper scoring, and asymmetric quadratic overconfidence penalties.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Capability Coverage)
- [x] **Option 1.1: Parameter-Efficient LoRA/QLoRA Training Pipeline Scope**
  - Author `code/ml/src/training/train_pipeline.py` (`Trainer`, `TrainerConfig`, `TrainingStepOutput`, `create_peft_dual_head_model`).
  - Author `code/ml/configs/lora_config.yaml` specifying LoRA rank, alpha, dropout, and target modules.
  - Author unit and integration tests: `tests/ml/test_training_pipeline.py`.
  - Author replication harness: `scripts/harness/g-ml-007-replication-harness.mjs`.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Metrics and Mathematical Bounds**
  - Trainable parameters bounded strictly below 2% of total model parameters.
  - Base transformer backbone weights remain completely frozen (`requires_grad=False`).
  - LoRA adapters (`lora_A`, `lora_B`) and `confidence_head` parameters have `requires_grad=True`.
  - Checkpoint emitted in valid safetensors format.
  - Zero mock objects or dummy return values.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Python/PyTorch API Contract**
  - `TrainerConfig(learning_rate=1e-4, weight_decay=0.01, lora_rank=16, lora_alpha=32, lora_dropout=0.05, target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj'], gamma_calibration=1.0)`
  - `Trainer(model, config, optimizer=None, train_dataloader=None)`
  - Returns `TrainingStepOutput` containing `loss`, `preservation_loss`, `calibration_loss`, `learning_rate`, `step`.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Training Loop Lifecycle & Checkpoint Saga**
  - Forward pass computes logits and confidence score.
  - Loss computes composite objective: $L_{\text{total}} = L_{\text{preservation}} + \gamma \cdot L_{\text{calibrated}}$.
  - Backward pass updates only adapter matrices and confidence value head.
  - Checkpointing saves adapter weights and confidence head in safetensors format.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Fail-Closed Boundary Handling**
  - Non-finite gradient or loss values trigger immediate error.
  - Invalid rank ($r \le 0$) or alpha ($\le 0$) rejected with `ValueError`.
  - Missing required fields in config trigger descriptive error.

### Dimension 6: Codebase Grounding & Provenance
- [x] **Option 6.1: Full Zero-Mock Grounding & Exact-HEAD Provenance**
  - Physical SHA-256 hashes recorded across all touch map files.
  - Conformance verified via `goal-template-conformance-harness.mjs G-ML-007`.
  - Mathematical invariant proof verified via `mathematical-invariant-proof-harness.mjs G-ML-007`.

---

## 🔒 State Machine Declaration

```text
[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]
All 6 Socratic architectural dimensions are 100% resolved and locked.
Zero open questions remain.
Unlocked for immediate implementation strictly within the declared Touch map.
```
