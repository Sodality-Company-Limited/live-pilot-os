---
name: soda-git-sanity-guard
description: Pre-commit and pre-push branch sanitation, touch map boundary verification, and clean working tree checks. Use to prevent out-of-scope diffs, dirty scratch files, or unauthorized branch pushes.
version: 1.0.0
triggers:
  - git sanity
  - touch map check
  - pre-push check
  - clean tree
  - branch guard
---

# soda-git-sanity-guard

Pre-commit and pre-push branch sanitation and touch map verification driver inspired by `pstack`'s `commit` and `push` rituals.

## Quick reference

```javascript
import { validateTouchMapCompliance, checkWorkingTreeSanity } from 'scripts/lib/git-sanity-guard.mjs';

// Verify staged changes against active goal touch map
const compliance = validateTouchMapCompliance({
  stagedFiles: ['scripts/lib/app.mjs'],
  touchMap: ['scripts/lib/app.mjs', 'tests/lib/app.test.mjs'],
  failClosed: true,
});

// Check branch status and upstream alignment
const sanity = checkWorkingTreeSanity({
  branchName: 'feature/G-CORE-030',
  porcelainStatus: '',
  isRebasedOnUpstream: true,
});
```

## Invariants

1. **INV-030-001 (boundedness):** Commits are strictly rejected fail-closed if any staged file falls outside the declared touch map.
2. **INV-030-002 (determinism):** Verification passes cleanly if and only if git status is clean and HEAD is cleanly aligned with its upstream target.
