# Architecture Specification: Model and Checkpoint Provenance

> **Status:** Active  
> **Classification:** Framework Core Architecture  
> **Referenced By:** `soda-model-provenance`, `artifact-provenance.md`

---

## 1. Executive Summary

Soda OS enforces full cryptographic traceability for all model checkpoints, adapter weights, tokenizer revisions, and evaluation artifacts.

---

## 2. Provenance Architecture

### 2.1 Provenance Graph Structure
A valid model provenance manifest links the following nodes in an immutable DAG:
1. **Source Code Revision:** Git commit SHA of the training codebase.
2. **Dataset Digest:** Merkle root or SHA256 hashes of training, validation, and test splits.
3. **Tokenizer Artifact:** SHA256 of `tokenizer.json`, `vocab.json`, and special token mappings.
4. **Hyperparameter Configuration:** SHA256 of `train_config.yaml`.
5. **Adapter Weights:** SHA256 of `adapter_model.safetensors` or checkpoint tensor shards.
6. **Evaluation Artifact:** SHA256 of benchmark output and validation receipts.

### 2.2 Verification Protocol
`scripts/harness/model-provenance-harness.mjs` verifies that every digest in the provenance manifest matches the active files on disk. Missing files, hash divergences, or unrecorded mutations invalidate the checkpoint.
