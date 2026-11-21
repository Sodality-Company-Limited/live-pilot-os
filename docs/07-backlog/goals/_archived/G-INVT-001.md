---
goal_contract:
  id: G-INVT-001
  version: 2
  kind: api
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "A versioned, SOT-owned contract for tenant/session-scoped inventory reservations and stock mutations."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [authoritative stock boundary, zero overselling, and NATS schema compatibility]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-INVT-001: Freeze the Inventory service contract

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Atomic outcome:** A versioned, SOT-owned contract for tenant/session-scoped inventory reservations and stock mutations.  
**Epic:** INVT  
**Depends on:** —  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Freeze inventory service contract, schemas, and error code specifications | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-INVT-001; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Inventory service is the single authoritative writer of item stock levels and reservation states. It enforces zero overselling, atomic row-level locking, and transactional outbox events. It does not calculate margins or execute marketplace platform API calls.

## Intent
**Why:** Establish immutable SOT contract, schemas, subject registrations, and LP13xxx error codes for inventory-service before implementing runtime code.  
**Done when:** The inventory-service contract, AsyncAPI channels, error codes, and JSON schemas pass all automated schema validation and traceability checks.  
**Unblocks:** G-INVT-002, G-INVT-003, G-INVT-004

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `docs/03-architecture/api/services/inventory-service.md`
- `docs/03-architecture/api/asyncapi.yaml` inventory channel definitions
- `docs/03-architecture/api/schemas/nats/inventory-reservation-request.schema.json`
- `docs/03-architecture/api/schemas/nats/inventory-reservation-reply.schema.json`
- `docs/03-architecture/api/schemas/nats/inventory-stock-updated.schema.json`
- `docs/03-architecture/api/error-codes.yaml` error codes for inventory (LP13xxx)
- `docs/03-architecture/api/nats-subject-catalog-sot.md` registration
- `docs/03-architecture/specs/goals/G-INVT-001/`

## Out
- Runtime service code for inventory reservations (owned by G-INVT-005)
- Database schema creation and migrations (owned by G-INVT-003)
- Domain state machine implementation (owned by G-INVT-004)

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
### Step 1 — Freeze inventory service contract, schemas, and error code specifications
**Allowed files:** `docs/03-architecture/api/services/inventory-service.md`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/api/schemas/nats/inventory-reservation-request.schema.json`, `docs/03-architecture/api/schemas/nats/inventory-reservation-reply.schema.json`, `docs/03-architecture/api/schemas/nats/inventory-stock-updated.schema.json`, `docs/03-architecture/api/nats-subject-catalog-sot.md`, `docs/03-architecture/api/error-codes.yaml`, `docs/03-architecture/specs/goals/G-INVT-001/`  
**Actions:**
1. Create `docs/03-architecture/api/services/inventory-service.md` with complete ownership, commands, events, state machine, errors, and delivery semantics.
2. Create JSON schemas for inventory reservation request/reply and stock events, registering them in `asyncapi.yaml` and `nats-subject-catalog-sot.md`.
**Verification command:** node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs  
**Completion gate:** Contract file, schemas, asyncapi channels, and error code registry pass all validation gates with zero drift.  
**Stop condition:** Unresolved ownership conflict, unregistered subjects, schema validation failure, or out-of-scope code changes.

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
- [x] `docs/03-architecture/api/services/inventory-service.md` defines complete ownership, aggregate, commands, events, and persistence boundaries.
- [x] JSON schemas conform strictly to JSON Schema draft-07 and envelopes.
- [x] Error codes LP13001 through LP13005 are registered in `docs/03-architecture/api/error-codes.yaml`.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `docs/03-architecture/api/services/inventory-service.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/inventory-reservation-request.schema.json`
- `docs/03-architecture/api/schemas/nats/inventory-reservation-reply.schema.json`
- `docs/03-architecture/api/schemas/nats/inventory-stock-updated.schema.json`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `docs/03-architecture/specs/goals/G-INVT-001/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Reservations transition through requested → reserved → committed / released / expired; conflicts fail closed.

### Mathematical & Data Invariants Spec
Exact integer quantities, zero overselling (available_stock >= 0), zero-float money and quantity arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
