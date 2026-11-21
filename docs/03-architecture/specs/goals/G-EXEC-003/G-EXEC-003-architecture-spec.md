# Architecture Spec: G-EXEC-003: Persistence Architecture

Execution persistence schema establishes PostgreSQL 16 schema `execution` containing:
1. `execution_actions`: aggregate root with composite primary key `(tenant_id, session_id, action_id)`, unique `(tenant_id, idempotency_key)`, optimistic lock version trigger, and fail-closed state tracking.
2. `execution_state_transitions`: append-only audit trail with `P0002` rejection trigger on updates/deletions.
3. `adapter_idempotency_records`: deduplication store with response payloads, error codes, and expiration timestamps.
4. `execution_outbox`: transactional outbox committed atomically with execution actions for reliable JetStream dispatch.
5. `execution_inbox`: transactional deduplication ledger.
6. Forced Row-Level Security (RLS) policies on all tables scoping data by `current_setting('app.tenant_id', true)`.
