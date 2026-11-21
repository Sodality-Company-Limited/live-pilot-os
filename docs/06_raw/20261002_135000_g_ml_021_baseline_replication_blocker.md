# Baseline Replication Blocker: G-ML-021

**Date:** 2026-10-02T13:50:00+07:00  
**Goal:** [G-ML-021](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-ML-021.md)  
**Topic:** Baseline Freeze & Replication Blocker Audit  
**Blocker ID:** `BLOCKER-ML-021-01`  
**Classification:** Pre-Implementation Baseline Replication Audit  
**Status:** PENDING_RESOLUTION  

---

## 1. Blocker Identification & Formal Declaration

```yaml
blocker:
  id: BLOCKER-ML-021-01
  goal_id: G-ML-021
  epic: ML
  title: "Absence of End-to-End Calibrated Agent Workflow Integration Harness and E2E Test Suite"
  severity: HIGH
  discovered_phase: DEFINE
  resolution_phase: EXECUTE
  status: PENDING_RESOLUTION
```

---

## 2. Root Cause Analysis

Prior to Goal `G-ML-021`, Soda OS implemented individual components for calibrated uncertainty estimation:
1. `ModelAdapter` (`scripts/lib/model-adapter.mjs`) — trained-model runtime adapter bridging inference.
2. `DecisionLedger` (`scripts/lib/decision-ledger.mjs`) — append-only audit ledger with physical citation verification.
3. `routeDecision` (`scripts/lib/confidence-calibration.mjs`) — dynamic routing state machine enforcing the 4-way decision logic.
4. `CalibrationMonitor` (`scripts/lib/calibration-monitor.mjs`) — streaming calibration metric ingestion and drift alerting.
5. `ci-calibration-gate.mjs` (`scripts/ci/ci-calibration-gate.mjs`) — blocking quality policy enforcement.

However, the repository completely lacked:
1. An integrated, multi-step agent workflow harness (`scripts/harness/agent-workflow-harness.mjs`) orchestrating full autonomous execution loops (goal initialization $\to$ prompt formulation $\to$ model inference $\to$ tool invocation $\to$ physical evidence citation probing $\to$ dynamic routing $\to$ ledger audit logging $\to$ recovery saga).
2. End-to-end integration test battery (`tests/e2e/test-calibrated-agent-workflow.mjs`) validating missing evidence recovery routes, low-confidence deferrals, high-risk human-in-the-loop isolation, and fail-closed error handling.
3. Verification that real multi-step agent workflows run to completion with zero unhandled promise rejections, zero uncaught exceptions, and 100% green assertions.

Execution of the baseline verification commands prior to implementation empirically confirmed the blocker:
```text
$ node scripts/harness/agent-workflow-harness.mjs
Error: Cannot find module '/Users/batrarethsudprasert/projects/soda-os/scripts/harness/agent-workflow-harness.mjs'
  code: 'MODULE_NOT_FOUND'

$ node tests/e2e/test-calibrated-agent-workflow.mjs
Error: Cannot find module '/Users/batrarethsudprasert/projects/soda-os/tests/e2e/test-calibrated-agent-workflow.mjs'
  code: 'MODULE_NOT_FOUND'
```

---

## 3. Impact Assessment

- **Integration Blindspot:** Without an end-to-end workflow harness, subtle runtime deadlocks, race conditions between async tools, or failures in missing-evidence recovery loops cannot be detected by isolated unit tests.
- **Production Safety:** Autonomous agents making high-stakes tool execution decisions require empirical proof that multi-step loops never throw unhandled exceptions or enter infinite recovery loops.
- **Downstream Blocker:** Goal `G-ML-024` (Operational Documentation Suite) and release gates depend on verified end-to-end integration test execution.

---

## 4. Remediation Plan

1. **Step 1:** Implement `scripts/harness/agent-workflow-harness.mjs` and `template/scripts/harness/agent-workflow-harness.mjs` featuring:
   - `AgentWorkflowHarness` class coordinating real multi-step execution.
   - CLI flags: `--dry-run`, `--scenario <id>`, `--verbose`, `--help`.
   - In-process HTTP inference server via `createLocalInferenceServer` (zero mocks, real socket I/O).
   - 5 comprehensive operational scenarios: goal execution, missing evidence recovery, low-confidence deferral, high-risk guardrails, and fail-closed input validation.
2. **Step 2:** Implement `tests/e2e/test-calibrated-agent-workflow.mjs` and `template/tests/e2e/test-calibrated-agent-workflow.mjs` verifying:
   - Missing evidence detection routing to `verify` and emitting recovery queries (`-k test_missing_evidence`).
   - High-risk action routing to `human_review` or `defer`.
   - Decision ledger append-only audit trail and SHA256 integrity.
3. **Step 3:** Full multi-step integration execution with exit code 0.
4. **Step 4:** Construct `scripts/agentic/g-ml-021-5why-socratic-engine.mjs` (5 branches $\times$ 5 levels = 25 invariants).
5. **Step 5:** Construct `scripts/agentic/g-ml-021-provenance-oracle-evaluator.mjs` (20 measured episodes, 8 adversarial mutations, Wilson score 95% CI).
6. **Step 6:** Construct `scripts/harness/g-ml-021-replication-harness.mjs` and integrate into `scripts/run-all-soda-harnesses.sh`.
