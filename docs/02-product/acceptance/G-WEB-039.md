# G-WEB-039 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-009.

## Preconditions
The shared OpenAPI request/response schemas and Portal BFF security rules define this UI boundary. Runtime BFF verification is tracked separately.

## Scenarios
1. Connect proposal submission to Portal BFF using the approved idempotency contract.
2. Validate duplicate submission; validation; pending; timeout; unknown; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/proposeui.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
