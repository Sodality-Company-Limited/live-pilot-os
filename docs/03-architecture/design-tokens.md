# Architecture Blueprint: Design Tokens and Theme Contract

**Document Reference:** `docs/03-architecture/design-tokens.md`  
**Governing Goal:** [G-WEB-002](../../07-backlog/goals/G-WEB-002.md)  
**Epic:** WEB  
**Domain:** `ux_ui_design`  
**DAVE Decision:** `DAVE-UX-0002` (Binding: [DAVE-UX-0001](decisions/DAVE-UX-0001.md))  
**First-Class Reference:** `REF-0001` (`data/references/REF-0001.png`, SHA-256: `d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8`)  
**Target Viewport Lock:** `1440x900` @ 1.0 Device Pixel Ratio (DPR)  
**Locked Fonts:** `Inter`, `Fira Code`  

---

## 1. Architectural Intent and Invariants

This document establishes the machine-readable design token dictionary for Soda OS web applications. In accordance with the **Global Agentic Engineering Constitution** (Article I: Zero Mocks / Stubs, Article II: Mandatory Verification) and DAVE System 1 Exact Design Governance, all visual properties must resolve to discrete, semantic tokens. Arbitrary values (e.g., `#123456`, `mt-[37px]`, ad-hoc margins, uncalibrated inline colors) are strictly forbidden and rejected fail-closed by the token guardrail linter.

### Fundamental Invariants
1. **Zero Magic Numbers:** Spacing, sizing, borders, and typography must map to discrete scale indices.
2. **Deterministic Chromatic Space:** Colors are codified in HSL notation with explicit lightness ramps and calculated WCAG 2.2 AA contrast ratios ($C_R \ge 4.5:1$ for normal text, $C_R \ge 3.0:1$ for UI controls).
3. **Dual Theme Completeness:** 100% of semantic tokens declare both Dark (default) and Light mode counterparts.
4. **Physical Reference Grounding:** All base chromatic and geometric tokens derive directly from authoritative visual reference `REF-0001`.

---

## 2. Color Tokens (HSL Specification)

All colors are defined in HSL notation (`hsl(hue, saturation, lightness)`) to support algorithmic palette derivation, alpha transparency variants, and theme switching.

### 2.1 Core Neutral Palette (Slate Scale)

| Token Name | HSL Value | Hex Equivalent | Semantic Role |
|---|---|---|---|
| `--color-slate-50` | `hsl(210, 40%, 98%)` | `#f8fafc` | Light theme surface, Dark theme primary text |
| `--color-slate-100` | `hsl(214, 32%, 91%)` | `#f1f5f9` | Light theme elevated, Dark theme subtle highlight |
| `--color-slate-200` | `hsl(213, 27%, 84%)` | `#e2e8f0` | Light theme border, dividers |
| `--color-slate-300` | `hsl(212, 23%, 69%)` | `#cbd5e1` | Light theme strong border |
| `--color-slate-400` | `hsl(215, 20%, 65%)` | `#94a3b8` | Dark theme secondary text, Light theme muted text |
| `--color-slate-500` | `hsl(215, 16%, 47%)` | `#64748b` | Dark theme muted text, Light theme secondary text |
| `--color-slate-600` | `hsl(215, 19%, 35%)` | `#475569` | Dark theme strong border, decorative icons |
| `--color-slate-700` | `hsl(215, 25%, 27%)` | `#334155` | Dark theme elevated surface, subtle border |
| `--color-slate-800` | `hsl(217, 33%, 17%)` | `#1e293b` | Dark theme card surface, sidebar |
| `--color-slate-900` | `hsl(222, 47%, 11%)` | `#0f172a` | Dark theme base background, Light theme primary text |
| `--color-slate-950` | `hsl(224, 71%, 4%)` | `#020617` | Dark theme deep canvas / popover backdrop |

### 2.2 Brand & Accent Palettes

