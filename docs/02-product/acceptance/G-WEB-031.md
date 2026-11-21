# G-WEB-031 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-017.

## Preconditions
The shared OpenAPI `AuthSession` schema defines the UI boundary. This goal validates role gating; runtime BFF integration is tracked separately.

## Scenarios
1. Gate the role views using the authenticated session returned by Portal BFF.
2. Validate no session; wrong role; expired session; no browser role trust; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/accessui.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
