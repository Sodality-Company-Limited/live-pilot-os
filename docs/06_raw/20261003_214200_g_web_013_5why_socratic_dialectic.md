# Socratic 5-Why Dialectic Analysis: Deterministic Visual Execution Environment (G-WEB-013)

**Timestamp:** 2026-10-03T21:42:00+07:00  
**Topic:** Root Cause Elimination of Visual Regression Non-Determinism and Diff Flakiness  
**Artifact ID:** `ART-5WHY-G-WEB-013`  
**Goal:** [G-WEB-013.md](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-WEB-013.md)  

---

## 🎯 The Socratic 5-Why Dialectic Chain

### Level 1: Why do automated visual regression captures produce intermittent false positives?
- **Root Cause at L1:** Uncalibrated rendering environments capture frames at different rasterization timestamps, color profiles, or layout shift intervals, causing pixel deltas even when source code is unchanged.

### Level 2: Why do timestamps, color profiles, and layout states drift between runs?
- **Root Cause at L2:** Headless browser instances inherit host ambient state: operating system timezones, locale formatting, display color profiles (Display P3 vs sRGB), and unconstrained CSS animation clocks running at unpinned frame rates.

### Level 3: Why were these ambient parameters not constrained during test execution?
- **Root Cause at L3:** Standard browser automation runners launch with default flags and assume synchronous DOM rendering is sufficient, failing to freeze the JavaScript Date clock, CSS transition durations, and font rasterization pipelines.

### Level 4: Why does a general pixel diff ratio fail to diagnose the root cause when a mismatch occurs?
- **Root Cause at L4:** Conventional screenshot diffing tools compute an aggregate byte or pixel mismatch score without structural awareness, conflating DOM node changes with typography shifts, color token violations, or transient motion frames.

### Level 5: Why was there no decoupled layer decomposition engine?
- **Root Cause at L5:** Visual regression historically lacked an architectural specification dividing acceptance into canonical concern layers (DOM, Layout, Typography, Tokens, Assets, Interaction, Motion, Accessibility), preventing automated attribution to the exact failing layer.

---

## 🏛️ Level 5 Architectural Countermeasures Delivered in G-WEB-013

1. **15 Locked Rendering Dimensions:** Explicitly locks viewport, device scale factor (1.0), timezone (UTC), locale (en-US), subpixel font antialiasing, paused animation clock, zero-duration transitions, sRGB color profile, dark color scheme, reduced motion preference, screen media type, hidden scrollbars, deterministic date epoch (2026-10-01T00:00:00.000Z), and font readiness hooks.
2. **Deterministic Pre-Render Script Injection:** Injects JavaScript before document evaluation that pauses CSS keyframes, zeroes transitions, stubs Date and performance.now to fixed constants, and replaces Math.random with a deterministic Mulberry32 PRNG.
3. **8-Layer Visual Acceptance Decomposition:** Decomposes visual acceptance into 8 canonical layers and attributes diffs to the specific root-cause layer with actionable remediation guidance.
4. **Zero-Variance Bitwise Capture Assurance:** Proves 0.0000% variance and bitwise SHA-256 identity across repeated captures.
