---
goal_contract:
  id: G-INVT-006
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Durable TTL background expiration worker, emergency pause integration, and DLQ routing."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [background worker race conditions and dead-letter queue routing]}
  reversibility: {level: reversible}
  external_dependencies: [G-INVT-005]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-INVT-006: Implement Inventory expiration worker and reliability controls

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** Durable TTL background expiration worker, emergency pause integration, and DLQ routing.  
**Epic:** INVT  
**Depends on:** G-INVT-005  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Implement reservation auto-expiry sweeper, emergency pause listener, and DLQ publisher | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-INVT-006; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Uncommitted reservations must expire after TTL (e.g. 5 minutes) returning stock to available pool. Control pause request must freeze stock mutations immediately (fail-closed).

## Intent
**Why:** Prevent orphaned stock reservations and ensure system complies with emergency stop commands.  
**Done when:** Expired reservations are atomically released back to available stock, paused sessions refuse reservations, and failed messages route to DLQ.  
**Unblocks:** G-INVT-007

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/inventory-service/src/workers/expiry-worker.js`
- `code/services/inventory-service/src/handlers/pause-handler.js`
- `code/services/inventory-service/test/integration/expiry-and-pause.test.js`
- `docs/03-architecture/specs/goals/G-INVT-006/`

## Out
- Performance benchmarking and load testing (owned by G-INVT-007)
- Docker deployment configuration (owned by G-INVT-008)

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
### Step 1 — Implement reservation auto-expiry sweeper, emergency pause listener, and DLQ publisher
**Allowed files:** `code/services/inventory-service/src/workers/`, `code/services/inventory-service/src/handlers/`, `code/services/inventory-service/test/integration/expiry-and-pause.test.js`, `docs/03-architecture/specs/goals/G-INVT-006/`  
**Actions:**
1. Implement background sweeper that selects expired reservations with row locking, marks expired, and increments available stock.
2. Implement emergency pause subscriber that toggles fail-closed reservation lock.
**Verification command:** npm test -- code/services/inventory-service/test/integration/expiry-and-pause.test.js  
**Completion gate:** Tests verify stock recovery upon TTL expiry and immediate rejection under emergency pause.  
**Stop condition:** Sweeper race condition, double stock release, or failure to halt on pause.

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
- [x] Expired reservations are swept periodically and stock is atomically restored.
- [x] Emergency pause blocks all new stock reservations fail-closed with error LP13005.
- [x] Unprocessable messages route to `livepilot.v1.inventory.dlq`.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/inventory-service/src/workers/`
- `code/services/inventory-service/src/handlers/`
- `code/services/inventory-service/test/integration/expiry-and-pause.test.js`
- `docs/03-architecture/specs/goals/G-INVT-006/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Reservations transition through requested → reserved → committed / released / expired; conflicts fail closed.

### Mathematical & Data Invariants Spec
Exact integer quantities, zero overselling (available_stock >= 0), zero-float money and quantity arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
