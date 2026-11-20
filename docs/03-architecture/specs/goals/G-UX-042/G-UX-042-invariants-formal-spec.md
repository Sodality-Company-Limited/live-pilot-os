# G-UX-042 UI Invariants

> These are executable UI behavior invariants, not mathematical formal-proof claims.

| ID | Invariant | Verification |
|---|---|---|
| UX042-I1 | Host and Live Ops read the same session state. | Switch roles after events and compare visible session IDs, topic entries, metrics, and trace. |
| UX042-I2 | Incoming topics append; only a confirmed reset clears the current simulated history. | Deliver multiple events and inspect order/history before and after reset. |
| UX042-I3 | Unknown/missing numeric values are not rendered as zero. | Omit each optional fixture value and inspect labels/state. |
| UX042-I4 | An offer cannot show pass when a required guardrail input is missing or the fixture is below its configured threshold. | Run missing-data and below-floor fixtures. |
| UX042-I5 | Paused session state emits no subsequent automated demo action. | Pause, advance the fixture clock, and assert no new pin/offer/trace action occurs. |
| UX042-I6 | Every simulated video/chat/offer state is labeled simulated; no UI claims a live marketplace result. | Content and browser-network review. |
| UX042-I7 | Theme and component colors use semantic CSS variables from `src/tokens.css`. | Search component styles for raw palette values; inspect rendered theme. |
| UX042-I8 | Local video is not uploaded or persisted. | Inspect network requests and browser storage during file selection. |

## Proof level

Acceptance and browser automation provide empirical evidence. They do not prove marketplace correctness or formal system safety.
