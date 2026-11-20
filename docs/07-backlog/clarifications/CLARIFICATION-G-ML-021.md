# Clarification & Epistemic Alignment: G-ML-021

**Goal ID:** `G-ML-021`  
**Title:** Model Regression and Integration Test Harness  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Actor:** Soda OS Autonomous Agent & Machine Learning Integration Engineer  

---

## 1. 6-Domain Blueprint Alignment

### Domain 1: Target Persona & Scope
- **Actor:** Soda OS Agent Kernel, Multi-step Workflow Orchestrator, Quality Assurance Automation.
- **Scope:** Comprehensive end-to-end integration harness executing full Soda OS agent workflows against the calibrated model runtime, validating multi-step task completion, tool execution, decision ledger logging, and dynamic routing state machine.
- **Boundaries:** Zero mock scripts; real execution of runtime components (`ModelAdapter`, `DecisionLedger`, `routeDecision`, `validateDecision`, local HTTP inference server), validating that real agent loops complete cleanly without unhandled exceptions or infinite loops.

### Domain 2: Core KPI Metrics & Visual Panels
- **Integration Test Battery:** 5 distinct operational scenarios:
  1. `scenario_goal_execution`: Goal initialization, tool invocation, evidence verification, resulting in `proceed`.
  2. `scenario_missing_evidence`: Missing evidence file detected on disk, router transitions to `verify`, automated recovery query emitted.
  3. `scenario_low_confidence_defer`: Model returns low confidence (< 0.80), router transitions to `verify` or `defer`.
  4. `scenario_high_risk_guardrail`: High-risk operations with verified evidence route to `human_review`; unverified high-risk operations route to `defer`.
  5. `scenario_fail_closed_validation`: Corrupted or invalid prompt/metadata triggers fail-closed error handling without unhandled process termination.
- **Completion SLA:** 100% green assertions across all scenarios with exit code 0.

### Domain 3: Data Contracts & Freshness
- **Decision Record Schema:** Validated via `validateDecision` with fields: `id`, `prompt`, `answer`, `confidence` in $[0.0, 1.0]$, `riskLevel`, `evidence`, `evidenceVerified`, `tokenSpans`, `uncertaintyMetrics`, `reasoningProvenance`, and SHA256 `contentDigest`.
- **Audit Ledger:** Append-only JSONL format via `DecisionLedger` writing to `.agents/audit/decisions.jsonl` (or test directory override).

### Domain 4: Interactive Actions & Sagas
- **Missing File Recovery Action:** When evidence files are missing, the harness intercepts the `verify` route, emits a simulated retrieval or workspace search recovery query, logs the compensation action, and verifies ledger consistency.
- **CLI Commands & Flags:**
  - `node scripts/harness/agent-workflow-harness.mjs [options]`
  - Flags: `--dry-run`, `--scenario <id>`, `--verbose`, `--help`
  - Exit codes: 0 for all scenarios passing / dry-run passing; 1 for assertion failures or unexpected exceptions.

### Domain 5: Edge Boundaries & Failure States
- **Network / Gateway Outage:** Handled via typed `ModelInferenceError` (`GATEWAY_TIMEOUT`, `NETWORK_PARTITION`) with fail-closed behavior.
- **Missing Evidence:** Filesystem probe detects missing files, sets `evidenceVerified: false`, and routes to `verify`.
- **Zero Unhandled Exceptions:** All promises and async tool calls are caught, logged, and surfaced through structured result objects.

### Domain 6: Codebase Grounding & Template Parity
- 100% operational implementation mirrored between root and template:
  - `scripts/harness/agent-workflow-harness.mjs` $\leftrightarrow$ `template/scripts/harness/agent-workflow-harness.mjs`
  - `tests/e2e/test-calibrated-agent-workflow.mjs` $\leftrightarrow$ `template/tests/e2e/test-calibrated-agent-workflow.mjs`
- Zero drift verified via `diff -u`.

---

## 2. Fact vs. Assumption Audit
- `[OBSERVED_FACT]` `G-ML-013` (ModelAdapter), `G-ML-015` (DecisionLedger), `G-ML-016` (Dynamic Routing), `G-ML-019` (Streaming Telemetry), and `G-ML-020` (CI Calibration Gate) are all implemented and passing.
- `[OBSERVED_FACT]` No end-to-end multi-step agent workflow harness existed in `scripts/harness/agent-workflow-harness.mjs` prior to `G-ML-021`.
- `[UNDETERMINED_DYNAMICS]` How local model inference is coordinated during automated E2E testing without external cloud dependencies.
- `[RECOMMENDED_RESOLUTION]` Leverage `createLocalInferenceServer` from `scripts/lib/model-adapter.mjs` to spin up in-process HTTP servers simulating model gateway endpoints with real networking and zero mocks.

---

## 3. Epistemic Confirmation
- **Status:** Complete, unambiguous, fully specified. Ready for Red-Green-Refactor implementation.
