# telemetry-service Contract

Goal: `G-TELM-001`. Contract only: defines authoritative service boundaries, NATS JetStream subjects, schema, state machine, persistence ownership, error mappings, and verification gates.

## 1. Contract identity and ownership

| Field | Value |
|---|---|
| Contract ID | `telemetry.signal.livepilot.v1` |
| Status | `FROZEN` |
| Owner / authoritative writer | `telemetry-service` |
| Authority | Tenant/session-scoped chat, order, and engagement signal ingestion, normalization, deduplication, and persistence |
| Public exposure | None; internal versioned NATS JetStream subjects only |
| Requirements / flows | `REQ-LP-016`; `F01-FLOW-002`, `F01-FLOW-003`, `F01-FLOW-004`, `F01-FLOW-005` |
| Schema path | `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` |
| Schema version | `1.0.0` |
| Schema SHA-256 | `e257cd7cda43f277b4efff717e9bba11c4c2e78c115a23e3349512b37172faf8` |
| Ordering key | `session_id` |
| Source of truth | PostgreSQL 16 `telemetry_signals` table and transactional outbox |

## 2. Responsibility boundaries (Does NOT own)

`telemetry-service` is the single authoritative writer for normalized telemetry signal records and lineage. It strictly **does NOT own**:
- Margin calculation or policy verdicts (`margin-policy-service`)
- Inventory reservations or stock projections (`inventory-service`)
- Approval decisions or emergency pause state (`approval-control-service`)
- Append-only audit ledger (`audit-service`)
- Intent classification or risk severity moderation (`intent-risk-service`)
- Catalog products or SKU authority (`catalog-service`)
- Live-session lifecycle authority (`session-service`)

`telemetry-service` never reads another service's database tables and never exposes public HTTP routes directly.

## 3. Aggregate and resource model

- **Aggregate / Resource:** `TelemetrySignal`
- **Identity:** Composite tenant/session-scoped key `(tenant_id, session_id, signal_id)`
- **Signal types:** `chat`, `viewer_count`, `product_click`, `cart_add`, `checkout`, `payment`, `order`, `engagement`, `voucher`, `stock`
- **Immutability & Lineage:** Accepted source facts are append-only and preserve `signal_id`, `provider_event_id`, `payload_hash`, `occurred_at` (UTC ISO-8601), `occurred_at_ms` (exact integer epoch milliseconds; zero floats), `correlation_id`, `causation_id`, `idempotency_key`, and `mode` (`SIMULATED` | `SANDBOX` | `CONFIRMED`).

## 4. State machine

`TelemetrySignal` progresses deterministically through the following states:

```text
received ──▶ validated ──▶ persisted ──▶ dispatched
   │             │             │
   └─────────────┴─────────────┴──▶ failed ──▶ dead_lettered
```

| From state | Transition / Guard | To state | Failure / invariant |
|---|---|---|---|
| `received` | Schema, required headers, active `session_id`, and tenant scope validated | `validated` | Invalid envelope/headers or inactive session transitions to `failed` (fail closed) |
| `validated` | Normalized payload committed atomically to `telemetry_signals` + `telemetry_outbox` (or deduplicated as safe no-op) | `persisted` | Transient DB error triggers bounded retry; timeout/unknown transitions to reconciliation, never success |
| `persisted` | Outbox publishes `livepilot.v1.telemetry.signal.detected` to NATS JetStream | `dispatched` | Publish failure retries from outbox until delivered or exhausted |
| `received` / `validated` / `persisted` | Non-retryable validation/auth failure or 5 retry attempts exhausted | `failed` → `dead_lettered` | Routed to `livepilot.v1.telemetry.signal.dlq` with original payload, attempt count, and failure code |

Invalid or out-of-order state transitions fail closed (`IllegalStateTransitionError`). Terminal failure states (`failed`, `dead_lettered`) never silently coerce into `persisted` or `dispatched`.

## 5. Commands, events, producers, and consumers

