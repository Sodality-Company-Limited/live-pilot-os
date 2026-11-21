---
name: soda-post-mortem
version: "1.0.0"
description: >-
  Generates canonical engineering root cause analysis (RCA) records for resolved bugs.
  Captures root cause mechanism, exact failure chain, validated fix, and defect prevention actions.
  Triggers: post-mortem, postmortem, rca, root cause analysis, bug writeup, incident record, /post-mortem.
  Collaboration phase: REVIEW -> SHIP.
---

# Soda OS Engineering Post-Mortem & RCA Engine

The permanent technical record of a fixed defect, authored for engineers to preserve institutional memory and prevent regression cascades.

---

## 🏛️ Preflight Invariants (Refuse to draft without these)

An agent MUST NEVER draft a post-mortem based on unverified speculation. Execution requires:
1. [ ] **Deterministic Repro:** Fast passing/failing test or reproduction artifact.
2. [ ] **Confirmed Mechanism:** Exact lines of code and state failure sequence identified.
3. [ ] **Validated Fix:** Verified green test asserting the fix; zero regressions.

---

## 📋 The Canonical 7-Block Structure

```mermaid
graph TD
    B1["1. Executive Summary<br>(Problem, root fix, owner, JIRA/PR)"] --> B2["2. Concrete Symptom<br>(Logs, stack traces, metrics)"]
    B2 --> B3["3. Root Cause Chain<br>(Exact code identifiers & logic flaw)"]
    B3 --> B4["4. Failure Propagation<br>(How the flaw manifested as the symptom)"]
    B4 --> B5["5. Validated Fix<br>(Why the patch solves cause, not symptom)"]
    B5 --> B6["6. Discovery Diagnostics<br>(Repro harness, rejected hypotheses)"]
    B6 --> B7["7. Defect Prevention<br>(Regression tests, CI gates, linters)"]
```

### 1. Summary
One concise paragraph: what broke in customer/service terms, the core fix, and metadata (PR, Goal ID, Owner).

### 2. Symptom
Concrete observations: exact error envelopes, status codes, latency spikes, or failed assertions.

### 3. Root Cause Mechanism
Exhaustive walkthrough citing code identifiers (`struct`, `function`, `variable`, commit SHA). Avoid vague generalities.

### 4. Propagation Chain
Step-by-step causality connecting the underlying flaw to the observed external failure.

### 5. Validated Fix & Reversion of Workarounds
Detailed explanation of why the change fixes the root mechanism rather than papering over the symptom. Document and revert any temporary defensive hacks.

### 6. Diagnostic Journey
Summary of debugging steps: what repro isolated the defect, which hypotheses were disproven, and the pivotal experiment that confirmed root cause.

### 7. Prevention & CI Hardening
Concrete action items with assigned owners: new regression test suites, linter additions, or architectural invariants.
