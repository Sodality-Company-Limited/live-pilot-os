# G-TELM-001 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

Freeze an authoritative, versioned, SOT-owned contract for `telemetry-service` covering tenant/session-scoped chat, order, and engagement signal ingestion before any database migrations (`G-TELM-003`), pure domain state machine implementation (`G-TELM-004`), or runtime NATS JetStream ingestion (`G-TELM-005`) are written. Isolating signal ingestion behind explicit NATS JetStream subjects (`livepilot.v1.telemetry.signal.ingest`, `livepilot.v1.telemetry.signal.detected`, `livepilot.v1.telemetry.signal.dlq`) and JSON Schema 2020-12 prevents shared-table coupling, browser-originated raw payload writes, and silent metric inflation.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Establish single-writer ownership (`telemetry-service`) over `TelemetrySignal` and PostgreSQL `telemetry_signals`.
  - Freeze state machine (`received → validated → persisted → dispatched`, with failure states `failed`, `dead_lettered`).
  - Define envelope, required NATS transport headers, idempotency/deduplication (`(tenant_id, session_id, signal_id)`), 5-retry exponential backoff, DLQ routing, and operator replay ownership.
  - Register all subjects in `asyncapi.yaml` and `nats-subject-catalog-sot.md` and register telemetry error codes (`LP12001`–`LP12005`) in `error-codes.yaml`.
- **Non-Goals / Anti-Goals:**
  - Implementing runtime TypeScript/Rust handlers, PostgreSQL migrations, or UI/BFF routes.
  - Owning margin calculation, inventory reservations, approval decisions, audit ledger, or intent classification.

## 3. Approaches Considered & Rejected Alternatives

1. **Public REST endpoint for telemetry submission (Rejected):** Exposes raw provider payloads through public API routes and invites unauthenticated or cross-tenant spoofing.
2. **Shared PostgreSQL ingestion table written by adapters directly (Rejected):** Violates single-writer service isolation, bypasses schema validation, and breaks outbox ordering.
3. **Versioned internal NATS JetStream contract with JSON Schema + transactional outbox (Selected):** Enforces tenant/session authorization, deterministic deduplication, bounded retry, and durable post-commit event emission.

## 4. Selected Approach & Trade-off Analysis

Using NATS JetStream at-least-once delivery keyed by `session_id` with PostgreSQL `telemetry_signals` + `telemetry_inbox` + `telemetry_outbox` balances throughput with strict durability. At-least-once delivery requires idempotent consumers and a unique `(tenant_id, session_id, signal_id)` index, trading trivial fire-and-forget ingestion for audit-grade consistency and zero silent drops.

## 5. Bounded Context & Touch Map Invariants

All edits are strictly bounded to the declared `G-TELM-001` touch map:
- `docs/03-architecture/api/services/telemetry-service.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `docs/03-architecture/specs/goals/G-TELM-001/`
- `docs/07-backlog/goals/G-TELM-001.md`

## 6. Acceptance Test & TDD Verification Strategy

Verification runs deterministic contract, schema, traceability, and goal conformance gates:
- `node scripts/contract-check/error-code-registry.mjs`
- `node scripts/api/check-api-sot-traceability.mjs`
- `node scripts/architecture/check-sot.mjs`
- `node scripts/testing/check-tdd-traceability.mjs`
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-001.md`
