# G-APPR-003 Design — Approval and Emergency Pause Domain State Machine and Contracts

## 1. Intent & Architectural Rationale

Establish a 100% operational, Zero-Mock pure domain engine enforcing approval lifecycle transitions, authority checks, separation of duty, and fail-closed emergency pause. Decouple domain business invariants and state transitions from transport (NATS JetStream) and infrastructure/persistence (PostgreSQL) layers.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Implement pure FSM for Approval lifecycle: `requested` -> `approved` | `rejected` | `expired` | `revoked`.
- Enforce terminal state immutability rejecting illegal transitions fail-closed.
- Implement Emergency Pause engine with hierarchical scoping (`GLOBAL` > `TENANT` > `SESSION`) having absolute precedence over all approvals.
- Enforce Separation of Duty (SoD): proposer cannot approve their own request (`proposer_id !== decider_id`).
- Implement Approval Mode Governor (`RECOMMEND_ONLY`, `ASSISTED`, `AUTONOMOUS`) with permission barriers.

### Non-Goals
- PostgreSQL database access and repository implementations (owned by G-APPR-004).
- NATS message consumption and broker publishing (owned by G-APPR-005).
- Web portal UI components or REST controllers.

### Anti-Goals
- Zero mocks, stubs, or simulated domain logic in production paths.
- No floating-point timestamps or duration arithmetic.
- No automated systems allowed to deactivate emergency pause.

## 3. Approaches Considered & Rejected Alternatives

1. **Coupled Active Record Model:** Rejected because coupling state transitions to database queries prevents clean deterministic unit testing and violates clean hexagonal architecture.
2. **Dynamic Rule Engine:** Rejected because a runtime JSON-configurable rule engine introduces unpredictable non-deterministic failure paths for mission-critical emergency pause and financial approval gates.
3. **Pure Functional State Machine & Domain Service:** Selected because deterministic pure functions with immutable records and monotonic version bumps provide zero-mock formal verifiability and fail-closed security.

## 4. Selected Approach & Trade-off Analysis

The chosen pure domain engine implementation consists of four cohesion modules:
- `approvalStateMachine.ts`: Pure FSM with optimistic concurrency locking and deadline TTL evaluation.
- `emergencyPauseEngine.ts`: Hierarchical pause evaluation with fail-closed precedence.
- `authorityPolicy.ts`: Separation of duty and capability checking.
- `approvalModeEngine.ts`: Session automation mode governor.

**Trade-off:** Requires explicit passing of context (timestamps, pause records) rather than ambient hidden singletons. This design choice guarantees testability and eliminates hidden side-effects.

## 5. Bounded Context & Touch Map Invariants

The bounded context is strictly `Approval Control Plane & Emergency Pause Domain`.
Allowed touch map:
- `code/services/approval-control-service/src/domain/`
- `code/services/approval-control-service/test/domain/`
- `docs/03-architecture/specs/goals/G-APPR-003/`

## 6. Acceptance Test & TDD Verification Strategy

1. Automated unit test suite using Node.js test runner (`node --test`).
2. Comprehensive coverage over:
   - Valid FSM transitions and terminal state rejection (`LP05007`).
   - Optimistic concurrency version mismatch (`LP04001`).
   - Deterministic TTL expiry (`LP05005`).
   - Hierarchical emergency pause blocking approvals (`LP05004`).
   - Separation of duty violations (`LP05009`).
   - Mode transition authorization barriers (`LP05008`).
