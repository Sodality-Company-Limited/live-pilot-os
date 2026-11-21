# G-LIVE-003 Design Specification

## Intent & Architectural Rationale

Implement the vertical slice for live-session lifecycle command processing (`start`, `pause`, `resume`, `end`) within `session-service`.
The `session-service` is the single authoritative writer and aggregate root owner of the Live Session lifecycle in LivePilot OS.
Following the Live Session Control Flow SOT ([live-session-control-sot.md](../../source-of-truth-flows/live-session-control-sot.md)) and the Session Service API SOT ([session-service.md](../../api/services/session-service.md)), this design specification implements the vertical slice that receives authenticated lifecycle commands, enforces strict FSM invariants, ensures idempotent transaction processing with optimistic locking, and publishes transactional outbox events to NATS JetStream.

```
Transport Headers & Command Payload
                 │
                 ▼
     [Header & Scope Validator] ──(fail-closed)──► 400 Bad Request / 401 Unauthorized
                 │
                 ▼
     [Idempotency Check (SHA-256)] ──(cached)───► Cached Response (Replay Safe)
                 │
                 ▼
     [Tenant Transaction Boundary] (withTenantTransaction / SET LOCAL app.tenant_id)
                 │
                 ├── 1. Read Current Session State & expected_version
                 ├── 2. FSM Reachability Check: created → active ↔ paused → ended
                 ├── 3. Optimistic Lock Check: session.expected_version == command.expected_version
                 ├── 4. Update session: state, expected_version + 1, updated_at
                 ├── 5. Insert transition into session.session_transitions
                 ├── 6. Insert event into session.outbox (livepilot.v1.session.lifecycle.changed)
                 └── 7. Record idempotency_key with response payload (status: completed)
                 │
                 ▼
          Typed Success Reply
```

## Goals, Non-Goals & Anti-Goals

### Goals
- Implement `SessionLifecycleService` handling `start`, `pause`, `resume`, and `end` operations under PostgreSQL ACID transactions.
- Enforce strict FSM reachability:
  - `start`: `created` -> `active`
  - `pause`: `active` -> `paused`
  - `resume`: `paused` -> `active`
  - `end`: `created` | `active` | `paused` -> `ended` (terminal)
- Guarantee optimistic locking: compare `expected_version` against current session version, rejecting stale commands with `VERSION_CONFLICT`.
- Enforce idempotency deduplication with SHA-256 semantic fingerprints, caching completed results in `session.idempotency_keys`.
- Atomically record state transitions in `session.session_transitions` and emit `session.lifecycle.changed` events to `session.outbox`.
- Provide comprehensive unit and contract tests in `code/services/session-service/test/`.

### Non-goals
- Background worker polling `session.outbox` and dispatching onto live NATS JetStream server (deferred to G-LIVE-004).
- HTTP / REST controllers or GraphQL resolvers (governed by Core BFF and API Gateway).
- Host / Live Ops UI frontend panels.

### Anti-goals
- Allowing transitions out of terminal `ended` state.
- Permitting unauthorized or cross-tenant session mutations.
- Mocking database queries, FSM logic, or outbox insertions in production code.

## Approaches Considered & Rejected Alternatives

1. **Non-transactional separate writes**: Updating the session row, and then publishing directly to NATS in memory. Rejected because any network failure or crash after the DB write results in dual-write inconsistency and silent event loss.
2. **Pessimistic table locking**: Locking the entire `session.sessions` table during mutations. Rejected because it restricts tenant concurrency and causes contention across sessions.
3. **Optimistic locking with transactional outbox and row-level locking**: Selected approach. Executes under `withTenantTransaction`, uses `SET LOCAL app.tenant_id` for PostgreSQL RLS, checks `expected_version`, records transitions, and inserts outbox rows within a single ACID transaction.

## Selected Approach & Trade-off Analysis

Adopt the Transactional Outbox Pattern combined with optimistic locking. The caller must provide the current `expected_version`. The service validates required transport headers, checks idempotency fingerprints, verifies FSM reachability, increments version monotonically, and inserts the domain fact `livepilot.v1.session.lifecycle.changed` into `session.outbox`.
Trade-off: Requires an outbox relay worker to asynchronously deliver events to NATS, but guarantees at-least-once delivery, zero dual-write anomalies, and complete audit lineage.

## Bounded Context & Touch Map Invariants

- Bounded Context: `live-session lifecycle`.
- Service boundary: `session-service` owns the schema `session` and aggregate root `session.sessions`. No other service may write to this database.
- Touch Map:
  - `code/services/session-service/src/`
  - `code/services/session-service/test/`
  - `docs/03-architecture/specs/goals/G-LIVE-003/design.md`
  - `docs/07-backlog/goals/G-LIVE-003.md`

## Acceptance Test & TDD Verification Strategy

- Automated unit and contract test suite running with Node test runner:
  `npm --prefix code/services/session-service run test`
- Verification coverage:
  - Validation of all 9 transport headers and payload format.
  - FSM transition matrix: all valid state transitions and rejection of invalid transitions.
  - Terminal state invariant: `ended` state rejects all subsequent operations.
  - Optimistic locking: version mismatch returns `VERSION_CONFLICT` with retryable flag.
  - Idempotency: identical key and payload replays cached result without side-effects; key reuse with differing payload fails with `IDEMPOTENCY_CONFLICT`.
  - Atomicity: verified that session aggregate, transition record, outbox event, and idempotency key are updated in unison.
