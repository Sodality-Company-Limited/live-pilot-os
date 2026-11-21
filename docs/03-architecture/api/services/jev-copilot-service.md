# jev-copilot-service contract

Goal: G-JEVC-001. Microservice boundary, domain aggregates, state machines, commands, events, persistence, security, and verification discipline.

## 1. Ownership & Registration

| Field | Value |
|---|---|
| Service Name | `jev-copilot-service` |
| Bounded Context | JEV Agent Runtime & Session-Scoped Host Co-Pilot Assistance |
| Authoritative Writer For | `Suggestion`, `ProviderReceipt`, suggestion delivery, decisions, and evidence references |
| Non-Ownership Boundary | Does **NOT** own or mutate `Voucher`, `Promotion`, `MarginPolicy`, `InventoryReservation`, `OperatorApproval`, `LiveSession`, `CatalogProduct`, `PlatformAdapterExecution`, or the append-only `AuditLedger` |
| Public Exposure | **None**; internal event-driven microservice communicating via private, authenticated NATS JetStream and request/reply |
| Contract ID | `jev.copilot.livepilot.v1` |
| Requirements & Flows | `REQ-LP-008`, `REQ-LP-012`, `REQ-LP-015`; `F01-INT-001`, `F02-SAFETY-003`, `F02.1-FLOW-001`, `F02.1-FLOW-003` |
| SOT Registry Link | `docs/03-architecture/contracts/flows/coverage.yaml` |

Consumers: `core-bff`, `session-service`, `approval-control-service`, `promotion-service`, `audit-service`. JEV may propose; deterministic domain services decide and execute.

## 2. Inbound & Outbound Boundary Matrix

- **Inbound Driven Signals & Events:**
  - `livepilot.v1.telemetry.signal.detected` (from `telemetry-service` / `intent-risk-service`): Normalized stream telemetry signals and audience intent.
  - `livepilot.v1.session.lifecycle.changed` (from `session-service`): Session status updates (`active`, `paused`, `ended`).
  - `livepilot.v1.control.pause.request` (from control-plane): Emergency pause commands.
  - `livepilot.v1.catalog.product.read.reply` (from `catalog-service`): Verified catalog facts and claims.
- **Outbound Published Events & Commands:**
  - `livepilot.v1.copilot.suggestion.created` (event): Published when a suggestion is grounded and delivered to the session.
  - `livepilot.v1.copilot.suggestion.withdrawn` (event): Published when a suggestion is retracted or invalidated.
  - `livepilot.v1.copilot.delivery.degraded` (event): Published when provider outage or uncertainty forces degraded HUD mode.
  - `livepilot.v1.audit.receipt.append` (command to `audit-service`): Cryptographic audit receipts for all model invocations, suggestions, and decisions.

## 3. Aggregate Root & Entity Definitions

### 3.1. Suggestion Aggregate
- `suggestion_id`: UUIDv4 stable identifier.
- `tenant_id`: UUIDv4 tenant isolation scope.
- `live_session_id`: UUIDv4 session boundary.
- `suggestion_type`: `ALERT`, `HOST_CUE`, `PROMOTION_PROPOSAL`, `PRODUCT_FEATURE`.
- `status`: Lifecycle state (`proposed`, `grounded`, `delivered`, `used`, `edited`, `dismissed`, `expired`, `withdrawn`).
- `content_payload`: Typed structured payload (e.g. proposed promotion details, host cue script, warning text).
- `evidence_refs`: Array of evidence hashes (`signal_ids`, `catalog_version`, `fact_revision`, `policy_revision`).
- `confidence_score`: Fixed-point representation (`scale: 4`, range `0` to `10000` integer basis points).
- `freshness_expires_at`: UTC timestamp after which the suggestion expires.
- `version`: Monotonic aggregate version for optimistic locking.
- `created_at` / `updated_at`: UTC ISO-8601 timestamps.

