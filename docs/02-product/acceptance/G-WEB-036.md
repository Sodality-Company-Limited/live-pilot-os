# G-WEB-036 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-004.

## Preconditions
The shared OpenAPI `LiveSessionOverview` schema defines displayed fields. It has no freshness field, so the UI does not infer stale or fresh state. Local Ignore is view-only and has no API effect.

## Scenarios
1. Render an authoritative Host suggestion and allow local Ignore without changing session state.
2. Validate empty; unknown; server-dismissed; local-hidden; unavailable; accessible announcement; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/cue.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
