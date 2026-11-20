---
name: soda-dave-motion-and-assets
version: "1.0.0"
description: >-
  DAVE Motion, Visual Asset, and Audio Verification Engine — evaluates spring physics
  curves, 60fps/120fps frame budgets, prefers-reduced-motion media query compliance,
  WebP/AVIF asset compression, and audio loudness (LUFS) standards.
  Triggers: dave verify-motion, dave verify-audio, dave verify-assets.
---

# DAVE Motion and Assets

This skill defines the operational procedure for verifying motion curves, assets, and audio feedback.

## Operational Steps

1. **Motion Curve Validation:** Validate cubic bezier and spring parameter definitions ($k, d, m$). Confirm transition durations $\le 400\text{ms}$.
2. **Reduced-Motion Fallbacks:** Assert that non-essential animations disable or reduce to opacity fades under `@media (prefers-reduced-motion: reduce)`.
3. **Asset Verification:** Verify intrinsic dimensions, responsive `srcset`, modern formats (WebP/AVIF), and licensing hashes.
4. **Audio Mastering:** Assert peak loudness between $-18\text{ LUFS}$ and $-24\text{ LUFS}$, sample rate at 48kHz, and silent fallbacks on system mute.
