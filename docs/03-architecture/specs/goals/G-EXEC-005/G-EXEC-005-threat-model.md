# Threat Model: G-EXEC-005: Infrastructure Isolation

1. **Partial State Failure (Dual-Write Desync):**
   - *Mitigation:* Transactional outbox pattern commits database state and event stage in single SQL transaction.
2. **Concurrent State Overwrite:**
   - *Mitigation:* `assertOptimisticLockVersion` and SQL `WHERE version = expectedVersion`.
3. **Outbox Message Loss / Duplication:**
   - *Mitigation:* Mark dispatched only upon confirmed transport ack; downstream consumers enforce idempotency via `idempotency_key`.
