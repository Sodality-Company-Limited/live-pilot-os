---
goal_contract:
  id: G-APPR-004
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Database repositories, deduplication/idempotency store, and transactional outbox publisher."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [transactional integrity, duplicate safety, outbox publishing]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-APPR-004: Implement Approval repositories, idempotency store, and transactional outbox
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Database repositories, deduplication/idempotency store, and transactional outbox publisher.  
**Epic:** APPR  
**Depends on:** G-APPR-002, G-APPR-003  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement persistence repositories, idempotency manager, and outbox publisher | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-APPR-004; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Approval actions and pause state must be committed atomically with outbox records to guarantee at-least-once reliable delivery without distributed transactions.

## Intent
**Why:** Provide robust infrastructure layer guaranteeing exactly-once processing semantics and transactional outbox atomicity.  
**Done when:** Integration tests prove atomic commit of approval decision and outbox record with zero data loss.  
**Unblocks:** G-APPR-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/approval-control-service/src/infrastructure/`
- `code/services/approval-control-service/test/infrastructure/`
- `docs/03-architecture/specs/goals/G-APPR-004/`

## Out
- NATS subscription wiring (owned by G-APPR-005)
- DigitalOcean deployment packaging (owned by G-APPR-007)

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
### Step 1 — Implement persistence repositories, idempotency manager, and outbox publisher
**Allowed files:** `code/services/approval-control-service/src/infrastructure/`, `code/services/approval-control-service/test/infrastructure/`, `docs/03-architecture/specs/goals/G-APPR-004/`  
**Actions:**
1. Implement PostgreSQL repositories for approval entities and outbox events.
2. Implement idempotency key store ensuring duplicate request deduplication and safe replays.
**Verification command:** node --test code/services/approval-control-service/test/infrastructure/*.test.mjs  
**Completion gate:** Repository integration tests pass; outbox atomicity and duplicate suppression verified.  
**Stop condition:** Database transaction rollback leak, duplicate execution on replay, or uncommitted outbox entries.  
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
- [x] Transactional outbox guarantees atomic persistence of domain events.
- [x] Idempotency keys prevent duplicate decision recording.
- [x] Zero-mock integration tests pass against local PostgreSQL.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/approval-control-service/src/infrastructure/`
- `code/services/approval-control-service/test/infrastructure/`
- `docs/03-architecture/specs/goals/G-APPR-004/`

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
- **Reason / Outcome:** Implemented 100% operational Zero-Mock approval repositories, idempotency store, and transactional outbox publisher passing all verification tests.
