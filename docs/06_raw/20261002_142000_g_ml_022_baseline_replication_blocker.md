# Baseline Replication Blocker Report: G-ML-022

**Goal:** G-ML-022: Upgrade Engine and Downstream-Project Distribution  
**Epic:** ML  
**Blocker ID:** `BLOCKER-ML-022-01`  
**Severity:** HIGH  
**Status:** RESOLVED  
**Timestamp:** 2026-10-02T14:20:00+07:00  

---

## 🏛️ Structured Analysis (WHERE, WHY, FOR WHOM, HOW)

### WHERE
- [`cli.js`](file:///Users/batrarethsudprasert/projects/soda-os/cli.js#L150-L200)
- [`template/framework-manifest.yml`](file:///Users/batrarethsudprasert/projects/soda-os/template/framework-manifest.yml#L120-L135)
- [`tests/unit/test-upgrade-calibration.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-upgrade-calibration.mjs)

---

### WHY (Root Cause Analysis & Architectural Rationale)
Prior to the implementation of `G-ML-022`, downstream projects adopting Soda OS were unable to automatically receive the machine learning confidence calibration and uncertainty estimation capabilities introduced across goals `G-ML-014` through `G-ML-021`.

Specifically, three critical architectural gaps existed:
1. **Manifest Registration Absence:** `template/framework-manifest.yml` lacked an explicit `calibration:` group under `overwrite:` and contained no registry of `calibration_assets:` specifying destination paths and merge strategies. Because `cli.js` relies strictly on the manifest allow-list for mechanical file synchronization, running `soda-os upgrade` completely omitted all calibration modules (`confidence-calibration.mjs`, `confidence-calibration-harness.mjs`, `model-adapter.mjs`, `decision-ledger.mjs`, `calibration-monitor.mjs`, `ci-calibration-gate.mjs`, `agent-workflow-harness.mjs`).
2. **Configuration Overwrite Risk:** Downstream repositories maintain application-specific configurations and user-tuned domain thresholds (e.g. high-frequency trading bots requiring `max_ece: 0.015` vs standard agents requiring `0.040`). `cli.js` had no non-destructive deep-merge engine, meaning any attempt to distribute calibration settings would either clobber custom user keys or fail to supply mandatory baseline thresholds (`max_ece`, `max_brier`, `max_hcer`, `tau_low`, `tau_high`).
3. **Dry-Run Side-Effect Leakage:** `writeVersionStamp()` and parent directory creation did not strictly respect `options.dryRun`, allowing metadata mutations and empty directory creations to leak into target project folders during pre-flight dry-run audits.

---

### FOR WHOM
- **Downstream Project Developers & Maintainers:** Upgrading their repositories without breaking proprietary business logic in `code/**` or custom parameters.
- **Autonomous Agent Kernels:** Requiring uniform distribution of confidence calibration libraries and regression harnesses across all enterprise instances.
- **CI/CD Quality Pipelines:** Relying on deterministic manifest declarations and binary exit codes to automate framework upgrades.

---

### HOW (Implementation & Verification Mechanics)
1. **Registered Calibration Assets in Manifest:**
   - Added `calibration:` under `overwrite:` in `template/framework-manifest.yml` declaring all 7 calibration libraries and harnesses.
   - Declared top-level `calibration_assets:` with destination paths, overwrite strategies, and architectural descriptions.
   - Declared `config/calibration.json` with strategy `non_destructive_deep_merge` under `merge:`.
2. **Engineered Non-Destructive Merger in `cli.js`:**
   - Implemented `mergeCalibrationConfig(targetConfig, defaultThresholds)` performing recursive dictionary deep-merge.
   - Guaranteed 100% preservation of existing custom application keys and user-tuned values.
   - Populated missing default thresholds: `max_ece: 0.040`, `max_brier: 0.080`, `max_hcer: 0.010`, `tau_low: 0.50`, `tau_high: 0.80`, `min_sample_count: 30`.
   - Wired configuration merging into `performUpgrade()` across `config/calibration.json`, `calibration.config.json`, and `soda.config.json`.
3. **Hardened Dry-Run & Downstream Isolation Invariants:**
   - Guarded parent directory creation and `.soda-os-version` writing with `!activeOptions.dryRun`.
   - Maintained strict `never_touch` isolation for `code/**`.
4. **Empirical Verification:**
   - 14/14 unit & integration tests passing cleanly via `node tests/unit/test-upgrade-calibration.mjs`.
   - 25/25 Socratic 5-Why invariants verified at Level 5 depth via `node scripts/agentic/g-ml-022-5why-socratic-engine.mjs`.
