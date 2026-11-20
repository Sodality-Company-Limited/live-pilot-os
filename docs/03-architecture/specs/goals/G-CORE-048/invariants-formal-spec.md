# G-CORE-048: Formal Invariants & Mathematical Proof Specification

- Goal: G-CORE-048 (Implement soda-ast-type-invariants skill and type contract linter)

## Invariant Formalizations
1. **Zero Any Prohibition (INV-048-001):** Public APIs, exported functions, and internal models MUST NOT contain explicit or inferred `any`: $\forall t \in \text{Types}(P), t \neq \text{any}$.
2. **Discriminating Union Invariant (INV-048-002):** Union variants for multi-state domain entities MUST define a distinct literal discriminant field ensuring compile-time exhaustiveness: $\forall U = \bigcup V_i, \exists d: V_i.d \neq V_j.d \ (i \neq j)$.
3. **Explicit Return Signatures:** Exported function declarations MUST declare an explicit return type contract.
