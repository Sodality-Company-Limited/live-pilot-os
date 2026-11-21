# G-WEB-029 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-012.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Implement GET /api/live-sessions/{session_id}/actions with scoped redaction.
2. Validate authorization; sensitive data; empty log; timeout; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/actions.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
