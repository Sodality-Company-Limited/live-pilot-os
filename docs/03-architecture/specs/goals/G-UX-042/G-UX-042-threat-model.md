# G-UX-042 UI Threat Model

> Scope is a local Hackathon demo. No account, backend, or platform adapter is included.

| Threat | Boundary | Mitigation / acceptance |
|---|---|---|
| Malicious-looking chat fixture rendered as markup | Viewer-supplied text → UI | Render chat as text; do not inject HTML. |
| Unexpected local file type or oversized media | User file picker → browser | Validate video MIME/type and reasonable size; show a recoverable error; release object URL on replacement/reset. Exact size limit is set during implementation and recorded. |
| Accidental media upload | Browser UI → network | No upload path exists; verify via browser network inspection. |
| Demo action mistaken for real platform action | UI copy/status | Persistent simulated labels on video, chat, offer result, and adapter/action trace. |
| Stale/missing product or margin fixture shown as valid | Fixture → decision UI | Missing required guardrail data blocks pass; label mock fixture values and timestamps. |
| Motion causes discomfort or hides state | UI animation | Respect `prefers-reduced-motion`; no essential content depends on animation. |

## Explicit non-goals

Authentication, authorization, persistent storage, network API security, platform tokens, and real payment/stock safety are outside this goal and require separate goals before real integrations.
