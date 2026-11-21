---
goal_contract:
  id: G-AUDI-004
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Pure domain FSM and zero-leakage redaction filter for audit receipts."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [FSM deterministic transitions, sensitive data redaction, and fail-closed security]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-AUDI-004: Implement Audit receipt state machine & redaction
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Pure domain FSM and zero-leakage redaction filter for audit receipts.  
**Epic:** AUDI  
**Depends on:** G-AUDI-001  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement deterministic domain FSM and redaction filter | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-AUDI-004; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Audit receipts transition through received -> validated -> redacted -> hashed -> committed. Redaction must strip tokens, credentials, and raw PII before persistence.

## Intent
**Why:** Enforce strict state machine transitions and zero-leakage redaction invariants at the pure domain level.  
**Done when:** Pure domain FSM unit tests pass with 100% branch coverage and zero mock objects.  
**Unblocks:** G-AUDI-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/audit-service/src/domain/`
- `code/services/audit-service/test/unit/`
- `docs/03-architecture/specs/goals/G-AUDI-004/`

## Out
- Database access and network I/O (owned by G-AUDI-005)
- NATS transport adapters (owned by G-AUDI-005)

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
### Step 1 — Implement deterministic domain FSM and redaction filter
**Allowed files:** `code/services/audit-service/src/domain/`, `code/services/audit-service/test/unit/`, `docs/03-architecture/specs/goals/G-AUDI-004/`  
**Actions:**
1. Implement `AuditReceiptStateMachine` enforcing valid transitions and fail-closed error handling.
2. Implement `AuditRedactionFilter` scrubbing credentials, auth tokens, COGS, and unmasked PII.
**Verification command:** npm --prefix code/services/audit-service test:unit  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.  
**Completion gate:** 100% of domain FSM and redaction unit tests pass with zero warnings.  
**Stop condition:** Invalid transition permitted, unredacted secret detected, or test assertion failure.

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
- [x] State transitions follow strict DAG reachability; illegal transitions throw typed errors.
- [x] Redaction filter provably removes Bearer tokens, passwords, and sensitive financial margins.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/audit-service/src/domain/`
- `code/services/audit-service/test/unit/`
- `docs/03-architecture/specs/goals/G-AUDI-004/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → redacted → hashed → committed; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
