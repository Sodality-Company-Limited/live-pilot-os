# G-CORE-035: Formal Invariants & Mathematical Proof Specification

- Goal: G-CORE-035 (Implement soda-autopilot-runner skill and autonomous fleet supervisor)

## Invariant Formalizations
1. **Loop Boundedness Invariant (INV-035-001):** For any execution session with maximum iteration limit $N \in \mathbb{N}$, the actual number of iterations $i$ satisfies $0 \le i \le N$, guaranteeing strict loop termination.
2. **Queue Monotonicity Invariant (INV-035-002):** If goal $G$ transitions to `done`, the number of remaining eligible active goals in queue $Q$ strictly decreases: $|Q_{t+1}| \le |Q_t|$.
3. **Fail-Closed Safety Invariant:** If any executed step returns a non-zero exit code or fails assertions, the autopilot loop aborts immediately without attempting subsequent goals.
