# Invariants Formal Spec: G-EXEC-001
- Action IDs and Aggregate IDs are non-empty strings.
- Timestamps are exact ISO-8601 UTC dates.
- Monetary calculations adhere to Zero-Float integer minor units (Article V).
- Platform adapter responses adhere to strict isolation and anti-corruption principles.
- Unknown outcomes fail closed and require explicit observed-state reconciliation before completion.
