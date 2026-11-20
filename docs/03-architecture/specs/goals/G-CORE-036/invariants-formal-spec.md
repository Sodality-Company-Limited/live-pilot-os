# G-CORE-036: Formal Invariants & Mathematical Proof Specification

- Goal: G-CORE-036 (Implement soda-multiphase-planner skill and DAG plan compiler)

## Invariant Formalizations
1. **DAG Acyclicity Invariant (INV-036-001):** The phase dependency graph $G = (V, E)$ must contain zero directed cycles ($\forall v \in V, v \not\to^+ v$). Any cycle detection triggers immediate compilation rejection.
2. **Touch Map Disjointness Invariant (INV-036-002):** For any two phases $P_i, P_j$ eligible for parallel execution in the same wave ($i \neq j$), their declared touch map write sets are mutually disjoint: $W(P_i) \cap W(P_j) = \emptyset$.
3. **Topological Order Invariant:** If phase $P_a$ depends on $P_b$, then the assigned topological execution order satisfies $\text{ord}(P_b) < \text{ord}(P_a)$.
