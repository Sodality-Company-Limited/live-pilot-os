# G-CORE-040: Formal Invariants & Mathematical Proof Specification

- Goal: G-CORE-040 (Implement soda-visual-parity-guard skill and perceptual diff verification engine)

## Invariant Formalizations
1. **Pixel Diff Invariant (INV-040-001):** Perceptual pixel mismatch ratio $\delta$ is strictly bounded in $[0, 10000]$ basis points, and any mismatch exceeding tolerance $\tau$ fails closed.
2. **Determinism Invariant (INV-040-002):** Perceptual diff computation across identical image buffers produces an exact zero delta: $\text{Diff}(A, A) \equiv 0$.
3. **Fail-Closed Safety Invariant:** Any image dimension mismatch or corrupt PNG header fails the verification gate immediately without proceeding.
