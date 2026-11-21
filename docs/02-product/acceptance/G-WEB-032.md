# G-WEB-032 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-017.

## Preconditions
The documented 204/401 responses and Portal BFF CSRF rule define this UI boundary. Runtime route verification is tracked separately.

## Scenarios
1. Connect a sign-out control to the Portal logout operation.
2. Validate CSRF; pending; error; successful revocation; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/logoutui.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
