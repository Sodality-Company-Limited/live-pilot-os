# G-WEB-046 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-013.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. All referenced goals and participating services must have green reproducible evidence before cross-service integration. 

## Scenarios
1. Verify the selected authorized demo journey across Portal BFF and both role views.
2. Validate approval; rejection; simulated outcome; disconnect; privacy; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/e2e.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
