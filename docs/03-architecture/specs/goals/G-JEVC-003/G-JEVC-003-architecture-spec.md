# G-JEVC-003 — Architecture Specification

Goal ID: `G-JEVC-003`  
Scope: JEV/Copilot PostgreSQL Persistence Boundary, Table Schema, Outbox Partitioning, and Connection Management  
Status: `APPROVED`

---

## 1. Context and Architectural Drivers

The `jev-copilot-service` requires a durable, multi-tenant PostgreSQL persistence boundary for storing `jev_suggestions`, auditable `jev_provider_receipts`, transactional event queues in `jev_outbox`, and distributed deduplication records in `jev_idempotency`.

### Primary Invariants:
- **Tenant Isolation:** Enforced at the engine level via PostgreSQL Row Level Security (RLS) using `current_setting('app.tenant_id', true)`.
- **Atomic Transactional Outbox:** Suggestion aggregate state transitions and corresponding outbox messages are committed in the exact same physical database transaction, eliminating dual-write hazards.
- **Optimistic Concurrency Control:** Enforces monotonic version increments (`aggregate_version = expected_version + 1`) to detect and reject concurrent mutation races (`RESOURCE_VERSION_CONFLICT`).
- **Distributed Idempotency & Replay Protection:** Commands specify `idempotency_key` and SHA-256 `semantic_fingerprint`. Key reuse with differing fingerprints is rejected fail-closed (`IDEMPOTENCY_PAYLOAD_MISMATCH`, LP04003).

---

## 2. Table Topology & RLS Policies

1. **`jev.jev_suggestions`:**
   - Primary key: `(tenant_id, suggestion_id)`.
   - Fields: `suggestion_id`, `tenant_id`, `live_session_id`, `suggestion_type`, `status`, `content_payload`, `evidence_refs`, `confidence_basis_points`, `freshness_expires_at`, `aggregate_version`, `created_at`, `updated_at`.
   - Index: `idx_jev_suggestions_session_status`, `idx_jev_suggestions_expiry`.
   - RLS: `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
2. **`jev.jev_provider_receipts`:**
   - Primary key: `(tenant_id, receipt_id)`.
   - Foreign key: `(tenant_id, suggestion_id)` references `jev.jev_suggestions(tenant_id, suggestion_id)`.
   - Zero-Float Money: `cost_minor` (bigint), `cost_currency` (USD), `cost_scale` (6).
   - RLS: `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
3. **`jev.jev_outbox`:**
   - Primary key: `(tenant_id, outbox_id)`.
   - Fields: `outbox_id`, `tenant_id`, `live_session_id`, `event_type`, `subject`, `payload`, `headers`, `status`, `retry_count`, `occurred_at`, `created_at`, `published_at`.
   - Index: `idx_jev_outbox_pending`, `idx_jev_outbox_session`.
   - RLS: `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
4. **`jev.jev_idempotency`:**
   - Primary key: `(tenant_id, idempotency_key)`.
   - Fields: `idempotency_key`, `tenant_id`, `live_session_id`, `semantic_fingerprint`, `response_payload`, `status`, `created_at`, `expires_at`.
   - Index: `idx_jev_idempotency_expiry`.
   - RLS: `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.

---

## 3. Repositories & Connection Management

- `JevPersistenceConnection`: Wraps PostgreSQL connection pool, executing transactions with `SET LOCAL app.tenant_id = $tenantId`.
- `SuggestionRepository`: Provides atomic `createSuggestionWithOutbox`, `updateSuggestionStatusWithOutbox` with optimistic concurrency, and query finders.
- `OutboxRepository`: Manages `fetchPending`, `markPublished`, and bounded retry increments with DLQ routing.
- `IdempotencyStore`: Enforces atomic `acquire` and `complete` operations with payload conflict detection.
