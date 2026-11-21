# Worker Briefing: G-AUDI-003 Persistence Schema & Hash Chaining

## Objective
Implement PostgreSQL 16 persistence migrations for `audit-service`:
1. Scaffold `code/services/audit-service/package.json` and directory structure.
2. Create `code/services/audit-service/migrations/001_create_audit_ledger.up.sql`:
   - Schema `audit`
   - `audit.audit_records` (`receipt_id`, `tenant_id`, `session_id`, `aggregate_id`, `actor_ref`, `result`, `policy_revision`, `evidence_ids`, `record_hash`, `prev_record_hash`, `sequence_num`, `occurred_at_ms`, `created_at`) with composite primary key `(tenant_id, receipt_id)`, unique constraint on `(tenant_id, sequence_num)`, and SHA-256 hash chaining.
   - `audit.audit_inbox` for deduplicating incoming commands on `(tenant_id, message_id)`.
   - `audit.audit_outbox` for publishing facts atomically.
   - Enable Row-Level Security (RLS) on all tables with tenant isolation.
3. Create `code/services/audit-service/migrations/001_create_audit_ledger.down.sql` cleanly reverting all schema changes in reverse order.
4. Implement `code/services/audit-service/scripts/verify-migrations.mjs` verifying SQL syntax, RLS, indexes, and idempotency.
5. Author `docs/03-architecture/specs/goals/G-AUDI-003/design.md` satisfying Invariant 13.
6. Update `docs/07-backlog/goals/G-AUDI-003.md` to `status: done`, steps and criteria `[x]`, phase `SHIP`.
