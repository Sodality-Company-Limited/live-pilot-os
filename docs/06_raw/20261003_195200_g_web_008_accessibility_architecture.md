# Technical Architecture Specification: G-WEB-008 Accessibility Verification

**Goal Reference:** [`G-WEB-008.md`](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-WEB-008.md)  
**Timestamp:** `2026-10-03T19:52:00+07:00`  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Standards Compliance:** WCAG 2.2 Level AA  
**Author:** `Antigravity (AI System Architect & Lead Engineer)`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Empirical Testing Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. System Overview & Hexagonal Architecture

The accessibility verification engine operates as a decoupled, deterministic subsystem within the DAVE governance kernel.

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 AccessibilityAuditPort                      │
  │  (Driving Port: CSS Tokens, a11y.css & Component Sources)    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │           DAVE Accessibility Verification Kernel            │
  │  ┌─────────────────────────┐   ┌──────────────────────────┐ │
  │  │ WCAG Luminance Engine   │   │ Keyboard Focus Validator │ │
  │  │ - sRGB linear transform │   │ - :focus-visible (2px)   │ │
  │  │ - Relative luminance L  │   │ - Pointer focus reset    │ │
  │  │ - Contrast ratio CR     │   │ - Zero keyboard traps    │ │
  │  └─────────────────────────┘   └──────────────────────────┘ │
  │  ┌─────────────────────────┐   ┌──────────────────────────┐ │
  │  │ ARIA Landmark Auditor   │   │ Cryptographic Notary     │ │
  │  │ - Semantic roles        │   │ - SHA-256 source hashing │ │
  │  │ - Live status regions   │   │ - Exact HEAD binding     │ │
  │  │ - .sr-only utilities    │   │ - Schema v1 JSON receipt │ │
  │  └─────────────────────────┘   └──────────────────────────┘ │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                   ComplianceReportPort                      │
  │     (Driven Port: artifacts/proofs/ & docs/07-backlog/)     │
  └─────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Definition of WCAG 2.2 Contrast Ratio

### Relative Luminance ($L$)
According to WCAG 2.2 Criterion 1.4.3, the relative luminance $L$ of any color in the sRGB color space is calculated as:
$$L = 0.2126 \times R_{\text{lin}} + 0.7152 \times G_{\text{lin}} + 0.0722 \times B_{\text{lin}}$$
where each 8-bit color channel $C \in \{R, G, B\}$ is normalized to $s = C / 255$ and linearized via the inverse sRGB companding function:
$$C_{\text{lin}} = \begin{cases} \frac{s}{12.92} & \text{if } s \le 0.04045 \\ \left(\frac{s + 0.055}{1.055}\right)^{2.4} & \text{if } s > 0.04045 \end{cases}$$

### Contrast Ratio ($\text{CR}$)
The contrast ratio between two relative luminances $L_1$ and $L_2$ (where $L_1 \ge L_2$) is:
$$\text{CR} = \frac{L_1 + 0.05}{L_2 + 0.05}$$
Bounds:
- $\text{CR} \in [1.00, 21.00]$.
- Normal text requires $\text{CR} \ge 4.5:1$.
- Large text ($\ge 18\text{pt}$ or $\ge 14\text{pt}$ bold) and non-text UI graphical components require $\text{CR} \ge 3.0:1$.

---

## 3. Audited Token Pairs & Measured Ratios

