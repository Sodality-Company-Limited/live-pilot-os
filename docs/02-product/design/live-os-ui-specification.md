# Live OS UI specification

**Status:** Approved on 2026-11-21<br>
**UX flow:** [Live OS UX flow](../../03-architecture/ux/live-os-ux-flow.md)<br>
**Pain:** P-001 · **Evidence:** E-001

## Review decisions — 2026-11-21

- Earlier review selected one combined session status indicator. On 2026-11-21, the requester subsequently removed that indicator and chose not to display a simulation label on the current empty shell.
- Live Ops Pause pauses or resumes the simulated scenario only. It is not the Emergency Pause control in REQ-LP-014, which is outside the selected Hackathon scope.
- The Host cue has one action, **Ignore**. Ignoring hides the current cue from the active cue area; it does not send a response or change the shared session. There is no separate Dismiss action.
- The requester approved the screen anatomy, shared UI rules, screen states, and responsive behavior on 2026-11-21.
- On 2026-11-21, the requester chose not to show a simulation label on the current empty shell. This does not establish a production exception for actual simulated playback, which remains subject to the software-quality SOT.
- On 2026-11-21 the requester requested a clearer orange accent on the existing dark theme. G-WEB-017 records the token refinement; screen anatomy, status meanings, and behavior remain unchanged.
- Responsive layout follows the canonical UX SOT: compact under 768px, tablet 768–1279px, desktop 1280px and up, wide 1440px and up; minimum supported width is 390px.

## Host page

| Component | Anatomy and behavior | States / accessibility |
|---|---|---|
| Session header | Live OS title and Host/Live Ops view switch. The current empty shell has no visible simulation label by requester decision; it makes no production-platform status claim. | View switch is keyboard-operable and identifies the current page. |
| Live stage | 9:16 video area with chat overlaid; playback state and accessible player controls. | Empty/loading/error/partial/success per UX flow; chat has a bounded live region that announces new messages without rereading history. |
| Audience topic log | Persistent, timestamped topic entries with intent labels and counts. New items append; prior items stay visible. | Empty guidance; partial data labeled; keyboard-scrollable with stable focus. |
| Product signals | Interested viewers, clicks, add-to-cart, price, stock for the product linked to the selected topic. | Blank until activity; label units and distinguish unavailable from zero. |
| Host cue | Suggested response/talking point, updated only when topic or decision meaningfully changes. | Label as AI suggestion; provide one Ignore action that hides the active cue without sending speech or changing session state. |

## Live Ops page

| Component | Anatomy and behavior | States / accessibility |
|---|---|---|
| Session controls | Start, pause/resume simulated playback, replay, reset shared scenario. Confirm reset because it clears demo activity. Pause affects playback only; it is not an Emergency Pause control. | Disable unavailable actions with an explained reason; keyboard-operable, target ≥44×44px. |
| Live stage and chat | Same 9:16 simulated video/chat and session state as Host. | Same feed states and announcement rules as Host. |
| Audience topics and product signals | Same topic history and product figures as Host. | Show freshness/availability; do not treat missing numbers as zero. |
| Offer guardrails | Proposed price/discount, contribution margin, configured threshold, stock check, and explicit pass/block. | Missing inputs fail closed; status text/icon accompanies color. |
| Decision trace | Append proposal, check results, and pass/block outcome in time order. | Stable history; new result announced once; errors include recovery guidance. |

## Shared component rules

- Shared session is the source for both role views; mock scenario events are labeled as simulated.
- Use semantic tokens from `src/tokens.css`; no raw color or spacing values in components.
- Use CSS variables as the source of truth and map semantic names into Tailwind when app configuration is added.
- User-facing copy uses typed message keys; the Hackathon surface renders English (`en-US`) copy following the request on 2026-11-21, with no locale switch.
- Buttons expose default, hover, focus-visible, active, disabled, loading, and error states.
- Text contrast: WCAG 2.2 AA for normal text (4.5:1), as approved for the Live OS Hackathon surface on 2026-11-21; touch targets are at least 44×44px. Motion honors reduced-motion settings.
- Use the shared Shopee orange primary token for headings, the live frame, and the selected view; use its near-black foreground on orange fills. Use the lighter focus token and keep success, warning, danger, and info colors semantic.
- Use English labels and format currency and stock units for the selected locale; announce changes without color-only meaning.
