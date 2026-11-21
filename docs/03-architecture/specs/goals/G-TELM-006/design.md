# G-TELM-006 Pre-Execution Design Specification (Invariant 13)

## 1. Intent & Architectural Rationale

Deliver deterministic failure recovery, bounded exponential backoff retries, Dead-Letter Queue (DLQ) routing (`livepilot.v1.telemetry.signal.dlq`), and background stale-signal reconciliation for `telemetry-service`. Extending the `G-TELM-005` ingestion vertical slice with fail-closed recovery guarantees ensures transient PostgreSQL or NATS outages never cause silent telemetry signal loss, while unrecoverable or retry-exhausted payloads transition deterministically through `SignalStateMachine` (`failed -> dead_lettered`) with full causation, error context, and cryptographic payload digest preservation.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Implement `TelemetryDlqPublisher` (`code/services/telemetry-service/src/reconciliation/telemetry-dlq.publisher.ts`):
    1. Construct canonical DLQ envelopes conforming strictly to `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` (`telemetry.signal.livepilot.v1`, `state: 'dead_lettered'`, `dlq_metadata` with `original_subject`, `attempts`, `failure_code`, `failure_detail`, `failed_at`, `replay_owner: 'telemetry-service'`, and SHA-256 `payload_hash` / poison payload digest).
    2. Redact sensitive credentials or tokens from diagnostic error strings before emitting to `livepilot.v1.telemetry.signal.dlq`.
    3. Publish DLQ envelopes via an explicit `NatsPublisherPort` with required `MessageHeaders` (`Nats-Msg-Id`, `X-Correlation-Id`, `X-Causation-Id`, `X-Idempotency-Key`, `X-Tenant-Id`, `X-Session-Id`, `X-Schema-Version`, `X-Producer`, `X-Traceparent`, `X-Mode`).
  - Implement `TelemetryReconciliationService` (`code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.ts`):
    1. `handleIngestFailure(signal, attempt, error, bus, repo)`:
       - For retryable failures where `attempt < 5`, computes bounded integer exponential backoff delay (`baseBackoffMs * 2^(attempt - 1)` capped at `maxBackoffMs`, with deterministic integer jitter) and schedules retry via `nak(delayMs)` / retry bus port.
       - When `attempt >= 5` (or on non-retryable poison failures), invokes `transitionSignal(..., SignalEvent.FAIL)` followed by `transitionSignal(SignalState.FAILED, SignalEvent.DEAD_LETTER)`, commits `dead_lettered` state inside a tenant-isolated PostgreSQL RLS transaction, and publishes the canonical DLQ envelope to `livepilot.v1.telemetry.signal.dlq`.
    2. `reconcileStaleSignals(olderThanMs, repo, bus)`:
       - Scans non-terminal or uncommitted pending signals older than `olderThanMs` (exact integer millisecond threshold).
       - Verifies inbox/outbox completion status: reaps already-processed signals to `dispatched`, retries stale pending signals within the 5-attempt ceiling, and dead-letters signals that have exhausted retries or remain stuck in `failed`.
- **Non-Goals / Anti-Goals:**
  - User-facing administrative DLQ replay UI or external PagerDuty webhooks.
  - Modifying `telemetry-signal.repository.ts`, `signal-state-machine.ts`, or frozen `telemetry-signal.schema.json`.
  - Using floating-point timestamps, unbounded retry loops, or mocked FSM/SQL/schema logic.

## 3. Approaches Considered & Rejected Alternatives

1. **Direct `transitionSignal(currentState, SignalEvent.DEAD_LETTER)` shortcut (Rejected):** `SignalStateMachine` (`G-TELM-004`) strictly forbids skipping `failed`; `DEAD_LETTER` is only legal from `SignalState.FAILED`. Skipping `FAIL` violates monotonic rank progression (`SIGNAL_STATE_RANK`) and throws `IllegalSignalTransitionError`.
2. **Unstructured DLQ error wrapper outside `telemetry-signal.schema.json` (Rejected):** Breaks `telemetry.signal.livepilot.v1` contract compatibility (`DlqMetadata` has `additionalProperties: false` and requires `original_subject`, `attempts`, `failure_code`, `failed_at`, `replay_owner: 'telemetry-service'`).
3. **Floating-point backoff and timestamp comparisons (Rejected):** Violates Soda OS zero-float invariants; all delays, cutoffs, and timestamps are validated as safe non-negative integers (`Number.isSafeInteger`).
4. **Hexagonal `TelemetryReconciliationService` + `TelemetryDlqPublisher` + `PostgresTelemetryReconciliationRepository` (Selected):** Keeps `telemetry-signal.repository.ts` untouched, executes real RLS-scoped SQL transactions against PostgreSQL, enforces `SignalStateMachine` transitions, and validates DLQ envelopes against the frozen JSON Schema.

