---
goal_contract:
  id: G-AUDI-006
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Safe action log query projection, dead-letter handling, and authorized replay mechanics."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [safe query projection, dead-letter routing, and replay authorization]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-AUDI-006: Implement Audit query projection & DLQ recovery
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Safe action log query projection, dead-letter handling, and authorized replay mechanics.  
**Epic:** AUDI  
**Depends on:** G-AUDI-005  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement query projections and dead-letter queue recovery | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-AUDI-006; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Portal BFF queries action logs for live sessions. Failed audit ingest commands must route to DLQ with authorized replay capabilities.

## Intent
**Why:** Provide safe, redacted query read-models and resilient error recovery without compromising audit integrity.  
**Done when:** Action log query returns redacted timeline facts, and exhausted retries route safely to DLQ with replay support.  
**Unblocks:** G-AUDI-007

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/audit-service/src/application/queries/`
- `code/services/audit-service/src/infrastructure/nats/dlq.consumer.ts`
- `code/services/audit-service/test/e2e/`
- `docs/03-architecture/specs/goals/G-AUDI-006/`

## Out
- Production Docker and Kubernetes deployment (owned by G-AUDI-008)

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
### Step 1 — Implement query projections and dead-letter queue recovery
**Allowed files:** `code/services/audit-service/src/application/queries/`, `code/services/audit-service/src/infrastructure/nats/dlq.consumer.ts`, `code/services/audit-service/test/e2e/`, `docs/03-architecture/specs/goals/G-AUDI-006/`  
**Actions:**
1. Implement `ActionLogQueryHandler` projecting sanitized, session-scoped timeline events.
2. Implement DLQ consumer and operator-authorized replay worker emitting new audit receipts.
**Verification command:** npm --prefix code/services/audit-service test:e2e  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.  
**Completion gate:** All query projection and DLQ recovery scenarios pass with verified audit receipts.  
**Stop condition:** Unredacted secret in query projection, failure to route to DLQ, or unauthorized replay execution.

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
- [x] Query projection never exposes sensitive auth tokens, passwords, or provider API keys.
- [x] Exhausted failures enter `livepilot.v1.audit.receipt.dlq` and can be safely replayed.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/audit-service/src/application/queries/`
- `code/services/audit-service/src/infrastructure/nats/dlq.consumer.ts`
- `code/services/audit-service/test/e2e/`
- `docs/03-architecture/specs/goals/G-AUDI-006/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → redacted → hashed → committed; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
