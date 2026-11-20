---
name: soda-visual-parity-guard
version: "1.0.0"
description: Perceptual pixel diff engine and visual regression guard. Compares baseline and candidate pixel buffers, computes exact integer basis-point mismatch ratios, and enforces strict tolerance bounds.
---

# soda-visual-parity-guard

The **soda-visual-parity-guard** skill provides deterministic, pixel-level visual regression verification. It eliminates subjective visual assertions by computing mathematical mismatch basis points (0 to 10,000 bp) with zero floating-point arithmetic.

## When to Use
- When auditing UI components, dashboards, or responsive layouts for unexpected styling shifts.
- During CI visual regression checks comparing candidate screenshots against approved baselines.
- When verifying zero Cumulative Layout Shift (CLS) in frontend rendering pipelines.

## Operational Interface
The driver lives in `scripts/lib/visual-parity-guard.mjs`:
```javascript
import {
  comparePixelBuffers,
  validateVisualParity,
  formatVisualParityReport
} from './scripts/lib/visual-parity-guard.mjs';

const result = validateVisualParity(bufferA, bufferB, 1920, 1080, {
  toleranceBasisPoints: 50 // 0.50% allowed deviation
});

if (!result.passed) {
  console.error(formatVisualParityReport(result.diff, 50));
  throw new Error(result.reason);
}
```

## Guarantees
- **Zero-Float Math:** Ratios calculated via exact integer basis points $\lfloor \frac{\text{mismatched} \times 10000}{\text{total}} \rfloor$.
- **Symmetry:** $\text{Diff}(A, B) \equiv \text{Diff}(B, A)$.
- **Fail-Closed:** Any dimension mismatch immediately halts without comparison.