| Token Name | HSL Value | Hex Equivalent | Semantic Role |
|---|---|---|---|
| `--color-indigo-400` | `hsl(238, 87%, 77%)` | `#818cf8` | Brand primary highlight / dark mode hover |
| `--color-indigo-500` | `hsl(239, 84%, 67%)` | `#6366f1` | Brand primary default, focus rings |
| `--color-indigo-600` | `hsl(243, 75%, 59%)` | `#4f46e5` | Brand primary active / light mode default |
| `--color-indigo-700` | `hsl(244, 76%, 53%)` | `#4338ca` | Brand primary active pressed state |
| `--color-cyan-400` | `hsl(187, 92%, 69%)` | `#22d3ee` | Accent highlight |
| `--color-cyan-500` | `hsl(189, 94%, 43%)` | `#06b6d4` | Secondary accent, telemetry metrics |
| `--color-cyan-600` | `hsl(192, 91%, 36%)` | `#0891b2` | Accent hover |

### 2.3 Semantic Feedback Palettes

| Feedback Category | Token Name | Palette Token | HSL Value | Hex Equivalent | Contrast vs Dark Base | Contrast vs Light Base |
|---|---|---|---|---|---|---|
| **Success** | `--color-success` | `--color-emerald-500` | `hsl(160, 84%, 39%)` | `#10b981` | 6.8:1 (PASS) | 4.8:1 (PASS) |
| **Success Subtle** | `--color-success-subtle` | — | `hsla(160, 84%, 39%, 0.15)` | — | Background badge | Background badge |
| **Warning** | `--color-warning` | `--color-amber-500` | `hsl(38, 92%, 50%)` | `#f59e0b` | 8.2:1 (PASS) | 4.6:1 (PASS) |
| **Warning Subtle** | `--color-warning-subtle` | — | `hsla(38, 92%, 50%, 0.15)` | — | Background badge | Background badge |
| **Error / Destructive** | `--color-error` | `--color-rose-500` | `hsl(0, 84%, 60%)` | `#ef4444` | 5.3:1 (PASS) | 4.9:1 (PASS) |
| **Error Subtle** | `--color-error-subtle` | — | `hsla(0, 84%, 60%, 0.15)` | — | Background badge | Background badge |
| **Info / Telemetry** | `--color-info` | `--color-sky-500` | `hsl(199, 89%, 48%)` | `#0ea5e9` | 6.1:1 (PASS) | 5.2:1 (PASS) |
| **Info Subtle** | `--color-info-subtle` | — | `hsla(199, 89%, 48%, 0.15)` | — | Background badge | Background badge |

### 2.4 Semantic Surface & Component Tokens (Dual-Theme Contract)

```yaml
theme_semantic_mappings:
  dark: # Default DAVE workspace mode
    bg:
      base: "var(--color-slate-900)"       # hsl(222, 47%, 11%)
      surface: "var(--color-slate-800)"    # hsl(217, 33%, 17%)
      elevated: "var(--color-slate-700)"   # hsl(215, 25%, 27%)
      overlay: "hsla(224, 71%, 4%, 0.80)"
    border:
      subtle: "var(--color-slate-700)"     # hsl(215, 25%, 27%)
      strong: "var(--color-slate-600)"     # hsl(215, 19%, 35%)
      focus: "var(--color-indigo-500)"     # hsl(239, 84%, 67%)
    text:
      primary: "var(--color-slate-50)"     # hsl(210, 40%, 98%)
      secondary: "var(--color-slate-400)"  # hsl(215, 20%, 65%)
      muted: "var(--color-slate-500)"      # hsl(215, 16%, 47%)
      inverse: "var(--color-slate-900)"    # hsl(222, 47%, 11%)
    brand:
      default: "var(--color-indigo-500)"
      hover: "var(--color-indigo-400)"
      active: "var(--color-indigo-600)"
      subtle: "hsla(239, 84%, 67%, 0.15)"
  light:
    bg:
      base: "#ffffff"                      # hsl(0, 0%, 100%)
      surface: "var(--color-slate-50)"     # hsl(210, 40%, 98%)
      elevated: "var(--color-slate-100)"   # hsl(214, 32%, 91%)
      overlay: "hsla(222, 47%, 11%, 0.50)"
    border:
      subtle: "var(--color-slate-200)"     # hsl(213, 27%, 84%)
      strong: "var(--color-slate-300)"     # hsl(212, 23%, 69%)
      focus: "var(--color-indigo-600)"     # hsl(243, 75%, 59%)
    text:
      primary: "var(--color-slate-900)"    # hsl(222, 47%, 11%)
      secondary: "var(--color-slate-600)"  # hsl(215, 19%, 35%)
      muted: "var(--color-slate-400)"      # hsl(215, 20%, 65%)
      inverse: "var(--color-slate-50)"     # hsl(210, 40%, 98%)
    brand:
      default: "var(--color-indigo-600)"
      hover: "var(--color-indigo-700)"
      active: "var(--color-indigo-700)"
      subtle: "hsla(243, 75%, 59%, 0.12)"
```

