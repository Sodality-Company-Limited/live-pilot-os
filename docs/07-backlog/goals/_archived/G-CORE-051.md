---
goal_contract:
  id: G-CORE-051
  version: 2
  kind: migration
  status: done
  profiles: [core, database]
  atomicity:
    outcome_count: 1
    primary_outcome: "one independently verifiable session-service outcome"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [authoritative persistence and rollback]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-050]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-051: Add service-owned live-session persistence
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Atomic outcome:** Expand/contract migration for authoritative live-session state and outbox records.  
**Epic:** CORE  
**Depends on:** G-CORE-050  
**Traceability:** REQ-LP-016; `technology-stack-sot.md`; `technical-specifications-sot.md` §6; `migration-rollback-sot.md`

## Context and intent
`session-service` must own durable lifecycle state and publish only after commit. This goal establishes the NestJS/TypeScript persistence boundary using `pg` + Kysely before domain or transport code exists.

## In
- Session identity, tenant/workspace scope, lifecycle status/version, timestamps, idempotency key, audit/outbox linkage, and indexes required by the contract.
- Expand/contract and rollback evidence.

## Out
- Domain transitions, HTTP/NATS handlers, Redis, other service tables, and deployment.

## Work steps
### Step 1 — create and verify the migration
**Allowed files:** goal-scoped files declared in the touch map
**Actions:**
1. Apply the migration and run fresh, upgrade, and rollback-safe checks.
2. Record reproducible evidence and stop on any failed gate.
**Allowed files:** `code/services/session-service/src/`, `code/services/session-service/migrations/`, `code/services/session-service/test/`, `docs/03-architecture/specs/goals/G-CORE-051/`  
**Verification command:** `npm test -- session-service` plus the migration verification command recorded by the service scaffold  
**Completion gate:** Fresh apply, repeat apply, rollback-safe expand path, uniqueness, tenant isolation, and outbox atomicity tests pass.  
**Stop condition:** destructive down migration, cross-service table access, or missing backup/restore evidence.

## Acceptance criteria
## Intent
**Why:** Deliver the single bounded session-service capability defined by the linked SOTs.  
**Done when:** The declared atomic outcome has reproducible green evidence.  
**Unblocks:** The next goal in the session-service dependency chain.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

**Spec stability:** clarify done | spec check pending | analyze pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement the declared atomic outcome | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-CORE-051; no subagents; disjoint touch map only.

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
| **Epic & Integration Branch** | feature/G-CORE-051 |
| **System Archetype** | backend-service / event-stream / sre-control-plane as scoped |
| **Bounded Context & Domain** | Live-session lifecycle supporting domain |
| **Ports & Adapters Topology** | Inbound lifecycle command; outbound PostgreSQL, NATS, audit, and telemetry ports as applicable |
| **State Machine & Invariants** | created → active → paused → active → ended; invalid/stale transitions fail closed |
| **Zero-Mock & Conformance Gate** | Concrete implementation and executable verification |
| **Socratic 5-Why Blueprint** | Derive from linked SOT evidence during PLAN |

## Contract impact
- **Schema modifications:** Only the versioned contract or migration named in the goal touch map.

## Spec checklist
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

- [ ] State is service-owned and supports optimistic version checks.
- [ ] Duplicate idempotency keys cannot create a second lifecycle effect.
- [ ] Migration is forward-compatible and has a documented recovery path.

## Touch map
- `code/services/session-service/migrations/`
- `code/services/session-service/src/`
- `code/services/session-service/test/`
- `docs/03-architecture/specs/goals/G-CORE-051/`

## Test plan
Fresh/upgrade migration, constraint, tenant isolation, concurrent update, idempotency, outbox transaction, and restore verification.

## Satellite specifications
- [Architecture](../../03-architecture/specs/goals/G-CORE-051/G-CORE-051-architecture-spec.md)
- [Invariants](../../03-architecture/specs/goals/G-CORE-051/G-CORE-051-invariants-formal-spec.md)
- [FSM](../../03-architecture/specs/goals/G-CORE-051/G-CORE-051-fsm-runtime-spec.md)
- [Threat model](../../03-architecture/specs/goals/G-CORE-051/G-CORE-051-threat-model.md)
- [Worktree plan](../../03-architecture/specs/goals/G-CORE-051/G-CORE-051-worktree-plan.md)
