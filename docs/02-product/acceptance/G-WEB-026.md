# G-WEB-026 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-009.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Implement POST /api/live-sessions/{session_id}/promotions without treating acceptance as issuance.
2. Validate CSRF; idempotency; rejected policy; timeout; unknown; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/proposal.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
