# G-WEB-044 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-016.

## Preconditions
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. The Portal BFF inventory has no start/pause/replay/reset operation; reconcile ownership and contracts before implementation. 

## Scenarios
1. Connect simulation controls only after their shared-session contract is approved.
2. Validate start; pause; replay; reset confirmation; missing contract; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/controls.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
