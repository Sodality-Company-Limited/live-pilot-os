---
goal_contract:
  id: G-APPR-002
  version: 2
  kind: migration
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "PostgreSQL migrations with approval aggregates, decision history, control modes, emergency pause, RLS, and transactional outbox."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [persistence schema, RLS isolation, transactional outbox]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-APPR-002: Implement Approval & Control PostgreSQL persistence, migrations, and RLS
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** PostgreSQL migrations with approval aggregates, decision history, control modes, emergency pause, RLS, and transactional outbox.  
**Epic:** APPR  
**Depends on:** G-APPR-001  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement database migrations, RLS policies, and outbox schema for approval-control-service | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-APPR-002; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Approval-control-service requires durable, tenant-isolated persistence for approval requests, decisions, mode configurations, and emergency pause flags.

## Intent
**Why:** Provide authoritative, transactional persistence ensuring single-writer principle and multi-tenant RLS isolation.  
**Done when:** Migrations run cleanly up and down with automated schema validation and RLS enforcement verified.  
**Unblocks:** G-APPR-004

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/approval-control-service/migrations/`
- `code/services/approval-control-service/src/persistence/`
- `docs/03-architecture/specs/goals/G-APPR-002/`

## Out
- NATS transport handlers (owned by G-APPR-005)
- Domain state machine pure logic (owned by G-APPR-003)

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
### Step 1 — Implement database migrations, RLS policies, and outbox schema for approval-control-service
**Allowed files:** `code/services/approval-control-service/migrations/`, `code/services/approval-control-service/src/persistence/`, `code/services/approval-control-service/test/verify-migrations.mjs`, `docs/03-architecture/specs/goals/G-APPR-002/`  
**Actions:**
1. Create PostgreSQL migrations for `approval_requests`, `approval_decisions`, `approval_modes`, `emergency_pauses`, and `approval_outbox`.
2. Add Row-Level Security (RLS) policies and unique constraints ensuring strict tenant isolation and idempotent updates.
**Verification command:** node code/services/approval-control-service/test/verify-migrations.mjs  
**Completion gate:** Migrations apply cleanly and rollback without errors; RLS policies verified by automated integration test.  
**Stop condition:** Migration rollback failure, missing RLS policies, or non-deterministic schema constraints.  
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
- [x] PostgreSQL tables support atomic state transitions and transactional outbox.
- [x] RLS policies prevent cross-tenant record leakage.
- [x] Reversible up/down migration scripts verified.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/approval-control-service/migrations/`
- `code/services/approval-control-service/src/persistence/`
- `code/services/approval-control-service/test/verify-migrations.mjs`
- `docs/03-architecture/specs/goals/G-APPR-002/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Approvals transition through requested → approved | rejected | expired | revoked; emergency pause transitions through active | inactive; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