### 3.2. ProviderReceipt Entity
- `receipt_id`: UUIDv4 receipt identifier.
- `suggestion_id`: Foreign key reference to `Suggestion` (nullable if deferred/refused before suggestion creation).
- `tenant_id` / `live_session_id`: Tenant and session scope.
- `provider_name`: Model provider (e.g. `anthropic`, `openai`, `vertex-ai`, `local-simulated`).
- `model_version`: Exact model snapshot identifier.
- `prompt_template_id` & `prompt_revision`: SHA-256 digest of system prompt and context template.
- `outcome`: Provider execution outcome (`accepted`, `deferred`, `refused`, `timeout`, `unknown`, `conflict`).
- `token_usage`: Exact integer counts (`input_tokens`, `output_tokens`, `cached_tokens`).
- `latency_ms`: Execution latency in milliseconds integer.
- `cost_minor`: Minor-unit token cost accounting (`amount_minor`, `currency: USD`, `scale: 6`).
- `raw_input_digest`: SHA-256 hash of redacted context payload (never raw PII or raw provider tokens).
- `raw_output_digest`: SHA-256 hash of raw model response.
- `created_at`: UTC ISO-8601 timestamp.

## 4. Lifecycle & Finite State Machine (FSM)

A suggestion follows a strict, deterministic state transition graph:

```text
       [ proposed ] ──(grounding check passes)──► [ grounded ] ──(outbox delivered)──► [ delivered ]
            │                                                                                   │
            ├──(stale / unverified / low confidence)                                            ├──► [ used ] (host acted on suggestion)
            │                                                                                   ├──► [ edited ] (host modified suggestion)
            ▼                                                                                   ├──► [ dismissed ] (host explicitly rejected)
       [ withdrawn ] ◄──────────────────────────────────────────────────────────────────────────┼──► [ expired ] (freshness SLA exceeded)
                                                                                                └──► [ withdrawn ] (emergency pause / manual retraction)
```

### Transition Invariants:
1. `proposed → grounded`: Requires all referenced catalog facts to be verified `fresh`, confidence $\ge$ policy threshold, and no active emergency pause.
2. `grounded → delivered`: Occurs atomically when the suggestion event is published via JetStream outbox.
3. `delivered → used | edited | dismissed`: Terminal state transitions driven by host interaction via Core BFF.
4. `delivered → expired`: Automatic deterministic transition when current wall-clock time $>$ `freshness_expires_at`.
5. `delivered → withdrawn`: Immediate transition if an emergency pause is signaled or an underlying catalog fact revision changes.
6. **Provider Outcomes:** `accepted`, `deferred`, `refused`, `timeout`, `unknown`, or `conflict`. No non-success outcome (`deferred`, `refused`, `timeout`, `unknown`, `conflict`) can ever produce a `grounded` or `delivered` suggestion.

## 5. Commands and API Operations

All commands are tenant-scoped, session-scoped, signed/authenticated, and idempotent:

| Command | Subject | Message Kind | Payload / Params | Result / Emitted Fact |
|---|---|---|---|---|
| `suggestion.create` | `livepilot.v1.copilot.suggestion.create` | command | `tenant_id`, `live_session_id`, `signal_ids`, `context_digest`, `idempotency_key` | Evaluates model, creates aggregate, emits `copilot.suggestion.created` |
| `suggestion.withdraw` | `livepilot.v1.copilot.suggestion.withdraw` | command | `tenant_id`, `live_session_id`, `suggestion_id`, `reason_code` | Retracts suggestion, emits `copilot.suggestion.withdrawn` |
| `suggestion.expire` | `livepilot.v1.copilot.suggestion.expire` | command | `tenant_id`, `live_session_id`, `suggestion_id`, `observed_at` | Marks expired, updates projection |
| `suggestion.decision.record` | `livepilot.v1.copilot.suggestion.decision` | command | `tenant_id`, `live_session_id`, `suggestion_id`, `decision: used\|edited\|dismissed` | Records final host action, emits audit receipt command |

## 6. NATS JetStream Contracts & Subject Catalog

Registered subjects comply strictly with `docs/03-architecture/api/nats-subject-catalog-sot.md`:

