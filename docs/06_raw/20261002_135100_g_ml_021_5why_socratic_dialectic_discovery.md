# Socratic 5-Why Dialectic Discovery: G-ML-021

**Date:** 2026-10-02T13:51:00+07:00  
**Goal:** [G-ML-021](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-ML-021.md)  
**Topic:** Model Regression and Integration Test Harness  
**Classification:** Epistemic Architectural Discovery (Level 1–5 Formal Dialectic)  
**Status:** ALL 5 BRANCHES VERIFIED AT LEVEL 5  

---

## Executive Architectural Summary

This document formalizes the Socratic 5-Why root-cause discovery and architectural invariant derivation for Goal `G-ML-021`: **Model Regression and Integration Test Harness**. In accordance with Article I (Zero Mocks, Zero Stubs) and Article II (Mandatory Verification) of the Global Engineering Constitution, end-to-end multi-step agent workflows must be verified in an integrated runtime environment. Unit tests of isolated modules (`ModelAdapter`, `DecisionLedger`, `routeDecision`, `CalibrationMonitor`) verify individual contracts, but only a comprehensive integration harness executing real multi-step loops against an operational model server can prove that agent goal initialization, tool execution, physical evidence verification, dynamic routing, decision ledger audit logging, and missing evidence recovery sagas operate harmoniously with zero unhandled exceptions, zero deadlocks, and zero silent regressions.

---

## 5-Branch Socratic Dialectic Matrix

### Branch 1: End-to-End Agent Workflow Orchestration & Dry-Run CLI Contract (`BRANCH-A`)
- **Level 1 (Why):** Why must the harness orchestrate full multi-step agent loops instead of relying on isolated unit tests?  
  *Answer:* Unit tests test functions in isolation; only an end-to-end harness tests the temporal ordering and data flow across model inference, tool execution, citation probing, and ledger writes.  
  *Invariant:* `E2E Workflow Invariant`: The harness coordinates a complete multi-step agent execution loop from goal intake to ledger commit.
- **Level 2 (Why):** Why must the harness support a `--dry-run` CLI flag?  
  *Answer:* To enable instant sanity checks in pre-flight checks, container bootstrapping, and CI pipelines without running heavy scenario loops.  
  *Invariant:* `Dry-Run Contract`: `--dry-run` initializes dependencies, executes a synthetic pass, and exits 0 cleanly.
- **Level 3 (Why):** Why must exit codes strictly map to POSIX 0 (pass) and 1 (fail)?  
  *Answer:* Automated test runners and CI orchestrators depend on binary exit codes to signal success or failure.  
  *Invariant:* `Binary Exit Code Invariant`: Process exits with code 0 on complete green assertion pass and code 1 on any scenario failure.
- **Level 4 (Why):** Why must `--help` display options and exit with 0 while invalid flags exit with 1?  
  *Answer:* Standard CLI ergonomics allow developers to inspect usage without triggering false test failures.  
  *Invariant:* `CLI Ergonomics Invariant`: `--help` / `-h` exits 0 with complete usage manual; unknown flags fail with exit code 1.
- **Level 5 (Why):** Why must stdout emit structured scenario metrics and latency benchmarks?  
  *Answer:* To provide immediate actionable diagnostics on scenario duration, decision routes, and latency bottlenecks.  
  *Invariant:* `Diagnostic Telemetry Invariant`: Terminal output details step counts, execution latency (ms), routes taken, and pass/fail status per scenario.

---

### Branch 2: Missing Evidence Recovery Saga & Dynamic Routing (`BRANCH-B`)
- **Level 1 (Why):** Why must missing evidence files route to `verify` instead of `proceed`?  
  *Answer:* To prevent autonomous agents from acting on hallucinated or deleted evidence files, enforcing zero-trust integrity.  
  *Invariant:* `Zero-Trust Evidence Invariant`: When any cited evidence file is absent on disk, the router transitions decision to `verify`.
- **Level 2 (Why):** Why must the system trigger an automated recovery query upon missing evidence?  
  *Answer:* To enable self-healing agent execution that re-queries or re-searches workspace files rather than immediately aborting the workflow.  
  *Invariant:* `Recovery Saga Invariant`: The `verify` route emits an automated recovery query and logs the recovery attempt.
- **Level 3 (Why):** Why must the recovery action be audited in the decision ledger?  
  *Answer:* For complete forensic provenance, recording that initial evidence was missing and how secondary retrieval resolved it.  
  *Invariant:* `Audit Provenance Invariant`: The append-only ledger records `missingEvidence` citations and recovery query traces.
- **Level 4 (Why):** Why must recovery fail-closed if secondary queries also fail to locate evidence?  
  *Answer:* To prevent infinite recovery loops and block unverified decisions from silently proceeding.  
  *Invariant:* `Fail-Closed Recovery Invariant`: Persistent missing evidence transitions to `defer` or human review; never `proceed`.
- **Level 5 (Why):** Why must physical disk probing (`fs.existsSync`) be enforced rather than string pattern checking?  
  *Answer:* String paths can look well-formed but point to non-existent disk locations, leading to runtime failures during tool execution.  
  *Invariant:* `Physical Storage Grounding Invariant`: Evidence validation probes real workspace filesystem paths inside declared workspace boundaries.

---

