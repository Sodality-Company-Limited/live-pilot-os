# Live OS information architecture and UX flow

**Status:** IA, high-level journey, and UI behavior approved on 2026-11-21<br>
**Pain:** [P-001](../../02-product/knowledge-map.json) · **Evidence:** E-001<br>

**User & job:** Host needs to understand audience interest and respond while presenting; Live Ops needs to monitor the same session and assess offers.<br>
**Success:** In one demo scenario, a chat message becomes an audience topic and product signal, Live Ops makes an offer decision, and the corresponding Host cue appears in the shared session.<br>
**Constraints:** Warm dark surfaces with a clear orange primary accent; simulated 9:16 live video and chat; separate Host and Live Ops views; responsive bento layout; do not imply a real platform connection.

## IA review decision

- **Decision:** Approved by the requester on 2026-11-21.
- **Approved scope:** The separate Host and Live Ops views over one shared simulated session, the screen regions summarized for each role, and the high-level journey from session/chat signals through Live Ops review to the resulting Host cue.
- **Follow-up visual direction:** The requester asked for a clearer orange accent on the existing dark theme on 2026-11-21; G-WEB-017 records the token and app accent refinement without changing IA or behavior.
- **Still draft:** Design-token changes and any behavior outside the approved [UI specification](../../02-product/design/live-os-ui-specification.md) require a separate review.

## Flow

1. Live Ops opens a scenario and starts, pauses/resumes, replays, or resets the shared simulation.
2. Both roles see the same 9:16 mock video and chat stream; chat is overlaid on the video.
3. A chat message contributes to the persistent audience-topic log and the related product signals.
4. Live Ops reviews the offer against price/discount, margin, threshold, and stock guardrails.
5. A pass/block result is recorded; a meaningful result updates the Host cue without replacing the topic history.
6. Reset clears the simulated chat, topic history, metrics, and decision trace.

## Screen states

| State | Host | Live Ops |
|---|---|---|
| **Empty** | Before playback: explain that no viewer messages/topics have arrived; show featured product details; activity metrics remain blank. | Same empty feed and product context; scenario controls remain available. |
| **Loading** | Video/scenario is preparing; retain layout and show a labeled stage placeholder. | Show preparation status; disable only controls that cannot safely run yet. |
| **Error** | Explain that the simulated feed failed and offer retry; preserve the last topic log and metrics. | Explain the failed scenario/check and recovery action; preserve prior decision trace. |
| **Partial** | Show whichever of video, chat, topic, or product signals are available, with stale/missing indicators. | Same partial session data; mark unavailable guardrail inputs and block offer approval when required data is missing. |
| **Success** | Video and chat run; topic log persists; product signals show interested viewers, clicks, add-to-cart, price, and stock; Host cue changes only when materially relevant. | Shared video/chat and metrics run; offer checks and append-only decision trace are visible. |

## Wireframe and responsive behavior

The live stage is the dominant bento tile. Supporting tiles contain audience topics, product signals, Host cue, scenario controls, offer guardrails, and decision trace. Tile size follows importance and available space; no fixed tile or column count is prescribed.

| Viewport | Reflow |
|---|---|
| **compact — under 768px** | One-column priority view; stage first, then primary controls, topics, and product signals. Secondary operations panels become labeled drawers. Minimum supported viewport is 390px; no horizontal scrolling. |
| **tablet — 768–1279px** | Two-column layout; collapse chat and evidence panels by priority while keeping offer checks and results together. |
| **desktop — 1280px and up** | Full bento layout with stage, signals, controls, and trace visible. |
| **wide — 1440px and up** | Expand evidence/trace columns without changing information hierarchy. |

These breakpoints follow the canonical [Responsive Layout SOT](responsive-layout-sot.md).

DOM, screen-reader, and keyboard order: session header → live stage/chat → audience topics → product signals → Host cue (Host) / offer guardrails → decision trace (Live Ops) → secondary controls. Each control has an accessible name and visible focus; state changes are announced without repeatedly announcing the whole log. Respect `prefers-reduced-motion`.

## Decisions carried forward

- One warm dark theme with a clear orange primary accent.
- Host and Live Ops are separate role views over one shared simulated session.
- Video and chat are mocked for the pitch; no live platform integration is claimed.
- Audience topics remain in a log; repeated chat does not replace prior topics.
- Product signals: interested viewers, clicks, add-to-cart, price, and stock.
- Use Motion for React for purposeful transitions; avoid animating layout dimensions.

## Gate

The IA, high-level journey, component anatomy, control behavior, screen states, and responsive behavior are approved as recorded in this document and the UI specification. Changes to design tokens or behavior beyond that approved scope require a separate review.
