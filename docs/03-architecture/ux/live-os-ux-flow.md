# Live OS information architecture and UX flow

**Status:** Design draft · awaiting product/design approval<br>
**Pain:** [P-001](../../02-product/knowledge-map.json) · **Evidence:** E-001<br>

**User & job:** Host needs to understand audience interest and respond while presenting; Live Ops needs to monitor the same session and assess offers.<br>
**Success:** In one demo scenario, a chat message becomes an audience topic and product signal, Live Ops makes an offer decision, and the corresponding Host cue appears in the shared session.<br>
**Constraints:** Shopee warm-dark visual direction; simulated 9:16 live video and chat; separate Host and Live Ops views; responsive bento layout; do not imply a real platform connection.

## Flow

1. Live Ops opens a scenario and starts, pauses, replays, or resets the shared simulation.
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
| **sm — 640px** | One-column reading order. Stage first; controls and primary action next; topics and product signals follow. Operations details can be disclosed in a labeled collapsible section. |
| **md — 768px** | Stage remains prominent; supporting tiles can form a second column where space permits. Keep offer check and result together. |
| **lg — 1024px and up** | Variable-size bento canvas. Preserve video prominence and keep the topic log, product signals, and Host cue visible without scrolling where the target viewport allows. |

DOM, screen-reader, and keyboard order: session header → live stage/chat → audience topics → product signals → Host cue (Host) / offer guardrails → decision trace (Live Ops) → secondary controls. Each control has an accessible name and visible focus; state changes are announced without repeatedly announcing the whole log. Respect `prefers-reduced-motion`.

## Decisions carried forward

- One warm dark theme with Shopee orange accent.
- Host and Live Ops are separate role views over one shared simulated session.
- Video and chat are mocked for the pitch; no live platform integration is claimed.
- Audience topics remain in a log; repeated chat does not replace prior topics.
- Product signals: interested viewers, clicks, add-to-cart, price, and stock.
- Use Motion for React for purposeful transitions; avoid animating layout dimensions.

## Gate

This is an unapproved design draft. Treat it as a reference until Product/Design reviews it.
