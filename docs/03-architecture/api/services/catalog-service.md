# catalog-service contract

Goal: G-CORE-073, G-CATA-001. Contract only: no persistence, runtime handlers, UI,
or external synchronization.

## Ownership and registration

| Field | Value |
|---|---|
| Owner / single authoritative writer | `catalog-service` |
| Authority | Tenant-scoped brand-approved products, SKUs, variants, approved claims, localized labels, integer minor-unit prices, and catalog versions |
| Authoritative persistence | PostgreSQL Catalog tables + transactional outbox (`data-persistence-contract-sot.md`); Redis/projections are reconstructable only |
| Public exposure | None; Core BFF and internal services use versioned NATS request/reply and JetStream events |
| Contract ID | `catalog.product-read.livepilot.v1` |
| Subjects | Query/reply: `livepilot.v1.catalog.product.read.request` → `livepilot.v1.catalog.product.read.reply`; Event: `livepilot.v1.catalog.product.updated` (DLQ: `livepilot.v1.catalog.product.updated.dlq`) |
| Requirements / flows | `REQ-LP-004`, `REQ-LP-005`, `REQ-LP-007`, `REQ-LP-016`; `F01.1-FLOW-004`, `F01.1-FLOW-005`, `F01.1-FLOW-008`, `F02.2-FLOW-001`, `F02.2-FLOW-005`, `F02.2-FLOW-006`, `F03-FLOW-002`, `F03-FLOW-003` |
| Registry | `docs/03-architecture/contracts/flows/coverage.yaml` |
| Schema | `docs/03-architecture/api/schemas/catalog-product-read.schema.json` (`1.0.0`, SHA-256 `aefa37483a6af22841a749df4d035cbdbec2d5ef3620f2359ea8b324ea3485d5`) |

Producer: `catalog-service`. Consumers: `core-bff`, `jev-copilot-service`,
`intent-risk-service`, `margin-policy-service`, `inventory-service`,
`promotion-service`, `decision-engine-service`, and `audit-service`. Other services
never write Catalog tables, never read Catalog tables directly, and never infer or
invent a product, SKU, or claim from another service or AI output.

## Explicit non-ownership

`catalog-service` owns brand-approved catalog definitions only. It does **not** own
or mutate:

- **Inventory:** stock reservations, commits, releases, or authoritative warehouse stock projections (`inventory-service`).
- **Margin:** COGS, margin floors, or margin policy verdicts (`margin-policy-service`).
- **Promotion:** promotion proposals, voucher eligibility, or campaign lifecycle (`promotion-service`).
- **Order:** checkout completion, order state, or purchase-interest projections (`telemetry-service` / `purchase-projection` / commerce adapters).
- **Execution:** platform action dispatch, simulated or external marketplace adapters, or action reconciliation (`execution-adapter-safety-service`).
- **Approval, session, telemetry, or audit ledger:** owned respectively by `approval-control-service`, `session-service`, `telemetry-service`, and `audit-service`.

## Query, reply, and update events

Query/reply subjects are `livepilot.v1.catalog.product.read.request` →
`livepilot.v1.catalog.product.read.reply` (ordering key `tenant_id:product_id|sku`),
using schema `1.0.0` in `docs/03-architecture/api/schemas/catalog-product-read.schema.json`.
The request selects one `product_id` or `sku`, and may include `catalog_version`,
`as_of`, and a freshness requirement. The server resolves tenant and session scope;
caller-supplied tenant or browser claims are never authority.

The deterministic reply contains `product_id`, `sku`, `name`, `size`,
`selling_points`, `usage`, `price_minor` (integer minor units), `currency` (ISO 4217),
`stock_display`, `catalog_version`, `fact_revision`, `as_of`, `freshness_expires_at`,
`freshness_state`, `status`, `approved_claims`, `evidence_ids`, and `mode`. A query may
return `resolved`, `ambiguous`, or `unresolved`; an empty or inaccessible result
never discloses whether another tenant's item exists.

Committed revisions publish `livepilot.v1.catalog.product.updated` (ordering key
`tenant_id:product_id`) only after the owning PostgreSQL aggregate and transactional
outbox commit atomically.

## Monotonic revisions, lifecycle, and freshness

The authoritative lifecycle is `draft → approved → stale|withdrawn` (mapping to
`domain-resource-state-sot.md` `active`, `unavailable`, and `archived` via
`publish` / `unpublish` / `archive`). In `catalog-product-read.schema.json`,
published read/update payloads emit `status` in `approved | stale | withdrawn`.

