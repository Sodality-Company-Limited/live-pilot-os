---
goal_contract:
  id: G-APPR-005
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Operational approval request/reply handlers, decision dispatchers, and emergency pause event broadcasters."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [NATS JetStream routing, command/reply latency, event broadcasting]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-APPR-005: Implement NATS handlers, command endpoints, and vertical slice execution
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Operational approval request/reply handlers, decision dispatchers, and emergency pause event broadcasters.  
**Epic:** APPR  
**Depends on:** G-APPR-004  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement NATS handlers, dispatch loop, DLQ, and end-to-end vertical slice | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-APPR-005; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Connect domain and infrastructure layers to live NATS JetStream messaging bus. Process incoming approval requests, decide commands, and broadcast control mode updates.

## Intent
**Why:** Expose operational control plane endpoints and asynchronous event streaming to platform services.  
**Done when:** End-to-end vertical slice from request ingestion to event broadcast passes all integration checks.  
**Unblocks:** G-APPR-006

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/approval-control-service/src/handlers/`
- `code/services/approval-control-service/src/index.mjs`
- `code/services/approval-control-service/test/handlers/`
- `docs/03-architecture/specs/goals/G-APPR-005/`

## Out
- Cross-service chaos testing (owned by G-APPR-006)
- Production container build (owned by G-APPR-007)

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-013; REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md; docs/03-architecture/deployment/digitalocean-droplets-sot.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Implement NATS handlers, dispatch loop, DLQ, and end-to-end vertical slice
**Allowed files:** `code/services/approval-control-service/src/handlers/`, `code/services/approval-control-service/src/index.mjs`, `code/services/approval-control-service/test/handlers/`, `docs/03-architecture/specs/goals/G-APPR-005/`  
**Actions:**
1. Implement NATS JetStream consumers and request/reply handlers for approval commands.
2. Implement error mapping to ProblemDetails and configure dead-letter queues (DLQ) with bounded retries.
**Verification command:** node --test code/services/approval-control-service/test/handlers/*.test.mjs  
**Completion gate:** End-to-end NATS vertical slice runs green; DLQ fallback tested and verified.  
**Stop condition:** Uncaught message parsing exception, silent failure on missing headers, or NATS ack before persistence.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| approval-control-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Approval Control Plane & Emergency Pause Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] NATS request/reply returns deterministic ProblemDetails on error.
- [x] JetStream messages acknowledged only after durable persistence.
- [x] Emergency pause triggers broadcast within sub-50ms SLA.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/approval-control-service/src/handlers/`
- `code/services/approval-control-service/src/index.mjs`
- `code/services/approval-control-service/test/handlers/`
- `docs/03-architecture/specs/goals/G-APPR-005/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Approvals transition through requested → approved | rejected | expired | revoked; emergency pause transitions through active | inactive; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.


## Closeout Notes

- **Closed Date:** 2026-11-21
- **Reason / Outcome:** Implemented 100% operational Zero-Mock NATS handlers, command endpoints, DLQ routing, and vertical slice execution passing all verification suites
