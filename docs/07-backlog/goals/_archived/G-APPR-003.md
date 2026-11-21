---
goal_contract:
  id: G-APPR-003
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Pure domain engine enforcing approval lifecycle transitions, authority checks, and fail-closed emergency pause."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [state machine transition correctness and pause enforcement]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-APPR-003: Implement Approval and Emergency Pause domain state machine and contracts
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Pure domain engine enforcing approval lifecycle transitions, authority checks, and fail-closed emergency pause.  
**Epic:** APPR  
**Depends on:** G-APPR-001  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement domain state machine, authority validator, and contract tests | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-APPR-003; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Approval lifecycle must strictly transition `requested → approved | rejected | expired | revoked` with optimistic concurrency locking and fail-closed emergency pause enforcement.

## Intent
**Why:** Decouple domain business invariants and state transitions from transport and infrastructure adapters.  
**Done when:** 100% test coverage over state transitions, unauthorized actor rejection, expiry calculations, and emergency pause triggers.  
**Unblocks:** G-APPR-004

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/approval-control-service/src/domain/`
- `code/services/approval-control-service/test/domain/`
- `docs/03-architecture/specs/goals/G-APPR-003/`

## Out
- Database access and repository implementations (owned by G-APPR-004)
- NATS message consumption (owned by G-APPR-005)

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-013; REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md; docs/03-architecture/deployment/digitalocean-droplets-sot.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Implement domain state machine, authority validator, and contract tests
**Allowed files:** `code/services/approval-control-service/src/domain/`, `code/services/approval-control-service/test/domain/`, `docs/03-architecture/specs/goals/G-APPR-003/`  
**Actions:**
1. Implement pure functional state machine for approvals and emergency pause switches.
2. Write zero-mock unit and contract tests verifying valid transitions and fail-closed rejections.
**Verification command:** node --test code/services/approval-control-service/test/domain/*.test.mjs  
**Completion gate:** Unit tests pass 100% with zero mocks; state machine adheres strictly to domain-resource-state-sot.  
**Stop condition:** Any failing transition assertion, unhandled invalid state, or relaxed actor authorization.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| approval-control-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Approval Control Plane & Emergency Pause Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] State machine strictly rejects invalid transitions (e.g. approved -> rejected).
- [x] Emergency pause instantly blocks all pending approval evaluations fail-closed.
- [x] Actor authority and separation of duty (proposer != approver) enforced.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/approval-control-service/src/domain/`
- `code/services/approval-control-service/test/domain/`
- `docs/03-architecture/specs/goals/G-APPR-003/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Approvals transition through requested → approved | rejected | expired | revoked; emergency pause transitions through active | inactive; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.


## Closeout Notes

- **Closed Date:** 2026-11-21
- **Reason / Outcome:** Implemented 100% operational Zero-Mock approval FSM, emergency pause engine, authority policy, and approval mode governor with 34/34 passing unit/contract tests.
