# 🔄 Socratic Clarification State Machine: Goal G-CORE-009 Artifact and Model Provenance Harness

> **Goal ID:** `G-CORE-009`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-CORE-009](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-CORE-009.md)  
> **Created At:** `2026-09-29T21:46:00+07:00`  
> **Updated At:** `2026-09-29T21:46:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Artifact & Model Provenance Governance)** -> Confirmed Option 1.1: Cryptographic artifact and model provenance harness verifying exact-HEAD commit hashes, weights digests, dataset lineage, and tokenizer lineage for autonomous engineering agents, ML researchers, and Soda OS runtime governance.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: 100% verification that working-tree source file SHA256 hashes match declared receipt hashes; rejection of artifacts claiming success when tests failed or were skipped; validation of model provenance manifest schemas (model_id, source_revision, dataset_lineage, tokenizer, training_config); optional disk file verification; and exit code 0 with zero mocks or stubs.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Machine-readable `artifact_id`, `source_hashes`, `source_revision`, `receipt_schema`, `dataset_lineage`, `tokenizer`, and `training_config` JSON schemas, exact-HEAD commit SHA, proof receipt binding, and programmatic provenance validator.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Atomic validation of artifact provenance and model checkpoint lineage, fail-closed termination on hash divergence or unverified receipts, and immediate exit code 1 upon invariant violation.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Boundary guards rejecting stale artifacts, contradictory receipts (non-zero exit code with passed=true), skipped test artifacts, statistical receipts missing positive sample counts, and corrupted model weight manifests.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Reusability)** -> Confirmed Option 6.1: Sub-50ms execution SLA per harness evaluation, 100% byte equivalence between root and `template/` copies, zero mocks, and zero stubs.

---

## 🏛️ Context & Problem Statement

Autonomous agent pipelines, proof assurance, and ML training require verifiable cryptographic provenance:
1. **Stale Proof Receipts:** Deploying code or models against unverified or stale receipts breaks the chain of custody.
2. **Untracked Model Binaries:** Operating with unversioned weights or untracked tokenizer revisions causes catastrophic silent regressions.
3. **Contradictory Certification:** Accepting receipts produced by failed or skipped test runs invalidates all governance guarantees.
4. **Tampered Artifacts:** Manual or unauthorized modifications to evaluation results without re-running verification must be caught immediately.
5. **Distribution Parity:** Governance rules, architecture specs, and harnesses must maintain 100% byte equivalence between root and `template/` distributions.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Artifact & Model Provenance Governance)
- [x] **Option 1.1: Automated Provenance Harness with Working-Tree SHA256 Verification**
  - Implement source file hashing and receipt checking in `scripts/harness/artifact-provenance-harness.mjs`.
  - Implement model weights and dataset lineage verification in `scripts/harness/model-provenance-harness.mjs`.
  - Codify provenance governance in `.agents/rules/artifact-provenance.md` and `docs/03-architecture/model-provenance.md`.
  - Maintain 100% byte-for-byte parity across root and `template/` distributions.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Verification & Anti-Tamper Gate**
  - Recompute SHA256 of all declared source files and verify exact match against active working tree.
  - Fail-closed gate: Reject receipts declaring `exit_code != 0` when `passed == true`.
  - Fail-closed gate: Reject artifacts produced by skipped or unexecuted tests.
  - Validate model provenance manifests for `schema_version`, `model_id`, `source_revision`, `dataset_lineage`, `tokenizer`, and `training_config`.
  - Recompute disk file hashes when `verify_disk: true`.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Exported Schema & Programmatic Lineage Validation**
  - Export `validateArtifactProvenance(artifactPath, options)` returning `{ valid, exists, data, errors, warnings }`.
  - Export `validateGoalArtifacts(content, filename, options)` returning `{ valid, artifactCount, verifiedCount, artifacts, errors, warnings }`.
  - Export `validateModelProvenance(manifestOrPath, options)` returning `{ valid, errors, warnings, manifest }`.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Fail-Closed Pipeline Integration**
  - Provenance harnesses terminate fail-closed with exit code 1 upon any hash divergence, schema error, or stale receipt.
  - Accumulate all validation errors in a single pass for complete diagnostics.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Boundary Guards & Tamper Detection**
  - Detect and fail on modified source files whose working-tree SHA256 diverges from receipts.
  - Reject empty artifact files (0 bytes) and malformed JSON.
  - Reject statistical receipts missing valid positive sample counts.

### Dimension 6: Codebase Grounding, Latency & Provenance
- [x] **Option 6.1: Sub-50ms Kernel SLA and Exact-HEAD Provenance**
  - All harness validations execute with p99 < 50ms latency.
  - Exact-HEAD commit SHA bound in proof receipts.
  - 100% byte equivalence between root and `template/` files.
  - Zero mocks, zero stubs; 100% operational logic.

---

## 🔒 Verification & Exit Gate
- Unit test 14 passes: `node scripts/harness/test-goal-assurance-suite.mjs`
- Unit test 19 passes: `node scripts/harness/test-goal-assurance-suite.mjs`
- Artifact provenance harness passes: `node scripts/harness/artifact-provenance-harness.mjs docs/07-backlog/goals/G-CORE-009.md`
- Conformance harness passes: `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-009`
- Full test pass: `npm test && npm run test:template`
