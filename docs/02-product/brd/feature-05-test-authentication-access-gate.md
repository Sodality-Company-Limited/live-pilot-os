# BRD — Feature 05: Test Authentication and Access Gate

> **Feature ID:** F05  
> **Business capability:** Authenticated access to the LivePilot OS demo  
> **Document type:** Business Requirements Document  
> **Version:** 1.0  
> **Status:** Draft for product review  
> **Owner:** Product / LivePilot OS team

## 1. Executive summary

LivePilot OS needs a small, reliable access gate so Host and Live Ops users can enter the
simulated demo with a server-derived identity. The browser must not manage access tokens or
decide roles. Authentication is established by the server and represented to the browser by
an opaque, revocable `HttpOnly` cookie session, following the proven Aflovia boundary pattern.

This feature is a test-mode adapter for the Hackathon demo. It is not the production identity
provider; production authentication remains OIDC-based.

## 2. Business problem

Without an authenticated entry point, protected Host and Live Ops views cannot prove who is
using the demo, role-based access is easy to fake in the browser, and test evidence cannot
trace actions to an actor and session.

## 3. Objectives

- Let seeded Host and Live Ops users sign in with email and password.
- Establish server-authoritative identity and role context.
- Keep credentials and access tokens out of browser JavaScript, local storage, URLs, logs,
  events, and audit records.
- Allow the server to expire and revoke sessions independently of browser state.
- Make the test adapter visibly local/simulated and unavailable in production mode.

## 4. Scope

### In scope

- Login, current-session inspection, logout, and protected demo-route access.
- Opaque `HttpOnly` cookie session with server-side session persistence.
- `HOST` and `LIVE_OPS` roles.
- Argon2id password verification for seeded test users.
- Session expiry, idle timeout, revocation, rate limiting, CSRF protection, and audit events.
- BDD coverage for success, failure, expiry, logout, and role isolation.

### Out of scope

- OIDC federation implementation.
- Self-service registration, password recovery, admin role, or user administration.
- Live-session authorization, promotion, inventory, margin, or platform actions.

## 5. Business requirements

| ID | Requirement | Acceptance | Trace |
|---|---|---|---|
| BR-F05-001 | The system shall authenticate seeded Host and Live Ops test users. | Valid credentials create the correct role-scoped session. | REQ-LP-017; F05.1-FLOW-001 |
| BR-F05-002 | The browser shall use an opaque `HttpOnly` cookie and shall not hold an access token. | No access token is returned to JavaScript, local storage, or response JSON. | F05.1-FLOW-001/003 |
| BR-F05-003 | The server shall own session truth, expiry, idle timeout, and revocation. | Expired or revoked cookies cannot access protected views. | F05.1-FLOW-003/004 |
| BR-F05-004 | Invalid login shall fail with a stable, non-enumerating error. | Unknown email and wrong password have the same public result. | F05.1-FLOW-002 |
| BR-F05-005 | The test adapter shall be disabled in production mode. | Production configuration rejects test login. | F05.1-FLOW-001/002 |
| BR-F05-006 | Authentication events shall be auditable without secrets. | Passwords, hashes, raw tokens, and cookies are absent from evidence. | F05.1-FLOW-001–004 |

## 6. Business rules

1. The server, never the browser, is authoritative for identity and role.
2. A cookie identifies an opaque server session; it is not a bearer token exposed to UI code.
3. Authentication does not grant live-session capability; the resource owner checks scope separately.
4. Cookie mutations require same-origin/CSRF protection.
5. The simulated-mode label must remain visible in the demo experience.
