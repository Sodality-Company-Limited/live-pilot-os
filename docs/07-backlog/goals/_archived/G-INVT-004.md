---
goal_contract:
  id: G-INVT-004
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Deterministic domain state machine enforcing reservation lifecycle and zero-overselling row locks."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [race conditions, overselling prevention, and state machine correctness]}
  reversibility: {level: reversible}
  external_dependencies: [G-INVT-001]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-INVT-004: Implement Inventory state machine and concurrency row locking

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** Deterministic domain state machine enforcing reservation lifecycle and zero-overselling row locks.  
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
| 1 | Implement pure domain state machine and row-level locking concurrency logic | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-INVT-004; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
The inventory state machine governs requested -> reserved -> committed/released/expired. It calculates available stock = total_stock - reserved_stock and locks rows during reservation.

## Intent
**Why:** Mathematically prevent overselling and guarantee deterministic state transitions across concurrent reservation requests.  
**Done when:** All state transitions pass unit testing, concurrent allocations are rejected when stock is insufficient, and invalid transitions fail closed.  
**Unblocks:** G-INVT-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/inventory-service/src/domain/` state machine and domain logic
- `code/services/inventory-service/test/unit/state-machine.test.js`
- `docs/03-architecture/specs/goals/G-INVT-004/`

## Out
- NATS transport handler (owned by G-INVT-005)
- Docker deployment packaging (owned by G-INVT-008)

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
### Step 1 — Implement pure domain state machine and row-level locking concurrency logic
**Allowed files:** `code/services/inventory-service/src/domain/`, `code/services/inventory-service/test/unit/state-machine.test.js`, `docs/03-architecture/specs/goals/G-INVT-004/`  
**Actions:**
1. Implement `InventoryItem` and `InventoryReservation` domain models with strict state transitions.
2. Write unit tests verifying all valid transitions, invalid transition rejections, and zero overselling invariants.
**Verification command:** npm test -- code/services/inventory-service/test/unit/state-machine.test.js  
**Completion gate:** Domain tests pass with 100% code coverage, zero floating-point arithmetic, and zero stubs.  
**Stop condition:** State machine allows invalid transition or overselling, floating-point usage, or failing tests.

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
- [x] State transitions conform exactly to requested -> reserved -> committed/released/expired.
- [x] Zero-float integer quantities enforced across all domain calculations.
- [x] 100% test pass on transition matrix and conflict states.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/inventory-service/src/domain/`
- `code/services/inventory-service/test/unit/state-machine.test.js`
- `docs/03-architecture/specs/goals/G-INVT-004/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Reservations transition through requested → reserved → committed / released / expired; conflicts fail closed.

### Mathematical & Data Invariants Spec
Exact integer quantities, zero overselling (available_stock >= 0), zero-float money and quantity arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
