# Invariants Formal Spec: G-EXEC-007: Reliability Invariants

1. **Pause Priority Invariant:**
   $\text{isPaused}(\text{sessionId}) \implies \text{assertExecutionPermitted}(\text{sessionId}) \text{ throws } \text{LP40003}$.
2. **Circuit Isolation Invariant:**
   $\text{state} = \text{OPEN} \implies \text{OutboundCalls} = 0 \land \text{assertAvailable}() \text{ throws } \text{LP07001}$.
3. **DLQ Completeness Invariant:**
   Unresolved unknown actions route to DLQ with original metadata, attempt counts, and lineage.
