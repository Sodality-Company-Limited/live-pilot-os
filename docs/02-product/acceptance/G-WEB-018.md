# G-WEB-018 — Acceptance contract

- **Goal:** G-WEB-018 — Serve an Authorized Session Overview through Portal BFF
- **Status:** planned; verification has not been run.
- **Requirement:** REQ-LP-003, REQ-LP-016
- **Preconditions:** Do not execute until overview schema, error mapping, session/transport interfaces, and independently green upstream service and Core BFF evidence are available. Review the route prefix boundary and current Next.js documentation first.

## Scenarios
1. Given a valid server-authenticated actor with session visibility and an approved complete upstream response, the route returns 200 with the approved versioned DTO and correlation lineage.
2. Given no valid session, forged browser authority, or a session outside the actor scope, the route follows the approved privacy-safe error contract and reveals no session data.
3. Given a partial, stale, malformed or timed-out upstream response, the route returns only the documented partial/error outcome and never fabricates values or success.
4. The response excludes raw viewer IDs, COGS, secrets, provider payloads and internal error details; no browser-provided tenant or role is trusted.

## Verification
- [ ] `node --test apps/web/tests/session-overview-route.test.mjs` after the new test exists: authorized read; unauthenticated access; forged role/tenant; inaccessible session; sensitive-field redaction; malformed DTO; upstream timeout; approved stale/partial representation and correlation propagation.
- [ ] `npm --prefix apps/web run lint` and `npm --prefix apps/web run build` after implementation.
- [ ] Record revision-bound evidence and any unavailable upstream separately; no release is certified by this draft.
