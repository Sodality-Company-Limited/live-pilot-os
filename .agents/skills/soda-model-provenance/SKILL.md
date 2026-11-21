---
name: soda-model-provenance
version: "1.0.0"
description: Cryptographic tracking of model weights, dataset revisions, training hyperparameters, tokenizer commits, and reproducibility manifests.
skill_contract:
  id: soda-model-provenance
  version: 1.0.0
  profiles:
    - ml_research
    - compliance
    - devops
  inputs:
    - model_artifact_path
    - training_manifest
    - dataset_manifest
  outputs:
    - provenance_receipt
    - cryptographic_digest_manifest
  gates:
    - sha256_digests_verified
    - lineage_graph_unbroken
    - source_revision_valid
  blocks:
    - ready
    - verified
    - done
---

# Model Provenance Skill

> **Mission:** Guarantee complete, tamper-evident cryptographic provenance for every model checkpoint, adapter, and dataset.

---

## 1. When to Use

Use this skill when:
- Packaging or registering trained model checkpoints, LoRA adapters, or confidence heads.
- Verifying the SHA256 integrity of training data and tokenizer configs.
- Generating auditable provenance manifests before deployment.
- Detecting stale or unverified model binaries.

---

## 2. Model Provenance Workflow

1. **Digest Generation:** Compute SHA256 hashes of base model weights, adapter tensor files, tokenizer JSON, and training scripts.
2. **Lineage Binding:** Link the model revision to the exact git commit SHA of the training codebase and dataset manifest.
3. **Receipt Issuance:** Store immutable provenance manifest at `docs/07-backlog/evidence/<GOAL_ID>-model-provenance.json`.
4. **Harness Verification:** Run `node scripts/harness/model-provenance-harness.mjs <GOAL_ID>`.

---

## 3. Required Artifacts

- Specification: [docs/03-architecture/model-provenance.md](../../../docs/03-architecture/model-provenance.md)
- Provenance Harness: [scripts/harness/model-provenance-harness.mjs](../../../scripts/harness/model-provenance-harness.mjs)
- Output Manifest: `docs/07-backlog/evidence/<GOAL_ID>-model-provenance.json`
