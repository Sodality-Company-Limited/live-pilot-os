---
goal_contract:
  id: G-AUDI-002
  version: 2
  kind: qa
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Schema conformance test suite and backward-compatibility golden fixtures for audit receipts."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [message schema evolution and consumer compatibility]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-AUDI-002: Verify Audit message compatibility
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** qa  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Schema conformance test suite and backward-compatibility golden fixtures for audit receipts.  
**Epic:** AUDI  
**Depends on:** G-AUDI-001  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Create golden contract fixtures and automated schema validation tests | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-AUDI-002; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Audit ingestion accepts receipts across multiple producer versions. Backward compatibility must be verified with automated contract fixtures before implementation.

## Intent
**Why:** Guarantee all incoming audit message variants conform strictly to schema envelopes and pass backward-compatibility test suites.  
**Done when:** Contract test suite passes against valid, invalid, and legacy golden fixtures with zero false positives.  
**Unblocks:** G-AUDI-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `tests/contracts/audit/` test fixtures and contract runners
- Valid, invalid, edge-case, and envelope schema validation tests
- `docs/03-architecture/specs/goals/G-AUDI-002/`

## Out
- Database integration and persistence testing (owned by G-AUDI-003/005)
- Runtime service code (owned by G-AUDI-005)

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
### Step 1 — Create golden contract fixtures and automated schema validation tests
**Allowed files:** `tests/contracts/audit/`, `docs/03-architecture/specs/goals/G-AUDI-002/`  
**Actions:**
1. Implement `tests/contracts/audit/audit-schema.test.mjs` verifying required fields, envelope headers, and payload restrictions.
2. Add golden JSON fixtures representing valid and invalid audit receipt payloads.
**Verification command:** node tests/contracts/audit/run-contract-tests.mjs  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.  
**Completion gate:** All schema contract tests pass 100% green with zero mocks or skipped tests.  
**Stop condition:** Schema validation failure, missing required fields, or uncaught contract drift.

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
- [x] Contract tests reject malformed envelopes, missing headers, or unexpected additional properties.
- [x] Backward-compatibility fixtures pass cleanly without schema violation.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `tests/contracts/audit/`
- `docs/03-architecture/specs/goals/G-AUDI-002/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → redacted → hashed → committed; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
