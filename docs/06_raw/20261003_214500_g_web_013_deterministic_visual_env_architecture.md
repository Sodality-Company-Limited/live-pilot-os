# Architectural Specification: Deterministic Visual Execution Environment (G-WEB-013)

**Timestamp:** 2026-10-03T21:45:00+07:00  
**Artifact ID:** `ART-DETERMINISTIC-VISUAL-ENV-SPEC`  
**Topic:** Containerized Headless Rendering Lock, Pre-Render Script Injection, and 8-Layer Visual Acceptance Decomposition  
**Goal:** [G-WEB-013.md](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-WEB-013.md)  
**Status:** Certified PASS  

---

## 🏛️ SECTION I: STRUCTURED CODE EXPLANATION (WHERE, WHY, FOR WHOM, HOW)

### 📍 WHERE: Codebase Locations & Touch Map
- Specification Contract: [deterministic-env-spec.json](file:///Users/batrarethsudprasert/projects/soda-os/artifacts/visual/deterministic-env-spec.json#L1-L192)
- Execution Engine Library: [deterministic-visual-env.mjs](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/deterministic-visual-env.mjs#L1-L685)
- Automated Visual Regression Harness: [visual-regression-harness.mjs](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/visual-regression-harness.mjs#L25-L65) and [L640-L760](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/visual-regression-harness.mjs#L640-L760)
- Unit Test Suite: [test-deterministic-visual-env.mjs](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-deterministic-visual-env.mjs#L1-L225)
- Acceptance BDD Contract: [G-WEB-013.md](file:///Users/batrarethsudprasert/projects/soda-os/docs/02-product/acceptance/G-WEB-013.md#L1-L85)
- Cryptographic Proof Receipt: [G-WEB-013-proof-receipt.json](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/evidence/G-WEB-013-proof-receipt.json#L1-L60)

### 🎯 WHY: Deep Architectural Rationale & Invariants
Visual regression assertions must be mathematical invariants, not probabilistic approximations. Prior to G-WEB-013, screenshot captures exhibited subtle pixel shifts due to:
1. Clock races between CSS `@keyframes` and headless browser screenshot triggers.
2. Inconsistent font antialiasing when host systems apply varying subpixel hinting algorithms.
3. System date/clock leakage influencing dynamic date-formatted UI components.
4. Ambiguous diff reporting that emitted generic percentage mismatches without identifying whether the defect stemmed from DOM structure, CSS token deviations, font substitutions, or layout shifts.

G-WEB-013 eliminates all ambient variance by locking 15 rendering dimensions and decomposing visual diffs into 8 canonical visual acceptance layers.

### 👥 FOR WHOM: Target Actors & Consumers
- **DAVE System 1 Autonomous Routing Engine:** Relies on deterministic visual verification to authoritatively clear visual evidence before granting autonomous execution permissions.
- **Frontend Engineers & Reviewers:** Receive structured diagnostics identifying the exact failing visual layer (e.g. "Layer 4: Colors and Tokens - raw hex color detected") and actionable remediation steps rather than deciphering raw pixel heatmaps.
- **Continuous Integration Pipeline:** Operates zero-variance visual gates that never flake, preventing blocked release trains due to ambient environment jitter.

### ⚙️ HOW: Detailed Algorithmic Mechanics & Implementation Pipeline

```
 ┌──────────────────────────────────────────────────────────────┐
 │ 1. Headless Rendering Environment Lock (15 Dimensions)       │
 │    (DPR 1.0, UTC, en-US, subpixel hinting, sRGB profile)     │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 2. Pre-Render Script Injection                               │
 │    - Pauses CSS animations (animation-play-state: paused)    │
 │    - Zeroes transition durations (transition-duration: 0s)   │
 │    - Freezes Date.now() to fixed epoch (2026-10-01T00:00Z)   │
 │    - Replaces Math.random with deterministic Mulberry32 PRNG │
 │    - Awaits document.fonts.ready                             │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 3. Deterministic Frame Capture & Bitwise Hashing             │
 │    - Captures PNG frame buffer at locked viewport            │
 │    - Computes SHA-256 digest                                 │
 │    - Asserts 0.0000% variance across repeated captures       │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 4. 8-Layer Visual Acceptance Decomposition Engine            │
 │    - Layer 1: DOM structure                                  │
 │    - Layer 2: layout geometry                                │
 │    - Layer 3: typography                                     │
 │    - Layer 4: colors and tokens                              │
 │    - Layer 5: image crop and assets                          │
 │    - Layer 6: interaction states                             │
 │    - Layer 7: motion frames                                  │
 │    - Layer 8: accessibility                                  │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 5. Root-Cause Attribution & Cryptographic Certification      │
 │    - Isolates primary failing layer if mismatch detected     │
 │    - Asserts pixel_diff_ratio <= 0.0050 and CLS = 0          │
 │    - Emits cryptographic proof receipt with SHA-256 hashes   │
 └──────────────────────────────────────────────────────────────┘
```

---

## 🔒 SECTION II: THE 15 LOCKED RENDERING DIMENSIONS

| # | Dimension | Locked Value | Invariant Guard |
|---|---|---|---|
| 1 | `viewport_width` | 1440 (desktop), 1024 (tablet), 390 (mobile) | Strictly positive integer bounding box |
| 2 | `viewport_height` | 900 (desktop), 768 (tablet), 844 (mobile) | Strictly positive integer bounding box |
| 3 | `device_scale_factor` | 1.0 | Fixed DPR 1.0 (zero subpixel scaling) |
| 4 | `timezone` | UTC / Etc/UTC | Zero UTC offset |
| 5 | `locale` | en-US | Consistent number and date string formatting |
| 6 | `font_antialiasing` | subpixel / hinting medium | Deterministic font glyph rasterization |
| 7 | `animation_clock` | paused | Time zero frozen (`animation-play-state: paused`) |
| 8 | `transition_duration`| 0s | Instantaneous style property application |
| 9 | `color_profile` | srgb | Standard 8bpc sRGB color profile |
| 10 | `color_scheme` | dark | Dark theme tokens enforced |
| 11 | `reduced_motion` | reduce | prefers-reduced-motion media query satisfied |
| 12 | `media_type` | screen | Screen media type rules active |
| 13 | `scrollbars` | hidden | Zero scrollbar gutter or dynamic scrollbar width |
| 14 | `javascript_date_clock`| 2026-10-01T00:00:00.000Z | Fixed epoch timestamp (`1790812800000` ms) |
| 15 | `network_idle` | document_fonts_ready | Document fonts and network requests quiescent |

---

## 🔍 SECTION III: THE 8 CANONICAL VISUAL ACCEPTANCE LAYERS

| Layer | Name | Evaluation Scope | Severity | Remediation Strategy |
|---|---|---|---|---|
| **Layer 1** | DOM structure | Tag hierarchy, node count, tree depth, semantic elements | Critical | Check JSX template structure; ensure correct wrapper nesting |
| **Layer 2** | Layout geometry | Bounding boxes, margins, paddings, flex/grid tracks, CLS | Critical | Inspect Flexbox/Grid track definitions; prevent overflow |
| **Layer 3** | Typography | Font family, font size, line height, letter spacing, weight | Critical | Adhere to `--font-sans: Inter` and `--font-mono: Fira Code` tokens |
| **Layer 4** | Colors and tokens | Design tokens, background, text, border colors, zero raw hex | Critical | Replace raw hex values with CSS variable tokens |
| **Layer 5** | Image crop & assets | Aspect ratio, object-fit, natural vs rendered size, SHA-256 | Serious | Maintain image aspect ratio and verify asset checksums |
| **Layer 6** | Interaction states | Default, hover, focus-visible, active, disabled states | Moderate | Implement missing pseudo-class states in responsive.css |
| **Layer 7** | Motion frames | Animation state paused at t=0, transition duration 0s | Moderate | Verify animation freezing and reduced-motion adherence |
| **Layer 8** | Accessibility | WCAG 2.2 AA contrast (>= 4.5:1), touch target >= 44x44px | Critical | Increase text contrast and enlarge button hitboxes |
