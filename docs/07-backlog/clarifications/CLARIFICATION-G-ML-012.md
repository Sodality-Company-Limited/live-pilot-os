# Socratic Clarification: Goal G-ML-012 Model Packaging, Checkpoint Versioning and Provenance Ledger

> **Goal ID:** `G-ML-012`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-ML-012](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-ML-012.md)  
> **Acceptance Contract:** [G-ML-012 Acceptance](file:///Users/batrarethsudprasert/projects/soda-os/docs/02-product/acceptance/G-ML-012.md)  
> **Created At:** `2026-09-30T11:15:00+07:00`  
> **Updated At:** `2026-09-30T11:15:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Packaging & Provenance Ledger)** -> Confirmed Option 1.1: Release packaging script consolidating LoRA adapter weights, value head parameters, tokenizer files, and calibration configurations into `models/checkpoints/v1.0.0/` with exact-HEAD git commit hash, calculated SHA256 checksums in `manifest.json`, and comprehensive model card in `docs/06_raw/model_card_v1.0.0.md`.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: 100% byte-exact SHA256 checksum identity across all packaged files, verified `.safetensors` reload without corruption, zero mocks, zero stubs, exact-HEAD commit hash resolution, and zero float monetary math.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Strict RFC 8259 JSON `manifest.json` schema with schema version, git commit, timestamps, base model digest, adapter SHA256, recipe hash, and artifact dictionary; fail-closed verification on any corrupted byte.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: CLI packaging command supporting `--dry-run`, `--verify-checksums`, explicit output directory configuration, and atomic directory publishing with compensation on write failure.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Missing input files, invalid weight structures, corrupted tensor headers, non-matching checksums, or missing git repository context raise fatal errors and exit with non-zero status.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Provenance)** -> Confirmed Option 6.1: Sub-500ms packaging/verification latency on release bundles, 100% concrete Python/PyTorch/Safetensors implementation without mock objects or dummy returns, verifiable via `python code/ml/scripts/package_model.py --verify-checksums` and `goal-template-conformance-harness.mjs G-ML-012`.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope
- [x] **Option 1.1: Release Packaging and Provenance Ledger**
  - Implement `code/ml/scripts/package_model.py`.
  - Produce release bundle in `models/checkpoints/v1.0.0/` with `manifest.json`.
  - Author model card `docs/06_raw/model_card_v1.0.0.md`.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Checksums and Exact-HEAD Binding**
  - All tensor and config files hashed with SHA256.
  - Manifest records exact 40-char git commit SHA.
  - Verification loads safetensors files and compares computed digests with stored manifest.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Manifest Schema**
  - RFC 8259 compliant JSON manifest.
  - Contains `schema_version`, `model_version`, `git_commit`, `created_at`, `base_model`, `training_recipe_hash`, `artifacts`, `checksums`.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: CLI Interface**
  - `python code/ml/scripts/package_model.py --dry-run`
  - `python code/ml/scripts/package_model.py --verify-checksums`
  - `python code/ml/scripts/package_model.py --output-dir models/checkpoints/v1.0.0`

### Dimension 5: Edge Boundaries & Failure States
- [x] **Option 5.1: Fail-Closed Gate**
  - Exit code non-zero on any hash mismatch, missing file, or corrupted safetensor file.
