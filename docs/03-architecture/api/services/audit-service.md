# audit-service Contract

Goal: `G-AUDI-001`. Contract only: defines authoritative service boundaries, NATS JetStream subjects, schema, state machine, persistence ownership, error mappings, and verification gates.

## 1. Contract identity and ownership

| Field | Value |
|---|---|
| Contract ID | `audit.receipt.livepilot.v1` |
| Status | `FROZEN` |
| Owner / authoritative writer | `audit-service` |
| Authority | Tenant/session-scoped append-only audit receipt ingestion, schema & hash validation, redaction verification, and immutable ledger persistence |
| Public exposure | None; internal versioned NATS JetStream subjects only |
| Requirements / flows | `REQ-LP-016`; `F01-SAFETY-003`, `F02-SAFETY-004`, `F04-6-FLOW-001`, `F04-6-FLOW-002`, `F04-6-FLOW-003`, `F04-6-FLOW-004`, `F04-6-FLOW-005` |
| Schema path | `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json` |
| Schema version | `1.0.0` |
| Schema SHA-256 | `44dc50b7f188a99fec869777aa66eb40d175ca43f2e8bbda101dfe813a0d2ae6` |
| Ordering key | `aggregate_id` |
| Source of truth | PostgreSQL 16 `audit_records` immutable table, `audit_inbox`, and transactional outbox |

## 2. Responsibility boundaries (Does NOT own)

`audit-service` is the single authoritative writer for immutable audit receipts, decision lineages, and ledger proof verification. It strictly **does NOT own**:
- Session lifecycle transitions (`session-service`)
- Telemetry signal ingestion or normalization (`telemetry-service`)
- Catalog product authority or fact approval (`catalog-service`)
- Host copilot recommendations or ranking (`jev-copilot-service`)
- Margin policy rules, evaluation, or verdicts (`margin-policy-service`)
- Stock reservations, commitments, or warehouse allocations (`inventory-service`)
- Promotion proposal or decision workflows (`promotion-service`)
- Human-in-the-loop approval verdicts or emergency pause state (`approval-control-service`)
- Consequential external marketplace mutations or adapter execution (`execution-service`)

`audit-service` never mutates business domain state, never reads another service's private database tables directly, and never exposes public HTTP routes directly without gateway authentication and role-based access control.

## 3. Aggregate and resource model

- **Aggregate / Resource:** `AuditRecord`
- **Identity:** Composite tenant-scoped key `(tenant_id, receipt_id)`
- **Aggregate Scope:** Bound to `aggregate_id` (e.g. `session_id`, `promotion_id`, `action_id`, `proposal_id`)
- **Receipt Results:** `accepted`, `rejected`, `failed`, `unknown`, `reconciled`
- **Immutability & Lineage:** Accepted audit receipts are strictly append-only and preserve `receipt_id`, `aggregate_id`, `actor_ref`, `result`, `policy_revision`, `evidence_ids`, `payload_hash`, `occurred_at` (UTC ISO-8601), `occurred_at_ms` (exact integer epoch milliseconds; zero floats), `correlation_id`, `causation_id`, `idempotency_key`, and `mode` (`SIMULATED` | `SANDBOX` | `CONFIRMED`).

## 4. State machine

`AuditRecord` progresses deterministically through the following states:

```text
received ──▶ validated ──▶ redacted ──▶ hashed ──▶ committed
   │             │             │           │
   └─────────────┴─────────────┴───────────┴──▶ dlq
```

| From state | Transition / Guard | To state | Failure / invariant |
|---|---|---|---|
| `received` | Schema, required headers, tenant scope, and envelope validated | `validated` | Invalid envelope/headers or missing mandatory fields transitions to `dlq` (fail closed; `LP13002 AUDIT_RECEIPT_INVALID`) |
| `validated` | PII and sensitive data patterns verified redacted in evidence references | `redacted` | Unredacted PII or sensitive secrets detected fails closed to `dlq` (`LP13002 AUDIT_RECEIPT_INVALID`) |
| `redacted` | Cryptographic SHA-256 digest computed and verified against payload fingerprint | `hashed` | Digest mismatch or corrupted hash fails closed to `dlq` (`LP13003 AUDIT_HASH_MISMATCH`) |
| `hashed` | Receipt committed atomically to `audit_records` + `audit_inbox` (or deduplicated as safe no-op) | `committed` | Duplicate receipt_id with matching hash is safe no-op; duplicate with mismatched payload fails (`LP13004 AUDIT_DUPLICATE_RECEIPT`); DB error triggers bounded retry (`LP13001 AUDIT_WRITE_FAILED`) |
| `received` / `validated` / `redacted` / `hashed` | Non-retryable validation error, schema violation, or 5 retry attempts exhausted | `dlq` | Routed to `livepilot.v1.audit.receipt.dlq` (`LP13005 AUDIT_DLQ_ROUTED`) with original envelope, attempt count, and failure reason |

Invalid or out-of-order state transitions fail closed (`IllegalStateTransitionError`). Terminal state `committed` is immutable and cannot be updated, deleted, or overwritten.

## 5. Commands, events, producers, and consumers

| Subject | Kind | Producers | Consumers | Delivery & Ordering |
|---|---|---|---|---|
| `livepilot.v1.audit.receipt.append` | command | All owning services (`session-service`, `telemetry-service`, `catalog-service`, `promotion-service`, `approval-control-service`, `execution-service`) | `audit-service` | JetStream at-least-once, durable pull consumer, ordered by `aggregate_id` |
| `livepilot.v1.audit.receipt.dlq` | dlq | `audit-service` | `audit-service` (operator replay worker) | Dead-letter stream preserving original envelope, attempt count, failure code, and lineage |

