# G-WEB-035 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-001.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. 

## Scenarios
1. Render the authorized audience-topic history and approved interest ratio.
2. Validate empty; partial; no duplicate entries; unknown ratio; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/topics.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
