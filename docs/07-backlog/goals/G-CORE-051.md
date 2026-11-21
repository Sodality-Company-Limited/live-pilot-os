---
goal_contract:
  id: G-CORE-051
  version: 2
  kind: api
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Register Feature 01 NATS subjects and payload bindings"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: event-mesh-lead}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: ["Async compatibility"]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-051: Register Feature 01 NATS subjects and payload bindings

**Status:** draft
**Kind:** api
**Atomic outcome:** The required F01 event subjects, producers, consumers, schemas, retry/DLQ, and compatibility bindings are registered.
**Epic:** CORE
**Depends on:** —
**Spec stability:** clarify pending | spec check pending | analyze pending

## Context
F01 requires canonical chat, commerce, intent, risk, question, product-interest, purchase, and engagement events. The current catalog has only part of the telemetry baseline.

## Intent
**Why:** Services and Core BFF need one async contract.
**Done when:** AsyncAPI, subject catalog, and schema hashes agree with F01 flows.
**Unblocks:** F01 service implementation goals.

## In
- F01 subject inventory and schema bindings.
- Delivery, idempotency, late-event, and DLQ semantics.

## Out
- Service implementation or model/provider behavior.

## Atomicity & Zero-Mock Contract
- One contract registry outcome; no fake event behavior.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| F01 event inventory is broader than the pilot subject list | F01 BRD and flow index | Register only flow-backed subjects and schemas | API/SOT checks |

## How
Use the NATS subject template, AsyncAPI, telemetry schema, and F01 flow coverage.

## Open questions
- [ ] [NEEDS CLARIFICATION: confirm final subject names for F01 events not already present in AsyncAPI]

## Knowledge links
| Type | Path |
|---|---|
| Async authority | docs/03-architecture/api/nats-subject-catalog-sot.md |
| Schema authority | docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json |
| Satellite | docs/03-architecture/specs/goals/G-CORE-051/G-CORE-051-architecture-spec.md |

## Context manifest
| Kind | Path |
|---|---|
| F01 flows | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/ |
| AsyncAPI | docs/03-architecture/api/asyncapi.yaml |

## Work steps
### Step 1 — Register and validate F01 async bindings
**Allowed files:** `docs/03-architecture/api/nats-subject-catalog-sot.md`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`
**Actions:** Add flow-backed subject rows, message bindings, version/hash references, retry/DLQ, and compatibility rules.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `node scripts/api/check-api-sot-traceability.mjs`
**Completion gate:** Every registered subject has one owner and verification evidence.
**Stop condition:** unresolved subject ownership or payload semantics.

## Change delta
| Area | Action | Path |
|---|---|---|
| Async catalog | CHANGE | docs/03-architecture/api/nats-subject-catalog-sot.md |
| AsyncAPI | CHANGE | docs/03-architecture/api/asyncapi.yaml |

## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; goal branch `feature/G-CORE-051` |
| System Archetype | event-stream |
| Bounded Context & Domain | F01 telemetry and signal contracts |
| Ports & Adapters Topology | producers → NATS JetStream → named consumers/DLQ |
| State Machine & Invariants | duplicate, late, unknown, rejected, and accepted are explicit |
| Zero-Mock & Conformance Gate | AsyncAPI and schema compatibility checks |

## Contract impact
- Adds only flow-backed versioned F01 async bindings.

## Spec checklist
- [ ] Intent is WHAT/WHY only
- [ ] Subject names and owners resolved
- [ ] Goal and architecture harnesses pass

## Acceptance criteria
- [ ] F01 subjects map to BRD/BDD/flow evidence.
- [ ] Each subject has schema, owner, ordering, retry, and DLQ behavior.
- [ ] Compatibility validation passes.

## Test plan
- Positive: valid envelope/schema bindings.
- Negative: unknown subject, wrong schema version, session-scope mismatch.
- Fail-closed: poison and repeated failure route to explicit DLQ.

## Epistemic Proof & Evidence Classification
Contract registry and schema-hash evidence plus executable traceability.

## Touch map
- docs/03-architecture/api/nats-subject-catalog-sot.md
- docs/03-architecture/api/asyncapi.yaml
- docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json

## Notes for AI
Never create a subject from a service name alone.

## Comprehensive Spec Design Appendix
See the five goal satellites linked above.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-051/G-CORE-051-architecture-spec.md |

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
