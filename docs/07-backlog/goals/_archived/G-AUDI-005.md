---
goal_contract:
  id: G-AUDI-005
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "A fully functional end-to-end append pipeline from NATS ingest to PostgreSQL commit."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [end-to-end receipt ingestion, transactional atomicity, and hash chaining]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-AUDI-005: Implement the Audit append vertical slice
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** A fully functional end-to-end append pipeline from NATS ingest to PostgreSQL commit.  
**Epic:** AUDI  
**Depends on:** G-AUDI-002, G-AUDI-003, G-AUDI-004  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement vertical slice connecting NATS consumer, domain FSM, and persistence repository | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-AUDI-005; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
The primary vertical slice ingests `livepilot.v1.audit.receipt.append`, checks idempotency, redacts secrets, appends to hash chain, and commits atomically.

## Intent
**Why:** Deliver the core operational capability of audit-service in a production-ready, zero-mock vertical slice.  
**Done when:** Integration tests verify complete flow from message ingestion to durable database commit with verified hash chaining.  
**Unblocks:** G-AUDI-006, G-AUDI-007

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/audit-service/src/application/`
- `code/services/audit-service/src/infrastructure/`
- `code/services/audit-service/test/integration/`
- `docs/03-architecture/specs/goals/G-AUDI-005/`

## Out
- Query projections and HTTP read routes (owned by G-AUDI-006)
- Production containerization and Kubernetes manifests (owned by G-AUDI-008)

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
### Step 1 — Implement vertical slice connecting NATS consumer, domain FSM, and persistence repository
**Allowed files:** `code/services/audit-service/src/application/`, `code/services/audit-service/src/infrastructure/`, `code/services/audit-service/test/integration/`, `docs/03-architecture/specs/goals/G-AUDI-005/`  
**Actions:**
1. Implement `AuditAppendHandler` orchestrating idempotency check, domain FSM, and repository commit.
2. Implement PostgreSQL repository with atomic hash-chaining and outbox fact publishing.
**Verification command:** npm --prefix code/services/audit-service test:integration  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.  
**Completion gate:** Integration tests pass cleanly with real PostgreSQL and NATS test containers.  
**Stop condition:** Integration test failure, hash divergence, broken idempotency, or unhandled promise rejection.

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
- [x] Duplicate receipt appends return the original committed receipt without double-appending.
- [x] Hash chain linkage is strictly validated: every new record cryptographically binds to the previous record hash.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/audit-service/src/application/`
- `code/services/audit-service/src/infrastructure/`
- `code/services/audit-service/test/integration/`
- `docs/03-architecture/specs/goals/G-AUDI-005/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → redacted → hashed → committed; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
