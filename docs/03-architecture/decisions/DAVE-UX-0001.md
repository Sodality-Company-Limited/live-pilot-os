# DAVE Decision: DAVE-UX-0001

- **Decision ID:** DAVE-UX-0001
- **Domain:** `ux_ui_design`
- **Goal ID:** `G-WEB-001`
- **Author:** DAVE UX/UI Specialist
- **Date:** 2026-10-03T17:03:00+07:00
- **Status:** APPROVED
- **Calibrated Confidence:** 0.9500
- **Risk Level:** `low`
- **Human Action:** `none` (autonomous execution permitted under confidence SLA >= 0.85)

---

## 1. Grounded References

- **Primary Reference:** `REF-0001`
  - **URI:** `data/references/REF-0001.png`
  - **SHA-256:** `d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8`
  - **Authority:** `approved_design_reference`
  - **Viewport Constraint:** 1440x900 @ 1.0 Device Pixel Ratio (DPR)
  - **Locked Fonts:** `Inter`, `Fira Code`

---

## 2. Layout Geometry & Grid Specification

- **Baseline Grid:** 8px strict modular unit (`--space-1`: 4px, `--space-2`: 8px, `--space-3`: 12px, `--space-4`: 16px, `--space-6`: 24px, `--space-8`: 32px)
- **Column System:** 12-column responsive fluid grid with max-width container of 1440px.
- **Gutters:** 24px horizontal gutters at desktop, 16px at mobile.
- **Side Margins:** 48px desktop outer padding, 16px mobile outer padding.
- **Header Height:** 64px fixed top command rail.
- **Sidebar Width:** 280px left navigation / status rail.

---

## 3. Design Tokens Contract

### Color Palette Tokens
```yaml
color:
  background:
    base: "#0f172a"      # Slate 900
    surface: "#1e293b"   # Slate 800
    elevated: "#334155"  # Slate 700
  border:
    subtle: "#334155"
    focus: "#6366f1"
  text:
    primary: "#f8fafc"   # Slate 50
    secondary: "#94a3b8" # Slate 400
    muted: "#64748b"     # Slate 500
  brand:
    primary: "#6366f1"   # Indigo 500
    primary_hover: "#4f46e5"
    accent: "#06b6d4"    # Cyan 500
  feedback:
    success: "#10b981"   # Emerald 500
    warning: "#f59e0b"   # Amber 500
    error: "#ef4444"     # Rose 500
```

### Typography Scale
- **Display 1:** 32px / line-height 40px / font-weight 700
- **Heading 1:** 24px / line-height 32px / font-weight 600
- **Heading 2:** 20px / line-height 28px / font-weight 600
- **Body Large:** 16px / line-height 24px / font-weight 400
- **Body Regular:** 14px / line-height 20px / font-weight 400
- **Caption / Monospace:** 12px / line-height 16px / font-family `Fira Code`

---

## 4. Responsive Breakpoint Matrix

| Viewport Tier | Width Range | Layout Behavior | Navigation Mode |
|---|---|---|---|
| **Mobile** | 320px – 767px | Single column stacked | Drawer / Bottom sheet |
| **Tablet** | 768px – 1023px | 6-column adaptive grid | Collapsed icon rail |
| **Desktop** | 1024px – 1440px | 12-column canonical layout | Full 280px sidebar |
| **Wide / 4K** | 1441px+ | Centered 1440px max container | Full sidebar + telemetry dock |

---

## 5. Alternatives Rejected

1. **Fluid Multi-Column with Auto-Fit:** Rejected due to non-deterministic column wrapping and visual layout shifts (CLS > 0.00).
2. **Generic Unscoped Utility Classes:** Rejected to eliminate styling collisions and enforce strict design token encapsulation.
3. **Variable Viewport Floating Canvas:** Rejected in favor of locked 1440x900 viewport ground truth to guarantee reproducible pixel diffing.

---

## 6. Verification and Invariant Plan

- `dave-reference-harness.mjs`: Verifies `REF-0001` SHA-256 digest on disk.
- `test-dave-reference.mjs`: Validates programmatic loading and viewport clamping.
- `token-guardrail-harness.mjs`: Proves 100% token conformance across components.
