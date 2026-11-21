# execution-service Contract

Goal: `G-EXEC-001`. Contract only: defines authoritative service boundaries, NATS JetStream subjects, schema, state machine, persistence ownership, error mappings, and verification gates for Execution & Platform Adapter Safety.

## 1. Contract identity and ownership

| Field | Value |
|---|---|
| Contract ID | `execution.action.livepilot.v1` |
| Status | `FROZEN` |
| Owner / authoritative writer | `execution-service` (Platform Adapter Safety) |
| Authority | Tenant/session-scoped durable action dispatch, adapter protocol isolation, timeout/retry policy, reconciliation, and adapter receipts |
| Public exposure | None; internal versioned NATS JetStream subjects and internal service mesh only |
| Requirements / flows | `REQ-LP-016`; `BR-F04-019`; `F03.1-FLOW-004`, `F03.1-FLOW-006`, `F03.1-FLOW-007`, `F03.2-FLOW-008`, `F04.5-FLOW-005` |
| Schema path | `docs/03-architecture/api/schemas/nats/execution-update.schema.json` |
| Schema version | `1.0.0` |
| Schema SHA-256 | `3fad6fbbc0a4d05350b7893427054378d19d5940efee6645f44ef646b3e51604` |
| Ordering key | `action_id` |
| Source of truth | PostgreSQL 16 `execution_actions` table and transactional outbox |

## 2. Responsibility boundaries (Does NOT own)

`execution-service` is the single authoritative writer for platform execution action state, adapter dispatch receipts, and external reconciliation. It strictly **does NOT own**:
- Margin calculation, floor policies, or discount economics (`margin-policy-service`)
- Stock reservations, allocation limits, or inventory commits (`inventory-service`)
- Approval decisions, approval modes, or emergency pause authority (`approval-control-service`)
- Append-only audit ledger or cryptographic evidence sealing (`audit-service`)
- Product facts, brand claims, or SKU definitions (`catalog-service`)
- Live session lifecycle or channel connection states (`session-service`)
- Host copilot recommendations or real-time HUD cues (`jev-copilot-service`)
- Raw signal observation or engagement telemetry (`telemetry-service`)

`execution-service` never reads another service's database tables and never exposes public HTTP routes directly.

## 3. Aggregate and resource model

- **Aggregate / Resource:** `ExecutionAction`
- **Identity:** Composite tenant/session-scoped key `(tenant_id, session_id, action_id)`
- **Aggregate Reference:** `aggregate_id` (e.g. `promotion_id`, `product_id`, `pin_id`)
- **Action types:** `pin_product`, `unpin_product`, `distribute_voucher`, `revoke_voucher`, `broadcast_announcement`
- **Immutability & Lineage:** Accepted execution actions preserve `action_id`, `aggregate_id`, `tenant_id`, `session_id`, `action_type`, `provider_ref`, `idempotency_key`, `payload_hash`, `status`, `mode` (`SIMULATED` | `SANDBOX` | `CONFIRMED`), `error_code`, `observed_at`, and ISO-8601 UTC timestamps.

## 4. State machine

`ExecutionAction` progresses deterministically through the following states:

```text
requested ──▶ accepted ──▶ pending ──▶ succeeded
    │            │            │
    │            │            ├──▶ failed
    │            │            │
    │            │            └──▶ unknown ──▶ reconciled ──▶ succeeded / failed
    ▼            ▼
  failed       failed
```

| From state | Transition / Guard | To state | Failure / invariant |
|---|---|---|---|
| `requested` | Schema, required headers, active session, and idempotency validated | `accepted` | Schema violation, unauthenticated workload, or invalid headers transitions to `failed` |
| `accepted` | Action committed to `execution_actions` and dispatched to adapter queue | `pending` | Adapter unreachable or rate-limited enters retry loop or transitions to `failed` |
| `pending` | Platform adapter confirms execution with verifiable observed receipt | `succeeded` | Adapter confirmed state committed atomically; outbox emits update event |
| `pending` | Platform adapter returns definitive fatal rejection | `failed` | Failure code recorded; outbox emits failure update event; no blind retry |
| `pending` | Adapter times out or network connection drops without confirmation | `unknown` | NEVER coerce to `succeeded`; must enter reconciliation worker loop |
| `unknown` | Active reconciliation worker probes platform state or processes webhook | `reconciled` | Final observed platform state determines terminal transition (`succeeded` or `failed`) |

Invalid or out-of-order state transitions fail closed (`IllegalStateTransitionError`). Terminal failure states never silently coerce into `succeeded`.

## 5. Commands, events, producers, and consumers

| Subject | Kind | Producers | Consumers | Delivery & Ordering |
|---|---|---|---|---|
| `livepilot.v1.execution.action.updated` | event | `execution-service` | `promotion-service`, `inventory-service`, `audit-service`, `portal-bff` | JetStream at-least-once, published only after durable PostgreSQL commit |
| `livepilot.v1.execution.action.dlq` | dlq | `execution-service` | `execution-service` (operator replay worker) | Dead-letter stream preserving original envelope, attempts, reason, and lineage |

