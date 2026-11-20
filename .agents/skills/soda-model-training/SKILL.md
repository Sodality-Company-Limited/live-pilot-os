---
name: soda-model-training
version: "1.0.0"
description: Governs ML training, dataset lineage, label-oracle contracts, LoRA/QLoRA, dual-head confidence models, RLCD rewards, and checkpoint evaluation.
skill_contract:
  id: soda-model-training
  version: 1.0.0
  profiles:
    - ml_research
    - fine_tuning
    - rlcd
  inputs:
    - dataset_manifest
    - base_checkpoint
    - hyperparameters
    - oracle_rubric
  outputs:
    - adapter_weights
    - training_history
    - evaluation_receipt
  gates:
    - dataset_hash_matches
    - split_separation_verified
    - baseline_comparison_significant
    - language_quality_preserved
  blocks:
    - ready
    - verified
    - done
---

# Model Training Skill

> **Mission:** Enforce contract-driven, reproducible, and verifiable model training, fine-tuning, and calibrated confidence alignment.

---

## 1. When to Use

Use this skill when:
- Preparing datasets for supervised fine-tuning (SFT), reinforcement learning from calibrated feedback (RLCD), or preference optimization (DPO).
- Fine-tuning autoregressive language models using LoRA / QLoRA adapters or dual-head architectures.
- Defining ground-truth label oracles and reward loss functions.
- Evaluating model checkpoints against established baselines and calculating perplexity delta.

---

## 2. Model Training Workflow

1. **Dataset Contract Ingestion:** Validate dataset SHA256, token count, and split isolation (Train, Val, Test).
2. **Setup Base Model & Adapters:** Specify exact Hugging Face / local checkpoint commit hash and adapter rank $r$, $\alpha$.
3. **Execute Training Loop:** Log step loss, learning rate, gradient norm, and evaluation metrics per epoch.
4. **Preserve Base Language Quality:** Measure base generation perplexity $\Delta \text{PPL} \le 5\%$.
5. **Contract Verification:** Run `node scripts/harness/model-training-contract-harness.mjs <GOAL_ID>`.

---

## 3. Required Artifacts

- Specification: [docs/03-architecture/model-training.md](../../../docs/03-architecture/model-training.md)
- Training Harness: [scripts/harness/model-training-contract-harness.mjs](../../../scripts/harness/model-training-contract-harness.mjs)
- Training Receipt: `docs/07-backlog/evidence/<GOAL_ID>-model-training-receipt.json`
