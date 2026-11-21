# Invariants Formal Spec: G-EXEC-005: Transactional Invariants

1. **Atomicity Invariant:**
   $\text{Commit}(\text{ActionUpdate}) \iff \text{Commit}(\text{AuditTransition}) \iff \text{Commit}(\text{OutboxEvent})$.
2. **Version Monotonicity Invariant:**
   $\forall a \in \text{ExecutionActions}, v_{new} = v_{old} + 1$.
3. **Outbox Drain Ordering Invariant:**
   Messages are fetched and published in strict FIFO sequence based on `created_at ASC`.
