# G-TELM-007 Pre-Execution Design Specification (Invariant 13)

## 1. Intent & Architectural Rationale

Certify the isolated `telemetry-service` behavioral, latency, concurrency, idempotency, and fault-recovery guarantees before production rollout (`G-TELM-008`). By driving 10,000 valid telemetry signals across 50 concurrent live sessions—together with high-load duplicate/idempotency storms and transient/poison chaos fault injection—through the real `TelemetryIngestController` → `TelemetryIngestService` → `TelemetrySignalRepository` → `SignalStateMachine` → `TelemetryReconciliationService` → `TelemetryDlqPublisher` stack, this certification suite proves strict SLA compliance (`p95 < 50ms`, `p99 < 100ms`, zero dropped signals) and emits a cryptographic proof receipt (`artifacts/proofs/G-TELM-007_certification.json`) bound to the physical SHA-256 digests of every service source file.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Execute a 10,000-signal stress benchmark across 50 concurrent live sessions (distributed across 5 tenants to exercise multi-tenant Row-Level Security concurrency).
  - Measure per-signal ingestion latency in integer microseconds (`process.hrtime.bigint()`) and integer milliseconds using zero-float arithmetic.
  - Compute exact integer basis points (`0..10,000` bps) and nearest-rank percentiles (`p50`, `p90`, `p95`, `p99`, `min`, `max`), verifying `p95 < 50,000 us` (`50ms`), `p99 < 100,000 us` (`100ms`), and `0` dropped signals.
  - Certify high-load duplicate delivery idempotency (same `Nats-Msg-Id` and transport redeliveries) and fail-closed `LP04003` rejection of tampered-payload conflicts.
  - Certify chaos fault resilience under concurrent load: transactional `ROLLBACK` + `NAK` on transient DB failures, bounded exponential backoff recovery, retry-exhausted `FAIL -> DEAD_LETTER` DLQ routing (`livepilot.v1.telemetry.signal.dlq`), poison credential redaction, and stale-signal reaping via `reconcileStaleSignals`.
  - Emit a canonical `proof-receipt-validator.mjs`-compatible cryptographic proof receipt to `artifacts/proofs/G-TELM-007_certification.json` containing real SHA-256 hashes of all `telemetry-service` source artifacts.
- **Non-Goals / Anti-Goals:**
  - Provisioning live DigitalOcean Kubernetes clusters, external PostgreSQL instances, or DNS records (covered by `G-TELM-008` / infrastructure goals).
  - Modifying production `src/` service logic unless a defect is uncovered during certification.
  - Using floating-point arithmetic (`performance.now()`, float averages/percentiles), `setTimeout`-based fake benchmarks, mocked `TelemetryIngestService` calls, or synthetic proof hashes.

## 3. Approaches Considered & Rejected Alternatives

1. **Full Map `structuredClone` Snapshot per `BEGIN` (Rejected):** Cloning an entire 10,000-entry `Map` on every `BEGIN` introduces $O(N^2)$ copy overhead (~50 million cloned entries), distorting latency measurements and causing artificial GC pauses rather than measuring actual service logic.
2. **Mocked Repository / Stubbed Service Benchmark (Rejected):** Violates Soda OS Article I (Zero Mocks, Zero Stubs, Zero Fallbacks) and fails to exercise SQL query generation, `set_config('app.tenant_id', ...)` RLS enforcement, JSON Schema validation, SHA-256 payload hashing, FSM transitions, and outbox/inbox deduplication.
3. **O(1)-Indexed Undo-Log Transactional Engine + Real Service Stack (Selected):** Preserves full ACID `BEGIN`/`COMMIT`/`ROLLBACK` isolation and `app.tenant_id` RLS enforcement using a per-transaction undo journal and $O(1)$ unique-index maps (`signals`, `lineage`, `inbox`, `outbox`). Every call executes the real `telemetry-service` TypeScript modules and frozen `telemetry-signal.schema.json`.

## 4. Selected Approach & Trade-off Analysis

### Isolated Certification Pipeline Architecture

