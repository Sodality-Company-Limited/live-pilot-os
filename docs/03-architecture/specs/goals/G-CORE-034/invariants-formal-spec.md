# G-CORE-034: Formal Invariants & Mathematical Proof Specification

- Goal: G-CORE-034 (Implement soda-worktree-prune skill and fleet garbage collection driver)

## Invariant Formalizations
1. **Safety Preservation Invariant (INV-034-001):** For any worktree $W$ where $\text{isDirty}(W) = \text{true}$ or $\text{hasActiveLock}(W) = \text{true}$, $W \notin \text{PrunedSets}$, guaranteeing fail-closed preservation of work-in-progress.
2. **Prune Idempotency Invariant (INV-034-002):** Executing prune on a system state $S$ twice produces an identical file system state without duplicate deletion attempts ($\text{prune}(\text{prune}(S)) \equiv \text{prune}(S)$).
3. **Prefix Containment Invariant:** Worktree candidate paths must strictly begin with the authorized worktree prefix path (`.worktrees/`).
