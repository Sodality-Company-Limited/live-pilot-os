# G-WEB-025 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-016.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Implement GET /api/live-sessions/{session_id}/events as an authorized SSE boundary.
2. Validate cross-tenant access; disconnect; replay cursor; timeout; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/events.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
