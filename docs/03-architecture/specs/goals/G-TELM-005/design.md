# G-TELM-005 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

Deliver the primary end-to-end ingestion vertical slice for `telemetry-service`, connecting inbound NATS JetStream `livepilot.v1.telemetry.signal.ingest` messages to frozen Draft 2020-12 schema validation (`G-TELM-002`), the pure `SignalStateMachine` reducer (`G-TELM-004`), and PostgreSQL 16 Row-Level Security (RLS) persistence (`G-TELM-003`) with atomic outbox emission (`livepilot.v1.telemetry.signal.detected`) and strict **ack-after-commit** semantics.

This invariant-driven architecture prevents split-brain state, duplicate downstream signal emission, silent schema drift, and cross-tenant data leakage by enforcing a single ACID transaction boundary around `telemetry.telemetry_signals`, `telemetry.telemetry_lineage`, `telemetry.telemetry_inbox`, and `telemetry.telemetry_outbox`.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Implement `TelemetrySignalRepository` (`code/services/telemetry-service/src/repository/telemetry-signal.repository.ts`) providing tenant-isolated RLS transaction orchestration (`SELECT set_config('app.tenant_id', $1, true)`) and typed SQL persistence for `saveSignal`, `findSignal`, `writeOutbox`, and `recordInbox`.
  - Implement `TelemetryIngestService` (`code/services/telemetry-service/src/ingest/telemetry-ingest.service.ts`) performing:
    1. Fail-closed envelope, transport header, `payload_hash`, and Draft 2020-12 schema validation against `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`.
    2. Deterministic domain state transitions (`received -> validated -> persisted`) via `transitionSignal`.
    3. Idempotent deduplication via `(tenant_id, session_id, signal_id)` and `telemetry.telemetry_inbox` (`(tenant_id, consumer_name, message_id)` and `idempotency_key`), failing closed on payload hash mismatches (`LP04003` / `IDEMPOTENCY_PAYLOAD_MISMATCH`) and skipping duplicate side-effects while safely acknowledging matching replays.
    4. Atomic single-transaction commit of signal, lineage, inbox, and `livepilot.v1.telemetry.signal.detected` outbox event.
    5. Strict **ack-after-commit** guarantee: `message.ack()` executes exclusively after transaction `COMMIT` completes; any validation or persistence error rolls back and invokes `message.nak()` without acking.
  - Implement `TelemetryIngestController` (`code/services/telemetry-service/src/ingest/telemetry-ingest.controller.ts`) wiring NATS JetStream subject `livepilot.v1.telemetry.signal.ingest` to `TelemetryIngestService`.
  - Add `"type": "module"` to `code/services/telemetry-service/package.json` for clean ESM + Node native TypeScript execution.
- **Non-Goals / Anti-Goals:**
  - DLQ background recovery and operator replay workers (`G-TELM-006`).
  - Outbox relay daemon / polling loop (`G-TELM-006` / downstream dispatchers).
  - Public HTTP ingestion endpoints (`telemetry-service` is internal NATS JetStream only per `telemetry-service.md`).
  - Mocking `transitionSignal`, schema validation, or repository SQL execution.

## 3. Approaches Considered & Rejected Alternatives

1. **Ack-before-commit or fire-and-forget outbox insert outside the signal transaction (Rejected):** Creates data-loss windows on process crash and allows duplicate or uncommitted `signal.detected` events to leak downstream.
2. **Ad-hoc manual `if/else` field checks detached from `telemetry-signal.schema.json` (Rejected):** Risks schema drift against the frozen `telemetry.signal.livepilot.v1` contract and misses nested `#/$defs/MessageHeaders` / `additionalProperties: false` constraints.
3. **NestJS `@Controller` / experimental decorator metadata without `@nestjs/common` installed (Rejected):** Incompatible with `@livepilot/telemetry-service` dependencies and Node v26 native TypeScript type-stripping.
4. **Pure ESM TypeScript hexagonal slice (`Controller -> IngestService -> SignalStateMachine + SchemaValidator + TelemetrySignalRepository`) (Selected):** Uses only declared dependencies and Node built-ins, runs natively under `node --test`, enforces `tsc --noEmit` strictness, and isolates all SQL inside parameterized RLS-aware transactions.

## 4. Selected Approach & Trade-off Analysis

### Ack-After-Commit Ingestion Sequence

