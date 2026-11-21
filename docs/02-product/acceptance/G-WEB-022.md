# G-WEB-022 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-017.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Implement POST /api/auth/login for the local or simulated test adapter only.
2. Validate invalid credentials; rate limit; production rejection; secure cookie; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/login.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