### Branch 3: Calibrated Model Integration & Decision Gating (`BRANCH-C`)
- **Level 1 (Why):** Why must model inference connect through `ModelAdapter`?  
  *Answer:* To maintain hexagonal architecture, decoupling the agent workflow core from the network transport of model serving endpoints.  
  *Invariant:* `Hexagonal Decoupling Invariant`: All model interactions flow through the `ModelAdapter` driving port.
- **Level 2 (Why):** Why must model confidence be strictly validated in $[0.0, 1.0]$?  
  *Answer:* Non-finite, negative, or unnormalized scores destroy calibration math and corrupt routing thresholds.  
  *Invariant:* `Bounded Confidence Invariant`: Confidence scores outside $[0.0, 1.0]$ or non-finite values are rejected with `ModelInferenceError`.
- **Level 3 (Why):** Why must high-risk decisions require `human_review` even if confidence $\ge 0.80$?  
  *Answer:* High-consequence operations (destructive edits, financial transfers) require mandatory human signoff under Article III governance.  
  *Invariant:* `Human-in-the-Loop Guardrail`: High risk + verified evidence + confidence $\ge 0.80$ routes exclusively to `human_review`.
- **Level 4 (Why):** Why must low-confidence decisions route to `verify` or `defer`?  
  *Answer:* To bound high-confidence error rate (HCER $\le 0.0100$) and prevent autonomous execution of uncertain predictions.  
  *Invariant:* `Uncertainty Deferral Invariant`: Decisions with confidence $< \tau$ (0.80) are never permitted to `proceed`.
- **Level 5 (Why):** Why must all decision outputs record cryptographic SHA256 content digests?  
  *Answer:* To ensure immutable, tamper-evident audit trails in `.agents/audit/decisions.jsonl`.  
  *Invariant:* `Cryptographic Digest Invariant`: Every recorded decision includes a SHA256 digest over its canonical JSON representation.

---

### Branch 4: Fail-Closed Async Loop Safety & Zero Uncaught Exception Invariant (`BRANCH-D`)
- **Level 1 (Why):** Why must all async promises in the agent workflow be strictly awaited and caught?  
  *Answer:* Unhandled promise rejections terminate Node.js processes in modern runtimes, causing service downtime.  
  *Invariant:* `Zero Unhandled Rejection Invariant`: All asynchronous actions are wrapped in fail-closed try/catch blocks.
- **Level 2 (Why):** Why must gateway timeouts trigger fail-closed typed `ModelInferenceError`?  
  *Answer:* To enable deterministic timeout handling and retry/defer policies without hanging workflow threads.  
  *Invariant:* `Typed Error Invariant`: Gateway timeouts and network partitions throw typed `ModelInferenceError` with standard error codes.
- **Level 3 (Why):** Why must corrupt decision metadata fail-closed without stack dumps?  
  *Answer:* To maintain clean reporting and log readability while safely rejecting malformed inputs.  
  *Invariant:* `Clean Degradation Invariant`: Corrupt schemas or invalid types reject with descriptive error messages.
- **Level 4 (Why):** Why must test environments use real HTTP sockets (`createLocalInferenceServer`) rather than mocks?  
  *Answer:* Article I forbids mocks and stubs; testing over real loopback HTTP sockets validates real serialization, HTTP headers, and status codes.  
  *Invariant:* `Zero-Mock Network Invariant`: Tests use real Node.js `http.createServer` instances on dynamic loopback ports.
- **Level 5 (Why):** Why must temp test ledgers and directories be safely created and cleaned up?  
  *Answer:* To prevent test pollution and ensure idempotent execution across consecutive test runs.  
  *Invariant:* `Idempotent Sandbox Invariant`: Test harnesses isolate temporary test directories and clean up sockets upon completion.

---

### Branch 5: Exact-HEAD Provenance, Template Parity, and Master Replication (`BRANCH-E`)
- **Level 1 (Why):** Why must all harness assets be mirrored 100% to `template/`?  
  *Answer:* Downstream projects created from or upgraded by Soda OS inherit all harnesses; drift causes subtle cross-repo bugs.  
  *Invariant:* `Template Parity Invariant`: Zero drift between root and `template/` files verified via `diff -u`.
- **Level 2 (Why):** Why must proof receipts record exact `git rev-parse HEAD`?  
  *Answer:* To bind verification evidence immutably to the exact commit tree, preventing stale verification claims.  
  *Invariant:* `Exact-HEAD Provenance Invariant`: Proof and assurance receipts embed the active Git commit SHA.
- **Level 3 (Why):** Why must the replication harness execute as part of `scripts/run-all-soda-harnesses.sh`?  
  *Answer:* To ensure that future goals and refactorings continuously execute `g-ml-021-replication-harness.mjs`.  
  *Invariant:* `Master Suite Integration Invariant`: Harness is registered and executes cleanly in `run-all-soda-harnesses.sh`.
- **Level 4 (Why):** Why must isolated adversarial mutations be executed and killed?  
  *Answer:* To mathematically prove that the test suite is sensitive to regressions; mutations that disable safety checks must fail.  
  *Invariant:* `Adversarial Mutation Invariant`: 100% mutation kill rate across all safety-critical checks.
- **Level 5 (Why):** Why must Wilson score 95% confidence intervals be computed over measured episode trials?  
  *Answer:* To provide rigorous statistical proof that agent workflow reliability is statistically bounded at 95% confidence.  
  *Invariant:* `Statistical Boundedness Invariant`: Measured pass rate over 20 episodes has Wilson lower bound $\ge 0.80$.
