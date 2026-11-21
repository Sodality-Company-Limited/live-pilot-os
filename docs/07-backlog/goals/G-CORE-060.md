---
goal_contract:
  id: G-CORE-060
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Compute idempotent Feature 01 purchase signals"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: purchase-signal-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Funnel metric correctness"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-051, G-CORE-057]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-060: Compute idempotent Feature 01 purchase signals
**Status:** draft
**Kind:** feature
**Atomic outcome:** F01 keeps cart-add, checkout, payment/order, voucher, and conversion measures separate and replay-safe.
**Epic:** CORE
**Depends on:** G-CORE-051, G-CORE-057
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
F01.P defines purchase-signal correlation and explicitly forbids funnel inflation.
## Intent
**Why:** Operators must distinguish attention from conversion.
**Done when:** event-time windows, separate counters, idempotency, and unknown/reconciliation states are tested.
**Unblocks:** F01 projections.
## In
- Cart, checkout, order, voucher, and conversion signal computation.
## Out
- Inventory mutation, promotion issuance, margin policy.
## Atomicity & Zero-Mock Contract
- One purchase-signal outcome.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| Purchase signal runtime absent | F01.P flows | Add replay-safe calculator | property tests |
## How
Use canonical event identities, explicit windows, and integer counts.
## Open questions
- [ ] [NEEDS CLARIFICATION: approved conversion-window defaults]
## Knowledge links
| Type | Path |
|---|---|
| Flow | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/flows/f01-p-flow-004-calculate-cart-to-checkout-conversion.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-060/G-CORE-060-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| BRD | docs/02-product/brd/feature-01-live-chat-purchase-signal-analysis.md |
## Work steps
### Step 1 — Calculate replay-safe purchase signals
**Allowed files:** `code/apps/services/purchase-signal-service/src/signals.ts`, `code/apps/services/purchase-signal-service/test/signals.spec.ts`
**Actions:** separate funnel stages, correlate windows, suppress replays, and preserve pending/unknown states.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/services/purchase-signal-service/test/signals.spec.ts`
**Completion gate:** duplicate and out-of-order events do not inflate metrics.
**Stop condition:** undefined window or order-state semantics.
## Change delta
| Area | Action | Path |
|---|---|---|
| Purchase signals | ADD | code/apps/services/purchase-signal-service/src/signals.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-060` |
| System Archetype | event-stream |
| Bounded Context & Domain | purchase signal analysis |
| Ports & Adapters Topology | canonical commerce events → signal calculator → NATS |
| State Machine & Invariants | observed/pending/unknown/reconciled; stage separation |
| Zero-Mock & Conformance Gate | property and replay tests |
## Contract impact
- Publishes registered `purchase.signal.updated` binding.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Funnel stages remain separate.
- [ ] Idempotency and late-event reconciliation are proven.
- [ ] Unknown payment/order state is not counted as paid.
## Test plan
- Positive each stage; negative duplicates; out-of-order and timeout reconciliation.
## Epistemic Proof & Evidence Classification
Executable invariant evidence.
## Touch map
- code/apps/services/purchase-signal-service/src/signals.ts
- code/apps/services/purchase-signal-service/test/signals.spec.ts
## Notes for AI
Cart-add never equals paid order.
## Comprehensive Spec Design Appendix
See the five goal satellites.
+
#### Plan

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Contract and implementation boundary | pending |
| 2 | Verification and evidence | pending |

### Worktree & Multi-Subagent Orchestration Plan
- Integration branch: `epic/CORE`.
- Each implementation goal runs on `feature/G-xxx` with disjoint touch maps; wave scheduling uses `soda-os goal waves CORE`.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps, allowed files, verification command, completion gate, and stop condition without expanding the touch map.

### Mathematical & Data Invariants Spec
- F01 state is session-scoped, lineage-bearing, idempotent, and explicit about stale, pending, unknown, and rejected outcomes.
- No raw PII, provider credential, or unverified model output crosses a public boundary.

### Architecture Invariants
- **System Archetype** | The declared system archetype remains within the goal's single layer.
- **Bounded Context & Domain Invariant** | Ownership stays with the named F01 context.
- **Ports & Adapters Topology Invariant** | Cross-boundary calls use approved HTTP/NATS contracts only.
- **Zero-Mock Conformance Gate** | Verification exercises concrete behavior and explicit failure states.
- **Socratic 5-Why Blueprint Link** | Rationale is recorded in the goal satellite architecture specification.

### Checklist: Software & Architecture Design
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic Report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

+
## Conformance Addendum

## Knowledge links
| Type | IDs |
|---|---|
| F01 authority | REQ-LP-001; F01 flow IDs |
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-060/G-CORE-060-architecture-spec.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Feature | F01 |
| Contract | docs/03-architecture/api/README.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** This goal delivers exactly one independently verifiable outcome.
- **Concrete execution:** 100% concrete implementation and executable evidence; zero placeholders, stubs, or fake success.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Declared outcome | ADD / CHANGE | The goal touch map and approved contract boundary |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | Single-layer F01 backend boundary |
| **Bounded Context & Domain** | F01 observation and signal analysis |
| **Ports & Adapters Topology** | Approved HTTP/NATS/provider ports only |
| **State Machine & Invariants** | Explicit accepted, rejected, pending, unknown, stale, and reconciled states |
| **Zero-Mock & Conformance Gate** | Concrete behavior verified by goal and architecture harnesses |
| **Socratic 5-Why Blueprint** | Recorded in this goal's architecture satellite |

## Spec checklist
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

### 1. Positive Tests
- Valid contract input produces the declared outcome.
### 2. Negative Tests
- Invalid scope, schema, or capability is rejected.
### 3. Fail-Closed & Chaos Tests
- Timeout, dependency outage, stale input, and unknown result remain explicit.
### 4. Temporal Causality Tests
- Event time and causation lineage are monotonic or explicitly reconciled.
### 5. Security & Air-Gap Checks
- No public boundary bypass, secret leakage, or cross-session data.
