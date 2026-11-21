---
goal_contract:
  id: G-CORE-050
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "one independently verifiable session-service outcome"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [service boundary and event contract]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-050: Define the live-session lifecycle contract
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** A versioned, executable lifecycle contract for `session-service`.  
**Epic:** CORE  
**Depends on:** —  
**Traceability:** REQ-LP-016; `service-topology-sot.md`; `api/nats-subject-catalog-sot.md`; `api/schemas/nats/session-lifecycle.schema.json`

## Context and intent
The repository names `session-service` as the authoritative live-session lifecycle owner, but has no service implementation. This goal freezes the contract that later goals must implement without inventing transport behavior.

## In
- Start, pause, resume, and end operations; version, correlation, tenant/session scope, retry/DLQ, and `SIMULATED` mode semantics.
- Contract compatibility tests and coverage registration.

## Out
- Database schema, service runtime, UI/BFF, authentication implementation, and DigitalOcean deployment.

## Work steps
### Step 1 — publish the contract module
**Allowed files:** goal-scoped files declared in the touch map
**Actions:**
1. Publish the contract and update executable coverage.
2. Record reproducible evidence and stop on any failed gate.
**Allowed files:** `docs/03-architecture/api/services/session-service.md`, `docs/03-architecture/api/schemas/nats/session-lifecycle.schema.json`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/contracts/flows/coverage.yaml`, goal-scoped tests  
**Verification command:** `node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** Contract has one owner, schema hash, producer/consumer, lifecycle states, error/retry semantics, and executable compatibility evidence.  
**Stop condition:** Any missing SOT authority, invented field, or unresolved lifecycle transition.

## Acceptance criteria
## Intent
**Why:** Deliver the single bounded session-service capability defined by the linked SOTs.  
**Done when:** The declared atomic outcome has reproducible green evidence.  
**Unblocks:** The next goal in the session-service dependency chain.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

**Spec stability:** clarify done | spec check done | analyze done

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement the declared atomic outcome | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-CORE-050; no subagents; disjoint touch map only.

## How
Implement only the declared outcome using linked SOTs. No placeholder behavior or fabricated evidence.

## Open questions
- [x] None; unresolved decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
Return ordered steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| session-service | CHANGE | Implement only the declared atomic outcome |
| verification | ADD | Positive, negative, replay, timeout, and fail-closed evidence |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | feature/G-CORE-050 |
| **System Archetype** | backend-service / event-stream / sre-control-plane as scoped |
| **Bounded Context & Domain** | Live-session lifecycle supporting domain |
| **Ports & Adapters Topology** | Inbound lifecycle command; outbound PostgreSQL, NATS, audit, and telemetry ports as applicable |
| **State Machine & Invariants** | created → active → paused → active → ended; invalid/stale transitions fail closed |
| **Zero-Mock & Conformance Gate** | Concrete implementation and executable verification |
| **Socratic 5-Why Blueprint** | Derive from linked SOT evidence during PLAN |

## Contract impact
- **Schema modifications:** Only the versioned contract or migration named in the goal touch map.

## Spec checklist
- [x] Software & Architecture Design specified by AI Agent
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
- [x] Intent is WHAT/WHY only.
- [x] Acceptance criteria are testable and touch map is real.
- [x] Security, failure, idempotency, audit, and rollback invariants are explicit.
- [x] Architecture and goal conformance harness passes.

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, linked API/flow authority, and deployment authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM Matrix)
See the goal-specific FSM satellite specification.

### Mathematical & Data Invariants Spec
See the goal-specific invariants satellite specification.

### Hexagonal Ports & Adapters Spec
Inbound and outbound dependencies remain behind explicit ports; service-owned state is not bypassed.

- [ ] Contract covers `start|pause|resume|end` and rejects unknown operations and stale versions.
- [ ] NATS envelope, ordering key, retries, DLQ, replay authorization, and mode label are explicit.
- [ ] Coverage registry points to the contract and verification command.

## Touch map
- `docs/03-architecture/api/services/session-service.md`
- `docs/03-architecture/api/schemas/nats/session-lifecycle.schema.json`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/contracts/flows/coverage.yaml`
- `docs/03-architecture/specs/goals/G-CORE-050/`

## Test plan
Schema positive/negative validation, additive compatibility, unknown operation, stale version, duplicate message, and DLQ/replay metadata checks.

## Satellite specifications
- [Architecture](../../03-architecture/specs/goals/G-CORE-050/G-CORE-050-architecture-spec.md)
- [Invariants](../../03-architecture/specs/goals/G-CORE-050/G-CORE-050-invariants-formal-spec.md)
- [FSM](../../03-architecture/specs/goals/G-CORE-050/G-CORE-050-fsm-runtime-spec.md)
- [Threat model](../../03-architecture/specs/goals/G-CORE-050/G-CORE-050-threat-model.md)
- [Worktree plan](../../03-architecture/specs/goals/G-CORE-050/G-CORE-050-worktree-plan.md)
