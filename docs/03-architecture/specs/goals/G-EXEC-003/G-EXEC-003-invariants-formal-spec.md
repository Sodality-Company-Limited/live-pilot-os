# Invariants Formal Spec: G-EXEC-003: Persistence Invariants

1. **Tenant Isolation Invariant:**
   All tables enable and force RLS using restrictive policies checking `tenant_id = current_setting('app.tenant_id', true)`.
2. **Optimistic Locking Invariant:**
   Updates to `execution.execution_actions` fail closed with SQLSTATE `P0001` if `NEW.version <> OLD.version + 1`.
3. **Audit Immutability Invariant:**
   Updates or deletions on `execution.execution_state_transitions` fail closed with SQLSTATE `P0002`.
4. **Outbox Atomicity Invariant:**
   Every mutating state change must be committed in the same database transaction as the corresponding `execution_outbox` event.
