# Deep Architectural Specification: G-WEB-009 Motion Choreography & Interaction Fidelity Engine

**Goal ID:** `G-WEB-009`  
**Timestamp:** `2026-10-03T20:05:00+07:00`  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Kind:** `qa`  
**Topic:** Motion Choreography, Frame Rate Budgets, Easing Curves & Vestibular Accessibility  
**Author:** `Antigravity (AI System Architect & Lead Engineer)`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Empirical Testing Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. Architectural Overview & System Topology

The Soda OS Motion Choreography Engine delivers a mathematically rigorous, hardware-accelerated motion system. The engine operates across three synchronized tiers:
1. **Token Tier (`code/src/styles/motion.css`):** Codifies standardized CSS custom properties for durations, cubic-bezier easing curves, and GPU-optimized keyframe definitions.
2. **Audit & Verification Tier (`scripts/harness/motion-harness.mjs`):** A static AST/regex auditing engine that analyzes stylesheets and React component TSX files to prove zero layout thrashing, bounded durations ($\le 300\text{ms}$), absence of linear easing, and full reduced-motion coverage.
3. **Cryptographic Provenance Tier (`artifacts/proofs/motion_receipt.json`):** Emits cryptographic certification receipts hashed with SHA-256 and anchored to the exact git commit HEAD.

```
                      +---------------------------------------+
                      |       code/src/styles/motion.css       |
                      |  - Durations: 150ms / 200ms / 300ms   |
                      |  - Easing: standard, decelerate, etc. |
                      |  - Compositor-only Keyframes          |
                      |  - Reduced-motion collapse (0.01ms)   |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |   scripts/harness/motion-harness.mjs  |
                      |  - verifyMotionTokens()               |
                      |  - verifyPrefersReducedMotion()       |
                      |  - scanLayoutThrashingAndDurations()  |
                      |  - emitMotionReceipt()                |
                      +---------------------------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
+-----------------------------------------------+ +-----------------------------------------------+
|  artifacts/proofs/motion_receipt.json          | | docs/07-backlog/evidence/G-WEB-009-receipt.json|
|  - Invariant: 009-INV-001 (100% Proven)       | | - Invariant: 009-INV-001 (100% Proven)       |
|  - Git HEAD revision SHA-256 source digests   | | - Git HEAD revision SHA-256 source digests   |
+-----------------------------------------------+ +-----------------------------------------------+
```

---

## 2. Motion Token Definitions

The token system in `motion.css` establishes strict temporal and kinematic parameters:

### Duration Tokens
- `--motion-duration-fast`: `150ms` (used for micro-interactions, hover highlights, button presses, toggle shifts).
- `--motion-duration-normal`: `200ms` (used for dropdown expansions, modal fades, tab transitions, navigation changes).
- `--motion-duration-deliberate`: `300ms` (used for expansive canvas reflows, large drawer reveals, complex spatial transitions).
- `--motion-duration-max`: `300ms` (enforced as the absolute upper bound for any interactive transition).

### Easing Curve Tokens
All easing tokens are defined using 4-point cubic-bezier vectors:
- `--motion-ease-standard`: `cubic-bezier(0.2, 0.0, 0.0, 1.0)` (Material 3 standard easing for transitions within view).
- `--motion-ease-decelerate`: `cubic-bezier(0.0, 0.0, 0.2, 1.0)` (Incoming elements decelerating to rest).
- `--motion-ease-accelerate`: `cubic-bezier(0.3, 0.0, 1.0, 1.0)` (Outgoing elements accelerating out of view).
- `--motion-ease-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1.0)` (Snappy spring micro-interaction).

---

## 3. Hardware Acceleration & Layout Thrashing Elimination

### The Compositor Invariant
To ensure 60fps (16.6ms/frame) performance across both desktop and low-power mobile GPUs, animations must avoid the CPU Layout and Paint pipeline.

| Property | Layout Reflow? | Repaint Required? | GPU Composited? | Allowed in Soda OS Animations? |
|:---|:---:|:---:|:---:|:---:|
| `transform` | ❌ No | ❌ No | ✅ Yes | **YES** |
| `opacity` | ❌ No | ❌ No | ✅ Yes | **YES** |
| `width`, `height` | ⚠️ **YES** | ⚠️ **YES** | ❌ No | 🛑 **BANNED** |
| `top`, `bottom`, `left`, `right` | ⚠️ **YES** | ⚠️ **YES** | ❌ No | 🛑 **BANNED** |
| `margin`, `padding` | ⚠️ **YES** | ⚠️ **YES** | ❌ No | 🛑 **BANNED** |

### Verified Hardware-Accelerated Keyframes
`motion.css` codifies four canonical keyframe animations:
1. `@keyframes motionFadeIn`: Animates `opacity: 0` to `opacity: 1`.
2. `@keyframes motionFadeOut`: Animates `opacity: 1` to `opacity: 0`.
3. `@keyframes motionScaleUp`: Animates `transform: scale(0.96); opacity: 0` to `transform: scale(1); opacity: 1`.
4. `@keyframes motionSlideUp`: Animates `transform: translateY(8px); opacity: 0` to `transform: translateY(0); opacity: 1`.

Component-level infinite ambient indicators (such as `shimmerPulse` and `blinkCursor`) animate exclusively `opacity`, completely bypassing the layout engine.

---

## 4. Vestibular Safety & Reduced Motion Architecture

To comply with **WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions)** and protect users with vestibular conditions:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
### Why 0.01ms instead of 0s?
Setting `transition-duration: 0s` causes web browsers to suppress DOM transition events (`transitionrun`, `transitionstart`, `transitionend`). If component state machines await `transitionend` before completing modal unmounting or focus redirection, `0s` can deadlock the UI. Setting `0.01ms` guarantees instantaneous visual rendering (<0.1ms, imperceptible to human vision) while ensuring all event listener promises resolve cleanly.

---

## 5. Harness Implementation Details (`motion-harness.mjs`)

The harness provides 4 modular, deterministic verification routines:
- `verifyMotionTokens(cssContent)`: Asserts presence of duration tokens $\le 300\text{ms}$ and cubic-bezier easing tokens.
- `verifyPrefersReducedMotion(cssContent)`: Asserts universal selector collapse with `0.01ms` and `!important`.
- `scanLayoutThrashingAndDurations(targetDir)`: Recursively scans all `.css` and `.tsx` files in `code/src/`. Parses all `@keyframes` blocks to ensure zero layout-triggering properties. Parses all `transition` and `duration` strings to ensure no duration $> 300\text{ms}$ and no `linear` easing for interactive transitions.
- `emitMotionReceipt(results)`: Formats and writes the cryptographic receipt matching the `motion_receipt_v1` schema with exact source hashes.