Revisions (`catalog_version` and `fact_revision >= 1`) are strictly monotonic;
corrections append a new revision and never mutate prior revisions in place.

| Freshness state | Meaning | Permitted usage |
|---|---|---|
| `fresh` | `approved` fact within `freshness_expires_at` (`as_of`) | Actionable for grounding, policy evaluation, and commerce preconditions |
| `stale` | Freshness window exceeded or fact superseded/unpublished | Display and reconciliation only; **never actionable** for promotions, copilot guidance, or execution |
| `unknown` | No trustworthy observation exists (including timeout/unreconciled states) | Non-actionable; must **not** be silently replaced by a prior version or fallback |

`withdrawn` is terminal for that revision. Every reply preserves `catalog_version`,
`fact_revision`, `as_of`, `freshness_expires_at`, and `freshness_state` (`fresh`,
`stale`, `unknown`). Any `catalog_version` change invalidates dependent guidance
and requires re-resolution before action.

## Envelope, delivery, authorization, and DLQ/replay

Every NATS message uses the canonical envelope and required headers:

- **Envelope fields:** `message_id`, `message_kind`, `subject`, `schema_version` (`1.0.0`),
  `occurred_at` (UTC instant), `producer` (`catalog-service`), `tenant_id`, optional
  `session_id`, `aggregate_type`, `aggregate_id`, `correlation_id`, optional
  `causation_id`, `deadline_at`, `mode` (`SIMULATED`, `SANDBOX`, `CONFIRMED`), and `data`.
- **Required headers:** `Nats-Msg-Id`, `X-Correlation-Id`, `X-Tenant-Id`,
  `X-Schema-Version`, `X-Producer`, and `X-Traceparent`. Derived requests require
  `X-Causation-Id`; session-scoped requests carry `X-Session-Id`; revision mutations
  require `X-Idempotency-Key`; simulated/sandbox/confirmed paths require `X-Mode`.
  Missing scope, lineage, or schema headers fail closed.

Delivery and reliability semantics:

- **Query/reply (`livepilot.v1.catalog.product.read.request` / `.reply`):** bounded
  deadline, no DLQ, no replayable stream. Identical `message_id` requests deduplicate
  deterministically and return the same reply. A timeout is **not** success and is
  never blindly retried; the caller must treat the result as `unknown` and reconcile.
- **Update event (`livepilot.v1.catalog.product.updated`):** JetStream at-least-once
  ordered by `tenant_id:product_id`, 7-day / 10 GiB retention, 5 retries with bounded
  exponential backoff, then `livepilot.v1.catalog.product.updated.dlq`. Consumers
  acknowledge only after durable processing and deduplicate by `message_id`.
- **Authorization, redaction, and replay:** The server validates service/actor
  identity and tenant/session membership on every request; raw credentials and
  unnecessary PII are redacted before persistence or events. DLQ replay is disabled by
  default; only an operator with Catalog-owner and audit capability may authorize
  bounded tenant-scoped replay, preserving original lineage and recording a replay
  audit receipt via `audit-service`.

## Explicit refusal and ProblemDetails error boundary

Replies map failures to canonical `ProblemDetails` fields and registry entries in
`docs/03-architecture/api/error-codes.yaml` (`code`, `symbol`, `http_status`, `type`,
`message_key`, `retry_policy`), plus `correlation_id` and redacted `detail`:

