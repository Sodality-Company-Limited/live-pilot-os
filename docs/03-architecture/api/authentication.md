# Authentication API Contract

> **Goal:** REQ-LP-017  
> **Scope:** Test-only local authentication for the simulated Hackathon demo

This contract provides the minimum access gate for Host and Live Ops test users.
Browser routes use the cookie boundary. Any bearer credentials that may exist for
internal service-to-service transport are not a browser authentication alternative
and are outside this contract. It does not replace the production OIDC identity
provider contract.

## POST `/v1/auth/login`

**Auth:** none  
**Mode:** `local` or `simulated` only

### Request

```json
{
  "email": "host@example.test",
  "password": "provided-by-local-test-config"
}
```

The password is never logged, returned, or persisted in plaintext. The server
compares it with an Argon2id hash belonging to a seeded test account.

### Response 200

```json
{
  "user": {
    "user_id": "user_host_demo",
    "role": "HOST",
    "display_name": "Demo Host"
  },
  "session": {
    "session_id": "session_01",
    "expires_at": "2026-11-21T12:00:00Z",
    "mode": "simulated"
  }
}
```

The server sets an `HttpOnly`, `SameSite=Lax`, scoped session cookie. Production
uses `Secure`; local development may disable `Secure` only through explicit local
configuration.

### Errors

| Status | Code | When |
|---|---|---|
| 400 | `LP03001 REQUEST_INVALID` | Missing or malformed email/password |
| 401 | `LP01002 AUTHENTICATION_INVALID` | Credentials are invalid or the test adapter is disabled |
| 429 | `LP06001 RATE_LIMITED` | Login attempt threshold is exceeded |

## GET `/v1/auth/session`

**Auth:** required LivePilot session cookie

Returns the current authenticated principal and session scope.

### Response 200

```json
{
  "user_id": "user_host_demo",
  "role": "HOST",
  "live_session_id": null,
  "mode": "simulated"
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 401 | `LP01001 AUTHENTICATION_REQUIRED` | No valid session is present |
| 401 | `LP01002 AUTHENTICATION_INVALID` | Session is expired, revoked, or invalid |

## POST `/v1/auth/logout`

**Auth:** required session cookie

Revokes the current server-side session, clears the cookie, and emits
`auth.session.revoked`. Logout is idempotent.

### Response 204

No response body.

### Errors

| Status | Code | When |
|---|---|---|
| 401 | `LP01001 AUTHENTICATION_REQUIRED` | No session is present |

## Security and lifecycle rules

- Seeded users are `HOST` and `LIVE_OPS`; no admin role is included in this feature.
- Session records store a hash or opaque reference, never the raw token.
- Session lifetime is eight hours with a 30-minute idle timeout.
- Login failures are rate-limited and audited without storing the password.
- Every browser-authenticated request receives server-derived principal, role, and mode context.
- Browser bearer tokens are not accepted as an alternative to the session cookie.
- Login does not select or authorize a live session; session access is checked separately.
- The test adapter is unavailable in production mode.
