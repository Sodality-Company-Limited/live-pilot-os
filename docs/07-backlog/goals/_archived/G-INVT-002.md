---
goal_contract:
  id: G-INVT-002
  version: 2
  kind: qa
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Schema conformance test suite and backward-compatibility golden fixtures for inventory commands and events."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [message schema evolution and consumer contract compatibility]}
  reversibility: {level: reversible}
  external_dependencies: [G-INVT-001]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-INVT-002: Verify Inventory message and schema compatibility

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** qa  
**Atomic outcome:** Schema conformance test suite and backward-compatibility golden fixtures for inventory commands and events.  
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
| 1 | Create golden contract fixtures and automated schema validation tests | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-INVT-002; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Inventory commands and events must be verified against schema envelopes, ensuring valid, invalid, and edge-case payloads are strictly validated before service implementation.

## Intent
**Why:** Guarantee all incoming reservation requests and outgoing stock events conform strictly to schema envelopes and pass automated test suites.  
**Done when:** Contract test suite passes against valid, invalid, and legacy golden fixtures with zero false positives.  
**Unblocks:** G-INVT-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `tests/contracts/inventory/` test fixtures and contract runners
- Valid, invalid, edge-case, and envelope schema validation tests
- `docs/03-architecture/specs/goals/G-INVT-002/`

## Out
- Database integration and persistence logic (owned by G-INVT-003)
- Runtime service code (owned by G-INVT-005)

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
### Step 1 — Create golden contract fixtures and automated schema validation tests
**Allowed files:** `tests/contracts/inventory/`, `docs/03-architecture/specs/goals/G-INVT-002/`  
**Actions:**
1. Implement automated schema validation tests in `tests/contracts/inventory/` using ajv or node assert.
2. Verify envelope validation, invalid payload rejection, and duplicate key detection.
**Verification command:** npm test -- tests/contracts/inventory/  
**Completion gate:** 100% passing tests across all valid and invalid message fixtures with zero warnings.  
**Stop condition:** Schema drift, failing contract tests, or touch map violations.

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
- [x] Contract tests cover reservation request, reply, and stock updated event schemas.
- [x] Tests verify rejection of negative quantities, missing tenant_id, and invalid UUIDs.
- [x] Test suite passes cleanly with zero mocks and zero warnings.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `tests/contracts/inventory/`
- `docs/03-architecture/specs/goals/G-INVT-002/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Reservations transition through requested → reserved → committed / released / expired; conflicts fail closed.

### Mathematical & Data Invariants Spec
Exact integer quantities, zero overselling (available_stock >= 0), zero-float money and quantity arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