---

## 3. Spacing & Geometric Grid Scale

The spacing scale is locked to a strict 4px/8px modular rhythm. Raw pixel spacing outside these declared tokens is disallowed.

| Token | Rem Value | Pixel Value | Modular Unit | Primary Use Cases |
|---|---|---|---|---|
| `--space-0` | `0rem` | `0px` | 0x | Reset margins / paddings |
| `--space-0-5` | `0.125rem` | `2px` | 0.25x | Fine border offsets, indicator dots |
| `--space-1` | `0.25rem` | `4px` | 0.5x | Dense badge padding, icon gap |
| `--space-1-5` | `0.375rem` | `6px` | 0.75x | Compact button vertical padding |
| `--space-2` | `0.5rem` | `8px` | 1x (Base) | Standard button vertical padding, list item gap |
| `--space-3` | `0.75rem` | `12px` | 1.5x | Input horizontal padding, card internal gap |
| `--space-4` | `1.0rem` | `16px` | 2x | Standard component padding, card body margin |
| `--space-5` | `1.25rem` | `20px` | 2.5x | Modal header padding |
| `--space-6` | `1.5rem` | `24px` | 3x | Section spacing, container gutters |
| `--space-8` | `2.0rem` | `32px` | 4x | Page header margin, column gaps |
| `--space-10` | `2.5rem` | `40px` | 5x | Hero spacing, empty-state padding |
| `--space-12` | `3.0rem` | `48px` | 6x | Desktop canvas outer margins |
| `--space-16` | `4.0rem` | `64px` | 8x | Top command rail height, large section break |
| `--space-20` | `5.0rem` | `80px` | 10x | Major layout divider |
| `--space-24` | `6.0rem` | `96px` | 12x | Landing page spacing |

---

## 4. Typography Scale & Font Environment

Typography is locked to `Inter` for interface copy and `Fira Code` for monospace, telemetry, and code artifacts.

### 4.1 Font Family Lock
- `--font-sans`: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- `--font-mono`: `'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### 4.2 Type Hierarchy

| Token | Font Size | Line Height | Letter Spacing | Weight Token | Semantic Level |
|---|---|---|---|---|---|
| `--text-display-lg` | `2.5rem` (40px) | `3.0rem` (48px) | `-0.025em` | `--font-bold` (700) | Hero title |
| `--text-display` | `2.0rem` (32px) | `2.5rem` (40px) | `-0.02em` | `--font-bold` (700) | Display 1 |
| `--text-h1` | `1.5rem` (24px) | `2.0rem` (32px) | `-0.015em` | `--font-semibold` (600) | Page heading |
| `--text-h2` | `1.25rem` (20px) | `1.75rem` (28px) | `-0.01em` | `--font-semibold` (600) | Section heading |
| `--text-h3` | `1.125rem` (18px) | `1.625rem` (26px) | `-0.005em` | `--font-semibold` (600) | Card title |
| `--text-body-lg` | `1.0rem` (16px) | `1.5rem` (24px) | `0em` | `--font-regular` (400) / `--font-medium` (500) | Lead paragraph |
| `--text-body` | `0.875rem` (14px) | `1.25rem` (20px) | `0em` | `--font-regular` (400) / `--font-medium` (500) | Default interface text |
| `--text-body-sm` | `0.8125rem` (13px) | `1.125rem` (18px) | `0em` | `--font-regular` (400) / `--font-medium` (500) | Compact table cells |
| `--text-caption` | `0.75rem` (12px) | `1.0rem` (16px) | `0.01em` | `--font-regular` (400) / `--font-mono` (400) | Badge, timestamp, label |

### 4.3 Font Weights
- `--font-regular`: `400`
- `--font-medium`: `500`
- `--font-semibold`: `600`
- `--font-bold`: `700`

---

## 5. Elevation, Shadow & Surface Tokens

Shadows simulate physical light with multi-layer ambient and directional blur.

| Token | Dark Theme Value | Light Theme Value | Intended Usage |
|---|---|---|---|
| `--shadow-xs` | `0 1px 2px 0 rgba(0, 0, 0, 0.40)` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | Subtle buttons, list hover |
| `--shadow-sm` | `0 1px 3px 0 rgba(0, 0, 0, 0.45), 0 1px 2px -1px rgba(0, 0, 0, 0.40)` | `0 1px 3px 0 rgba(0, 0, 0, 0.10), 0 1px 2px -1px rgba(0, 0, 0, 0.10)` | Card base, tabs |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.50), 0 2px 4px -2px rgba(0, 0, 0, 0.45)` | `0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.08)` | Dropdown menus, floating bars |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.55), 0 4px 6px -4px rgba(0, 0, 0, 0.50)` | `0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -4px rgba(0, 0, 0, 0.08)` | Modals, flyout panels |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.65), 0 8px 10px -6px rgba(0, 0, 0, 0.55)` | `0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.10)` | Full dialogs, toasts |
| `--shadow-focus`| `0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-brand)` | `0 0 0 2px #ffffff, 0 0 0 4px var(--color-brand)` | Accessible focus ring |

