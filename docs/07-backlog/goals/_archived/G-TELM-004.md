---
goal_contract:
  id: G-TELM-004
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Deterministic TypeScript state machine managing signal lifecycle states."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [signal transition invariants and deterministic handling]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-TELM-004: Implement Telemetry signal state machine
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check pending | analyze pending  
**Atomic outcome:** Deterministic TypeScript state machine managing signal lifecycle states.  
**Epic:** TELM  
**Depends on:** G-TELM-001  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement pure signal lifecycle state machine with property-based tests | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-TELM-004; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Signals transition through `received` -> `validated` -> `persisted` -> `dispatched` / `failed`. Transitions must be deterministic and fail closed on invalid events.

## Intent
**Why:** Provide a zero-dependency, pure domain state machine enforcing signal lifecycle invariants.  
**Done when:** All legal state transitions advance correctly, invalid transitions throw typed domain errors, and property tests pass 100%.  
**Unblocks:** G-TELM-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/telemetry-service/src/domain/signal-state-machine.ts`
- `code/services/telemetry-service/src/domain/signal-state-machine.spec.ts`
- `docs/03-architecture/specs/goals/G-TELM-004/`

## Out
- I/O or database operations
- NATS transport listeners

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
### Step 1 — Implement pure signal lifecycle state machine with property-based tests
**Allowed files:** `code/services/telemetry-service/src/domain/signal-state-machine.ts`, `code/services/telemetry-service/src/domain/signal-state-machine.spec.ts`, `docs/03-architecture/specs/goals/G-TELM-004/`  
**Actions:**
1. Implement `SignalStateMachine` pure domain reducer with state enum, events, and explicit transition matrix.
2. Author unit and property-based tests using fast-check verifying invariant protection across 1,000 randomized state permutations.
**Verification command:** node --test code/services/telemetry-service/src/domain/signal-state-machine.spec.ts  
**Completion gate:** 100% branch and statement coverage across all state transitions and illegal transitions reject fail-closed.  
**Stop condition:** Unchecked state transitions, side effects inside pure domain reducer, or mocked invariants.  
**Zero-Mock invariant check:** 100% pure, zero-dependency TypeScript domain state machine and deterministic property-based `node:test` suite; zero mocks, zero stubs, zero fallbacks.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| telemetry-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Telemetry Signal Observation Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Legal transitions `received → validated → persisted → dispatched` are strictly enforced.
- [x] Duplicate signals or out-of-order transitions throw deterministic `IllegalStateTransitionError`.
- [x] Property-based invariant tests pass across 1,000 trials with zero regressions.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/telemetry-service/src/domain/signal-state-machine.ts`
- `code/services/telemetry-service/src/domain/signal-state-machine.spec.ts`
- `docs/03-architecture/specs/goals/G-TELM-004/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
