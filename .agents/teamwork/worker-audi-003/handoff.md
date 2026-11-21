# Handoff: G-AUDI-003

- **Status:** COMPLETE
- **Goal ID:** G-AUDI-003
- **Role:** Implementer (Systems & Database Architect)
- **Touch Map Compliance:** Strict adherence to declared touch map (`code/services/audit-service/`, `docs/03-architecture/specs/goals/G-AUDI-003/`, `docs/07-backlog/goals/G-AUDI-003.md`).
- **Verification Results:** PASS
  - `node code/services/audit-service/scripts/verify-migrations.mjs`: PASSED (all schemas, invariants, composite keys, regex constraints, and RLS policies verified).
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-003.md`: PASSED (100% 51/51 sections and invariants verified).

## Deliverables
1. `code/services/audit-service/package.json`: NPM package configuration (`@livepilot/audit-service`, ES module).
2. `code/services/audit-service/migrations/001_create_audit_ledger.up.sql`:
   - Isolated schema `CREATE SCHEMA IF NOT EXISTS audit;`.
   - `audit.audit_records` with strict string length constraints, regex validation on hashes (`^[a-f0-9]{64}$`), sequence ordering, composite primary key `(tenant_id, receipt_id)`, unique sequence `(tenant_id, sequence_num)`, and unique hash `(tenant_id, record_hash)`.
   - `audit.audit_inbox` with consumer deduplication on `(tenant_id, message_id)` and unique `idempotency_key`.
   - `audit.audit_outbox` for reliable event dispatch.
   - Row-Level Security (RLS) enabled and forced on all tables with tenant isolation policies.
3. `code/services/audit-service/migrations/001_create_audit_ledger.down.sql`: Complete reverse teardown dropping all policies, tables, and schemas via CASCADE.
4. `code/services/audit-service/scripts/verify-migrations.mjs`: Verification harness testing SQL syntax, tables, constraints, RLS policies, and idempotency.
5. `docs/03-architecture/specs/goals/G-AUDI-003/design.md`: 6-section pre-execution architectural design specification satisfying Invariant 13.
6. `docs/07-backlog/goals/G-AUDI-003.md`: Updated to status `done`, phase `SHIP`, with all acceptance criteria and checklist items marked `[x]`.