| Subject | Kind | Producer → Consumer | Ordering Key | Retry / DLQ Policy |
|---|---|---|---|---|
| `livepilot.v1.copilot.suggestion.created` | event | `jev-copilot-service` → `core-bff`, `session-service`, `audit-service` | `live_session_id:suggestion_id` | JetStream at-least-once, 5 retries → `livepilot.v1.copilot.suggestion.dlq` |
| `livepilot.v1.copilot.suggestion.withdrawn` | event | `jev-copilot-service` → `core-bff`, `portal-bff`, `audit-service` | `live_session_id:suggestion_id` | 5 retries → `livepilot.v1.copilot.suggestion.dlq` |
| `livepilot.v1.copilot.delivery.degraded` | event | `jev-copilot-service` → `core-bff`, `portal-bff` | `live_session_id` | 3 retries → `livepilot.v1.copilot.delivery.dlq` |
| `livepilot.v1.audit.receipt.append` | command | `jev-copilot-service` → `audit-service` | `suggestion_id` | 5 retries → `livepilot.v1.audit.receipt.dlq` (no silent drop) |

### Canonical Transport Headers
- `Nats-Msg-Id`: Deduplication key (`tenant_id:session_id:suggestion_id:version`).
- `X-Correlation-Id`: Distributed W3C trace ID propagated across all hops.
- `X-Causation-Id`: ID of the triggering signal or user command.
- `X-Tenant-Id`: Authenticated workspace tenant UUID.
- `X-Session-Id`: Active live session UUID.
- `X-Schema-Version`: Semantic schema version (e.g. `1.0.0`).
- `X-Producer`: `jev-copilot-service`.
- `X-Traceparent`: W3C traceparent context.
- `X-Mode`: `CONFIRMED`, `SIMULATED`, or `SANDBOX`.

## 7. Persistence Schema & Outbox Discipline

PostgreSQL relational storage enforces strict integrity and multi-tenant isolation:

```sql
-- Suggestions Aggregate Table
CREATE TABLE jev_suggestions (
    suggestion_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    live_session_id UUID NOT NULL,
    suggestion_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    content_payload JSONB NOT NULL,
    evidence_refs JSONB NOT NULL,
    confidence_basis_points INT NOT NULL CHECK (confidence_basis_points BETWEEN 0 AND 10000),
    freshness_expires_at TIMESTAMPTZ NOT NULL,
    aggregate_version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_jev_suggestion_tenant UNIQUE (tenant_id, suggestion_id)
);

CREATE INDEX idx_jev_suggestions_session_status ON jev_suggestions (tenant_id, live_session_id, status);
CREATE INDEX idx_jev_suggestions_expiry ON jev_suggestions (status, freshness_expires_at) WHERE status = 'delivered';

-- Provider Receipts Table
CREATE TABLE jev_provider_receipts (
    receipt_id UUID PRIMARY KEY,
    suggestion_id UUID REFERENCES jev_suggestions(suggestion_id),
    tenant_id UUID NOT NULL,
    live_session_id UUID NOT NULL,
    provider_name VARCHAR(64) NOT NULL,
    model_version VARCHAR(128) NOT NULL,
    prompt_template_id VARCHAR(64) NOT NULL,
    prompt_revision VARCHAR(64) NOT NULL,
    outcome VARCHAR(32) NOT NULL,
    input_tokens INT NOT NULL,
    output_tokens INT NOT NULL,
    cached_tokens INT NOT NULL,
    latency_ms INT NOT NULL,
    cost_minor BIGINT NOT NULL,
    cost_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    cost_scale INT NOT NULL DEFAULT 6,
    raw_input_digest VARCHAR(64) NOT NULL,
    raw_output_digest VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactional Outbox Table
CREATE TABLE jev_outbox (
    outbox_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    live_session_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    headers JSONB NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ
);
```

### Atomic Commit & Transactional Invariant:
State mutation on `jev_suggestions` and the corresponding outbox record in `jev_outbox` MUST commit in the same physical database transaction. Outbox dispatch to NATS JetStream is asynchronous; consumers ACK only after durable persistence.

## 8. Reliability, Timeouts, and DLQ Replay

