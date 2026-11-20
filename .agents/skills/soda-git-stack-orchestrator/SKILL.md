---
name: soda-git-stack-orchestrator
description: Multi-branch stacked PR planner and rebase cascade coordinator. Plans topological rebase orderings, detects circular dependencies in branch chains, and enforces safe stack traversal.
---

# soda-git-stack-orchestrator

The **soda-git-stack-orchestrator** skill plans, validates, and coordinates multi-branch Git stacks. It prevents branch drift, detects dependency cycles, and ensures orderly rebasing when features build hierarchically upon preceding branches.

## When to Use
- When planning multi-branch feature chains or stacked PR dependencies.
- During cross-feature refactors spanning multiple sequential branches.
- When validating stack acyclicity and parent-child commit continuity.

## Operational Interface
The driver lives in `scripts/lib/git-stack-orchestrator.mjs`:
```javascript
import {
  buildStackPlan,
  validateStackAncestry,
  formatStackReport,
  detectStackCycles
} from './scripts/lib/git-stack-orchestrator.mjs';

const branches = [
  { name: 'feature/G-CORE-040', parent: 'feature/G-CORE-039' },
  { name: 'feature/G-CORE-039', parent: 'feature/G-CORE-038' }
];

const plan = buildStackPlan(branches, 'develop');
console.log(formatStackReport(branches, 'develop'));
```

## Guarantees
- **Topological Monotonicity:** Parents are always rebased before children.
- **Cycle Safety:** Acyclicity verification halts before modifying Git HEAD.
- **Idempotency:** Re-executing planning on unchanged stacks produces identical outputs.
