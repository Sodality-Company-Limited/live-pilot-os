---
name: soda-dave-visual-fidelity
version: "1.0.0"
description: >-
  DAVE Visual Fidelity & Pixel Regression Engine — captures headless Chromium screenshots
  under declared viewport, locked-font, and deterministic fixture conditions, computes
  perceptual pixel diff ratios (<= 0.0050), and verifies zero CLS and zero overflow.
  Triggers: dave verify-visual-fidelity, dave visual-diff, dave pixel-perfect.
---

# DAVE Visual Fidelity

This skill defines the operational procedure for automated visual regression and fidelity verification.

## Operational Steps

1. **Lock Environment:** Verify headless Chromium, DPR 1.0, and local font asset availability.
2. **Inject Fixtures:** Populate deterministic JSON test fixtures (`tests/fixtures/*.json`).
3. **Capture Viewports:** Render and screenshot across desktop (`1440x900`), tablet (`1024x768`), and mobile (`390x844`).
4. **Compute Metrics:** Calculate pixel-diff ratio against golden reference image:
   $$\tau_{\text{diff}} = \frac{\text{DiffPixels}}{W \times H} \le 0.0050$$
5. **Verify Layout Invariants:** Assert zero cumulative layout shift (CLS = 0) and zero horizontal overflow.
6. **Emit Proof Receipt:** Output structured verification scorecard in `artifacts/proofs/`.
