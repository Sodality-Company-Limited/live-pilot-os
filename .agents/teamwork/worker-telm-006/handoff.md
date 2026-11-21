# Terminal Handoff: G-TELM-006

- **Status:** `COMPLETE`
- **Goal ID:** `G-TELM-006` (Add Telemetry recovery and reconciliation)
- **Persona:** `Systems & Reliability Architect`

## Summary (WHERE / WHY / FOR WHOM / HOW)

- **WHERE:**
  - [telemetry-dlq.publisher.ts](file:///Users/batrarethsudprasert/projects/live-pilot-os/code/services/telemetry-service/src/reconciliation/telemetry-dlq.publisher.ts)
  - [telemetry-reconciliation.service.ts](file:///Users/batrarethsudprasert/projects/live-pilot-os/code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.ts)
  - [telemetry-reconciliation.service.spec.ts](file:///Users/batrarethsudprasert/projects/live-pilot-os/code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts)
  - [G-TELM-006.md](file:///Users/batrarethsudprasert/projects/live-pilot-os/docs/07-backlog/goals/G-TELM-006.md)
  - [design.md](file:///Users/batrarethsudprasert/projects/live-pilot-os/docs/03-architecture/specs/goals/G-TELM-006/design.md)
- **WHY:** Guarantees fail-closed resilience against transient PostgreSQL/NATS outages and poison payloads with bounded 5-attempt exponential backoff retries, deterministic FSM transitions (`failed -> dead_lettered`), schema-compliant DLQ emission (`livepilot.v1.telemetry.signal.dlq`), and stale signal reconciliation.
- **FOR WHOM:** `telemetry-service` ingestion & outbox recovery pipelines and downstream operator DLQ replay workflows.
- **HOW:**
  - `TelemetryDlqPublisher` builds envelopes conforming strictly to `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` (`DlqMetadata`: `original_subject`, `attempts`, `failure_code`, `failure_detail`, `failed_at`, `replay_owner: 'telemetry-service'`), redacts sensitive credentials from error messages, computes SHA-256 `poison_payload_digest`, and publishes to `livepilot.v1.telemetry.signal.dlq`.
  - `TelemetryReconciliationService.handleIngestFailure(signal, attempt, error, bus, repo)` schedules bounded integer exponential backoff retries via `nak(delayMs)` / bus retry port for retryable failures with `attempt < 5`, and on `attempt >= 5` (or non-retryable poison errors) transitions `SignalState` via `transitionSignal(..., FAIL)` -> `transitionSignal(FAILED, DEAD_LETTER)`, commits `dead_lettered` in PostgreSQL inside a tenant-isolated RLS transaction (`PostgresTelemetryReconciliationRepository`), and publishes to `livepilot.v1.telemetry.signal.dlq`.
  - `TelemetryReconciliationService.reconcileStaleSignals(olderThanMs, repo, bus)` scans stale non-terminal signals, verifies `telemetry_inbox` & `telemetry_outbox` state, reaps processed signals to `dispatched`, retries stale uncommitted signals, and dead-letters stuck `failed` signals.

## Acceptance Criteria Check
- [x] Transient failures trigger exponential backoff retry up to 5 attempts.
- [x] Permanent failures and exhausted retries publish cleanly to `livepilot.v1.telemetry.signal.dlq`.
- [x] Reconciliation worker safely identifies and resolves uncommitted signal records.

## Verification Results
- `node --test code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts`: **PASS** (5/5 tests)
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-006.md`: **PASS** (51/51 sections & invariants, 1 Passed, 0 Failed)
- Full telemetry suite (`signal-state-machine.spec.ts`, `telemetry-ingest.service.spec.ts`, `telemetry-reconciliation.service.spec.ts`): **PASS** (18/18 tests)
- `node tests/contracts/telemetry/run-contract-tests.mjs`: **PASS** (11 valid golden fixtures, 15 invalid fail-closed fixtures, 41 total checks)

## Next Action for Orchestrator
- Run independent review / verification gate and close `G-TELM-006` via `node ./cli.js goal close G-TELM-006` when ready.
