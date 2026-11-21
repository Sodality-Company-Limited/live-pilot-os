# G-WEB-033 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-003.

## Preconditions
The shared OpenAPI schemas define this UI boundary. Runtime BFF verification is tracked separately.

## Scenarios
1. Load the authorized overview for the active session into the role presentation boundary.
2. Validate loading; partial; error; tenant/session change; no invented metrics; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/overviewui.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
