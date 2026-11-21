# G-WEB-040 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-013.

## Preconditions
The shared OpenAPI request/response schemas and Portal BFF security rules define this UI boundary. Runtime BFF verification is tracked separately.

## Scenarios
1. Connect approval or rejection to Portal BFF with correct pending and conflict states.
2. Validate approve; reject; optional reason; duplicate; conflict; unknown; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/decisionui.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
