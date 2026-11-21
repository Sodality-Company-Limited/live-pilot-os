# G-WEB-017 — Invariants Specification

## Invariants

1. **One source:** App and Storybook consume color values from `src/tokens.css`; no duplicated token values are introduced.
2. **Dark surfaces:** The current dark background and elevation hierarchy remain dark.
3. **Orange primary:** Primary, hover, pressed, soft, foreground, and focus roles describe one orange accent family.
4. **Text contrast:** Every normal-text/background pair meets a WCAG contrast ratio of at least 7:1.
5. **Status semantics:** Success, warning, danger, and info tokens remain semantically distinct and unchanged.
6. **No color-only status:** Existing status labels and accessible names remain present.
7. **No behavior change:** Screen anatomy, unavailable data, session state, and API behavior remain unchanged.

## Verification mapping

| Invariant | Evidence |
|---|---|
| 1–3 | Source review and rendered comparison of app and both Storybook stories |
| 4 | Token guardrail and explicit relative-luminance contrast calculation |
| 5–7 | UI-spec conformance and source review |
| Accessibility and responsive layout | Storybook accessibility review and responsive visual review |

These are executable visual invariants, not formal proofs of application correctness.
