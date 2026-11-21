# Feature 05 — Test Authentication and Access Gate

> **Feature ID:** F05  
> **BDD contract:** Version 1.0  
> **BRD:** [Feature 05 BRD](../brd/feature-05-test-authentication-access-gate.md)  
> **Requirement:** [REQ-LP-017](../../03-architecture/live-pilot-os-requirements.md)

This document defines observable behavior for the local/simulated login used to test
LivePilot OS. The browser uses an opaque `HttpOnly` cookie session and never manages an
access token.

## F05.1 — Login and session behavior

### F05.1-FLOW-001 — Sign in as a seeded Host

**Given** local or simulated mode is enabled and a seeded Host account exists  
**When** the user submits valid email and password  
**Then** the server creates a role-scoped session, sets an opaque `HttpOnly` cookie, and returns a safe user projection.

### F05.1-FLOW-002 — Sign in as a seeded Live Ops user

**Given** local or simulated mode is enabled and a seeded Live Ops account exists  
**When** the user submits valid email and password  
**Then** the server creates a `LIVE_OPS` session and the user reaches only the authorized Live Ops demo view.

### F05.1-FLOW-003 — Reject invalid credentials

**Given** an unknown email or incorrect password  
**When** login is submitted  
**Then** the server returns the same authentication-invalid response, sets no cookie, and creates no session.

### F05.1-FLOW-004 — Read the current server session

**Given** a valid session cookie is present  
**When** the client requests `/v1/auth/session`  
**Then** the server returns the authoritative user, role, mode, and optional live-session scope.

### F05.1-FLOW-005 — Protect demo routes

**Given** no cookie, an expired cookie, or a revoked cookie  
**When** a protected Host or Live Ops route is requested  
**Then** the server returns `401` and performs no domain read or mutation.

### F05.1-FLOW-006 — Log out and revoke

**Given** an active session  
**When** the user submits logout  
**Then** the server revokes the session, clears the cookie, emits a redacted audit event, and returns `204`.

### F05.1-FLOW-007 — Prevent browser role elevation

**Given** a Host browser sends a forged role, tenant, or live-session header  
**When** a protected request is processed  
**Then** the server ignores the browser value and uses the stored session authority.

### F05.1-FLOW-008 — Reject test login in production

**Given** the runtime mode is production  
**When** a client submits the test login request  
**Then** the test adapter rejects it and production OIDC remains the only identity path.

## Security and test invariants

- The browser receives no access token in JSON, local storage, URL, or JavaScript-readable cookie.
- The session cookie is `HttpOnly`, `SameSite=Lax`, path-scoped, and `Secure` in production.
- Same-origin and CSRF checks protect state-changing cookie-authenticated requests.
- Argon2id verifies seeded password hashes; plaintext passwords are never persisted.
- Session records are stored server-side using a hash or opaque reference and support revocation.
- Login failures are rate-limited and do not reveal account existence.
- `HOST` and `LIVE_OPS` authorization is enforced server-side.

## Traceability

| BDD flow | API / SOT authority |
|---|---|
| F05.1-FLOW-001–003 | [authentication API](../../03-architecture/api/authentication.md) |
| F05.1-FLOW-004–006 | [F05 flow SOT](../../03-architecture/source-of-truth-flows/features/F05-test-authentication/index.md) |
| F05.1-FLOW-007 | [identity SOT](../../03-architecture/api/identity-tenancy-authorization-sot.md) |
| F05.1-FLOW-008 | [requirements baseline](../../03-architecture/live-pilot-os-requirements.md) |
