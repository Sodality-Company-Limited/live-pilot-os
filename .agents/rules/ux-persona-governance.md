# 12 Typed Agent Persona Governance & Veto Enforcement

This rule defines the mandatory structural, behavioral, and verification invariants for the 12 Typed UX/UI Agent Personas and their 4-Tier Precedence Hierarchy within Soda OS.

---

## 1. 12 Typed Personas & 4-Tier Precedence Hierarchy

All UX/UI design decisions, visual mockups, and component specifications evaluated by autonomous agents MUST pass rigorous critique across the 12 specialized personas registered in `scripts/lib/ux-persona-registry.mjs`.

### 1.1 Tier 1: Absolute Ethics & Deception Watchdog (Highest Priority)
- **`dark_pattern_ethics_watchdog`**:
  - Enforces Zero Deception. Prohibits confirmshaming, sneak into basket, hidden recurring subscriptions, disguised advertisements, forced continuity, and pre-ticked opt-ins.
  - **Veto Authority:** Absolute. A Tier 1 veto CANNOT be overridden by any other persona, user preference, or business constraint. Execution halts fail-closed (`REJECT_AS_UNSAFE`).

### 1.2 Tier 2: Universal Inclusion, Usability & Cognitive Safety
- **`accessibility_auditor`**:
  - Enforces WCAG 2.2 Level AAA compliance. Requires 7.0:1 text contrast (4.5:1 large text), 44x44px minimum touch targets, visible keyboard focus rings (`:focus-visible`), and ARIA semantic attributes.
  - **Veto Authority:** Absolute on accessibility regressions.
- **`i18n_multilocale_stylist`**:
  - Enforces bi-directional RTL/LTR readiness, CSS logical properties (`margin-inline-start`), dynamic font metrics for multi-script typography, and 100% extraction into ICU translation catalogs.
- **`ergonomics_cognitive_critic`**:
  - Enforces cognitive load limits (Miller's Law $7 \pm 2$, Hick's Law), prevents cognitive friction, and mandates dual-action confirmation modals or time-bounded undo windows for irreversible destructive operations.

### 1.3 Tier 3: Core Architectural Foundations & Design System
- **`enterprise_info_architect`**:
  - Enforces hierarchical wayfinding ($\le 3$ clicks navigation depth), breadcrumb integrity, ontology consistency, and zero circular redirect loops.
- **`design_systems_lead`**:
  - Enforces 100% design token fidelity. Prohibits unaliased raw hex/RGB color literals, raw pixel values, and bracketed Tailwind arbitrary classes (e.g. `mt-[37px]`).
- **`typography_scale_architect`**:
  - Enforces mathematical modular typographic scales (Major Second through Golden Ratio), optimal line lengths ($45 \text{ to } 85$ characters per line), and readable body line-height ratios ($\ge 1.15$).
- **`visual_balance_density`**:
  - Enforces 0px horizontal layout overflow across all viewports, optical alignment, whitespace rhythm, and responsive breakpoint continuity.
- **`interaction_choreographer`**:
  - Enforces deterministic 5-state component coverage (`empty`, `loading`, `partial`, `full`, `error`) and validates user journey DAGs to prevent unhandled state machine dead-ends.

### 1.4 Tier 4: Sensory Polish, Motion & Tone (Lowest Priority)
- **`color_contrast_specialist`**:
  - Enforces perceptual color spaces (OKLCH, APCA), colorblind-safe palettes (deuteranopia, protanopia, tritanopia), and dark/light mode semantic parity.
- **`motion_haptics_engineer`**:
  - Enforces micro-interaction performance budgets ($\le 300\text{ms}$ duration, $\ge 60\text{fps}$), spring physics damping, and mandatory zero-duration bypass under `@media (prefers-reduced-motion: reduce)`.
- **`microcopy_tone_specialist`**:
  - Enforces brand voice consistency, empathetic and actionable error messaging, and strictly prohibits leaking raw developer stack traces or internal exception identifiers to end users.

---

## 2. Veto & Conflict Precedence Laws

1. **Strict Monotonic Tier Precedence:** Any lower-tier persona recommendation that conflicts with a higher-tier invariant is automatically discarded.
2. **Fail-Closed Halt:** If any Tier 1 or Tier 2 persona issues a veto, the decision state machine transitions immediately to `REJECT_AS_UNSAFE` or `DEFER`.
3. **Deadlock Resolution:** If personas within the same tier cannot reach consensus on mutual trade-offs, an immutable Review Packet MUST be generated for Human-in-the-Loop resolution.

---

## 3. Verification Commands

```bash
# Unit test verification
node --test tests/unit/test-ux-persona-registry.mjs

# 12-persona clean vs adversarial harness
node scripts/harness/ux-persona-registry-harness.mjs
```
