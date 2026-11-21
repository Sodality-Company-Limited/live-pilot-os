# G-WEB-024 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-017.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Implement POST /api/auth/logout with CSRF protection and correct revocation handling.
2. Validate replay; CSRF; revocation timeout; cookie clearing; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/logout.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
