# G-UX-042 UI State Machine

## Session states

| Current | Trigger | Guard | Next | Visible result |
|---|---|---|---|---|
| Empty | Start scenario | Fixture available | Loading | Stage placeholder; controls reflect preparation. |
| Loading | Fixture ready | Session data valid | Running | Portrait video/chat and topic stream appear. |
| Loading | Feed error | — | Error | Explain retry; preserve any prior log. |
| Running | Pause | — | Paused | Stop automatic chat/action progression. |
| Paused | Resume | No emergency condition | Running | Continue from current session state. |
| Running | Check offer | Inputs complete | CheckingOffer | Show pending check. |
| CheckingOffer | Guard passes | Fixture valid | OfferPassed | Append pass result; update Host cue. |
| CheckingOffer | Guard fails/missing | — | OfferBlocked | Append block rationale; no external side effect. |
| Any active | Confirm reset | User confirms | Empty | Clear the local simulated session. |
| Any | Role switch | — | Same state | Render same session in the selected role view. |

## Transition rules

- Invalid transitions are ignored with accessible feedback; they do not mutate session data.
- Role switching is a presentation transition and never resets runtime state.
- Reset requires confirmation and affects only local demo state.
- Emergency pause blocks automation until explicit resume; it does not clear the audit trace.