| Condition | Code (`symbol`) | HTTP | Type / `message_key` | Retry policy & result |
|---|---|---|---|---|
| Missing/invalid identity | `LP01001` (`AUTHENTICATION_REQUIRED`) | 401 | `urn:livepilot:problem:authentication-required` / `errors.authentication.required` | `request_new_credential`; reject before lookup |
| Tenant scope failure | `LP02001` (`TENANT_SCOPE_DENIED`) | 403 | `urn:livepilot:problem:tenant-scope-denied` / `errors.scope.tenantDenied` | `never`; no existence disclosure |
| Session scope failure | `LP02002` (`SESSION_SCOPE_DENIED`) | 403 | `urn:livepilot:problem:session-scope-denied` / `errors.scope.sessionDenied` | `never`; no existence disclosure |
| Invalid selector or schema | `LP03001` (`REQUEST_INVALID`) | 400 | `urn:livepilot:problem:request-invalid` / `errors.validation.requestInvalid` | `never`; caller correction required |
| Product/SKU not found | `LP10001` (`RESOURCE_NOT_FOUND`) | 404 | `urn:livepilot:problem:resource-not-found` / `errors.resource.notFound` | `never`; explicit refusal, no invention |
| Fact not approved / withdrawn | `LP11001` (`CATALOG_FACT_NOT_APPROVED`) | 422 | `urn:livepilot:problem:catalog-fact-not-approved` / `errors.catalog.factNotApproved` | `never`; terminal refusal, no substitute |
| Ambiguous selector match | `LP11004` (`AMBIGUOUS_ENTITY`) | 422 | `urn:livepilot:problem:ambiguous-catalog-entity` / `errors.catalog.ambiguousEntity` | `never`; caller must disambiguate |
| Freshness window exceeded | `LP11002` (`CATALOG_FACT_STALE`) | 409 | `urn:livepilot:problem:catalog-fact-stale` / `errors.catalog.factStale` | `reconcile`; non-actionable stale result |
| Catalog version mismatch | `LP11005` (`CATALOG_VERSION_MISMATCH`) | 409 | `urn:livepilot:problem:catalog-version-mismatch` / `errors.catalog.versionMismatch` | `never`; re-resolve against authoritative version |
| Optimistic revision conflict | `LP04001` (`RESOURCE_VERSION_CONFLICT`) | 409 | `urn:livepilot:problem:resource-version-conflict` / `errors.conflict.version` | `never`; re-read current revision |
| Idempotency payload mismatch | `LP04003` (`IDEMPOTENCY_PAYLOAD_MISMATCH`) | 409 | `urn:livepilot:problem:idempotency-payload-mismatch` / `errors.conflict.idempotencyPayloadMismatch` | `never`; reuse key only with identical canonical payload |
| Emergency pause active | `LP05004` (`EMERGENCY_PAUSE_ACTIVE`) | 422 | `urn:livepilot:problem:emergency-pause-active` / `errors.policy.emergencyPauseActive` | `never`; mutation/replay blocked fail-closed while paused |
| No trustworthy observation | `LP08002` (`ACTION_UNKNOWN`) | 202 | `urn:livepilot:problem:action-unknown` / `errors.action.unknown` | `reconcile`; unresolved, reconcile before use |
| Catalog service/store unavailable | `LP11003` (`CATALOG_UNAVAILABLE`) | 503 | `urn:livepilot:problem:catalog-unavailable` / `errors.catalog.unavailable` | `retry`; preserve correlation lineage |
| Downstream dependency unavailable | `LP07001` (`DEPENDENCY_UNAVAILABLE`) | 503 | `urn:livepilot:problem:dependency-unavailable` / `errors.dependency.unavailable` | `retry`; preserve correlation lineage |
| Request/dependency timeout | `LP07002` (`DEPENDENCY_TIMEOUT`) | 504 | `urn:livepilot:problem:dependency-timeout` / `errors.dependency.timeout` | `reconcile`; timeout is not success |

Clients branch on `code` / `symbol`, never human text. A refusal is terminal for
the current request: the service emits no substitute product, stale fact, or
inferred approval. `unknown` and timeout are non-success outcomes requiring
reconciliation; only a new authorized request against a newer fact revision may
transition to `resolved`.

## Canonical SOT references and verification

- Governing SOTs: [overview.md](../../overview.md), [identity-tenancy-authorization-sot.md](../identity-tenancy-authorization-sot.md), [domain-resource-state-sot.md](../domain-resource-state-sot.md), [error-problem-details-sot.md](../error-problem-details-sot.md), [error-codes.yaml](../error-codes.yaml), [idempotency-mutation-sot.md](../idempotency-mutation-sot.md), [nats-subject-catalog-sot.md](../nats-subject-catalog-sot.md), [data-persistence-contract-sot.md](../data-persistence-contract-sot.md), [api-operation-catalog-sot.md](../api-operation-catalog-sot.md), and [testing-sot.md](../../testing-sot.md).
- Reproducible contract gates:
  - `node scripts/architecture/check-sot.mjs`
  - `node scripts/api/check-api-sot-traceability.mjs`
  - `node scripts/contract-check/error-code-registry.mjs`
- Contract verification must additionally validate JSON Schema conformance,
  envelope/header requirements, tenant isolation, monotonic revisions and
  freshness states, duplicate delivery, additive compatibility,
  ambiguous/unresolved/refusal handling, DLQ/replay authorization, timeout, and
  unknown-result behavior.
