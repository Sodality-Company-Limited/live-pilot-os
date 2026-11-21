# G-TELM-004 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

Establish a pure, zero-dependency TypeScript finite state machine (`SignalStateMachine` / `transitionSignal`) governing the lifecycle of `TelemetrySignal` aggregates in `telemetry-service`, prior to runtime NATS JetStream ingestion and PostgreSQL repository wiring (`G-TELM-005`). Grounded in the frozen `telemetry-service` contract ([telemetry-service.md](../../../api/services/telemetry-service.md)) and `telemetry.signal.livepilot.v1` JSON Schema ([telemetry-signal.schema.json](../../../api/schemas/nats/telemetry-signal.schema.json)), the domain reducer enforces monotonic forward progression, terminal absorbing states (`dispatched`, `dead_lettered`), strict zero-float integer timestamps, and fail-closed rejection via `IllegalSignalTransitionError` (`IllegalStateTransitionError`).

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Define canonical `SignalState` values (`received`, `validated`, `persisted`, `dispatched`, `failed`, `dead_lettered`) and `SignalEvent` values (`VALIDATE`, `PERSIST`, `DISPATCH`, `FAIL`, `DEAD_LETTER`).
  - Implement a pure, deterministic transition function `transitionSignal(current, event, context?) => SignalTransitionResult` backed by an explicit, immutable transition matrix (`SIGNAL_TRANSITION_MATRIX`).
  - Enforce monotonic forward progression with a strict integer ranking function (`SIGNAL_STATE_RANK`) where `received` cannot transition directly to `persisted` without `validated`, and `dispatched` and `dead_lettered` are absorbing terminal states.
  - Reject any illegal, duplicate, out-of-order, or unknown state/event transition fail-closed by throwing `IllegalSignalTransitionError` (aliased as `IllegalStateTransitionError`).
  - Enforce exact safe non-negative integer constraints on optional `occurredAtMs`, `transitionedAtMs`, and `attempt` context fields (`InvalidSignalContextError` on floats, `NaN`, negatives, or `Infinity`).
  - Verify all 30 `(state, event)` matrix cells and 1,000+ randomized property-based permutation trials via `node:test`.
- **Non-Goals / Anti-Goals:**
  - Performing PostgreSQL queries, NATS JetStream publishing, clock reads (`Date.now()`), or random ID generation inside the pure domain reducer (`G-TELM-005`).
  - Allowing mutable aggregate state, silent state coercion from `failed`/`dead_lettered` back to `persisted`/`dispatched`, or floating-point timestamps.
  - Modifying files outside the `G-TELM-004` touch map (`package.json`, `tsconfig.json`, or other services).

## 3. Approaches Considered & Rejected Alternatives

1. **Implicit `switch`/conditional branching without a declarative transition matrix (Rejected):** Disperses allowed edges across nested branches, increases omission risk when states or events evolve, and makes exhaustive matrix auditing harder.
2. **Stateful mutable class mutating `this.state` in place (Rejected):** Introduces side effects, complicates concurrency/idempotency reasoning in `G-TELM-005`, and prevents pure referential transparency.
3. **TypeScript `enum` syntax incompatible with Node.js native type-stripping (Rejected):** Node.js v26 native `--test` execution strips type annotations without compiling runtime `enum` blocks, causing `SyntaxError` without a build step.
4. **Pure declarative `SIGNAL_TRANSITION_MATRIX` + `as const` `SignalState`/`SignalEvent` value-type pairs + immutable `transitionSignal` reducer (Selected):** Works seamlessly in both Node.js native TypeScript execution (`node --test`) and `tsc` strict mode, keeps zero runtime dependencies, and guarantees exhaustive, deterministic behavior.

## 4. Selected Approach & Trade-off Analysis

### Canonical FSM Transition Matrix

```text
received ──(VALIDATE)──▶ validated ──(PERSIST)──▶ persisted ──(DISPATCH)──▶ dispatched [TERMINAL]
   │                         │                        │
   └────────(FAIL)───────────┴────────(FAIL)──────────┴──(FAIL)──▶ failed ──(DEAD_LETTER)──▶ dead_lettered [TERMINAL]
```

| From State | Event | Next State | Rank Delta | Invariant |
|---|---|---|---|---|
| `received` | `VALIDATE` | `validated` | `0 -> 1` | Envelope, headers, tenant, and active session validated |
| `validated` | `PERSIST` | `persisted` | `1 -> 2` | Atomic PostgreSQL + outbox commit; cannot skip `validated` from `received` |
| `persisted` | `DISPATCH` | `dispatched` | `2 -> 3` | Outbox published to JetStream; absorbing terminal state |
| `received` | `FAIL` | `failed` | `0 -> 4` | Validation/auth rejection before persistence |
| `validated` | `FAIL` | `failed` | `1 -> 4` | Persistence failure / exhausted retries |
| `persisted` | `FAIL` | `failed` | `2 -> 4` | Outbox dispatch failure / exhausted retries |
| `failed` | `DEAD_LETTER` | `dead_lettered` | `4 -> 5` | Routed to DLQ; absorbing terminal state |

- **Monotonicity & Termination Guarantee:** Every legal edge strictly increases `SIGNAL_STATE_RANK` (`received: 0 < validated: 1 < persisted: 2 < dispatched: 3`, and `0|1|2 < failed: 4 < dead_lettered: 5`), mathematically proving acyclicity and bounded termination in at most 4 transitions.
- **Fail-Closed Error Semantics:** All other 23 `(state, event)` combinations and any unrecognized runtime inputs throw `IllegalSignalTransitionError` without mutating caller inputs.
- **Zero-Float Context Guard:** Optional `occurredAtMs`, `transitionedAtMs`, and `attempt` values are validated via `Number.isSafeInteger(v) && v >= 0`, rejecting any floating-point or non-finite values fail-closed with `InvalidSignalContextError`.

## 5. Bounded Context & Touch Map Invariants

All edits remain strictly bounded to the `G-TELM-004` touch map:
- `code/services/telemetry-service/src/domain/signal-state-machine.ts`
- `code/services/telemetry-service/src/domain/signal-state-machine.spec.ts`
- `docs/07-backlog/goals/G-TELM-004.md`
- `docs/03-architecture/specs/goals/G-TELM-004/design.md`

## 6. Acceptance Test & TDD Verification Strategy

1. **Exhaustive Matrix & Guard Tests (`signal-state-machine.spec.ts`):** Verify all 30 `(SignalState, SignalEvent)` pairs—7 legal transitions and 23 illegal transitions (including `received + PERSIST`, `received + DISPATCH`, duplicate events, backward transitions, terminal state absorption on `dispatched` and `dead_lettered`, and unvalidated runtime inputs).
2. **Zero-Float & Purity Tests:** Verify safe non-negative integers succeed, floating-point/negative/`NaN`/`Infinity` timestamps or attempts throw `InvalidSignalContextError`, and `context` objects are never mutated.
3. **Property-Based Randomized Permutation Suite (1,500+ trials):** Deterministic seeded PRNG validates that `canTransitionSignal` matches `transitionSignal`, every valid transition strictly increases `SIGNAL_STATE_RANK`, and arbitrary event sequences never escape terminal states or violate `received -> validated -> persisted`.
4. **Verification Commands:**
   - `node --test code/services/telemetry-service/src/domain/signal-state-machine.spec.ts`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-004.md`
