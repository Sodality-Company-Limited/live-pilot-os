---
goal_contract:
  id: G-CORE-054
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Stream authorized F01 session events through Core BFF"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: core-bff-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Realtime boundary"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-050, G-CORE-051, G-CORE-052]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-054: Stream authorized F01 session events through Core BFF
**Status:** draft
**Kind:** feature
**Atomic outcome:** Core BFF delivers only authorized, redacted, version-valid F01 SSE events with explicit disconnect and stale state.
**Epic:** CORE
**Depends on:** G-CORE-050, G-CORE-051, G-CORE-052
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
`subscribeSessionEvents` is the approved realtime Core BFF operation.
## Intent
**Why:** Consumers need timely evidence without bypassing the private boundary.
**Done when:** SSE lifecycle, scope, redaction, replay cursor, and failure semantics are tested.
**Unblocks:** downstream host/operator surfaces.
## In
- Authorized SSE stream, event schema validation, heartbeat, stale/disconnect metadata.
## Out
- Browser auth, UI rendering, event production.
## Atomicity & Zero-Mock Contract
- One realtime stream outcome.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| Realtime handler absent | realtime SOT | Add one stream adapter | stream tests |
## How
Implement the existing realtime transport contract and F01 event bindings.
## Open questions
- [ ] [NEEDS CLARIFICATION: approved replay cursor retention for F01 SSE must be confirmed]
## Knowledge links
| Type | Path |
|---|---|
| Realtime | docs/03-architecture/api/realtime-transport-sot.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-054/G-CORE-054-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| Contract | docs/03-architecture/api/core-bff/openapi.yaml |
## Work steps
### Step 1 — Implement F01 SSE boundary
**Allowed files:** `code/apps/core-bff/src/f01-events.ts`, `code/apps/core-bff/test/f01-events.spec.ts`
**Actions:** enforce scope, validate event version, redact payload, emit heartbeat/stale/disconnect state.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/core-bff/test/f01-events.spec.ts`
**Completion gate:** authorized stream and all failure states pass.
**Stop condition:** raw unvalidated event reaches the stream.
## Change delta
| Area | Action | Path |
|---|---|---|
| SSE adapter | ADD | code/apps/core-bff/src/f01-events.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-054` |
| System Archetype | backend-service |
| Bounded Context & Domain | F01 realtime projection |
| Ports & Adapters Topology | NATS/JetStream → Core BFF → SSE |
| State Machine & Invariants | connected/stale/disconnected; invalid event rejected |
| Zero-Mock & Conformance Gate | real schema and stream tests |
## Contract impact
- Consumes `subscribeSessionEvents`; no new route.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Cross-session events are rejected.
- [ ] Invalid schema, stale, disconnect, and redaction states are explicit.
- [ ] Heartbeat and bounded buffering are tested.
## Test plan
- Positive stream; negative scope/schema; chaos disconnect and replay.
## Epistemic Proof & Evidence Classification
Executable realtime evidence.
## Touch map
- code/apps/core-bff/src/f01-events.ts
- code/apps/core-bff/test/f01-events.spec.ts
## Notes for AI
Never forward NATS payloads verbatim to SSE.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-054/G-CORE-054-architecture-spec.md |

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
