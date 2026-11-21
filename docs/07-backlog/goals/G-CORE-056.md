---
goal_contract:
  id: G-CORE-056
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Accept canonical Feature 01 telemetry ingress"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: telemetry-service-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Event ingestion and idempotency"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-051]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-056: Accept canonical Feature 01 telemetry ingress
**Status:** draft
**Kind:** feature
**Atomic outcome:** Telemetry ingress validates and records one canonical, session-scoped F01 event envelope.
**Epic:** CORE
**Depends on:** G-CORE-051
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
F01 begins with multi-source chat, commerce, engagement, and stock signals.
## Intent
**Why:** Downstream services require a validated source event.
**Done when:** schema, scope, timestamp, lineage, and idempotency checks are executable.
**Unblocks:** G-CORE-057 through G-CORE-060.
## In
- Ingress validation and durable handoff to the approved NATS subject.
## Out
- Classification, moderation, projection, external platform mutation.
## Atomicity & Zero-Mock Contract
- One ingress outcome.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| F01 ingress runtime absent | F01-FLOW-002/003 | Add validator and publisher | service tests |
## How
Use the registered telemetry schema and NATS envelope.
## Open questions
- [ ] [NEEDS CLARIFICATION: source-platform adapter identity list]
## Knowledge links
| Type | Path |
|---|---|
| Flows | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/flows/f01-flow-002-ingest-multi-source-signal.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-056/G-CORE-056-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| Schema | docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json |
## Work steps
### Step 1 — Validate and publish one telemetry envelope
**Allowed files:** `code/apps/services/telemetry-ingress/src/ingest.ts`, `code/apps/services/telemetry-ingress/test/ingest.spec.ts`
**Actions:** validate schema, session scope, timestamps, lineage, and duplicate identity before publish.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/services/telemetry-ingress/test/ingest.spec.ts`
**Completion gate:** invalid and duplicate events do not publish.
**Stop condition:** missing subject/schema authority.
## Change delta
| Area | Action | Path |
|---|---|---|
| Ingress | ADD | code/apps/services/telemetry-ingress/src/ingest.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-056` |
| System Archetype | event-stream |
| Bounded Context & Domain | telemetry ingestion |
| Ports & Adapters Topology | source adapter → ingress → NATS |
| State Machine & Invariants | accepted/rejected/duplicate; no metric inflation |
| Zero-Mock & Conformance Gate | real schema and publisher tests |
## Contract impact
- Consumes and publishes only G-CORE-051 bindings.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Valid source events are canonicalized with lineage.
- [ ] Invalid, cross-session, late-invalid, and duplicate inputs fail safely.
## Test plan
- Positive valid event; negative schema/scope; replay and timeout failure.
## Epistemic Proof & Evidence Classification
Executable event evidence.
## Touch map
- code/apps/services/telemetry-ingress/src/ingest.ts
- code/apps/services/telemetry-ingress/test/ingest.spec.ts
## Notes for AI
Do not treat an accepted transport receipt as a classified signal.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-056/G-CORE-056-architecture-spec.md |

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
