# G-CORE-040 Finite State Machine Matrix & Runtime Transitions

**Goal:** [G-CORE-040](../../../../07-backlog/goals/G-CORE-040.md)  
**Title:** Implement soda-visual-parity-guard skill and perceptual diff engine  
**Status:** ready  
**Framework:** Soda OS  

---

## 🔄 State Machine & Invariants
- **Transition System:** $(\mathcal{S}, \Sigma, \delta, s_0)$
- **Legal States:** `draft` $\to$ `planned` $\to$ `ready` $\to$ `in_progress` $\to$ `review` $\to$ `approved` $\to$ `done`
- **Saga Compensation / Rollbacks:** Unhandled exceptions or invariant breaches trigger immediate fail-closed state abort and working tree rollback.
