# G-WEB-017 — Architecture Specification

## Outcome

Make the Live OS Host and Live Ops surfaces visibly orange-accented while retaining the existing dark theme and shared token source.

## Source authority

- [Requirements baseline](../../../live-pilot-os-requirements.md) — `REQ-LP-016`.
- [Architecture overview](../../../overview.md) and [technical specifications](../../../technical-specifications-sot.md).
- [UX flow](../../../ux/live-os-ux-flow.md), [UI specification](../../../../02-product/design/live-os-ui-specification.md), and [token guide](../../../ux/live-os-design-tokens.md).
- [Canonical web tokens](../../../../../src/tokens.css).
- [Localization SOT](../../../localization-sot.md) — WCAG 2.2 AAA normal-text target.

## Boundary

This goal changes only visual colors. It adds no API, identity, event, session, business-rule, or commerce-platform behavior. The existing Next.js app and Storybook stories remain the inbound renderers; there are no outbound adapters.

## Token and rendering design

- `src/tokens.css` remains the single color source.
- Preserve semantic token names and the existing dark surface hierarchy.
- Refine the primary token family to a recognizable orange; consume it in the app's brand mark and focus treatment.
- The app and Storybook preview already import the same global stylesheet and token source.
- Keep success, warning, danger, and info token roles unchanged.

## Verification boundary

App and Storybook builds prove compilation. Token/contrast and accessibility checks prove the declared visual constraints for the inspected revision. No check certifies API or platform behavior.

## Approval

On 2026-11-21 the requester explicitly asked for a dark theme with an orange accent. This goal records that visual refinement; it does not add theme selection or new product behavior.
