# 🔄 Socratic Clarification State Machine: Goal G-CORE-008 Failure, Rollback & Fail-Closed Harness

> **Goal ID:** `G-CORE-008`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-CORE-008](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-CORE-008.md)  
> **Created At:** `2026-09-29T21:30:00+07:00`  
> **Updated At:** `2026-09-29T21:30:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Failure Policy, Rollback Verification & Fail-Closed State Machine)** -> Confirmed Option 1.1: Automated failure policy, rollback command validation, and fail-closed routing truth-table verification harness for autonomous engineering agents and runtime governance kernels.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: 100% Validation on mandatory failure policy conditions (`dependency_unavailable`, `invalid_input`, `verification_failure`, `timeout`), mandatory rollback fields (`trigger`, `command`, `scope`, `reversible`, `verification`), exhaustive Cartesian state space coverage over {Risk $\times$ Evidence $\times$ Confidence}, fail-closed locks on unverified high-risk/low-confidence actions, rejection of destructive commands (`rm -rf /`, `format`), and exit code 0.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Machine-readable `failure_policy`, `rollback`, and `routing_contract` YAML schemas, exact-HEAD commit SHA, proof receipt binding, and programmatic truth table parser.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Atomic validation of failure policies, inverse saga compensation rollback verification, truth-table completeness proofs, and fail-closed termination (exit code 1) upon invariant violations.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Boundary guards rejecting unhandled states, high-risk unverified actions routing to proceed, missing rollback compensation, and destructive commands.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Reusability)** -> Confirmed Option 6.1: Sub-50ms execution SLA per harness evaluation, 100% byte equivalence between root and `template/` copies, zero mocks, and zero stubs.

---

## 🏛️ Context & Problem Statement

Autonomous agent pipelines and governance frameworks require deterministic fail-closed safety and explicit rollback procedures:
1. **Unchecked Silent Failures:** Without machine-readable failure policies, partial writes or timed-out dependencies can masquerade as successful operations.
2. **Missing Rollback Verification:** Agents mutating system states without verified executable rollback commands leave corrupt states across environments.
3. **Incomplete Decision State Spaces:** Omitting combinations of risk, evidence, and confidence in decision routing causes runtime ambiguity and dangerous default-allow fallbacks.
4. **Permissive Routing Bypasses:** Allowing high-risk decisions with unverified evidence to execute autonomously breaches core security invariants.
5. **Distribution Parity:** Governance rules, architecture specs, and harnesses must maintain 100% byte equivalence between root and `template/` distributions.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Failure, Rollback & Fail-Closed Routing Governance)
- [x] **Option 1.1: Automated Failure & Rollback Harness with Truth Table Completeness Engine**
  - Implement failure policy parsing and validation in `scripts/harness/failure-rollback-harness.mjs`.
  - Implement rollback command syntax and non-empty compensation validation.
  - Implement combinatorial state space enumeration {risk, evidence, confidence} in `scripts/harness/routing-truth-table-harness.mjs`.
  - Codify fail-closed truth table in `.agents/rules/agent-runtime-fail-closed.md` and `docs/03-architecture/agent-runtime-governance.md`.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Verification & Epistemic Demarcation Gate**
  - Reject goals missing mandatory failure policy conditions (`dependency_unavailable`, `invalid_input`, `verification_failure`, `timeout`).
  - Reject rollback contracts missing executable commands, triggers, scopes, or verification steps.
  - Reject forbidden destructive commands (e.g. `rm -rf /`).
  - Prove exhaustiveness of Cartesian product: $\{ \text{normal}, \text{high} \} \times \{ \text{verified}, \text{unverified} \} \times \{ \text{low}, \text{high} \} = 8$ states.
  - Enforce Safety Invariant 1: High-risk unverified decisions MUST NEVER route to `proceed`.
  - Enforce Safety Invariant 2: Low-confidence decisions MUST NEVER route to `proceed`.
  - Enforce Safety Invariant 3: High-risk verified actions route strictly to `human_review` or `defer`.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Exported Schema & Programmatic Claim Validation**
  - Validate machine-readable `failure_policy`, `rollback`, and `routing_contract` blocks in goal cards.
  - Export `validateFailureAndRollbackPolicy(content, filename)` returning `{ valid, hasFailurePolicy, hasRollback, errors, warnings }`.
  - Export `validateRoutingTruthTable(content, filename)` returning `{ valid, caseCount, cases, errors, warnings }`.
  - Export `extractRoutingContract(content)`, `parseRoutingContractYaml(yamlText)`, and `parseRoutingTableMarkdown(tableText)`.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Fail-Closed Pipeline Integration**
  - Failure-rollback harness and routing truth-table CLI terminate fail-closed with exit code 1 on invariant violation.
  - Accumulate all validation errors in a single pass for actionable diagnostics.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Boundary Guards & Tamper Detection**
  - Detect and fail on modified source files whose working-tree SHA256 diverges from proof receipts.
  - Reject non-permitted actions outside `['proceed', 'verify', 'defer', 'human_review']`.
  - Require explicit `reason` when rollback is marked `not_applicable`.

### Dimension 6: Codebase Grounding, Latency & Provenance
- [x] **Option 6.1: Sub-50ms Kernel SLA and Exact-HEAD Provenance**
  - All harness validations execute with p99 < 50ms latency.
  - Exact-HEAD commit SHA bound in proof receipts.
  - 100% byte equivalence between root and `template/` files.
  - Zero mocks, zero stubs; 100% operational logic.

---

## 🔒 Verification & Exit Gate
- Unit tests pass: `node scripts/harness/test-goal-assurance-suite.mjs`
- Failure & rollback harness passes: `node scripts/harness/failure-rollback-harness.mjs docs/07-backlog/goals/G-CORE-008.md`
- Routing truth table harness passes: `node scripts/harness/routing-truth-table-harness.mjs docs/07-backlog/goals/G-CORE-008.md`
- Conformance harness passes: `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-008`
- Full test pass: `npm test && npm run test:template`
