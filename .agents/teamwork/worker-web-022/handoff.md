# Terminal Handoff: worker-web-022 (G-WEB-022)

- **Status:** `COMPLETE`
- **Goal ID:** `G-WEB-022` (Portal Login Route)
- **Persona:** `Next.js & API Route Engineer`

## Summary of Changes

1. **Goal Card (`docs/07-backlog/goals/G-WEB-022.md`):**
   - Updated frontmatter `status: in_progress`, `lifecycle.spec: ready`, `lifecycle.implementation: in_progress`.
   - Updated body status to `in_progress`, phase indicator to `EXECUTE`, Step 1 status to `in_progress`, Step 2 `**Zero-Mock invariant check:**` to reflect real cryptographic verification and fail-closed checks, and added `design.md` to the Change delta table.
2. **Pre-Execution Design (`docs/03-architecture/specs/goals/G-WEB-022/design.md`):**
   - Created Invariant 13 design specification covering architectural rationale, goals/non-goals, rejected alternatives, validation/security trade-offs, touch map invariants, and TDD verification strategy.
3. **Portal Login Route (`apps/web/src/app/api/auth/login/route.ts`):**
   - Implemented `POST /api/auth/login` (`force-dynamic`) accepting JSON `{ username, password, requested_role }`.
   - Rejects production execution (`NODE_ENV === "production"` without `LIVEPILOT_ENABLE_TEST_LOGIN=true`) with `403 { ok: false, error: "PRODUCTION_REJECTED" }`.
   - Validates strict request shape and required fields (`username`, `password`, `requested_role` in `{"HOST", "LIVE_OPS"}`), rejecting missing/invalid/unknown fields or malformed JSON with `400 { ok: false, error: "BAD_REQUEST" }`.
   - Enforces sliding-window rate limiting (`429 { ok: false, error: "RATE_LIMITED" }` + `Retry-After`).
   - Verifies demo `HOST`/`LIVE_OPS` credentials via `scryptSync` + `timingSafeEqual` (including dummy hash timing normalization for unknown usernames) and checks `account.role === requested_role`, rejecting mismatches with `401 { ok: false, error: "INVALID_CREDENTIALS" }`.
   - Issues signed `PortalSessionPrincipal` cookie via `signSessionCookie` from `apps/web/src/lib/session-context.ts` and returns `200 { ok: true, session: { role, userId, tenantId, mode } }` with `Set-Cookie: livepilot_session=<signed_cookie>; Path=/; HttpOnly; SameSite=Lax` (plus `; Secure` on HTTPS requests) and `Cache-Control: no-store`.
4. **Verification Suite (`apps/web/tests/login.test.mjs`):**
   - Implemented 6 `node:test` suites covering valid `HOST`/`LIVE_OPS` login + cookie verification via `verifySessionCookie` + `Secure` flag on HTTPS; invalid password & role mismatch (`401`); missing/invalid fields & malformed JSON (`400`); unknown role (`400`); rate limiting (`429`); and production-mode rejection (`403`).

## Verification Results

- `node apps/web/tests/login.test.mjs` — **PASS** (`6` passed, `0` failed)
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-WEB-022.md` — **PASS** (`51/51` sections & invariants passed)
- `node scripts/harness/architecture-design-conformance-harness.mjs G-WEB-022` — **PASS** (`9/9` checks passed)
- `npm --prefix apps/web run lint` — **PASS**
- `npm --prefix apps/web run build` — **PASS** (`ƒ /api/auth/login` compiled & typechecked)

## Checked Acceptance Criteria

- [x] Implement `POST /api/auth/login` for the local or simulated test adapter only.
- [x] Given unavailable, unauthorized, or invalid inputs, the outcome follows the failure contract and does not disclose sensitive data.
- [x] Focused verification covers valid login + signed cookie, invalid credentials, missing fields, unknown role, rate limit, secure cookie, and production rejection.

## Next Action

- Orchestrator may advance `G-WEB-022` to `REVIEW` / closure (`node ./cli.js goal close G-WEB-022`) and terminate this ephemeral worker.
