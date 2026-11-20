---
description: DAVE motion and asset evidence — animation timing, frame budgets, asset provenance, and audio contracts
alwaysApply: true
---

# DAVE Motion, Asset, and Audio Evidence Contract

This rule defines the mandatory engineering standards and evidence requirements for animations, graphic assets, and audio feedback across Soda OS applications.

---

## 1. Motion & Animation Standards

1. **Duration & Easing:** All transitions MUST declare explicit durations ($t \le 400\text{ms}$) and cubic bezier or spring curves. Linear easing on interface transitions is forbidden.
2. **Frame-Rate Budget:** Animations MUST maintain a steady 60fps (or 120fps on ProMotion displays) without triggering layout thrashing or long tasks ($> 50\text{ms}$) on the main thread.
3. **Prefers-Reduced-Motion Invariant:**
   $$\text{prefers-reduced-motion: reduce} \implies (\text{Duration} = 0 \lor \text{Transform} = \text{OpacityOnly})$$
   Components MUST respect system accessibility settings by disabling non-essential motion.

---

## 2. Visual Asset Standards

1. **Resolution & Crop:** Raster assets MUST provide exact intrinsic dimensions and responsive `srcset` variants (1x, 2x WebP/AVIF).
2. **Provenance & Licensing:** Every asset MUST include licensing metadata and provenance recorded in `docs/06-workflows/asset-provenance.md`.
3. **Zero Placeholders:** Stock placeholders or broken image URLs are strictly forbidden. Assets MUST be verified via `asset-harness.mjs`.

---

## 3. Audio & Acoustic Standards

1. **Loudness Standards:** Earcons and sound feedback MUST be mastered between $-18\text{ LUFS}$ and $-24\text{ LUFS}$ to avoid user fatigue.
2. **Acoustic Fallbacks:** Audio feedback MUST NEVER be the sole channel for critical notifications; every earcon MUST pair with an accessible visual notification.
3. **Mute Invariant:** When system audio is muted or reduced-sound mode is active, interface earcons MUST be cleanly suppressed without crashing or leaking unhandled audio promises.
