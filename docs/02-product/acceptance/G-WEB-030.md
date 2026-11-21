# G-WEB-030 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-017.

## Preconditions
The shared OpenAPI `LoginRequest`/`LoginResponse` schemas define the UI boundary. This goal validates the browser consumer; runtime BFF integration is tracked separately.

## Scenarios
1. Connect the test-user sign-in screen to the Portal login operation.
2. Validate invalid credentials; rate limit; loading; keyboard; production restriction; no sensitive data or false success is exposed.

## Verification
- [x] `node --test apps/web/tests/loginui.test.mjs` — initial form and simulated-mode rendering.
- [x] App lint and build.
- [ ] Live success, invalid-credential, and rate-limit responses; these require the Portal BFF route and compatible upstream service.
