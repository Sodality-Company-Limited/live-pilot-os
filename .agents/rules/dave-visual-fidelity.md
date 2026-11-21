---
description: DAVE visual fidelity — bounded pixel-perfect contracts, headless Chromium regression, and threshold gating
alwaysApply: true
---

# DAVE Visual Fidelity Contract

This rule establishes the bounded mathematical and operational definition of **Visual Fidelity** in Soda OS web and UI implementations.

---

## 1. Bounded Definition of "Pixel Perfect"

Absolute claims such as *"this page is pixel-perfect everywhere"* are scientifically ungrounded and **strictly prohibited**.

Visual Fidelity in Soda OS is defined exclusively within a **Bounded Rendering Environment**:
- **Browser Engine:** Headless Chromium (stable version).
- **Device Pixel Ratio (DPR):** Explicitly declared (default `1.0`).
- **Locked Typography:** Web fonts loaded deterministically from immutable local WOFF2/TTF assets; zero system font fallback substitution.
- **Deterministic Fixtures:** Populated data fixtures (`fixtures/*.json`) with fixed text lengths, dates, and media placeholders.
- **Declared Viewport Matrix:**
  - Desktop: `1440 x 900`
  - Tablet: `1024 x 768`
  - Mobile: `390 x 844`

---

## 2. Quantitative Visual Invariant Formula

$$\text{VisualFidelity}(\mathcal{R}, \mathcal{I}) = \left( \frac{\sum_{x=1}^{W} \sum_{y=1}^{H} \mathbb{I}(|\mathcal{R}_{x,y} - \mathcal{I}_{x,y}| > \delta_{\text{color}})}{W \times H} \le \tau_{\text{diff}} \right) \land (\text{CLS} = 0) \land (\text{Overflow} = \emptyset)$$

Where:
- $\mathcal{R}$ is the golden reference image.
- $\mathcal{I}$ is the rendered implementation screenshot.
- $\delta_{\text{color}} = 16$ (perceptual color delta ceiling).
- $\tau_{\text{diff}} = 0.0050$ (maximum allowable pixel variance of 0.50%).
- $\text{CLS} = 0$ (zero Cumulative Layout Shift during load and hydrate).
- $\text{Overflow} = \emptyset$ (zero horizontal page scroll or clipped interactive controls).

---

## 3. Verification Protocol

1. **Deterministic Screenshot Capture:** Captured automatically via `visual-regression-harness.mjs` across desktop, tablet, and mobile.
2. **Region-Level Diff Mapping:** If variance exceeds $\tau_{\text{diff}}$, the harness generates a side-by-side visual diff artifact and an error heatmap highlighting shifted bounding boxes.
3. **Fail-Closed Gate:** If visual variance exceeds $0.0050$ or horizontal overflow is detected, the verification pass fails, blocking goal promotion to `review`.
