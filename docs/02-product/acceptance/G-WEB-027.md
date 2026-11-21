# G-WEB-027 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-013.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Implement POST /api/promotions/{promotion_id}/decision with authorized idempotent decision handling.
2. Validate CSRF; authority; version conflict; duplicate; unknown; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/decision.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
