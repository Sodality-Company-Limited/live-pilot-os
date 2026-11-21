---
goal_contract:
  id: G-CORE-053
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Orchestrate the F01 live-session overview query"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: core-bff-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Cross-service read aggregation"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-050, G-CORE-051, G-CORE-052]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-053: Orchestrate the F01 live-session overview query
**Status:** draft
**Kind:** feature
**Atomic outcome:** Core BFF returns the contract-approved safe F01 overview projection for an authorized session.
**Epic:** CORE
**Depends on:** G-CORE-050, G-CORE-051, G-CORE-052
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
The existing `readSessionOverview` operation is the synchronous F01 read boundary.
## Intent
**Why:** Host and operator surfaces need one safe projection.
**Done when:** Authorized reads aggregate through contracts without database reads across services.
**Unblocks:** Portal BFF and F01 integration.
## In
- NATS/read-projection orchestration, redaction, freshness, degraded and unknown states.
## Out
- Domain rules, raw model output, direct service database access, UI.
## Atomicity & Zero-Mock Contract
- One query handler outcome.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| Core BFF runtime absent | core-bff contract | Add one overview handler | integration tests |
## How
Use approved HTTP DTO and NATS request/reply contracts with bounded timeout.
## Open questions
- [ ] [NEEDS CLARIFICATION: exact projection owner for each F01 metric must be confirmed]
## Knowledge links
| Type | Path |
|---|---|
| HTTP | docs/03-architecture/api/core-bff/openapi.yaml |
| Satellite | docs/03-architecture/specs/goals/G-CORE-053/G-CORE-053-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| F01 overview flows | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/ |
## Work steps
### Step 1 — Implement overview orchestration
**Allowed files:** `code/apps/core-bff/src/f01-overview.ts`, `code/apps/core-bff/test/f01-overview.spec.ts`
**Actions:** authorize session, request approved projection, map safe DTO, preserve freshness and explicit unavailable state.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/core-bff/test/f01-overview.spec.ts`
**Completion gate:** valid, denied, timeout, stale, and unavailable cases are deterministic.
**Stop condition:** any cross-service database access or invented field.
## Change delta
| Area | Action | Path |
|---|---|---|
| Handler | ADD | code/apps/core-bff/src/f01-overview.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-053` |
| System Archetype | backend-service |
| Bounded Context & Domain | F01 read orchestration |
| Ports & Adapters Topology | HTTP → Core BFF → NATS/projection ports |
| State Machine & Invariants | fresh/stale/degraded/unknown are not empty success |
| Zero-Mock & Conformance Gate | contract fixtures and real handler logic |
## Contract impact
- Consumes `readSessionOverview`; no new route.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Session scope and capability are enforced.
- [ ] Safe DTO excludes raw PII/model output and exposes freshness.
- [ ] Timeout/unavailable response is explicit and tested.
## Test plan
- Positive authorized read; negative scope; fail-closed timeout and redaction failure.
## Epistemic Proof & Evidence Classification
Executable integration evidence.
## Touch map
- code/apps/core-bff/src/f01-overview.ts
- code/apps/core-bff/test/f01-overview.spec.ts
## Notes for AI
Core BFF aggregates contracts, never another service's tables.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-053/G-CORE-053-architecture-spec.md |

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