## 6. Envelope, required headers, and compatibility

Every message must conform to `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json` and carry required transport headers:
- `Nats-Msg-Id` (broker deduplication ID)
- `X-Correlation-Id` (end-to-end trace ID)
- `X-Causation-Id` (required for derived events/replies)
- `X-Idempotency-Key` (command idempotency key)
- `X-Tenant-Id` (server-derived tenant scope; never trusted from browser claims)
- `X-Session-Id` (live session scope, where applicable)
- `X-Schema-Version` (`1.x.y`)
- `X-Producer` (producing workload identity)
- `X-Traceparent` (W3C `traceparent`)
- `X-Mode` (`SIMULATED`, `SANDBOX`, or `CONFIRMED`)

Compatibility policy: additive optional minor fields (`1.x.y`) are permitted only when consumers ignore unknown additions; removing fields, narrowing enums, or changing semantics requires a new major subject (`livepilot.v2.*`).

## 7. Authorization and idempotency

- **Authorization:** Every inbound command is authenticated via private NATS mTLS/workload identity and authorized against server-resolved `tenant_id` scope before persistence. Cross-tenant or unauthorized payloads fail closed (`TENANT_SCOPE_DENIED`).
- **Envelope validation:** Missing required headers, invalid W3C `traceparent`, unsupported `X-Schema-Version`, or schema violations reject fail-closed before ledger write (`LP13002 AUDIT_RECEIPT_INVALID`).
- **Idempotency & Deduplication:** `audit-service` enforces a unique primary index on `(tenant_id, receipt_id)` and tracks `idempotency_key` + `payload_hash` in `audit_inbox`. Duplicate `receipt_id` deliveries with matching fingerprint are idempotent no-ops returning success with zero second ledger effect; mismatched fingerprints reject fail-closed with `LP13004 AUDIT_DUPLICATE_RECEIPT` / `LP04003 IDEMPOTENCY_PAYLOAD_MISMATCH`.

## 8. Timeout, retry, DLQ, and replay semantics

- **Delivery & Ack:** JetStream at-least-once delivery with durable pull consumers. Consumers acknowledge (`Ack`) **only after** PostgreSQL transaction commit (`audit_records` + `audit_inbox`).
- **Timeout & Retry:** Transient failures trigger up to **5 retries with bounded exponential backoff and jitter** using explicit negative acknowledgement (`Nak` with delay). Timeouts or unknown persistence outcomes remain deferred for reconciliation and are **never** reported as accepted (`ACTION_PENDING` / `ACTION_UNKNOWN`).
- **DLQ & Replay:** After 5 exhausted retries or upon non-retryable poison payload errors, the message is routed to `livepilot.v1.audit.receipt.dlq` with `dlq_metadata` (`original_subject`, `attempts`, `failure_code`, `failure_detail`, `failed_at`, `replay_owner: audit-service`).
- **Replay owner:** `audit-service` owns DLQ replay. Replay is disabled by default, requires explicit operator capability authorization, generates a new `replay_id`, preserves original `correlation_id`/`causation_id`, and records an audit receipt.

## 9. Persistence owner and schema boundaries

- **Authoritative Persistence Owner:** `audit-service` owns PostgreSQL 16 schema and tables:
  - `audit_records` (authoritative append-only immutable ledger, composite key `(tenant_id, receipt_id)`)
  - `audit_inbox` (consumer deduplication table, key `(tenant_id, idempotency_key)`)
  - `audit_outbox` (transactional outbox table for downstream projections, key `outbox_id`)
- **Row-Level Security (RLS):** All tables strictly enforce PostgreSQL 16 RLS by `tenant_id`.
- **Zero-Mutation Invariant:** The database role granted to `audit-service` application workers has `INSERT` and `SELECT` permissions only on `audit_records`; `UPDATE` and `DELETE` grants are strictly revoked at the database engine level.

## 10. Error mapping (LP13xxx)

| Code | Symbol | HTTP Status | Retry Policy | Detail |
|---|---|---|---|---|
| `LP13001` | `AUDIT_WRITE_FAILED` | 500 | `retry` | Failed to persist immutable audit receipt to PostgreSQL ledger or outbox. |
| `LP13002` | `AUDIT_RECEIPT_INVALID` | 400 | `never` | Audit receipt failed JSON schema validation, envelope headers check, or lineage requirements. |
| `LP13003` | `AUDIT_HASH_MISMATCH` | 409 | `never` | Computed payload digest does not match provided receipt payload hash or lineage checksum. |
| `LP13004` | `AUDIT_DUPLICATE_RECEIPT` | 409 | `never` | The receipt_id was already committed to the immutable audit ledger for this tenant. |
| `LP13005` | `AUDIT_DLQ_ROUTED` | 502 | `reconcile` | Audit receipt exhausted retry attempts or encountered non-retryable poison payload and was routed to DLQ. |

## 11. Verification commands

- **Error-code registry validation:**
  ```bash
  node scripts/contract-check/error-code-registry.mjs
  ```
- **API SOT traceability verification:**
  ```bash
  node scripts/api/check-api-sot-traceability.mjs
  ```
- **Architecture SOT hierarchy verification:**
  ```bash
  node scripts/architecture/check-sot.mjs
  ```
- **Goal template conformance:**
  ```bash
  node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-001.md
  ```
