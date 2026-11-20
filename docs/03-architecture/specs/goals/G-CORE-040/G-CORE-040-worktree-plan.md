# G-CORE-040 Subagent Swarm & Git Worktree Coordination Plan

**Goal:** [G-CORE-040](../../../../07-backlog/goals/G-CORE-040.md)  
**Title:** Implement soda-visual-parity-guard skill and perceptual diff engine  
**Status:** ready  
**Framework:** Soda OS  

---

## 🌳 Worktree Isolation & Disjoint Touch Map Theorem
- **Worktree Path:** `.worktrees/G-CORE-040-{role}`
- **Disjoint Touch Map Invariant:** $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- **Barrier Join Protocol:** Fast-forward merge `git merge --ff-only` with automated post-merge worktree pruning.
