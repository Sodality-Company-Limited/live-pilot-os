# G-JEVC-006 Architecture Specification

## Selected Boundary & System Purpose
Defines the Suggestion Delivery and Withdrawal Lifecycle for `jev-copilot-service`. This goal formalizes and operationalizes:
1. Inbound driving ports:
   - Delivery confirmations from live Host HUD (`livepilot.v1.copilot.suggestion.deliver`).
   - Operator decision feedback recording (`livepilot.v1.copilot.suggestion.decision`: `used`, `edited`, `dismissed`).
   - TTL freshness expiration commands (`livepilot.v1.copilot.suggestion.expire`).
   - Manual and system withdrawal commands (`livepilot.v1.copilot.suggestion.withdraw`).
   - Reactive external trigger invalidations (`livepilot.v1.catalog.stock.depleted`, `livepilot.v1.control.pause.request`).
2. Domain Aggregate (`SuggestionAggregate`):
   - Strict FSM transitions from `grounded` to `delivered`, `used`, `edited`, `dismissed`, `expired`, and `withdrawn`.
   - Invariant guard checks: freshness expiry bounds on delivery, terminal state immutability, optimistic concurrency version bumps.
   - RFC 7807 compliant `SuggestionStateTransitionError` (`LP04001`) on illegal state transitions.
3. Driven ports:
   - Atomic database persistence with transactional outbox (`SuggestionRepository`).
   - NATS JetStream event publication (`NatsPublisher`) with composite ordering key `tenant_id:live_session_id`.

## Architecture & Data Flow
```text
  Host HUD / Core BFF                   External Services (Inventory / Control)
           │                                            │
           │ deliver / decision / expire / withdraw    │ stock.depleted / pause.request
           ▼                                            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 SuggestionLifecycleHandler                  │
  │  1. Scoped Snapshot Retrieval (SuggestionRepository)        │
  │  2. Aggregate Transition Execution (SuggestionAggregate)    │
  │     ├── deliver({ observedAt })                             │
  │     ├── recordDecision({ decision, actorId, edits })        │
  │     ├── expire({ observedAt })                              │
  │     └── withdraw({ reason, actorId, causationRef })         │
  │  3. Optimistic Lock Update & Outbox Append (PostgreSQL)     │
  │  4. Domain Event Publication (NatsPublisher JetStream)      │
  └─────────────────────────────────────────────────────────────┘
                               │
                               ▼
        NATS JetStream: livepilot.v1.copilot.suggestion.*
```

## Rejected Alternatives
- Polling for inventory drops instead of event-driven reactive invalidation: Rejected; polling introduces unbounded race conditions where depleted items could be promoted live.
- Allowing transition out of terminal states (e.g., re-activating expired suggestions): Rejected; creates non-deterministic state divergence and breaks audit trail integrity.
- Client-side optimistic delivery without server-side verification: Rejected; HUD must not display suggestions whose freshness window has elapsed.

## Verification
- Unit & integration test suite: `node code/services/jev-copilot-service/test/lifecycle.test.mjs`
- Regression suite: `node code/services/jev-copilot-service/test/vertical-slice.test.mjs`
- Four SOT checks: error-code registry, api-sot-traceability, architecture sot, tdd-traceability.
