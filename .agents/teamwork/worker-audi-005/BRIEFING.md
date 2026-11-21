# Worker Briefing: G-AUDI-005 Ingestion Vertical Slice

## Objective
Implement the full vertical slice for audit receipt ingestion:
1. `code/services/audit-service/src/infrastructure/audit-record.repository.ts`:
   - Persistence repository managing `audit.audit_records`, `audit.audit_inbox`, and `audit.audit_outbox`
   - Sequential SHA-256 hash chaining: retrieves latest `record_hash` for tenant, calculates `current_hash = sha256(prev_hash + receipt_id + result + policy_revision + payload)`, and atomically increments `sequence_num`
   - Atomic transaction with inbox deduplication on `(tenant_id, message_id)` and idempotency key
2. `code/services/audit-service/src/application/audit-append.service.ts`:
   - Orchestrates schema validation, envelope headers verification, inbox idempotency check, domain FSM transitions, sensitive data redaction, hash computation, and repository commit
   - Publishes outbox fact `livepilot.v1.audit.receipt.recorded`
3. Integration test suite under `code/services/audit-service/test/integration/`:
   - `audit-append.service.spec.ts`: Test end-to-end receipt append, duplicate command idempotency, hash chain continuity, redaction verification, and transaction rollback on error
4. Update `package.json` with `"scripts": { ..., "test:integration": "node --test test/integration/*.spec.ts" }`
5. Author `docs/03-architecture/specs/goals/G-AUDI-005/design.md` satisfying Invariant 13.
6. Update `docs/07-backlog/goals/G-AUDI-005.md` to `status: done`, steps and criteria `[x]`, phase `SHIP`.
