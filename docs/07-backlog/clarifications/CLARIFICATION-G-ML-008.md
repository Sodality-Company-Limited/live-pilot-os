# 🔄 Socratic Clarification State Machine: Goal G-ML-008 Verification and Defer-Policy Optimization

> **Goal ID:** `G-ML-008`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-ML-008](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-ML-008.md)  
> **Created At:** `2026-09-30T10:30:00+07:00`  
> **Updated At:** `2026-09-30T10:30:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Verification and Defer-Policy Optimization)** -> Confirmed Option 1.1: Implement an end-to-end decision policy optimization module in `code/ml/src/training/defer_policy.py` that tunes threshold boundaries (`tau_low`, `tau_high`) mapping continuous confidence and contextual metadata into discrete action policies (`proceed`, `verify`, `defer`, `human_review`) under domain-specific risk matrices.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: Enforce risk-weighted cost matrix penalizing false acceptances (confident incorrect assertions) at least 10x higher than false deferrals; Pareto threshold grid search bounding high-risk false acceptances strictly below 1.0% and false deferrals strictly below 5.0%; 100% of high-risk decisions with confidence below 0.85 routed to `defer` or `verify`; strict monotonicity and bounds $0.0 \le \tau_{\text{low}} < \tau_{\text{high}} \le 1.0$.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Python/PyTorch and NumPy policy optimizer in `code/ml/src/training/defer_policy.py` exporting `ActionPolicy`, `CostMatrix`, `PolicyThresholds`, `DecisionRouter`, and `DeferPolicyOptimizer`, serialized to YAML specification at `code/ml/configs/policy_thresholds.yaml`.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Deterministic evaluation and routing engine executing against real decision distributions; supporting Pareto frontier search minimizing empirical risk; fail-safe fallback routing and YAML threshold persistence.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Fail-closed boundary guards; non-finite confidence values (NaN or Inf) or values outside $[0.0, 1.0]$ immediately raise `ValueError`; unknown risk levels or malformed evidence flags reject with descriptive errors; threshold inversion ($\tau_{\text{low}} \ge \tau_{\text{high}}$) raises `ValueError`.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Provenance)** -> Confirmed Option 6.1: Sub-250ms per decision latency budget, 100% concrete implementation without mock objects or dummy returns, verifiable via `pytest tests/ml/test_defer_policy.py`, `mathematical-invariant-proof-harness.mjs G-ML-008`, and `goal-template-conformance-harness.mjs G-ML-008`.

---

## 🏛️ Context & Problem Statement

Continuous confidence estimates must translate into optimal discrete agent actions (`proceed`, `verify`, `defer`, `human_review`) according to domain-specific risk matrices:
1. **Uncalibrated Action Hazard:** Raw confidence scores without risk-weighted thresholding lead to catastrophic production failures when an agent proceeds with high-risk, unverified tool calls.
2. **Asymmetric Penalty Dynamics:** A false acceptance (proceeding when incorrect or unverified) carries catastrophic operational costs ($C_{\text{fa}} = 10.0$) compared to a false deferral (deferring when correct, $C_{\text{fd}} = 1.0$).
3. **Multi-Threshold Decision Surface:** A single threshold is insufficient to distinguish between lightweight autonomous execution (`proceed`), intermediate secondary verification (`verify`), full pipeline deferral (`defer`), and mandatory human escalation (`human_review`).

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Capability Coverage)
- [x] **Option 1.1: Defer-Policy Optimization & Decision Routing Scope**
  - Author `code/ml/src/training/defer_policy.py` (`ActionPolicy`, `CostMatrix`, `PolicyThresholds`, `DecisionRouter`, `DeferPolicyOptimizer`).
  - Author `code/ml/configs/policy_thresholds.yaml` specifying tuned $\tau_{\text{low}}, \tau_{\text{high}}$, cost matrix parameters, and safety constraints.
  - Author unit and integration tests: `tests/ml/test_defer_policy.py`.
  - Author replication harness: `scripts/harness/g-ml-008-replication-harness.mjs`.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Metrics and Mathematical Bounds**
  - High-risk false acceptance rate $< 1.0\%$.
  - False deferral rate on correct high-confidence examples $< 5.0\%$.
  - 100% of high-risk decisions with confidence $c < 0.85$ routed to `defer` or `verify`.
  - Monotonic threshold invariant: $0.0 \le \tau_{\text{low}} < \tau_{\text{high}} \le 1.0$.
  - Zero mock objects or dummy return values.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Python API Contract**
  - `ActionPolicy`: `Enum` with values `PROCEED = "proceed"`, `VERIFY = "verify"`, `DEFER = "defer"`, `HUMAN_REVIEW = "human_review"`.
  - `CostMatrix`: Dataclass with $C_{\text{fa}} = 10.0, C_{\text{fd}} = 1.0, C_{\text{proceed}} = 0.0, C_{\text{verify}} = 0.2, C_{\text{defer}} = 1.0, C_{\text{human_review}} = 2.0$.
  - `DecisionRouter`: Evaluates `(confidence, risk_level, evidence_verified)` and returns `ActionPolicy`.
  - `DeferPolicyOptimizer`: Conducts grid optimization over validation split minimizing empirical risk.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Routing Truth Table & Policy Life Cycle**
  - Routing strictly adheres to the truth table:
    - Normal risk, verified evidence, high confidence ($c \ge \tau_{\text{high}}$) -> `proceed`.
    - Normal risk, verified evidence, low confidence ($c < \tau_{\text{high}}$) -> `verify`.
    - Normal risk, unverified evidence, high confidence -> `verify`.
    - Normal risk, unverified evidence, low confidence ($c < \tau_{\text{low}}$) -> `defer`.
    - High risk, verified evidence, high confidence -> `human_review`.
    - High risk, verified evidence, low confidence -> `defer`.
    - High risk, unverified evidence, high confidence -> `defer`.
    - High risk, unverified evidence, low confidence -> `defer`.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Fail-Closed Boundary Handling**
  - Out-of-bounds confidence ($c < 0.0$ or $c > 1.0$), NaN, or Inf raises `ValueError`.
  - Invalid risk level strings (anything other than `normal` or `high`) raise `ValueError`.
  - Non-boolean `evidence_verified` raises `TypeError`.
  - Degenerate thresholds ($\tau_{\text{low}} \ge \tau_{\text{high}}$) raise `ValueError`.

### Dimension 6: Codebase Grounding & Provenance
- [x] **Option 6.1: Full Zero-Mock Grounding & Exact-HEAD Provenance**
  - Physical SHA-256 hashes recorded across all touch map files.
  - Conformance verified via `goal-template-conformance-harness.mjs G-ML-008`.
  - Mathematical invariant proof verified via `mathematical-invariant-proof-harness.mjs G-ML-008`.

---

## 🔒 State Machine Declaration

```text
[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]
All 6 Socratic architectural dimensions are 100% resolved and locked.
Zero open questions remain.
Unlocked for immediate implementation strictly within the declared Touch map.
```
