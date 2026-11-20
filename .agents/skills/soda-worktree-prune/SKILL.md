---
name: soda-worktree-prune
description: Safely inspects, unmounts, and garbage-collects inactive subagent Git worktrees with fail-closed dirty worktree preservation.
---

# Soda Worktree Prune Skill

## Purpose
Governs autonomous subagent Git worktree lifecycle management. Automatically discovers stale, merged, or detached worktrees under `.worktrees/`, unmounts them cleanly via `git worktree remove`, and cleans up orphaned git lock files while strictly protecting worktrees that contain uncommitted edits or active process locks.

## When to Use
- After completing autonomous swarming sessions or multi-agent worktree execution.
- Periodic garbage collection during long-running overnight runs to prevent disk bloat.
- Cleaning up stale worktrees after subagent crashes or process cancellations.

## Commands & Workflows
```bash
# Evaluate and prune stale worktrees safely
node -e "
  import { evaluateWorktreePrunability, executeWorktreePrune } from './scripts/lib/worktree-prune-driver.mjs';
  // Inspect and prune
  const summary = executeWorktreePrune({ worktrees: [] });
  console.log(summary);
"
```

## Invariants & Rules
1. **Zero Mocks (Article I):** Interacts with real git worktrees and real filesystem status.
2. **Safety Invariant (INV-034-001):** Active worktrees with uncommitted changes (`isDirty`), active process locks, or unmerged branches are NEVER pruned.
3. **Idempotency (INV-034-002):** Pruning an already clean worktree environment produces zero side effects and zero errors.
4. **Strict Containment:** Refuses to prune any directory outside `.worktrees/` or declared worktree prefixes.
