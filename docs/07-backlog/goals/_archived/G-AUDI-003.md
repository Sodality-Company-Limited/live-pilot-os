---
goal_contract:
  id: G-AUDI-003
  version: 2
  kind: migration
  status: done
  profiles: [core, database]
  atomicity:
    outcome_count: 1
    primary_outcome: "PostgreSQL 16 migration defining audit_records, audit_inbox, and hash-chaining invariants."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [database migration, tamper-evident hash chaining, and unique constraints]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-AUDI-003: Create Audit persistence schema & hash-chaining
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** PostgreSQL 16 migration defining audit_records, audit_inbox, and hash-chaining invariants.  
**Epic:** AUDI  
**Depends on:** G-AUDI-001  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Write up/down SQL migrations for audit persistence and idempotency | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-AUDI-003; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Audit records require immutable append-only persistence with SHA-256 hash chaining, composite uniqueness, and transactional inbox.

## Intent
**Why:** Provide a durable, tamper-evident schema with zero foreign keys to external services and strict tenant isolation.  
**Done when:** Up and down migrations execute cleanly against PostgreSQL 16 with indexes and idempotency constraints intact.  
**Unblocks:** G-AUDI-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/audit-service/migrations/`
- PostgreSQL 16 tables: `audit_records`, `audit_inbox`, `audit_idempotency`
- `docs/03-architecture/specs/goals/G-AUDI-003/`

## Out
- Application logic and domain handlers (owned by G-AUDI-004/005)
- NATS consumer code (owned by G-AUDI-005)

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

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
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Write up/down SQL migrations for audit persistence and idempotency
**Allowed files:** `code/services/audit-service/migrations/`, `docs/03-architecture/specs/goals/G-AUDI-003/`  
**Actions:**
1. Create SQL migration files with strict up/down scripts for `audit_records`, `audit_inbox`, and `audit_idempotency`.
2. Enforce unique index on `(tenant_id, receipt_id)` and sequential hash chaining `(prev_record_hash, record_hash)`.
**Verification command:** node code/services/audit-service/scripts/verify-migrations.mjs  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.  
**Completion gate:** Migrations apply and revert cleanly with zero errors and 100% invariant verification.  
**Stop condition:** Migration rollback failure, missing unique constraints, or non-deterministic schema creation.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| audit-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Execution Audit & Immutable Decision Ledger Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Table `audit_records` has immutable append-only constraints and SHA-256 record hashing.
- [x] Migration applies and rolls back deterministically without leaving orphaned objects.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/audit-service/migrations/`
- `docs/03-architecture/specs/goals/G-AUDI-003/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → redacted → hashed → committed; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
