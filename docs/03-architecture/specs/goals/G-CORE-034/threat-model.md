# G-CORE-034: Threat Modeling & Defensive Boundaries Specification

- Goal: G-CORE-034 (Implement soda-worktree-prune skill and fleet garbage collection driver)

## STRIDE Threat Analysis
- **Tampering / Destructive Loss:** Prevented by fail-closed dirty status checks (`git status --porcelain`) verifying zero uncommitted changes prior to deletion.
- **Elevation of Privilege:** Constrained to subprocess invocations on directories strictly within `.worktrees/`.
- **Denial of Service (DoS):** Mitigated by pruning orphaned git index locks and removing dangling detached branches.