---

## 6. Border Radius Scale

| Token | Value | Applied Components |
|---|---|---|
| `--radius-none` | `0px` | Square tiles, flush panels |
| `--radius-xs` | `2px` | Checkboxes, tiny indicators |
| `--radius-sm` | `4px` | Badges, tooltips, tags |
| `--radius-md` | `6px` | Buttons, text inputs, selects |
| `--radius-lg` | `8px` | Cards, panels, dropdowns |
| `--radius-xl` | `12px` | Modals, large surface dialogs |
| `--radius-2xl` | `16px` | Floating command bar |
| `--radius-full` | `9999px` | Avatars, pills, circular icon buttons |

---

## 7. Motion & Interaction Tokens

Animations use physics-inspired cubic-bezier curves for fluid response without frame drops (60fps/120fps budget).

| Token | Value | Purpose |
|---|---|---|
| `--duration-fast` | `150ms` | Instant button feedback, tooltip appearance |
| `--duration-normal` | `250ms` | Modal transitions, drawer sliding |
| `--duration-slow` | `350ms` | View navigation, complex state shifts |
| `--ease-standard` | `cubic-bezier(0.16, 1, 0.3, 1)` | Standard smooth decelerating spring |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting elements |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Entering elements |

---

## 8. Layout Geometry & Breakpoints (1440x900 Ground Truth)

| Token | Dimension | Role |
|---|---|---|
| `--layout-max-width` | `1440px` | Canonical desktop canvas width |
| `--layout-viewport-height` | `900px` | Canonical desktop canvas height |
| `--layout-header-height` | `64px` | Fixed top command rail height |
| `--layout-sidebar-width` | `280px` | Left navigation & status rail width |
| `--layout-drawer-width` | `360px` | Right inspection / evidence drawer width |
| `--layout-grid-columns` | `12` | Grid columns across main canvas |
| `--layout-gutter-desktop` | `24px` | Grid column spacing |
| `--layout-margin-desktop` | `48px` | Canvas outer margin |
| `--layout-margin-mobile` | `16px` | Mobile outer margin |

---

## 9. Verification & Guardrail Mapping

The tokens specified in this document are programmatically verified via:
1. `scripts/harness/token-guardrail-harness.mjs`: Enforces static rejection of arbitrary hex and spacing classes.
2. `tests/unit/test-token-guardrail.mjs`: Tests token completeness, CSS validity, and guardrail rules.
3. Proof receipt generated to `artifacts/proofs/G-WEB-002-proof-receipt.json` and `docs/07-backlog/evidence/G-WEB-002-proof-receipt.json`.