| Subject | Kind | Producers | Consumers | Delivery & Ordering |
|---|---|---|---|---|
| `livepilot.v1.telemetry.signal.ingest` | command | `core-bff`, `platform-adapters` (`telemetry-ingress`) | `telemetry-service` | JetStream at-least-once, durable pull consumer, ordered by `session_id` |
| `livepilot.v1.telemetry.signal.detected` | event | `telemetry-service` | `intent-risk-service`, `jev-copilot-service`, `audit-service` | JetStream at-least-once, published only after durable PostgreSQL commit |
| `livepilot.v1.telemetry.signal.dlq` | dlq | `telemetry-service` | `telemetry-service` (operator replay worker) | Dead-letter stream preserving original message, attempts, reason, and lineage |

## 6. Envelope, required headers, and compatibility

Every message must conform to `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` and carry required transport headers:
- `Nats-Msg-Id` (broker deduplication ID)
- `X-Correlation-Id` (end-to-end trace ID)
- `X-Causation-Id` (required for derived events/replies)
- `X-Idempotency-Key` (command idempotency key)
- `X-Tenant-Id` (server-derived tenant scope; never trusted from browser claims)
- `X-Session-Id` (live session scope)
- `X-Schema-Version` (`1.x.y`)
- `X-Producer` (producing workload identity)
- `X-Traceparent` (W3C `traceparent`)
- `X-Mode` (`SIMULATED`, `SANDBOX`, or `CONFIRMED`)

Compatibility policy: additive optional minor fields (`1.x.y`) are permitted only when consumers ignore unknown additions; removing fields, narrowing enums, or changing semantics requires a new major subject (`livepilot.v2.*`).

## 7. Authorization and idempotency

- **Authorization:** Every inbound command is authenticated via private NATS mTLS/workload identity and authorized against server-resolved `tenant_id` and active `session_id` scope before business processing. Cross-tenant or inactive-session payloads fail closed (`TENANT_SCOPE_DENIED`, `SESSION_SCOPE_DENIED`, `TELEMETRY_SESSION_NOT_ACTIVE`).
- **Envelope validation:** Missing required headers, invalid W3C `traceparent`, unsupported `X-Schema-Version`, or schema violations reject fail-closed before persistence (`TELEMETRY_SIGNAL_INVALID`).
- **Idempotency & Deduplication:** `telemetry-service` enforces a unique deduplication index on `(tenant_id, session_id, signal_id)` and tracks `idempotency_key` + `payload_hash` in `telemetry_inbox`. Duplicate `signal_id` deliveries with matching fingerprint are idempotent no-ops returning the original receipt with zero second metric/outbox effect; mismatched fingerprints reject fail-closed with `IDEMPOTENCY_PAYLOAD_MISMATCH`.

## 8. Timeout, retry, DLQ, and replay semantics

- **Delivery & Ack:** JetStream at-least-once delivery with durable pull consumers. Consumers acknowledge (`Ack`) **only after** PostgreSQL transaction commit (aggregate + inbox + outbox).
- **Timeout & Retry:** Transient failures trigger up to **5 retries with bounded exponential backoff and jitter** using explicit negative acknowledgement (`Nak` with delay). Timeouts or unknown persistence outcomes remain deferred for reconciliation and are **never** reported as accepted (`ACTION_PENDING` / `ACTION_UNKNOWN`).
- **DLQ & Replay:** After 5 exhausted retries or upon non-retryable poison payload errors, the message is routed to `livepilot.v1.telemetry.signal.dlq` with `dlq_metadata` (`original_subject`, `attempts`, `failure_code`, `failure_detail`, `failed_at`, `replay_owner: telemetry-service`).
- **Replay owner:** `telemetry-service` owns DLQ replay. Replay is disabled by default, requires explicit operator capability authorization, generates a new `replay_id`, preserves original `correlation_id`/`causation_id`, and records an audit receipt.

## 9. Persistence owner and schema boundaries

