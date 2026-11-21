---
goal_contract:
  id: G-CORE-050
  version: 2
  kind: api
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Reconcile the approved F01 Core BFF HTTP contract"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: api-contracts-lead}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: ["Boundary contract affects multiple consumers"]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-050: Reconcile Feature 01 Core BFF HTTP contract

**Status:** draft
**Kind:** api
**Atomic outcome:** The approved F01 session overview and event-stream contract is complete and traceable.
**Epic:** CORE
**Depends on:** —
**Spec stability:** clarify pending | spec check pending | analyze pending

## Context
F01 already maps `getLiveSessionOverview` and `streamLiveSessionEvents` in the API catalog. This goal closes the remaining field-level contract gap before implementation.

## Intent
**Why:** Consumers need a stable, safe projection boundary.
**Done when:** OpenAPI, DTO schema references, authorization, error, freshness, and degraded-state rules are traceable to F01 flows.
**Unblocks:** G-CORE-051 through G-CORE-062.

## In
- Reconcile existing Core BFF operations with F01 requirements and flows.
- Define only approved safe DTO and SSE projection semantics.

## Out
- Core BFF implementation, Portal BFF, UI, or new unapproved routes.

## Atomicity & Zero-Mock Contract
- One outcome: contract reconciliation only; no implementation placeholders.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| F01 projection fields are not fully bound to operation rows | API catalog and F01 flows | Update approved contract artifacts | API traceability and SOT checks |

## How
Contract-first reconciliation using the API operation catalog, core-bff OpenAPI, realtime SOT, error SOT, and F01 flow coverage.

## Open questions
- [ ] [NEEDS CLARIFICATION: product must approve exact dashboard freshness/window defaults where the F01 flows leave them open]

## Knowledge links
| Type | Path |
|---|---|
| Requirements | docs/03-architecture/live-pilot-os-requirements.md |
| HTTP authority | docs/03-architecture/api/core-bff/openapi.yaml |
| Operation catalog | docs/03-architecture/api/api-operation-catalog-sot.md |
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-050/G-CORE-050-architecture-spec.md |

## Context manifest
| Kind | Path |
|---|---|
| F01 flows | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/ |
| Coverage | docs/03-architecture/contracts/flows/coverage.yaml |

## Work steps
### Step 1 — Reconcile F01 HTTP operations
**Allowed files:** `docs/03-architecture/api/core-bff/openapi.yaml`, `docs/03-architecture/api/api-operation-catalog-sot.md`, `docs/03-architecture/api/realtime-transport-sot.md`
**Actions:** Bind approved DTO, SSE, auth, freshness, error, and degraded semantics to existing operations.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `node scripts/api/check-api-sot-traceability.mjs`
**Completion gate:** API traceability passes with no new unowned operation.
**Stop condition:** Missing product intent or route semantics.

## Change delta
| Area | Action | Path |
|---|---|---|
| HTTP contract | CHANGE | docs/03-architecture/api/core-bff/openapi.yaml |
| Catalog | CHANGE | docs/03-architecture/api/api-operation-catalog-sot.md |

## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; goal branch `feature/G-CORE-050` |
| System Archetype | api-gateway |
| Bounded Context & Domain | F01 observation projection |
| Ports & Adapters Topology | Portal BFF → KrakenD → Core BFF → NATS/read projections |
| State Machine & Invariants | fresh/stale/degraded/unknown are explicit; no raw model output |
| Zero-Mock & Conformance Gate | Contract checks and schema validation |

## Contract impact
- Existing `readSessionOverview` and `subscribeSessionEvents` only; no route invention.

## Spec checklist
- [ ] Intent is WHAT/WHY only
- [ ] Open questions resolved before ready
- [ ] Goal and architecture harnesses pass
- [ ] Touch map is disjoint

## Acceptance criteria
- [ ] F01 requirements and flows trace to the two approved Core BFF operations.
- [ ] DTO/SSE freshness, authorization, error, and degraded semantics are explicit.
- [ ] API and SOT checks pass.

## Test plan
- Positive: approved operation and schema references.
- Negative: missing owner, unsafe raw payload, public route exposure.
- Fail-closed: unavailable/stale projection remains explicit.

## Epistemic Proof & Evidence Classification
Contract evidence is repository source evidence; validation is executable traceability evidence.

## Touch map
- docs/03-architecture/api/core-bff/openapi.yaml
- docs/03-architecture/api/api-operation-catalog-sot.md
- docs/03-architecture/api/realtime-transport-sot.md

## Notes for AI
Do not add a route from a feature flow unless the catalog approves it.

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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-050/G-CORE-050-architecture-spec.md |

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
