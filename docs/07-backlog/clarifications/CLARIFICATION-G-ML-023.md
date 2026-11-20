# Clarification & Epistemic Alignment: G-ML-023

**Goal ID:** `G-ML-023`  
**Title:** Rollback and Model-Version Compatibility State Machine  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Actor:** Autonomous Agent Looper, Model Inference Gateway, Reliability Engineer, Governance Kernel  

---

## 1. 6-Domain Blueprint Alignment

### Domain 1: Target Persona & Scope
- **Actor:** Soda OS Agent Runtime, Model Adapter Client (`ModelAdapter`), High-Stakes Autonomous Decision Looper, System SRE / Tech Lead.
- **Scope:** Implement `ModelCircuitBreaker` in `scripts/lib/model-circuit-breaker.mjs` and `template/scripts/lib/model-circuit-breaker.mjs` as an autonomous rollback and fault-tolerance finite state machine. Intercepts inference-time outcomes, tracks consecutive failure and recovery thresholds, and automatically overrides decision routing to safe fallbacks (`human_review` for high-risk, `verify` for low/normal risk) during model outages or runtime calibration degradation.
- **Boundaries:** Zero modification to external inference server backbones or human review UI desk. The circuit breaker sits strictly inside the Soda OS client runtime layer between `ModelAdapter` and `routeDecision`.

### Domain 2: Core KPI Metrics & Visual Panels
- **State Transition Invariants:**
  1. `Active`: Normal operational state. Requests pass through to model inference adapter.
  2. `Tripped`: State reached immediately after $N$ consecutive inference failures (default $N = 3$).
  3. `Fallback`: Active degraded operational mode where standard inference is bypassed or overridden, forcing all high-risk decisions to `human_review` and low/normal-risk decisions to `verify`.
  4. `HalfOpen`: Probing recovery state allowing test requests to probe model health. Restores `Active` state upon $M$ consecutive successful probes (default $M = 5$).
- **Threshold Bounds:**
  - `failureThreshold`: strictly positive integer $\ge 1$ (default: 3).
  - `recoveryThreshold`: strictly positive integer $\ge 1$ (default: 5).
  - High-risk fallback override: 100% of high-risk decisions during `Fallback` / `Tripped` routed to `human_review` (0% unverified proceed).
- **Completion SLA:** All unit tests in `tests/unit/test-circuit-breaker.mjs` pass cleanly with exit code 0.

### Domain 3: Data Contracts & Freshness
- **State Machine Constants:**
  - `CircuitState = Object.freeze({ ACTIVE: 'active', TRIPPED: 'tripped', FALLBACK: 'fallback', HALF_OPEN: 'half_open' })`
- **Class API Specification:**
  - `constructor({ failureThreshold = 3, recoveryThreshold = 5, onStateChange = null } = {})`
  - `getState(): string`
  - `canAttempt(): boolean`
  - `recordSuccess(): void`
  - `recordFailure(error?: Error): void`
  - `routeWithCircuitBreaker(decision: GovernedDecision, defaultRouter?: Function): RouteResult`
  - `getMetrics(): CircuitBreakerMetrics`
  - `reset(): void`

### Domain 4: Interactive Actions & Sagas
- **CLI & Test Execution:**
  - `node tests/unit/test-circuit-breaker.mjs`
  - `node tests/unit/test-circuit-breaker.mjs -k test_state_transitions`
- **Saga Compensations:**
  - On transition to `Fallback`, system logs audit warning and emits state change event.
  - If a model inference failure occurs mid-workflow, the circuit breaker records the failure; upon the 3rd failure, the active saga immediately switches to fallback routing without unhandled process termination or silent corruption.

### Domain 5: Edge Boundaries & Failure States
- **Invalid Threshold Inputs:** Rejects non-integer, negative, or non-finite threshold options with `TypeError` or `RangeError`.
- **Zero Consecutive Failure Leakage:** A single successful call in `Active` mode resets consecutive failure count to 0.
- **Fail-Closed on Unknown States:** If state is corrupted or unhandled, circuit breaker defaults to fail-closed (`FALLBACK`), disallowing unverified execution.

### Domain 6: Codebase Grounding & Template Parity
- 100% operational implementation across all touch map files:
  - `scripts/lib/model-circuit-breaker.mjs`
  - `template/scripts/lib/model-circuit-breaker.mjs`
  - `tests/unit/test-circuit-breaker.mjs`
  - `template/tests/unit/test-circuit-breaker.mjs`
- Zero drift between root and template mirrors.

---

## 2. Fact vs. Assumption Audit
- `[OBSERVED_FACT]` `G-ML-016` implemented `routeDecision()` mapping Risk x Evidence x Confidence tuples into (`proceed`, `verify`, `defer`, `human_review`).
- `[OBSERVED_FACT]` `G-ML-017` implemented `ModelConfig` and health pinging, and `G-ML-013` implemented `ModelAdapter` with typed `ModelInferenceError`.
- `[OBSERVED_FACT]` No centralized circuit breaker FSM currently exists in `scripts/lib/` to autonomously intercept consecutive model failures and override routing to `human_review`/`verify` during outages.
- `[RECOMMENDED_RESOLUTION]` Implement `ModelCircuitBreaker` in `scripts/lib/model-circuit-breaker.mjs`, export `CircuitState`, provide non-destructive routing integration with `routeDecision`, and verify comprehensive state transitions in `tests/unit/test-circuit-breaker.mjs`.

---

## 3. Epistemic Confirmation
- **Status:** Complete, unambiguous, fully specified. Ready for Red-Green-Refactor implementation.