- **Authoritative Persistence Owner:** `telemetry-service` owns PostgreSQL 16 schema and tables:
  - `telemetry_signals` (authoritative append-only signal records, composite key `(tenant_id, session_id, signal_id)`)
  - `telemetry_lineage` (source/correlation/causation and replay lineage records)
  - `telemetry_inbox` (idempotency & deduplication index keyed by `(tenant_id, session_id, signal_id)` and `idempotency_key`)
  - `telemetry_outbox` (transactional outbox committed atomically with `telemetry_signals`)
- **Tenant Isolation:** PostgreSQL Row-Level Security (RLS) isolates all queries and mutations by `tenant_id`.
- **Redaction & Audit:** Secrets, provider credentials, tokens, and unnecessary raw PII are redacted or hashed (`payload_hash`) prior to persistence, logging, and event emission. Audit lineage events are sent to `audit-service` without `telemetry-service` owning the audit ledger.

## 10. Error mapping (Public & Internal symbols)

All error symbols map deterministically to `docs/03-architecture/api/error-codes.yaml`:

| Condition | Error Code | Symbol | Exposure | Retry Policy | Resulting State / Behavior |
|---|---|---|---|---|---|
| Missing/invalid workload auth | `LP01001` / `LP01002` | `AUTHENTICATION_REQUIRED` / `AUTHENTICATION_INVALID` | `public` | `request_new_credential` | Reject before lookup |
| Tenant or session scope mismatch | `LP02001` / `LP02002` | `TENANT_SCOPE_DENIED` / `SESSION_SCOPE_DENIED` | `public` | `never` | Reject fail-closed; no existence disclosure |
| Inactive live session | `LP12001` | `TELEMETRY_SESSION_NOT_ACTIVE` | `internal` | `never` | Reject (`failed`); no downstream event |
| Invalid envelope, header, or schema | `LP03001` / `LP12002` | `REQUEST_INVALID` / `TELEMETRY_SIGNAL_INVALID` | `public` / `internal` | `never` | Reject (`failed`); route poison messages to DLQ |
| Unsupported `signal_type` | `LP12003` | `TELEMETRY_UNSUPPORTED_SIGNAL_TYPE` | `internal` | `never` | Reject (`failed`); no downstream event |
| Unsupported `X-Mode` | `LP05003` | `UNSUPPORTED_SESSION_MODE` | `public` | `never` | Reject fail-closed |
| Duplicate `signal_id` (same fingerprint) | `LP12004` | `TELEMETRY_DUPLICATE_SIGNAL` | `internal` | `never` | Idempotent no-op; return original receipt |
| Same idempotency key, different payload | `LP04002` / `LP04003` | `IDEMPOTENCY_KEY_CONFLICT` / `IDEMPOTENCY_PAYLOAD_MISMATCH` | `public` | `never` | Reject fail-closed; never overwrite |
| Transient DB/broker outage or timeout | `LP07001` / `LP07002` | `DEPENDENCY_UNAVAILABLE` / `DEPENDENCY_TIMEOUT` | `public` | `retry` / `reconcile` | Exponential backoff (max 5 retries) |
| Outcome unconfirmed / deferred | `LP08001` / `LP08002` | `ACTION_PENDING` / `ACTION_UNKNOWN` | `public` | `reconcile` | Defer for reconciliation; never report accepted |
| Retries exhausted / poison routed | `LP12005` | `TELEMETRY_DLQ_ROUTED` | `internal` | `reconcile` | Transition to `dead_lettered`; emit to DLQ |
| Unexpected internal failure | `LP09001` | `INTERNAL_ERROR` | `public` | `retry` | Bounded retry then DLQ |

## 11. Verification commands

Run all contract, traceability, and goal conformance gates:

```bash
node scripts/contract-check/error-code-registry.mjs \
  && node scripts/api/check-api-sot-traceability.mjs \
  && node scripts/architecture/check-sot.mjs \
  && node scripts/testing/check-tdd-traceability.mjs \
  && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-001.md
```

Release gates additionally require JSON Schema validation, duplicate-delivery idempotency, 5-retry exponential backoff, DLQ routing, ack-after-commit, and producer/consumer compatibility tests (implemented in `G-TELM-002` through `G-TELM-007`).
