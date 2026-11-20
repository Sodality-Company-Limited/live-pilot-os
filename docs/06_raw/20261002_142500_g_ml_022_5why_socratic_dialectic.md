# Socratic 5-Why Dialectic Report: G-ML-022

**Goal:** G-ML-022: Upgrade Engine and Downstream-Project Distribution  
**Epic:** ML  
**Status:** COMPLETE (Level 5 Socratic Depth Across 5 Branches)  
**Timestamp:** 2026-10-02T14:25:00+07:00  

---

## 🏛️ SECTION I: STRUCTURED CODE EXPLANATION (WHERE, WHY, FOR WHOM, HOW)

### WHERE
- [`cli.js`](file:///Users/batrarethsudprasert/projects/soda-os/cli.js#L150-L200)
- [`template/framework-manifest.yml`](file:///Users/batrarethsudprasert/projects/soda-os/template/framework-manifest.yml#L120-L135)
- [`tests/unit/test-upgrade-calibration.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-upgrade-calibration.mjs)
- [`scripts/agentic/g-ml-022-5why-socratic-engine.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/agentic/g-ml-022-5why-socratic-engine.mjs)
- [`scripts/agentic/g-ml-022-provenance-oracle-evaluator.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/agentic/g-ml-022-provenance-oracle-evaluator.mjs)
- [`scripts/harness/g-ml-022-replication-harness.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/g-ml-022-replication-harness.mjs)

---

### WHY (Root Cause & Architectural Rationale)
Soda OS is designed as a centralized agent governance operating system distributed to diverse downstream repositories across the Sodality ecosystem. With the completion of ML goals G-ML-014 through G-ML-021, autonomous agents acquired critical uncertainty estimation, temperature scaling, decision ledgers, drift monitors, and regression harnesses.

However, downstream repositories could not consume these capabilities without an automated upgrade engine. Prior to G-ML-022:
- The framework manifest (`framework-manifest.yml`) had no registration of calibration modules under `overwrite`.
- `cli.js` had no mechanism to deep-merge calibration configurations without destroying user-tuned risk boundaries or proprietary application keys.
- Dry-run mode leaked directory creations and metadata stamps into target filesystems.

---

### FOR WHOM
- **Downstream Platform Engineers:** Seamlessly synchronizing governance contracts and calibration libraries without manual copy-paste errors.
- **Autonomous Agent Workflows:** Operating across downstream applications with mathematical and statistical guarantees against overconfident hallucination.
- **Continuous Integration (CI):** Running non-interactive upgrades and pre-flight dry runs in automated pipelines.

---

### HOW (Implementation & Invariant Pipeline)
1. **Manifest Registration:** Declared all 7 calibration libraries and harnesses in `template/framework-manifest.yml` under `overwrite.calibration` and `calibration_assets:`.
2. **Non-Destructive Merger:** Implemented `mergeCalibrationConfig(targetConfig, defaultThresholds)` in `cli.js` performing recursive dictionary deep merge, guaranteeing 100% preservation of custom keys and user-tuned values while populating missing defaults.
3. **Dry-Run Hardening:** Guaranteed zero filesystem mutations during `--dry-run` executions.
4. **Dialectic Verification:** Traversed all 5 branches to Level 5 depth (25 invariants) with 100% green execution.

---

## 🔬 SECTION II: 5-BRANCH 5-WHY DIALECTIC MATRIX

### Branch A: Framework Manifest Allow-List Registration & Mechanical Sync
1. **Why reliance on central manifest?** Deterministic allow-list prevents untracked assets from silently polluting downstream repositories.
2. **Why register under `overwrite.calibration`?** Governance contracts and harnesses must overwrite outdated versions uniformly.
3. **Why valid YAML syntax?** CI linters, external automation, and YAML parsers consume `framework-manifest.yml` directly.
4. **Why aggregate sub-categories in `parseManifest`?** Preserves backward compatibility with lightweight parsers while grouping assets logically.
5. **Why physical existence in `template/`?** Missing files would cause silent upgrade failures or broken symlinks in target repositories.

### Branch B: Non-Destructive Deep Configuration Merging
1. **Why deep merge instead of file replacement?** Downstream projects contain custom keys and tuned parameters that must never be clobbered.
2. **Why user-tuned values take precedence?** Honors domain-specific risk tolerances (e.g. HFT bots requiring tighter ECE than general agents).
3. **Why populate missing default thresholds?** Provides immediate fail-closed safety boundaries (`max_ece: 0.040`, `max_brier: 0.080`, etc.).
4. **Why recursive traversal?** Microservices nest calibration parameters under domain sub-keys.
5. **Why fail-closed on null/undefined?** Malformed files must not crash the upgrade engine or inject `undefined` into files.

### Branch C: Downstream Project Code Isolation (`never_touch` & `code/**`)
1. **Why `code/**` in `never_touch`?** Application business logic and domain code must be 100% immune from framework template overwrite.
2. **Why ignore matching directories?** The manifest is an allow-list, not a blanket copy.
3. **Why byte-for-byte fixture verification?** Empirically proves that `soda-os upgrade` never causes code regression.
4. **Why `never_touch` precedence?** Enforces the Security Constitution invariant that customer code is inviolable.
5. **Why environment file isolation?** Prevents clobbering developer-specific environment bindings and secrets.

### Branch D: Dry-Run Mode Zero Mutation Invariant
1. **Why `--dry-run` support?** Operators must audit prospective file changes before committing mutations.
2. **Why forbid parent directory creation?** Creating empty directory trees mutates filesystem state.
3. **Why suppress `.soda-os-version` writing?** Touching metadata in dry run leads to false audit records.
4. **Why print prospective operations?** Operators require observability into what files would be written.
5. **Why exit 0 on clean dry-run?** Automated pre-flight checks and CI pre-merge gates rely on exit 0.

### Branch E: Upgrade Idempotency & Cryptographic Version Stamping
1. **Why idempotency?** Running `soda-os upgrade` multiple times must produce identical results without drift.
2. **Why `.soda-os-version` stamp?** Downstream tooling inspects `.soda-os-version` to verify framework compatibility.
3. **Why version synchronization?** Discrepancies between manifest, package, and stamp create broken dependency tracking.
4. **Why real disk I/O in unit tests?** Article I strictly forbids mocks and stubs; real POSIX operations guarantee production behavior.
5. **Why zero template drift?** Framework templates are the golden source of truth for new bootstraps and future upgrades.
