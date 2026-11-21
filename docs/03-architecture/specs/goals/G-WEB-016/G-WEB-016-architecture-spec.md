# G-WEB-016 — Architecture Specification

## Outcome

Provide separate, reviewable Host and Live Ops presentation shells in Storybook for the simulated session in `REQ-LP-016`.

## Source authority

- [Requirements baseline](../../../live-pilot-os-requirements.md) — `REQ-LP-016`.
- [Project brief](../../../../02-product/project-brief.md) — Solution and Core journey.
- [Hackathon UI direction](../../../live-pilot-os-tech-stack.md) — Next.js App Router + TypeScript, simulated UI, warm dark theme.
- [UX/UI SOT index](../../../ux/README.md), [IA](../../../ux/information-architecture-sot.md), [flow](../../../ux/live-os-ux-flow.md), and [UI specification](../../../../02-product/design/live-os-ui-specification.md).
- [Localization SOT](../../../localization-sot.md).

## Boundary

The deliverable is presentation only. Its inbound renderers are the Next.js route and Storybook. It has no outbound API, event, identity, or marketplace adapter. The backend team remains the owner of the API specification and contract. This goal must not infer an API shape from an endpoint name or mock an API response.

## Workspace and styling

- Confirmed workspace: `apps/web/`; the requester approved this location on 2026-11-21.
- Proposed framework: Next.js App Router + TypeScript, as specified for the Hackathon UI.
- Shared style authority: import repository `src/tokens.css`; do not copy token values or change the token contract in this goal.
- Storybook contains one Host shell story and one Live Ops shell story. Their regions come from the approved UI specification, not from new IA decisions.

## Runtime and evidence

The app and static Storybook build are the finite technical verification. Manual review checks approved anatomy, Thai text/font rendering where present, semantic landmarks, visible keyboard focus for controls, token sourcing, and truthful unavailable-data labels. A green build does not prove API or platform behavior.

## Approval gate

The role split, shell regions, high-level journey, component anatomy, and interaction rules were approved on 2026-11-21 and are recorded in the UX flow and UI specification. The requester confirmed `apps/web/` as the frontend workspace on the same date. The technology direction is already stated for the Hackathon; this goal does not approve production architecture.
