# G-WEB-022 Pre-Execution Design Specification (Invariant 13)

## 1. Intent & Architectural Rationale

Provide a fail-closed, local/simulated Portal Login Route (`apps/web/src/app/api/auth/login/route.ts`) at the Portal BFF boundary (`apps/web`). Browser login requests submit credentials and a requested portal role (`HOST` or `LIVE_OPS`), which are validated strictly against schema bounds, verified using constant-time `scrypt` password verification, and bound to a server-derived `PortalSessionPrincipal` signed via `signSessionCookie` from [session-context.ts](file:///Users/batrarethsudprasert/projects/live-pilot-os/apps/web/src/lib/session-context.ts). In production (`NODE_ENV === "production"` without explicit simulation opt-in), the test login adapter fails closed to prevent unauthorized simulated credential bypass.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Implement `POST /api/auth/login` receiving JSON `{ username, password, requested_role }`.
  - Validate inputs strictly: require non-empty trimmed `username`, non-empty `password`, valid `requested_role` (`"HOST"` or `"LIVE_OPS"`), and reject missing/unknown fields or malformed JSON with `400 { ok: false, error: "BAD_REQUEST" }`.
  - Verify demo host/ops credentials with `scryptSync` + `timingSafeEqual` and verify account role matches `requested_role`; reject invalid credentials with `401 { ok: false, error: "INVALID_CREDENTIALS" }`.
  - Enforce rate limiting (`429 { ok: false, error: "RATE_LIMITED" }`) and production-mode rejection (`403 { ok: false, error: "PRODUCTION_REJECTED" }`).
  - Issue a signed session cookie via `signSessionCookie` and return `200 { ok: true, session: { role, userId, tenantId, mode } }` with `Set-Cookie: livepilot_session=<signed_cookie>; Path=/; HttpOnly; SameSite=Lax` (plus `; Secure` on HTTPS requests).
- **Non-Goals / Anti-Goals:**
  - Production OIDC/WebAuthn provider flows or direct PostgreSQL/Redis queries from Next.js routes.
  - Trusting client-supplied `userId`, `tenantId`, or unverified role overrides.
  - Returning plaintext passwords, password hashes, signing secrets, or stack traces in HTTP responses.

## 3. Approaches Considered & Rejected Alternatives

1. **Unsigned Cookie or Client-Supplied Principal Fields (Rejected):** Allows arbitrary tampering of `role` and `tenantId` in the browser, violating [portal-bff/README.md](file:///Users/batrarethsudprasert/projects/live-pilot-os/docs/03-architecture/api/portal-bff/README.md).
2. **Plaintext String Equality on Credentials (Rejected):** Leaks timing side channels and violates credential-handling invariants.
3. **Strict Schema Validation + `scryptSync`/`timingSafeEqual` + `signSessionCookie` (Selected):** Enforces fail-closed input validation, constant-time password verification, server-derived `PortalSessionPrincipal`, bounded rate limiting, and `HttpOnly; SameSite=Lax` cookie issuance.

## 4. Selected Approach & Trade-off Analysis

- **Request Validation Order:**
  1. Check production-mode boundary (`NODE_ENV === "production"` without explicit simulation flag -> `403 PRODUCTION_REJECTED`).
  2. Parse JSON body safely; verify plain object with exact allowed keys (`username`, `password`, `requested_role`), non-empty strings, and valid `requested_role` in `{"HOST", "LIVE_OPS"}` -> `400 BAD_REQUEST`.
  3. Enforce sliding-window rate limit per client IP and normalized username -> `429 RATE_LIMITED` with `Retry-After`.
  4. Resolve demo account and verify password with `scryptSync` + `timingSafeEqual` (running dummy verification on unknown usernames to normalize timing) and assert `account.role === requested_role` -> `401 INVALID_CREDENTIALS`.
  5. Construct server-derived `PortalSessionPrincipal` (`mode: "simulated"`), sign via `signSessionCookie`, and return `200` JSON with `Set-Cookie: livepilot_session=<signed_cookie>; Path=/; HttpOnly; SameSite=Lax` (and `; Secure` when HTTPS).
- **Trade-off:** An in-memory sliding-window rate limiter protects single-instance local/simulated pilot deployments without requiring Redis, while distributed production deployments rely on KrakenD / Core BFF rate limiters and OIDC.

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly within the declared `G-WEB-022` touch map:
- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/tests/login.test.mjs`
- `docs/07-backlog/goals/G-WEB-022.md`
- `docs/03-architecture/specs/goals/G-WEB-022/design.md`

## 6. Acceptance Test & TDD Verification Strategy

1. **Unit & Contract Verification (`apps/web/tests/login.test.mjs`):**
   - Valid login for `HOST` and `LIVE_OPS` returns `200`, `{ ok: true, session: { role, userId, tenantId, mode } }`, and sets `Set-Cookie: livepilot_session=...; Path=/; HttpOnly; SameSite=Lax` verifiable by `verifySessionCookie`.
   - HTTPS request sets `; Secure` attribute on `Set-Cookie`.
   - Invalid password and role mismatch return `401 { ok: false, error: "INVALID_CREDENTIALS" }`.
   - Missing fields, invalid JSON, and unknown roles return `400 { ok: false, error: "BAD_REQUEST" }`.
   - Repeated failed logins trigger `429 { ok: false, error: "RATE_LIMITED" }`.
   - Production environment (`NODE_ENV=production`) rejects simulated login with `403`.
2. **Execution Commands:**
   - `node apps/web/tests/login.test.mjs`
   - `npm --prefix apps/web run lint`
   - `npm --prefix apps/web run build`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-WEB-022.md`