1. **Inference Latency SLA:** Default provider timeout is bounded at 2500ms. If the provider exceeds deadline, the outcome transitions to `timeout`, and the request degrades gracefully.
2. **Idempotency Guarantees:** Command deduplication via unique constraint on `(tenant_id, idempotency_key)` in `jev_idempotency_records`. Replayed requests with identical semantic fingerprint return the cached response without re-invoking inference.
3. **Dead Letter Queue (DLQ):** Non-retryable errors or poison messages that exceed 5 retries are routed to `livepilot.v1.copilot.suggestion.dlq` carrying the original payload, failure stack, retry count, and tenant scope.
4. **Replay Authorization:** Replay from DLQ requires operator privilege (`ops.admin` role) and generates a new `replay_id` and audit receipt.

## 9. Error Mapping & LPxxxxx Taxonomy

All errors conform to RFC 7807 ProblemDetails and the canonical registry in `docs/03-architecture/api/error-codes.yaml`:

| Condition | Registry Symbol | HTTP / Code | Retry Policy | Remediation / System Behavior |
|---|---|---|---|---|
| Missing / invalid authentication | `AUTHENTICATION_REQUIRED` | LP01001 (401) | `request_new_credential` | Reject command at gateway |
| Unauthorized tenant access | `TENANT_SCOPE_DENIED` | LP02001 (403) | `never` | Reject without disclosing tenant resource existence |
| Unauthorized session boundary | `SESSION_SCOPE_DENIED` | LP02002 (403) | `never` | Reject request outside current session scope |
| Malformed command envelope | `REQUEST_INVALID` | LP03001 (400) | `never` | Schema validation error; caller must fix payload |
| Stale aggregate version | `RESOURCE_VERSION_CONFLICT` | LP04001 (409) | `never` | Optimistic locking collision; re-read state |
| Idempotency payload mismatch | `IDEMPOTENCY_PAYLOAD_MISMATCH` | LP04003 (409) | `never` | Same key with differing parameters rejected |
| Underlying catalog fact unapproved | `CATALOG_FACT_NOT_APPROVED` | LP11001 (422) | `never` | Grounding check fails; suggestion withheld |
| Underlying catalog fact stale | `CATALOG_FACT_STALE` | LP11002 (409) | `reconcile` | Stale catalog fact cannot ground suggestion |
| Provider unreachable or 5xx | `DEPENDENCY_UNAVAILABLE` | LP07001 (503) | `retry` | Fail closed; publish degraded HUD event |
| Provider invocation deadline exceeded | `DEPENDENCY_TIMEOUT` | LP07002 (504) | `reconcile` | Record `timeout` receipt; degrade gracefully |
| Provider returns malformed / ambiguous output | `ACTION_UNKNOWN` | LP08002 (202) | `reconcile` | Outcome recorded as `unknown`; no suggestion delivered |

## 10. Security, PII Redaction & Confidentiality

1. **Strict Context Redaction:** Before assembling prompt context for external or local LLM providers, all customer PII (names, phone numbers, addresses, credit cards), internal platform auth tokens, and vendor COGS (cost of goods sold) are cryptographically redacted or stripped.
2. **Digest Conservation:** Only SHA-256 digests (`raw_input_digest`, `raw_output_digest`) are retained long-term in `jev_provider_receipts`. Raw conversation logs and raw LLM completions are never retained in persistent transactional storage.
3. **Emergency Pause Fail-Closed:** Receipt of `livepilot.v1.control.pause.request` immediately flips the in-memory runtime circuit breaker to `PAUSED`. All pending `suggestion.create` commands are rejected fail-closed; running suggestions are transitioned to `withdrawn`.

## 11. Verification and Traceability Evidence

Execution and validation requirements:
- Conformance validation via `scripts/contract-check/error-code-registry.mjs`
- API traceability verification via `scripts/api/check-api-sot-traceability.mjs`
- SOT hierarchy and detailed flow validation via `scripts/architecture/check-sot.mjs`
- TDD traceability verification via `scripts/testing/check-tdd-traceability.mjs`
- All unit, integration, and property invariant tests under `tests/` pass with zero stubs and zero mocks.
