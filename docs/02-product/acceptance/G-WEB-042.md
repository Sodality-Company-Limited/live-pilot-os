# G-WEB-042 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-012.

## Preconditions
The shared OpenAPI action-log schemas define this UI boundary. Runtime BFF verification is tracked separately.

## Scenarios
1. Display the scoped decision and action log without exposing internal evidence.
2. Validate empty; ordered records; failure; redaction; inaccessible session; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/actionui.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
