# G-WEB-017 — Orange Theme Refinement Design

## Intent & Architectural Rationale

Make the existing warm dark Live OS interface read clearly as orange-accented. The root `src/tokens.css` is the existing shared color source consumed by both the Next.js app and Storybook, so refining its primary semantic family keeps the two renderers aligned.

## Goals, Non-Goals & Anti-Goals

- Keep the existing dark surfaces and information hierarchy.
- Use an unmistakable orange primary family and apply it visibly to the brand mark and keyboard focus.
- Preserve the existing semantic colors for success, warning, danger, and info.
- Keep all color values in the shared token source.
- Do not add a light theme, theme switch, new UI behavior, API binding, or session state.
- Do not rely on color alone to communicate status.

## Approaches Considered & Rejected Alternatives

| Approach | Benefit | Reason not selected |
|---|---|---|
| Refine primary semantic tokens in `src/tokens.css` and consume them in app styling | One shared source for the app and Storybook; maintains semantic roles | Selected; requires contrast checks for primary states |
| Override colors locally in `apps/web/src/app/globals.css` | Small local change | Rejected because it duplicates the shared theme and can make Storybook/app drift |
| Change only the brand mark while leaving the current primary hue | Very small change | Rejected because focus and other primary consumers would remain red-orange |

## Selected Approach & Trade-off Analysis

Set the primary family to orange around HSL 27°, with near-black foreground on orange fills. Change the brand mark from the muted soft surface to the primary fill so the theme is immediately visible; the existing focus rule already consumes the semantic focus token. The orange fill and foreground pair must meet 7:1, including hover and pressed states. This keeps the high-contrast target while retaining the current dark surfaces.

## Bounded Context & Touch Map Invariants

- Bounded context: Live OS presentation only.
- Allowed files: `src/tokens.css`, `apps/web/src/app/globals.css`, the listed visual specification files, and G-WEB-017 evidence/specifications.
- App and Storybook continue to import the same token stylesheet.
- No source outside the goal touch map is modified for the theme.

## UI Structure and State

No page region, copy, session state, or interaction changes. The brand mark becomes orange with its near-black semantic foreground. Keyboard focus remains a 3px outline using the orange focus token. Status colors and labels are unchanged.

## Acceptance Test & TDD Verification Strategy

1. `npm --prefix apps/web run build` and `npm --prefix apps/web run storybook:build` must pass.
2. `npm --prefix apps/web run lint` must pass.
3. `node scripts/harness/token-guardrail-harness.mjs` and `node scripts/harness/ui-spec-conformance-harness.mjs` must pass.
4. Calculate relative luminance for primary, hover, and pressed fills against the near-black primary foreground; require at least 7:1.
5. Review Host and Live Ops stories for visible orange accent, visible keyboard focus, no horizontal overflow, and zero Storybook accessibility violations.

These checks verify the visual theme only; they do not verify API or platform behavior.