## 6. Envelope, required headers, and compatibility

Every message must conform to `docs/03-architecture/api/schemas/nats/execution-update.schema.json` and carry required transport headers:
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

- **Authorization:** Inbound commands must be authenticated via private NATS mTLS workload identity and authorized against server-resolved `tenant_id` and active `session_id` scope.
- **Idempotency & Deduplication:** `execution-service` enforces a unique deduplication constraint on `(tenant_id, session_id, action_id)` and records `idempotency_key` + `payload_hash` in `execution_inbox`. Duplicate executions with identical fingerprints return the existing execution action receipt with zero secondary side effects; conflicting payloads reject fail-closed (`IDEMPOTENCY_PAYLOAD_MISMATCH`).

## 8. Timeout, retry, DLQ, and replay semantics

- **Delivery & Ack:** JetStream at-least-once delivery with durable pull consumers. Consumers acknowledge (`Ack`) only after PostgreSQL transaction commit (aggregate + outbox).
- **Timeout & Retry:** Transient adapter connectivity errors trigger bounded exponential backoff retries (maximum 3 retries). Operations exceeding deadline transition to `unknown`, never success.
- **DLQ & Replay:** Messages exhausting retry budgets or encountering poison payloads route to `livepilot.v1.execution.action.dlq` with failure metadata.
- **Replay owner:** `execution-service` owns DLQ replay. Replay requires operator authorization, generates a new `replay_id`, preserves lineage, and records an audit receipt.

## 9. Persistence owner and schema boundaries

- **Authoritative Persistence Owner:** `execution-service` owns PostgreSQL 16 schema and tables:
  - `execution_actions` (authoritative append-only action records, composite key `(tenant_id, session_id, action_id)`)
  - `execution_lineage` (source/correlation/causation and provider receipt lineage)
  - `execution_inbox` (idempotency & deduplication index keyed by `(tenant_id, session_id, action_id)` and `idempotency_key`)
  - `execution_outbox` (transactional outbox committed atomically with `execution_actions`)
- **Tenant Isolation:** PostgreSQL Row-Level Security (RLS) isolates all queries and mutations by `tenant_id`.
- **Redaction & Audit:** Platform credentials, API tokens, and provider secrets are strictly isolated behind adapters and never stored or logged in execution tables.

## 10. Error mapping (Public & Internal symbols)

All error symbols map deterministically to `docs/03-architecture/api/error-codes.yaml`:

| Condition | Error Code | Symbol | Exposure | Retry Policy | Resulting State / Behavior |
|---|---|---|---|---|---|
| Missing/invalid workload auth | `LP01001` / `LP01002` | `AUTHENTICATION_REQUIRED` / `AUTHENTICATION_INVALID` | `public` | `request_new_credential` | Reject before processing |
| Tenant or session scope mismatch | `LP02001` / `LP02002` | `TENANT_SCOPE_DENIED` / `SESSION_SCOPE_DENIED` | `public` | `never` | Reject fail-closed |
| Invalid payload or schema failure | `LP03001` | `REQUEST_INVALID` | `public` | `never` | Reject (`failed`); route poison messages to DLQ |
| Idempotency payload mismatch | `LP04003` | `IDEMPOTENCY_PAYLOAD_MISMATCH` | `public` | `never` | Reject fail-closed; never overwrite |
| Concurrency or version conflict | `LP04001` | `RESOURCE_VERSION_CONFLICT` | `public` | `never` | Reject fail-closed |
| Policy or emergency pause active | `LP05001` | `POLICY_REJECTED` | `public` | `never` | Reject fail-closed; block dispatch |
| Adapter rate limit reached | `LP06001` | `RATE_LIMITED` | `public` | `retry_after` | Exponential backoff with jitter |
| Adapter unavailable | `LP07001` | `DEPENDENCY_UNAVAILABLE` | `public` | `retry` | Bounded retry (max 3) |
| Adapter timeout | `LP07002` | `DEPENDENCY_TIMEOUT` | `public` | `reconcile` | Transition to `unknown`; trigger reconciliation |
| Channel not ready | `LP07003` | `CHANNEL_NOT_READY` | `public` | `retry` | Hold action until channel ready |
| Execution pending observation | `LP08001` | `ACTION_PENDING` | `public` | `reconcile` | Awaiting adapter confirmation |
| Execution outcome unknown | `LP08002` | `ACTION_UNKNOWN` | `public` | `reconcile` | Defer for active reconciliation |
| Internal server error | `LP09001` | `INTERNAL_ERROR` | `public` | `retry` | Bounded retry then DLQ |

## 11. Verification commands

Run all contract, traceability, and goal conformance gates:

```bash
node scripts/contract-check/error-code-registry.mjs \
  && node scripts/api/check-api-sot-traceability.mjs \
  && node scripts/architecture/check-sot.mjs \
  && node scripts/testing/check-tdd-traceability.mjs \
  && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-EXEC-001.md
```
