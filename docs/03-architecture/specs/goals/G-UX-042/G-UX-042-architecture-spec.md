# G-UX-042 Architecture Specification

> Status: Draft; no implementation until G-UX-041 design approval.

## System boundary

This is a browser-only demo UI. Next.js provides the application shell; React components render the Host and Live Ops views; a deterministic in-memory session model is the shared data source. The UI does not call marketplace, video, chat, or backend services.

## Proposed structure

| Area | Proposed path | Responsibility |
|---|---|---|
| App shell | `src/app/` | Layout, route/view entry, theme loading. |
| Role views | `src/components/live-os/` | Host and Live Ops presentation. |
| Shared state | `src/lib/live-os/` | Session, chat/topic updates, offer outcome, pause/reset. |
| Fixtures | `src/data/live-os-demo.ts` | Deterministic simulated session, product, and offer inputs. |
| Tokens | `src/tokens.css` | CSS variable values and one dark theme. |
| Browser smoke | `scripts/ui-smoke/live-os-demo.mjs` | End-to-end user-visible scenario. |

These are planned additions, not existing modules. Adjust only if the selected Next.js setup requires a documented path change.

## Data flow

```text
deterministic demo fixture
  → shared session state
  → Host view ───────────────┐
  → Live Ops view             ├─ role switch keeps same state
      → local offer decision ┘
      → append-only decision trace
```

## External ports

None. Local video selection uses browser object URLs only and is never uploaded or persisted by this goal. All offer outcomes are local demo decisions.

## Design authority

Follow [G-UX-041 UX flow](../../../ux/G-UX-041.md), [UI spec](../../../../02-product/design/G-UX-041.md), and [token proposal](../../../ux/live-os-design-tokens.md). The UI must preserve the draft's explicitly simulated boundary until the design and any later integration are separately approved.
