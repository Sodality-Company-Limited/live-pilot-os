---
goal_contract:
  id: G-CORE-057
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Normalize, deduplicate, and reconcile Feature 01 events"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: telemetry-service-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Replay and late-event correctness"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-051, G-CORE-056]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-057: Normalize, deduplicate, and reconcile Feature 01 events
**Status:** draft
**Kind:** feature
**Atomic outcome:** Replayed, duplicate, late, and out-of-order F01 events produce deterministic canonical state without inflating signals.
**Epic:** CORE
**Depends on:** G-CORE-051, G-CORE-056
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
F01 explicitly requires normalization, duplicate suppression, and late-event reconciliation.
## Intent
**Why:** Platform delivery is at-least-once and out of order.
**Done when:** event identity and reconciliation tests pass.
**Unblocks:** classifiers and purchase signals.
## In
- Normalization, inbox/idempotency, event-time windows, reconciliation state.
## Out
- Intent, risk, or purchase business calculations.
## Atomicity & Zero-Mock Contract
- One event consistency outcome.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| Late-event runtime absent | F01-FLOW-003/004/005 | Add deterministic reconciler | unit/property tests |
## How
Use event IDs, source timestamps, session scope, and explicit pending/reconciled states.
## Open questions
- [ ] [NEEDS CLARIFICATION: retention window for replay identity]
## Knowledge links
| Type | Path |
|---|---|
| Flows | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/flows/f01-flow-004-ignore-duplicate-event.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-057/G-CORE-057-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| Async | docs/03-architecture/api/nats-subject-catalog-sot.md |
## Work steps
### Step 1 — Implement F01 event reconciliation
**Allowed files:** `code/apps/services/telemetry-service/src/reconcile.ts`, `code/apps/services/telemetry-service/test/reconcile.spec.ts`
**Actions:** normalize source events, suppress duplicate fingerprints, classify late/out-of-order inputs, emit reconciliation evidence.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/services/telemetry-service/test/reconcile.spec.ts`
**Completion gate:** replay does not inflate counters and late events remain traceable.
**Stop condition:** ambiguous event-time policy.
## Change delta
| Area | Action | Path |
|---|---|---|
| Reconciler | ADD | code/apps/services/telemetry-service/src/reconcile.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-057` |
| System Archetype | event-stream |
| Bounded Context & Domain | telemetry consistency |
| Ports & Adapters Topology | canonical events → inbox/reconciler → downstream subjects |
| State Machine & Invariants | new/duplicate/late/reconciled/unknown |
| Zero-Mock & Conformance Gate | property and replay tests |
## Contract impact
- Uses existing F01 event envelopes.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Duplicate events are idempotent.
- [ ] Late events do not silently rewrite history.
- [ ] Unknown reconciliation remains explicit.
## Test plan
- Positive order; negative fingerprint mismatch; replay, late, crash recovery.
## Epistemic Proof & Evidence Classification
Executable invariant evidence.
## Touch map
- code/apps/services/telemetry-service/src/reconcile.ts
- code/apps/services/telemetry-service/test/reconcile.spec.ts
## Notes for AI
Never convert an unknown outcome into success by retrying blindly.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-057/G-CORE-057-architecture-spec.md |

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
