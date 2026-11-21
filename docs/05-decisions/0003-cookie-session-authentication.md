# ADR 0003: Use Server-Managed Cookie Sessions for LivePilot Browser Access

**Status:** proposed  
**Date:** 2026-11-21  
**Scope:** LivePilot OS test authentication and future browser access boundary

## Context

LivePilot needs a simple login for the simulated Hackathon demo. Browser-managed bearer
tokens would expose credential material to JavaScript and make revocation and role authority
harder to enforce. The Aflovia implementation provides a compatible reference pattern:
same-origin browser boundary, `HttpOnly` cookie, server-side session resolution, CSRF checks,
refresh/revocation, and no access token in browser code.

## Decision

LivePilot shall use an opaque, server-managed cookie session for browser authentication.

- Login sets a path-scoped `HttpOnly` cookie.
- The cookie contains only an opaque session reference; session truth is stored server-side.
- NestJS guards resolve the session and derive user, role, mode, and scope.
- Browser-supplied bearer tokens, role headers, tenant headers, and live-session headers are
  not accepted as authority for browser routes.
- Logout revokes the server session before clearing the cookie.
- State-changing cookie-authenticated requests require same-origin and CSRF protection.
- Production identity remains OIDC; the seeded email/password adapter is local/simulated only.

## Consequences

### Benefits

- Matches the proven Aflovia browser/BFF security boundary.
- Supports immediate server-side revocation and idle timeout.
- Keeps access tokens and role authority out of browser JavaScript.
- Works naturally with Host and Live Ops protected routes.

### Costs and mitigations

- Requires a shared session store for horizontal scaling; use Redis or PostgreSQL.
- Requires CSRF protection and cookie configuration discipline.
- Requires BFF/gateway forwarding of cookies and server-derived context.

## Rejected alternatives

- Browser-held JWT/access token: rejected for the browser boundary because it increases token
  exposure and makes revocation less direct.
- Encrypted self-contained cookie as the primary pattern: retained as a possible internal
  adapter, but not selected as the canonical session model because server-side revocation is
  clearer with an opaque reference.
