# G-WEB-034 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-016.

## Preconditions
The shared RealtimeEvent schema and frozen realtime transport SOT define this UI boundary. Runtime stream verification is tracked separately.

## Scenarios
1. Connect the role view to the authorized session event stream with replay semantics.
2. Validate duplicate event; stale sequence; disconnect; replay unavailable; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/eventsui.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
