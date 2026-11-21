---
name: soda-model-pairing-router
description: Algorithmic task complexity scoring and model tier allocation (flash_lite, flash, pro) with exact BigInt micro-currency cost accounting and high-risk safety overrides. Use when dispatching subagents or optimizing LLM token spend.
version: 1.0.0
triggers:
  - model pairing
  - route model
  - allocate model
  - complexity score
  - token finops
---

# soda-model-pairing-router

Algorithmic task complexity scoring and model tier allocation (`flash_lite`, `flash`, `pro`) with exact BigInt micro-currency cost accounting and high-risk safety overrides inspired by `pstack`'s `poteto-mode`.

## Quick reference

```javascript
import { allocateModelTier, calculateTokenCostMicro, MODEL_TIERS } from 'scripts/lib/model-pairing-router.mjs';

// Determine optimal tier
const allocation = allocateModelTier({
  task: {
    diffLines: 25,
    fileCount: 2,
    cyclomaticDepth: 3,
  },
  goalRiskLevel: 'low',
});
// allocation.tier -> 'flash_lite' | 'flash' | 'pro'

// Calculate exact BigInt micro-cost
const costMicro = calculateTokenCostMicro({
  tier: allocation.tier,
  inputTokens: 1500n,
  outputTokens: 500n,
});
```

## Invariants

1. **INV-028-001 (finite-value):** All token costs, rates, and budgets use exact integer BigInt arithmetic without IEEE 754 floats.
2. **INV-028-002 (determinism):** High-risk goals strictly allocate to the pro tier regardless of minimal diff size.

## Tier Allocation Matrix

| Tier | Complexity Score | Target Workload | Cost Ratio (vs Pro) |
|---|---|---|---|
| `flash_lite` | $\le 35$ (low risk only) | Mechanical doc updates, small single-line bug fixes, AST pattern checks | ~6% |
| `flash` | $36 \dots 120$ | Routine feature coding, unit test implementation, standard PR babysitting | ~12% |
| `pro` | $> 120$ or high/critical risk | Architectural refactoring, cryptographic proofs, high-risk security gates | 100% |