```text
50 Concurrent Live Sessions (5 Tenants × 10 Sessions × 200 Signals = 10,000 Signals)
  │
  ▼  InProcessNatsCertificationBus (livepilot.v1.telemetry.signal.ingest)
TelemetryIngestController.handleMessage(msg)
  │
  ▼  TelemetryIngestService.ingestMessage(msg)
     ├─ 1. Decode UTF-8 JSON + validate against frozen telemetry-signal.schema.json
     ├─ 2. Verify envelope <-> header bindings + SHA-256 payload_hash integrity
     ├─ 3. transitionSignal(RECEIVED, VALIDATE) [Zero-float FSM]
     ├─ 4. withTenantTransaction(tenant_id):
     │      ├─ SET LOCAL app.tenant_id = $1 [RLS isolation]
     │      ├─ findSignal + recordInbox (O(1) deduplication)
     │      ├─ transitionSignal(VALIDATED, PERSIST)
     │      ├─ saveSignal (signals + lineage) + writeOutbox (pending)
     │      └─ COMMIT (or ROLLBACK via undo journal on injected chaos fault)
     └─ 5. Strict Ack-After-Commit: msg.ack() only post-COMMIT (else msg.nak())

High-Load Chaos & Reconciliation Verification (500 Signals @ 50 Concurrent Sessions)
  ├─ Transient DB Faults ──► ROLLBACK + NAK ──► handleIngestFailure (exponential backoff) ──► Retry Commit
  ├─ 5x Exhausted Faults ──► FAIL -> DEAD_LETTER ──► RLS Commit + livepilot.v1.telemetry.signal.dlq
  ├─ Poison Payloads     ──► Immediate DLQ + credential redaction + SHA-256 poison_payload_digest
  └─ Stale Signals       ──► reconcileStaleSignals ──► reap processed signals to 'dispatched'
```

- **Zero-Float Accounting:** Latency samples are captured with `process.hrtime.bigint()` nanoseconds, rounded to integer microseconds via `BigInt` unbiased Banker's Rounding (`divHalfEvenBigInt`), and evaluated with integer nearest-rank percentiles and integer basis points (`0..10,000`).
- **Cryptographic Binding:** At suite completion, SHA-256 digests are computed directly from disk bytes of all `telemetry-service` source files and bound into `artifacts/proofs/G-TELM-007_certification.json` alongside `git rev-parse HEAD` and the measured scorecard.

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly within the declared `G-TELM-007` touch map:
- `code/services/telemetry-service/test/certification/telemetry-certification.spec.ts`
- `artifacts/proofs/G-TELM-007_certification.json`
- `docs/07-backlog/goals/G-TELM-007.md`
- `docs/03-architecture/specs/goals/G-TELM-007/design.md`

## 6. Acceptance Test & TDD Verification Strategy

`code/services/telemetry-service/test/certification/telemetry-certification.spec.ts` executes using `node --test`:
1. **10,000-Signal / 50-Session Peak Concurrency SLA Certification:** Dispatches 10,000 valid envelopes across 50 concurrent live sessions; asserts 10,000 persisted signals/lineage/inbox/outbox rows, 10,000 acks, 0 naks, 0 dropped signals, cross-tenant RLS isolation, `p95 < 50,000 us` (`50ms`), and `p99 < 100,000 us` (`100ms`).
2. **Duplicate & Idempotency Conflict Storm Certification:** Replays 1,000 concurrent duplicate deliveries (500 identical `Nats-Msg-Id`, 500 redelivery `Nats-Msg-Id`) + 50 tampered payload probes; verifies 10,000 bps deduplication accuracy, zero duplicate outbox/signal rows, and 10,000 bps `LP04003` conflict rejection.
3. **Chaos Fault Resilience & Reconciliation Certification:** Injects concurrent transient DB faults, 5-attempt retry exhaustions, poison malformed payloads with secrets, and stale pending signals; verifies zero silent signal drops, deterministic retry recovery, schema-valid DLQ emission, and stale reaping.
4. **Cryptographic Proof Receipt Emission & Integrity Check:** Writes `artifacts/proofs/G-TELM-007_certification.json` and verifies all recorded source SHA-256 digests match active disk bytes.
5. **Verification Commands:**
   - `node --test code/services/telemetry-service/test/certification/telemetry-certification.spec.ts`
   - `node scripts/harness/proof-receipt-validator.mjs artifacts/proofs/G-TELM-007_certification.json`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-007.md`
