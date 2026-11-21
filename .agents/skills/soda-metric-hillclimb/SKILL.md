---
name: soda-metric-hillclimb
description: Scientific hypothesis-driven performance optimization, benchmark delta verification, and automated commit/revert mechanics.
version: 1.0.0
author: Soda OS Core Architecture
date: 2026-10-18
---

# Metric Hillclimbing (`soda-metric-hillclimb`)

## Purpose
Enables autonomous agents to perform disciplined, scientific performance optimization loops. Every optimization cycle establishes a statistical baseline, introduces an isolated code mutation, measures candidate distributions, and accepts commits only when statistically significant improvements ($\ge 5.00\%$) are demonstrated, reverting immediately upon regression.

## Collaboration Phase
`PLAN` → `EXECUTE` → `REVIEW`

## Invariants
1. **Strict Monotonic Progress:** Commits must demonstrate $\ge 5\%$ improvement with zero functional regressions.
2. **Zero-Float Precision:** Metrics, sample moments, and basis points compute via exact `BigInt` micro-units.
3. **Automatic Compensation:** Regressions or below-threshold improvements trigger automatic `git reset --hard HEAD` and clean workspace restoration.

## Usage

```javascript
import { calculateSampleStats, evaluateHillclimbDelta, formatHillclimbReport } from 'scripts/lib/metric-hillclimb-runner.mjs';

// 1. Measure baseline samples (e.g. latency in microseconds)
const baseline = [1020n, 1010n, 995n, 1005n, 1000n];

// 2. Apply code mutation and measure candidate samples
const candidate = [905n, 895n, 910n, 900n, 898n];

// 3. Evaluate delta
const evaluation = evaluateHillclimbDelta({
  baseline,
  candidate,
  direction: 'lower_is_better',
  minImprovementBasisPoints: 500 // 5.00%
});

// 4. Act on decision
if (evaluation.accepted) {
  console.log('✅ Optimization verified: Commit candidate.');
} else {
  console.log('❌ Optimization rejected: Rollback candidate.');
}
```
