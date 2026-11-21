# Worker Briefing: G-WEB-022

## Objective
Implement Portal Login Route (`/api/auth/login`):
- Receives login request (`username`/`email`, `password`, `requested_role: "HOST" | "LIVE_OPS"`)
- Validates credentials against gateway transport or local simulated catalog
- Issues signed HTTP-only `livepilot_session` cookie via `signSessionCookie` from `session-context.ts`
- Sets `HttpOnly; SameSite=Lax; Path=/` and `Secure` in production
- Rejects invalid credentials (401), missing fields (400), rate-limiting (429)
- Unit test suite in `apps/web/tests/login.test.mjs` verifying: successful login sets signed cookie; invalid credentials return 401; missing fields return 400.
