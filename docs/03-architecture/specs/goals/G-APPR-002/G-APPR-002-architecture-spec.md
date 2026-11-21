# G-APPR-002 Architecture Specification: PostgreSQL Persistence, Migrations, and RLS

## 1. Domain & Persistence Boundary
The `approval-control-service` is the sole authoritative writer for:
- `approval.approval_requests`
- `approval.approval_decisions`
- `approval.approval_modes`
- `approval.emergency_pauses`
- `approval.approval_outbox`

## 2. Invariants & Guarantees
1. **Multi-Tenant Isolation**: Row-Level Security (RLS) is enabled and forced (`FORCE ROW LEVEL SECURITY`) on all tables with restrictive policies checking `tenant_id = current_setting('app.tenant_id', true)`.
2. **Optimistic Locking**: `approval_requests` uses an explicit version counter (`version BIGINT NOT NULL DEFAULT 1`) guarded by a BEFORE UPDATE trigger `approval.enforce_approval_request_optimistic_lock()`.
3. **Decision History Immutability**: `approval_decisions` is an append-only audit trail protected by `approval.reject_approval_decision_mutation()`.
4. **Foreign Key Integrity**: `approval_decisions` references `approval_requests` composite key `(tenant_id, session_id, approval_request_id)` with `ON DELETE RESTRICT`.
5. **Zero-Float Timestamps**: All temporal fields (`deadline_at_ms`, `created_at_ms`, `updated_at_ms`, `decided_at_ms`, `triggered_at_ms`, `processed_at_ms`) are exact 64-bit integer milliseconds (`BIGINT`).
6. **Transactional Outbox**: Events emitted to NATS JetStream are atomically staged in `approval.approval_outbox` within the same database transaction.
