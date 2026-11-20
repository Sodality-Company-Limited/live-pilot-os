# LivePilot OS — UI Component Contract SOT

> **Status:** Required authority for component-first implementation.

Every component has one record with:

| Field | Required |
|---|---|
| Component ID/owner | Stable ID and responsible team |
| Purpose | User outcome and non-goals |
| Props/data | Typed inputs, API DTO, freshness, sensitivity |
| Events | User actions and emitted telemetry |
| Variants | Approved visual/behavior variants only |
| States | Loading, empty, ready, pending, success, rejected, failed, unknown, paused |
| Accessibility | Role, name, keyboard, focus, live-region behavior |
| Localization | Message keys, plural/select variables, expansion rules |
| Responsive | Breakpoint and composition behavior |
| Dependencies | API operation, realtime event, design tokens |
| Tests | TDD/UI test IDs and visual baseline |

Components must not own domain policy, authorization, financial calculations, or
external platform protocol. They render server-authoritative state and explicit
simulation/pending/unknown labels.