## 4. Selected Approach & Trade-off Analysis

### Failure Retry, Dead-Letter & Reconciliation Flow

```text
Ingest / Outbox Failure (signal, attempt, error)
  │
  ├─► attempt < 5 (retryable):
  │     ├─ computeExponentialBackoffMs(attempt) = min(maxBackoffMs, baseMs * 2^(attempt - 1)) + intJitter
  │     ├─ message.nak(delayMs) / bus.scheduleRetry(...)
  │     └─ return { outcome: 'retry_scheduled', attempt, delayMs }
  │
  └─► attempt >= 5 OR non-retryable poison:
        ├─ 1. transitionSignal(current, FAIL) -> 'failed' (if not already 'failed')
        ├─ 2. transitionSignal('failed', DEAD_LETTER) -> 'dead_lettered'
        ├─ 3. repo.markSignalDeadLettered(tenantId, sessionId, signalId, ...) [RLS TX COMMIT]
        ├─ 4. dlqPublisher.publishToDlq(...) -> livepilot.v1.telemetry.signal.dlq
        └─ 5. message.term() (or ack after durable DLQ publish)

Periodic Reconciliation Scanner: reconcileStaleSignals(olderThanMs, repo, bus)
  │
  ├─► cutoffMs = nowMs - olderThanMs (safe integer >= 0)
  ├─► repo.findStaleSignals(cutoffMs)
  └─► For each stale signal:
        ├─ processed in inbox + outbox published ─► transitionSignal(persisted, DISPATCH) ─► reap 'dispatched'
        ├─ processed in inbox + outbox pending   ─► publish detected event + mark outbox published + reap 'dispatched'
        ├─ uncommitted & retryAttempts < 5       ─► computeExponentialBackoffMs + schedule retry
        └─ uncommitted & retryAttempts >= 5      ─► handleIngestFailure(..., DEAD_LETTER -> DLQ)
```

- **Zero-Float & Monotonicity:** All attempt counts, delays, cutoff windows, and `occurred_at_ms` values are checked with `Number.isSafeInteger(v) && v >= 0`.
- **RLS Isolation:** `PostgresTelemetryReconciliationRepository` wraps all reads and state updates inside `TelemetrySignalRepository.withTenantTransaction(tenantId, ...)` issuing `SELECT set_config('app.tenant_id', $1, true)`.
- **Schema Conformance:** `TelemetryDlqPublisher` builds envelopes conforming to `telemetry-signal.schema.json` (`DlqMetadata` + `MessageHeaders`) while computing and returning full diagnostic metadata (`poison_payload_digest`, `last_error_code`, `failure_reason`, `retry_count`).

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly within the declared `G-TELM-006` touch map:
- `code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.ts`
- `code/services/telemetry-service/src/reconciliation/telemetry-dlq.publisher.ts`
- `code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts`
- `docs/07-backlog/goals/G-TELM-006.md`
- `docs/03-architecture/specs/goals/G-TELM-006/design.md`

## 6. Acceptance Test & TDD Verification Strategy

`telemetry-reconciliation.service.spec.ts` runs against an in-process transactional PostgreSQL SQL engine (enforcing `BEGIN`/`COMMIT`/`ROLLBACK`, `app.tenant_id` RLS, and `telemetry.*` tables), an in-process NATS JetStream bus, and the frozen `telemetry-signal.schema.json`:
1. **Transient failure exponential backoff (attempts 1..4):** Simulates DB outages on attempts 1 through 4, verifying monotonic exponential backoff delays, `nak(delayMs)` / retry bus scheduling, zero premature DLQ routing, and zero false `dispatched` state.
2. **5th failure DLQ routing:** Simulates failure at attempt 5, verifying `transitionSignal` moves `received/validated/persisted -> failed -> dead_lettered`, PostgreSQL commits `state = 'dead_lettered'`, and `livepilot.v1.telemetry.signal.dlq` receives a schema-valid envelope with `dlq_metadata` and SHA-256 payload digest.
3. **Stale signal reconciliation (`reconcileStaleSignals`):** Seeds stale uncommitted signals, already-processed-but-undispatched signals, and retry-exhausted stale signals; verifies reaping to `dispatched`, retry scheduling for recoverable stale signals, and DLQ routing for exhausted stale signals.
4. **Fail-closed guards:** Rejects non-integer `olderThanMs` / `attempt`, enforces RLS tenant boundaries, and handles poison malformed payloads without crashing or leaking raw credentials.
5. **Verification Commands:**
   - `node --test code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-006.md`
