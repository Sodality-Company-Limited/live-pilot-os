# G-CORE-037: Formal Invariants & Mathematical Proof Specification

- Goal: G-CORE-037 (Implement soda-reflection-engine skill and blindspot scanner)

## Invariant Formalizations
1. **Determinism Invariant (INV-037-001):** Evaluating diff string $D$ against rule catalog $R$ produces identical risk score $S$ and finding list $F$: $f(D, R) \equiv f(D, R)$ across all executions.
2. **Completeness Invariant (INV-037-002):** For every declared high-risk pattern $p \in R$, if $p$ occurs in diff $D$, then $\exists \text{finding} \in F$ such that $\text{finding.ruleId} = p.\text{id}$ (zero false negatives on exact pattern matches).
3. **Score Boundedness Invariant:** Computed risk scores are bounded integers between 0 and 100 inclusive ($0 \le S \le 100$).
