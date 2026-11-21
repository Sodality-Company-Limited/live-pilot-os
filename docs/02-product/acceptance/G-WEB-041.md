# G-WEB-041 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-013.

## Preconditions
The shared `Promotion` schema defines status fields. Rejection reason is not part of that DTO; runtime BFF verification is tracked separately.

## Scenarios
1. Show server-confirmed promotion status from the API-defined `Promotion` DTO in the authorized role view.
2. Validate pending; rejected; unknown; stale; no false issuance; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/promotionui.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
