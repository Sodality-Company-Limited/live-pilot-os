---
goal_contract:
  id: G-INVT-005
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "End-to-end operational vertical slice handling reservation request/reply with transactional outbox."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [end-to-end transaction boundary and NATS message handling]}
  reversibility: {level: reversible}
  external_dependencies: [G-INVT-002, G-INVT-003, G-INVT-004]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-INVT-005: Implement the Inventory reservation vertical slice

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** End-to-end operational vertical slice handling reservation request/reply with transactional outbox.  
**Epic:** INVT  
**Depends on:** G-INVT-002, G-INVT-003, G-INVT-004  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Implement repository, NATS request handler, transaction boundary, and outbox publisher | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-INVT-005; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Connects NATS request handler to database repository within a single database transaction, recording the reservation and writing the outbox event atomically.

## Intent
**Why:** Provide a working, fully integrated stock reservation flow from NATS request to PostgreSQL persistence and reply.  
**Done when:** A reservation request successfully acquires row lock, mutates stock, writes outbox, and returns reservation receipt with idempotency guarantee.  
**Unblocks:** G-INVT-006

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/inventory-service/src/` repositories, services, and handlers
- `code/services/inventory-service/test/integration/reservation-flow.test.js`
- `docs/03-architecture/specs/goals/G-INVT-005/`

## Out
- TTL expiration background worker (owned by G-INVT-006)
- Multi-region deployment (owned by G-INVT-008)

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
### Step 1 — Implement repository, NATS request handler, transaction boundary, and outbox publisher
**Allowed files:** `code/services/inventory-service/src/`, `code/services/inventory-service/test/integration/reservation-flow.test.js`, `docs/03-architecture/specs/goals/G-INVT-005/`  
**Actions:**
1. Implement repository with `SELECT ... FOR UPDATE` row locking and transactional outbox insertion.
2. Implement NATS message subscriber for `livepilot.v1.inventory.reservation.request` returning structured reply.
**Verification command:** npm test -- code/services/inventory-service/test/integration/reservation-flow.test.js  
**Completion gate:** End-to-end integration test passes, verifying row locking, idempotency, and outbox writing.  
**Stop condition:** Dual-write failure, lock contention timeout, unhandled error, or missing outbox entry.

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
- [x] Reservation request acquires row lock and atomically updates available stock.
- [x] Outbox event is written within the exact same database transaction.
- [x] Idempotent retry with identical key returns cached reservation receipt.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/inventory-service/src/`
- `code/services/inventory-service/test/integration/reservation-flow.test.js`
- `docs/03-architecture/specs/goals/G-INVT-005/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Reservations transition through requested → reserved → committed / released / expired; conflicts fail closed.

### Mathematical & Data Invariants Spec
Exact integer quantities, zero overselling (available_stock >= 0), zero-float money and quantity arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