```text
NATS JetStream (livepilot.v1.telemetry.signal.ingest)
  │
  ▼
TelemetryIngestController.handleMessage(msg)
  │
  ▼
TelemetryIngestService.ingestMessage(msg)
  ├─► 1. Parse + Validate Envelope/Headers vs telemetry-signal.schema.json
  │      └─ invalid ──► msg.nak() + throw TelemetryValidationError (0 DB writes, 0 ack)
  ├─► 2. transitionSignal('received', 'VALIDATE') ──► 'validated'
  ├─► 3. repository.withTenantTransaction(tenantId):
  │      ├─ BEGIN + SELECT set_config('app.tenant_id', $1, true)
  │      ├─ findSignal(tenantId, sessionId, signalId)
  │      │   ├─ exists & same payload_hash ──► duplicate no-op (skip save/outbox)
  │      │   └─ exists & diff payload_hash ──► ROLLBACK + nak() + throw LP04003
  │      ├─ recordInbox(messageId, consumer, tenantId, sessionId)
  │      │   ├─ conflict & same hash ──► duplicate no-op (skip save/outbox)
  │      │   └─ conflict & diff hash ──► ROLLBACK + nak() + throw LP04003
  │      ├─ transitionSignal('validated', 'PERSIST') ──► 'persisted'
  │      ├─ saveSignal(signal, lineage, client)
  │      ├─ writeOutbox('livepilot.v1.telemetry.signal.detected', client)
  │      └─ COMMIT (on any DB error: ROLLBACK + msg.nak() + rethrow, 0 ack)
  └─► 4. Post-COMMIT: msg.ack()
```

- **RLS Enforcement:** Every database transaction issues `SELECT set_config('app.tenant_id', $1, true)` before any `SELECT` or `INSERT` on `telemetry.*` tables, matching the `FORCE ROW LEVEL SECURITY` policies in `001_create_telemetry_signals.up.sql`.
- **Zero-Float Integer Invariant:** `occurred_at_ms` is validated as a safe non-negative integer (`Number.isSafeInteger(v) && v >= 0`) and derived deterministically from RFC 3339 `occurred_at` when omitted.
- **Cryptographic Integrity:** `payload_hash` is verified against canonical SHA-256 of `JSON.stringify(payload)` when provided, and computed deterministically when omitted.

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly within the declared `G-TELM-005` touch map:
- `code/services/telemetry-service/src/ingest/telemetry-ingest.service.ts`
- `code/services/telemetry-service/src/ingest/telemetry-ingest.controller.ts`
- `code/services/telemetry-service/src/ingest/telemetry-ingest.service.spec.ts`
- `code/services/telemetry-service/src/repository/telemetry-signal.repository.ts`
- `code/services/telemetry-service/package.json`
- `docs/07-backlog/goals/G-TELM-005.md`
- `docs/03-architecture/specs/goals/G-TELM-005/design.md`

## 6. Acceptance Test & TDD Verification Strategy

`telemetry-ingest.service.spec.ts` executes an in-process transactional PostgreSQL SQL engine (enforcing `BEGIN`/`COMMIT`/`ROLLBACK`, `set_config('app.tenant_id')` RLS checks, and unique constraints) and an in-process JetStream message bus:
1. **Happy path:** Valid signal -> schema + header check -> `validated` -> `persisted` -> signal + lineage + inbox + outbox (`livepilot.v1.telemetry.signal.detected`) committed -> `ack()` invoked strictly after `COMMIT`.
2. **Duplicate delivery:** Re-delivery of an existing `(tenant_id, session_id, signal_id)` or `message_id` -> idempotent duplicate detected -> zero second signal/outbox write -> `ack()` invoked safely. Also verifies conflicting `payload_hash` fails closed (`LP04003`).
3. **Invalid schema / envelope:** Missing required fields, unsupported `signal_type`, float `occurred_at_ms`, or header/body tenant mismatch -> fails closed -> throws `TelemetryValidationError` + invokes `nak()` -> zero commits, zero acks.
4. **Database failure:** Fault injected during transaction execution or `COMMIT` -> full `ROLLBACK` restores pre-transaction state -> zero persisted rows -> `ack()` NOT called -> `nak()` called for retry.
5. **Verification Commands:**
   - `node --test code/services/telemetry-service/src/ingest/telemetry-ingest.service.spec.ts`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-005.md`
