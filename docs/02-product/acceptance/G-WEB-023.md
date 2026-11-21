# G-WEB-023 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-017.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Implement GET /api/auth/session using the server-managed cookie context.
2. Validate valid session; expiry; revoked session; sensitive data; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/sessionread.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
