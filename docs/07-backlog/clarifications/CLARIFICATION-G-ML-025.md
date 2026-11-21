# Clarification & Epistemic Alignment: G-ML-025

**Goal ID:** `G-ML-025`  
**Title:** DAVE Decision Trajectory and Correction Dataset  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Actor:** Machine Learning Engineer, Autonomous Agent SRE, Tech Lead, System Architect  

---

## 1. 6-Domain Blueprint Alignment

### Domain 1: Target Persona & Scope
- **Actor:** Machine Learning Engineers, DAVE System 1 Autonomous Decision Operators, Model Fine-Tuning Researchers.
- **Scope:** Build a high-throughput, deterministic stream ingestion and normalization pipeline transforming operational DAVE decision logs from `.agents/audit/decisions.jsonl`, paired with human feedback and empirical harness test outcomes, into standardized contrastive RLCD preference pairs (`artifacts/rlcd/train_dataset.jsonl`).
- **Boundaries:** Zero mocks, zero stubs, zero fallbacks. Fully functional stream processor, objective label oracle, calibrated reward engine, split isolation partitioner, and schema validation gatekeeper.

### Domain 2: Core KPI Metrics & Visual Panels
- **Calibration Reward Formulations:**
  1. **Logarithmic Utility:** $R_{\text{log}} = y \cdot \ln(c) + (1-y) \cdot \ln(1-c)$ clamped with $\epsilon = 10^{-6}$.
  2. **Asymmetric Overconfidence Penalty:** When $y = 0$ and $c \ge 0.80$, penalty $P_{\text{overconf}} = c^2 \times 10.0$.
  3. **Net Calibrated Reward:** $R_{\text{net}} = R_{\text{log}} - P_{\text{overconf}}$.
- **Split Proportions & Isolation SLA:**
  1. Train Split: 80% ($\pm 5\%$) of total trajectories.
  2. Validation Split: 10% ($\pm 5\%$) of total trajectories.
  3. Held-out Test Split: 10% ($\pm 5\%$) of total trajectories.
  4. Contamination Ceiling: Exactly 0.0% sample overlap ($S_{\text{train}} \cap S_{\text{val}} = \emptyset$, $S_{\text{train}} \cap S_{\text{test}} = \emptyset$).

### Domain 3: Data Contracts & Freshness
- **Inbound Port:** `AuditLedgerStreamPort` reading `.agents/audit/decisions.jsonl`.
- **Outbound Port:** `RLCDPreferenceDatasetPort` exporting `artifacts/rlcd/train_dataset.jsonl` and individual split files (`train.jsonl`, `validation.jsonl`, `test.jsonl`).
- **Training Contract:** `artifacts/evidence/G-ML-025-training-contract.json` declaring model ID, base checkpoint, dataset SHA-256 digest, splits, label oracle, reproducibility seed, and calibration targets.
- **Freshness:** Real-time ingestion synchronized to active working tree and git HEAD.

### Domain 4: Interactive Actions & Sagas
- **CLI Commands:**
  - `node scripts/lib/dave-trajectory-builder.mjs build-dataset`
  - `node scripts/lib/dave-trajectory-builder.mjs validate-dataset`
  - `node scripts/lib/dave-trajectory-builder.mjs stats`
  - `node scripts/harness/model-training-contract-harness.mjs`
  - `node --test tests/unit/test-dave-trajectory-builder.mjs`

### Domain 5: Edge Boundaries & Failure States
- **Malformed Line Rejection:** Any syntactically invalid JSON line or record missing `goal_id` halts ingestion fail-closed with descriptive diagnostics.
- **Data Leakage Elimination:** Trajectories duplicated across splits immediately trigger verification failure and block dataset promotion.
- **Reward Completeness:** Records missing numeric reward or reported confidence fail schema gatekeeping.

### Domain 6: Codebase Grounding & Latency Budgets
- Pure deterministic stream algorithms running locally on host CPU with 0 external LLM token overhead ($0$ API tokens).
- Sub-50ms execution time for parsing, scoring, and exporting 1,000+ decision records.

---

## 2. Fact vs. Assumption Audit
- `[OBSERVED_FACT]` Operational DAVE decisions are recorded in `.agents/audit/decisions.jsonl`.
- `[OBSERVED_FACT]` `scripts/lib/dave-trajectory-builder.mjs` implements 100% operational ingestion, prompt normalization, label oracle evaluation, reward scoring, split partitioning, and schema validation.
- `[OBSERVED_FACT]` `scripts/harness/model-training-contract-harness.mjs` validates both model training contracts and RLCD preference datasets with zero contamination.
- `[OBSERVED_FACT]` 9/9 unit tests pass cleanly in `tests/unit/test-dave-trajectory-builder.mjs`.
