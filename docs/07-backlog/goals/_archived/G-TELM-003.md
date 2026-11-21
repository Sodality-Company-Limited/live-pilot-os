---
goal_contract:
  id: G-TELM-003
  version: 2
  kind: migration
  status: done
  profiles: [core, database]
  atomicity:
    outcome_count: 1
    primary_outcome: "Idempotent PostgreSQL migration scripts establishing telemetry signal storage and lineage tables."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [authoritative persistence schema, partition strategy, and rollback]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-TELM-003: Create Telemetry persistence schema
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Spec stability:** clarify done | spec check pending | analyze pending  
**Atomic outcome:** Idempotent PostgreSQL migration scripts establishing telemetry signal storage and lineage tables.  
**Epic:** TELM  
**Depends on:** G-TELM-001  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Author and verify up and down PostgreSQL migrations for telemetry service | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-TELM-003; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Telemetry ingestion requires append-only persistence with partition pruning by tenant and session, unique deduplication indexes, and RLS tenant isolation.

## Intent
**Why:** Establish authoritative database tables and outbox records for telemetry-service before domain logic is implemented.  
**Done when:** Fresh apply, rollback-safe down migration, and idempotent re-apply pass cleanly against PostgreSQL.  
**Unblocks:** G-TELM-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/telemetry-service/migrations/`
- Tables: `telemetry_signals`, `telemetry_lineage`, `telemetry_inbox`, `telemetry_outbox`
- Composite indexes on `(tenant_id, session_id, signal_id)` and RLS policies
- `docs/03-architecture/specs/goals/G-TELM-003/`

## Out
- Runtime ingest service logic
- Cross-service analytics tables

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
### Step 1 — Author and verify up and down PostgreSQL migrations for telemetry service
**Allowed files:** `code/services/telemetry-service/migrations/001_create_telemetry_signals.up.sql`, `code/services/telemetry-service/migrations/001_create_telemetry_signals.down.sql`, `code/services/telemetry-service/test/migration.spec.ts`, `code/services/telemetry-service/scripts/verify-migrations.mjs`, `code/services/telemetry-service/package.json`, `code/services/telemetry-service/tsconfig.json`, `docs/03-architecture/specs/goals/G-TELM-003/`  
**Actions:**
1. Create `001_create_telemetry_signals.up.sql` with tables, indexes, constraints, and Row-Level Security policies.
2. Create corresponding `001_create_telemetry_signals.down.sql` rollback script and verify idempotency.
**Verification command:** node code/services/telemetry-service/scripts/verify-migrations.mjs && node --test code/services/telemetry-service/test/migration.spec.ts  
**Completion gate:** Fresh apply, repeat apply, rollback, and constraint validation pass with zero SQL errors.  
**Stop condition:** Destructive down migration, cross-service schema leakage, or missing tenant isolation RLS.  
**Zero-Mock invariant check:** 100% real PostgreSQL DDL migrations (up and down), deterministic SQL syntax/idempotency verifier, and fail-closed migration test suite; zero mocks, zero stubs, zero fallbacks.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| telemetry-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Telemetry Signal Observation Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] PostgreSQL tables `telemetry_signals`, `telemetry_lineage`, `telemetry_inbox`, and `telemetry_outbox` are created.
- [x] Composite primary keys and unique constraint on `(tenant_id, session_id, signal_id)` prevent duplicates.
- [x] Rollback script cleanly drops all created objects without affecting shared database state.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/telemetry-service/migrations/001_create_telemetry_signals.up.sql`
- `code/services/telemetry-service/migrations/001_create_telemetry_signals.down.sql`
- `code/services/telemetry-service/test/migration.spec.ts`
- `code/services/telemetry-service/scripts/verify-migrations.mjs`
- `code/services/telemetry-service/package.json`
- `code/services/telemetry-service/tsconfig.json`
- `docs/07-backlog/goals/G-TELM-003.md`
- `docs/03-architecture/specs/goals/G-TELM-003/design.md`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
