# G-WEB-028 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-008.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Implement GET /api/promotions/{promotion_id} with privacy-safe authorization.
2. Validate tenant isolation; stale; unavailable; pending and unknown; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/promotion.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
