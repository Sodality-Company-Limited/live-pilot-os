# Clarification & Epistemic Alignment: G-ML-022

**Goal ID:** `G-ML-022`  
**Title:** Upgrade Engine and Downstream-Project Distribution  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Actor:** Soda OS Framework Maintainer, Downstream Project Integrator, Upgrade CLI Engine  

---

## 1. 6-Domain Blueprint Alignment

### Domain 1: Target Persona & Scope
- **Actor:** Soda OS Central Bootstrapper & Upgrader (`cli.js`), Framework Release Automation, Downstream Application Maintainer.
- **Scope:** Enhance `cli.js` upgrade engine and `template/framework-manifest.yml` to support distribution of confidence calibration modules, runtime adapters, decision ledgers, calibration monitors, CI calibration gatekeepers, and E2E agent workflow harnesses to downstream application projects non-destructively.
- **Boundaries:** Zero modification to downstream custom application code (`code/**`), custom ADRs (`docs/05-decisions/**`), or existing custom configuration overrides. Phase 1 mechanical sync must strictly respect manifest allow-lists and non-destructive merge invariants.

### Domain 2: Core KPI Metrics & Visual Panels
- **Asset Registration:** Framework manifest (`template/framework-manifest.yml`) explicitly registers calibration modules under `overwrite.calibration` and `calibration_assets` with explicit destination paths and overwrite strategies:
  1. `scripts/lib/confidence-calibration.mjs`
  2. `scripts/harness/confidence-calibration-harness.mjs`
  3. `scripts/lib/model-adapter.mjs`
  4. `scripts/lib/decision-ledger.mjs`
  5. `scripts/lib/calibration-monitor.mjs`
  6. `scripts/ci/ci-calibration-gate.mjs`
  7. `scripts/harness/agent-workflow-harness.mjs`
- **Non-Destructive Configuration Merge:** Existing project configurations (e.g. `policy_thresholds.yaml`, `.soda-config.json`, `clickup.config.json`) merge missing default calibration thresholds (`max_ece: 0.040`, `max_brier: 0.080`, `max_hcer: 0.010`, `tau_low: 0.50`, `tau_high: 0.80`, `min_sample_count: 30`) while preserving 100% of existing custom user keys.
- **Completion SLA:** All unit and integration tests in `tests/unit/test-upgrade-calibration.mjs` pass cleanly with exit code 0.

### Domain 3: Data Contracts & Freshness
- **Framework Manifest Contract:** `template/framework-manifest.yml` version `1.24.0` valid YAML format, parsed deterministically by `cli.js` `parseManifest()`.
- **Merge Contract:** Deep non-destructive merge:
  - When target key does not exist: inject default calibration threshold.
  - When target key already exists: preserve target key and value without modification.
  - Handles nested objects recursively.

### Domain 4: Interactive Actions & Sagas
- **CLI Commands:**
  - `soda-os upgrade [path] [--report] [--yes] [--dry-run]`
  - `node tests/unit/test-upgrade-calibration.mjs`
- **Saga Compensations:** In dry-run mode (`--dry-run`), zero filesystem mutations occur. In case of unexpected I/O errors during file sync, the upgrade engine halts cleanly and reports diagnostic error details without partial silent writes.

### Domain 5: Edge Boundaries & Failure States
- **Target Project Custom Overrides:** If a downstream project tuned `max_ece: 0.025` (more strict than default 0.040), the merger MUST preserve `0.025`.
- **Target Missing Calibration Files:** Missing calibration files in downstream projects are detected by `runReport()` as mechanical drift and copied during `performUpgrade()`.
- **Framework Source Protection:** When run on `soda-os` itself, `detectRepositoryKind()` identifies `framework_source` and suppresses false downstream drift warnings.

### Domain 6: Codebase Grounding & Template Parity
- 100% operational implementation across all touch map files:
  - `cli.js` (Root upgrade tool and exports)
  - `template/framework-manifest.yml` (Canonical manifest)
  - `tests/unit/test-upgrade-calibration.mjs` (Unit test suite)
- Zero drift between root and template mirrors.

---

## 2. Fact vs. Assumption Audit
- `[OBSERVED_FACT]` `G-ML-014`, `G-ML-016`, `G-ML-020`, and `G-ML-021` created comprehensive calibration modules in `scripts/lib/` and `scripts/harness/`.
- `[OBSERVED_FACT]` `template/framework-manifest.yml` had not yet registered the individual calibration modules under a dedicated `calibration:` manifest block.
- `[OBSERVED_FACT]` `cli.js` lacked a dedicated non-destructive configuration merger for calibration thresholds during downstream project upgrades.
- `[RECOMMENDED_RESOLUTION]` Implement `mergeCalibrationConfig()` in `cli.js` to deep-merge default calibration thresholds non-destructively, register calibration assets in `template/framework-manifest.yml`, and author `tests/unit/test-upgrade-calibration.mjs` to empirically verify real sandbox project upgrades.

---

## 3. Epistemic Confirmation
- **Status:** Complete, unambiguous, fully specified. Ready for Red-Green-Refactor implementation.
