---
goal_contract:
  id: G-CORE-062
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Project and recover Feature 01 dashboard read models"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: projection-service-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Read-model recovery and freshness"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-051, G-CORE-057, G-CORE-058, G-CORE-059, G-CORE-060]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-062: Project and recover Feature 01 dashboard read models
**Status:** draft
**Kind:** feature
**Atomic outcome:** F01 dashboard projections expose freshness-aware metrics and rebuild deterministically from immutable events.
**Epic:** CORE
**Depends on:** G-CORE-051, G-CORE-057, G-CORE-058, G-CORE-059, G-CORE-060
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
F01.3 requires product interest, questions, conversion, sentiment, hype, engagement, alerts, and projection rebuild.
## Intent
**Why:** Core BFF needs a recoverable safe read model.
**Done when:** projection state, freshness, rebuild cursor, and failure behavior are tested.
**Unblocks:** G-CORE-053 and F01 integration consumers.
## In
- F01 projection reducer and replay/rebuild worker.
## Out
- UI, domain source-of-truth writes, cross-session BI.
## Atomicity & Zero-Mock Contract
- One projection/rebuild outcome.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| F01 dashboard projection absent | F01.3 flows | Add event-derived read model | replay tests |
## How
Reduce versioned immutable F01 events with bounded cursors and explicit stale/degraded state.
## Open questions
- [ ] [NEEDS CLARIFICATION: approved metric window defaults]
## Knowledge links
| Type | Path |
|---|---|
| Flow | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/flows/f01-3-flow-006-rebuild-failed-projection.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-062/G-CORE-062-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| SOT | docs/03-architecture/api/data-persistence-contract-sot.md |
## Work steps
### Step 1 — Build and rebuild F01 projections
**Allowed files:** `code/apps/services/f01-projection-service/src/project.ts`, `code/apps/services/f01-projection-service/test/project.spec.ts`
**Actions:** reduce typed events, mark freshness, checkpoint cursor, and rebuild after projection loss.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/services/f01-projection-service/test/project.spec.ts`
**Completion gate:** rebuild output matches deterministic event reduction and stale state is visible.
**Stop condition:** projection becomes source-of-truth or silently drops events.
## Change delta
| Area | Action | Path |
|---|---|---|
| Projection | ADD | code/apps/services/f01-projection-service/src/project.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-062` |
| System Archetype | event-stream |
| Bounded Context & Domain | F01 read projection |
| Ports & Adapters Topology | immutable events → reducer/checkpoint → Core BFF read |
| State Machine & Invariants | current/stale/rebuilding/degraded/recovered |
| Zero-Mock & Conformance Gate | deterministic replay and failure tests |
## Contract impact
- Consumes G-CORE-051 event bindings and exposes the approved read projection to Core BFF.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] F01 metrics remain stage-separated and session-scoped.
- [ ] Projection rebuild from event range is deterministic.
- [ ] Missing/stale source state is explicit, never empty success.
## Test plan
- Positive reduction; negative bad schema/session; crash, replay, and partial-source recovery.
## Epistemic Proof & Evidence Classification
Executable replay evidence.
## Touch map
- code/apps/services/f01-projection-service/src/project.ts
- code/apps/services/f01-projection-service/test/project.spec.ts
## Notes for AI
Read models are rebuildable views, never another service's authoritative tables.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-062/G-CORE-062-architecture-spec.md |

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
