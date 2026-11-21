# Invariants Formal Spec: G-EXEC-006: Dispatch Invariants

1. **Idempotent Single-Execution Invariant:**
   $\forall c, \text{Dispatch}(c) \land \text{IsDuplicate}(c) \implies \Delta(\text{ExternalState}) = 0$.
2. **Adapter Isolation Invariant:**
   External provider details and credentials never leak into domain events or PostgreSQL entities.
3. **Fail-Closed Timeout Invariant:**
   When an adapter connection drops or exceeds deadline, terminal state is `unknown` with error code `LP07002`.
