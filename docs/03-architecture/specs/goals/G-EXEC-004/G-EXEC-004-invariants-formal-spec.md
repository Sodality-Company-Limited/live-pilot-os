# Invariants Formal Spec: G-EXEC-004: Schema Invariants

1. **Schema Integrity Invariant:**
   $\text{SHA256}(\text{execution-update.schema.json}) \equiv \text{3fad6fbbc0a4d05350b7893427054378d19d5940efee6645f44ef646b3e51604}$.
2. **Additional Properties Invariant:**
   `additionalProperties: false` is strictly enforced to prevent silent schema drift.
3. **Ordering Key Invariant:**
   Messages published to `livepilot.v1.execution.action.updated` are ordered strictly by `action_id`.
