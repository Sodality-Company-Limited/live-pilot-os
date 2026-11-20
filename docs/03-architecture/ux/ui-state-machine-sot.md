# LivePilot OS — UI State Machine SOT

> **Status:** Canonical rendering contract for asynchronous and consequential UI.

Every screen and consequential component supports only declared state transitions.

```text
idle → loading → empty | ready | failed
ready → pending → success | rejected | failed | unknown
ready → paused | expired | offline
unknown → reconciling → success | failed | unknown
```

Rules:

- `pending`, `unknown`, `failed`, and `simulated` are never rendered as success.
- A stale realtime update cannot regress a newer state/version.
- Emergency pause blocks new consequential actions and shows propagation status.
- Retry preserves idempotency and reconciles unknown external outcomes first.
- Every state has accessible text, visual treatment, keyboard behavior, and localization key.
