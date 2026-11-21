---
goal_contract:
  id: G-INVT-003
  version: 2
  kind: migration
  status: done
  profiles: [core, database]
  atomicity:
    outcome_count: 1
    primary_outcome: "PostgreSQL migration creating tenant-safe inventory tables, RLS policies, outbox, and idempotency store."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [database row-locking, outbox atomicity, and multi-tenant RLS isolation]}
  reversibility: {level: reversible}
  external_dependencies: [G-INVT-001]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-INVT-003: Create Inventory persistence schema and migrations

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Atomic outcome:** PostgreSQL migration creating tenant-safe inventory tables, RLS policies, outbox, and idempotency store.  
**Epic:** INVT  
**Depends on:** G-INVT-001  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Implement PostgreSQL migration scripts with up/down paths and RLS policies | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-INVT-003; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Inventory service requires isolated tables: inventory_items, inventory_reservations, inventory_outbox, and inventory_idempotency with PostgreSQL Row-Level Security.

## Intent
**Why:** Provide durable, tenant-isolated persistence with optimistic locking and transactional outbox guarantees.  
**Done when:** Migrations execute cleanly up and down, RLS policies enforce tenant boundaries, and outbox schema supports atomic writes.  
**Unblocks:** G-INVT-004, G-INVT-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- Database migration scripts under `code/services/inventory-service/migrations/`
- RLS policy declarations and role grants
- `docs/03-architecture/specs/goals/G-INVT-003/`

## Out
- Application repository code (owned by G-INVT-005)
- Service business logic (owned by G-INVT-004)

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-004, REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/digitalocean-droplets-sot.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Implement PostgreSQL migration scripts with up/down paths and RLS policies
**Allowed files:** `code/services/inventory-service/migrations/`, `code/services/inventory-service/test/migration.test.js`, `docs/03-architecture/specs/goals/G-INVT-003/`  
**Actions:**
1. Write SQL migration creating inventory tables, indexes, version columns, and RLS policies.
2. Validate idempotent up/down execution and test tenant isolation.
**Verification command:** npm test -- code/services/inventory-service/test/migration.test.js  
**Completion gate:** Migration up/down passes with 100% verification and tenant isolation checks pass.  
**Stop condition:** Migration failure, missing down script, missing RLS, or table definition drift.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| inventory-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Inventory Reservation & Stock Mutation Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation; zero overselling |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Tables `inventory_items`, `inventory_reservations`, `inventory_outbox`, and `inventory_idempotency` are created.
- [x] Row-level security policies enforce tenant_id isolation for all queries.
- [x] Idempotent up/down migration test passes.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/inventory-service/migrations/`
- `code/services/inventory-service/test/migration.test.js`
- `docs/03-architecture/specs/goals/G-INVT-003/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Reservations transition through requested → reserved → committed / released / expired; conflicts fail closed.

### Mathematical & Data Invariants Spec
Exact integer quantities, zero overselling (available_stock >= 0), zero-float money and quantity arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
