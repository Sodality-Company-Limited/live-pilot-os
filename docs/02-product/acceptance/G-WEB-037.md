# G-WEB-037 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-004.

## Preconditions
The shared OpenAPI `TopProduct` schema defines every displayed product field.

## Scenarios
1. Display approved catalog details for the selected product in the Host view.
2. Validate unresolved product; missing details; stale stock; locale formatting; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/product.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
