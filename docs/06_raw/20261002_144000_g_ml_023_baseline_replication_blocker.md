# Baseline Replication Blocker Report: Goal G-ML-023
**Goal ID:** `G-ML-023`  
**Title:** Rollback and Model-Version Compatibility State Machine  
**Timestamp:** `2026-10-02T14:40:00Z`  
**Status:** `RESOLVED_IN_FLIGHT`  

---

## 1. Blocker Identification & Forensic Classification

### Blocker ID: `BLOCKER-ML-023-01`
- **Classification:** Missing Core Runtime Component & Fault-Tolerance Boundary
- **Impact Severity:** Critical (P1)
- **Target File Locations:**
  - `scripts/lib/model-circuit-breaker.mjs` (Absent)
  - `template/scripts/lib/model-circuit-breaker.mjs` (Absent)
  - `tests/unit/test-circuit-breaker.mjs` (Absent)
  - `template/tests/unit/test-circuit-breaker.mjs` (Absent)

---

## 2. Root Cause Analysis (Forensic 5-Why)

1. **Why does Goal G-ML-023 fail replication from baseline?**
   Because neither `scripts/lib/model-circuit-breaker.mjs` nor `tests/unit/test-circuit-breaker.mjs` exists in the repository.
2. **Why does the absence of this module cause operational failure?**
   Because when an inference endpoint fails, crashes, or suffers from severe latency spikes or calibration drift, the agent runtime has no automated state machine to detect consecutive failures and trip into fallback mode.
3. **Why cannot existing modules (`ModelAdapter`, `routeDecision`) handle this alone?**
   `ModelAdapter` only handles point-in-time HTTP request execution and typed error throwing (`ModelInferenceError`), while `routeDecision` is a stateless pure function evaluating a single decision tuple. Neither maintains rolling operational state across sequential requests.
4. **Why is a stateful circuit breaker necessary?**
   To prevent cascaded system failures, avoid hammering a crashed inference provider with repeated doomed requests, and enforce a safe fallback routing policy that guarantees 100% of high-risk decisions are diverted to human review during an outage.
5. **Why must the circuit breaker be formal, zero-mock, and automated?**
   To satisfy Article I of the Sodality Agentic Constitution: all fault-tolerance boundaries must be 100% operational with deterministic transitions (`Active`, `Tripped`, `Fallback`, `HalfOpen`), empirical threshold accounting (3 consecutive failures to trip, 5 consecutive healthy probes to recover), and zero dummy mocks.

---

## 3. Reproduction Command & Observed Error

```bash
node -e "import('./scripts/lib/model-circuit-breaker.mjs')"
# Error: Cannot find module '/Users/batrarethsudprasert/projects/soda-os/scripts/lib/model-circuit-breaker.mjs'

node tests/unit/test-circuit-breaker.mjs
# Error: Cannot find module '/Users/batrarethsudprasert/projects/soda-os/tests/unit/test-circuit-breaker.mjs'
```

---

## 4. Remediation Plan

1. **Implement `scripts/lib/model-circuit-breaker.mjs`:**
   - Define `CircuitState` enum (`ACTIVE`, `TRIPPED`, `FALLBACK`, `HALF_OPEN`).
   - Implement `ModelCircuitBreaker` class with `failureThreshold` (default 3) and `recoveryThreshold` (default 5).
   - Implement `recordSuccess()`, `recordFailure(err)`, `canAttempt()`, `getState()`, `routeWithCircuitBreaker(decision, defaultRouter)`, `reset()`, and `getMetrics()`.
2. **Implement `tests/unit/test-circuit-breaker.mjs`:**
   - 100% coverage of state transitions, consecutive failure tripping, high-risk fallback routing, recovery probe restoration, intermittent failure reset, and fail-closed validation.
3. **Synchronize 100% Parity with `template/`:**
   - Mirror all runtime libraries and tests to `template/`.
4. **Epistemic Validation:**
   - Verify 5-Why Socratic Dialectic across 5 branches through Level 5 depth (25 invariants).
   - Verify exact-HEAD provenance, 20 measured domain episodes, 8 adversarial mutation kills, and Wilson 95% CI.
   - Execute 10-stage master replication harness and 16-layer assurance suite.
