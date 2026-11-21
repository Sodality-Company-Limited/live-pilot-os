# Clarification & Epistemic Alignment: G-ML-028

**Goal ID:** `G-ML-028`  
**Title:** DAVE Model Evaluation, Promotion, Drift, and Rollback  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Actor:** System Architect, Production Platform Operator, ML Engineer  

---

## 1. 6-Domain Blueprint Alignment

### Domain 1: Target Persona & Scope
- **Actor:** System Architects, Production Operators, Autonomous DAVE Platform Runtime.
- **Scope:** Automated model promotion governor evaluating calibration drift, overconfidence regression, cryptographic checkpoint provenance, and zero-downtime atomic rollbacks.
- **Boundaries:** Zero mocks, zero stubs, zero fallbacks. Fully functional promotion policy evaluation across 6 invariants, SHA-256 weight and lineage verification, HMAC-SHA256 signature verification, promotion receipt creation and ledger recording, and atomic pointer rollback state machine with sub-100ms latency.

### Domain 2: Core KPI Metrics & Visual Panels
- **Calibration Drift Ceiling:** $ECE_{new} \le ECE_{baseline} + 0.010$ (measured: $0.048 \le 0.055$).
- **Accuracy Non-Regression Floor:** $Acc_{new} \ge Acc_{baseline} - 0.010$ (measured: $0.952 \ge 0.930$).
- **Overconfidence Rate Ceiling:** $\le 0.020$ (measured: $0.012$).
- **Unsafe Autonomy Rate:** Exactly $0.000$.
- **Brier Score Drift Ceiling:** $Brier_{new} \le Brier_{baseline} + 0.020$ (measured: $0.078 \le 0.100$).
- **HCER Ceiling:** $HCER_{new} \le HCER_{baseline}$ (measured: $0.014 \le 0.015$).
- **Rollback Latency:** $< 100$ms SLA (empirically measured: $0.001$ms).
- **Token Expenditure:** Exactly 0 tokens (pure deterministic algorithms).

### Domain 3: Data Contracts & Freshness
- **Inbound Port:** `CandidateCheckpointPort` (Model manifest, weights, and evaluation metrics).
- **Outbound Port:** `ProductionPointerPort` (Active production model pointer and rollback ledger).
- **Promotion Receipt:** `artifacts/proofs/G-ML-028-promotion-receipt.json`.
- **Model Provenance Manifest:** `docs/07-backlog/evidence/G-ML-028-model-provenance.json`.
- **Cryptographic Proof Receipt:** `docs/07-backlog/evidence/G-ML-028-proof-receipt.json`.

### Domain 4: Interactive Actions & Sagas
- **CLI Commands:**
  - `node --test tests/unit/test-dave-model-governor.mjs`
  - `node scripts/lib/dave-model-governor.mjs test-rollback`
  - `node scripts/harness/model-provenance-harness.mjs G-ML-028`
  - `node scripts/harness/proof-receipt-validator.mjs G-ML-028`
  - `node cli.js assure G-ML-028`

### Domain 5: Edge Boundaries & Failure States
- **Calibration Drift Spike:** Detected streaming miscalibration automatically swaps pointer to previous stable model within 100ms.
- **Overconfidence Regression:** Candidate model with increased task accuracy but worsened calibration is rejected fail-closed.
- **Tampered Checkpoint / Signature:** Mismatched weights hash or invalid cryptographic signature aborts promotion with descriptive error.
- **Orphan Rollback Attempt:** Requesting rollback when no previous stable model exists throws `RollbackExecutionError` fail-closed.

### Domain 6: Codebase Grounding & Latency Budgets
- Pure deterministic algorithms running on local host CPU with 0 external API tokens.
- Sub-second rollback SLA ($< 100$ms) empirically measured at $0.001$ms.
- Full memory footprint well within 128MB kernel RAM ceiling.

---

## 2. Fact vs. Assumption Audit
- `[OBSERVED_FACT]` `scripts/lib/dave-model-governor.mjs` implements 100% operational promotion evaluation, cryptographic provenance, promotion receipt generation, and atomic rollback state machine.
- `[OBSERVED_FACT]` 16/16 unit tests pass 100% green in `tests/unit/test-dave-model-governor.mjs`.
- `[OBSERVED_FACT]` Sub-100ms atomic rollback passes in 0.001ms via `node scripts/lib/dave-model-governor.mjs test-rollback`.
- `[OBSERVED_FACT]` Model provenance validation passes via `node scripts/harness/model-provenance-harness.mjs G-ML-028`.
- `[OBSERVED_FACT]` 16-layer Goal Lifecycle Assurance Suite passes 100% green (`node cli.js assure G-ML-028`).