| Pair ID | Foreground Token | Background Token | Context | Required Min | Measured Ratio | Pass/Fail |
|---|---|---|---|:---:|:---:|:---:|
| `CONTRAST-01` | `--color-slate-50` | `--color-slate-950` | Primary Text on Deep Canvas | $4.5:1$ | **19.26:1** | PASS |
| `CONTRAST-02` | `--color-slate-50` | `--color-slate-900` | Primary Text on Main Base | $4.5:1$ | **17.08:1** | PASS |
| `CONTRAST-03` | `--color-slate-50` | `--color-slate-800` | Primary Text on Surface Card | $4.5:1$ | **14.17:1** | PASS |
| `CONTRAST-04` | `--color-slate-200` | `--color-slate-900` | Secondary Light Text on Base | $4.5:1$ | **12.07:1** | PASS |
| `CONTRAST-05` | `--color-slate-200` | `--color-slate-800` | Secondary Light Text on Surface | $4.5:1$ | **9.96:1** | PASS |
| `CONTRAST-06` | `--color-slate-400` | `--color-slate-900` | Muted Text on Base | $4.5:1$ | **6.97:1** | PASS |
| `CONTRAST-07` | `--color-slate-400` | `--color-slate-800` | Muted Text on Surface Card | $4.5:1$ | **5.78:1** | PASS |
| `CONTRAST-08` | `--color-emerald-500` | `--color-slate-900` | Success Status Indicator | $4.5:1$ | **6.90:1** | PASS |
| `CONTRAST-09` | `--color-amber-500` | `--color-slate-900` | Warning Status Indicator | $4.5:1$ | **8.38:1** | PASS |
| `CONTRAST-10` | `--color-rose-500` | `--color-slate-900` | Error Status Indicator | $4.5:1$ | **4.73:1** | PASS |
| `CONTRAST-11` | `--color-sky-500` | `--color-slate-900` | Info Status Indicator | $4.5:1$ | **6.25:1** | PASS |
| `CONTRAST-12` | `--color-slate-900` | `--color-slate-50` | Light Mode Primary Text | $4.5:1$ | **17.08:1** | PASS |
| `CONTRAST-13` | `--color-slate-600` | `--color-slate-50` | Light Mode Secondary Text | $4.5:1$ | **6.67:1** | PASS |
| `CONTRAST-14` | `--color-indigo-500` | `--color-slate-900` | Brand Focus Ring on Base | $3.0:1$ | **4.05:1** | PASS |
| `CONTRAST-15` | `--color-indigo-500` | `--color-slate-800` | Brand Focus Ring on Surface | $3.0:1$ | **3.36:1** | PASS |
| `CONTRAST-16` | `--color-indigo-600` | `#ffffff` | Brand Focus Ring on Light Base | $3.0:1$ | **5.25:1** | PASS |

---

## 4. Keyboard Traversal & Visible Focus Invariants

1. **Skip Links (`WCAG 2.4.1`):**
   - Positioned offscreen via `top: -9999px; left: -9999px;`.
   - On `:focus`, positioned at `top: var(--space-3); left: var(--space-3);` with high z-index and high-contrast outline.
2. **Focus Visibility & Appearance (`WCAG 2.4.7 & 2.4.11`):**
   - Reset pointer clicks cleanly with `:focus:not(:focus-visible) { outline: none; }`.
   - High-contrast keyboard indicator:
     ```css
     :focus-visible {
       outline: 2px solid var(--color-brand-default) !important;
       outline-offset: 2px !important;
       box-shadow: 0 0 0 4px var(--color-brand-subtle) !important;
     }
     ```
3. **Minimum Target Sizing (`WCAG 2.5.8`):**
   - Interactive elements enforce `min-height: 44px; min-width: 44px;`.
   - On desktop ($\ge 768\text{px}$), compact controls enforce $\ge 32\text{px}$ visual size with an extended `::after` pseudo-element providing a $44\text{px}$ hit-box boundary.
4. **Zero Keyboard Traps (`WCAG 2.1.2`):**
   - Positive `tabIndex` attributes (`tabIndex={1}`, `tabIndex={2}`) are strictly forbidden across all component sources.

---

## 5. Screen Reader & ARIA Landmark Roles

All 4 mandatory workspace components implement semantic roles:
- `CommandRail`: role `navigation` or `toolbar`.
- `DecisionCanvas`: role `main` or `region` with accessible label.
- `EvidencePanel`: role `complementary` or `region`.
- `ReviewModal`: role `dialog` with `aria-modal="true"`.

Dynamic state messages are routed via live regions (`[role="status"]`, `[role="alert"]`, `[aria-live="polite"]`, `[aria-live="assertive"]`), and visually hidden text is encapsulated via `.sr-only` and `.sr-only-focusable`.
