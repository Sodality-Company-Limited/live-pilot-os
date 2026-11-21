# F05.1-FLOW-003 — Read Current Session and Role

> Flow-level Source of Truth for Feature F05. Identity is established here;
> live-session capability authorization remains a separate boundary.

## Machine-readable contract coverage

| Source | Link | Coverage |
|---|---|---|
| Requirement | [REQ-LP-017](../../../../../live-pilot-os-requirements.md) | Protected demo entry |
| API | [GET /v1/auth/session](../../../../../api/authentication.md) | Session contract |
| Feature index | [F05 index](../index.md) | Parent scope |
| Identity SOT | [identity SOT](../../../../../api/identity-tenancy-authorization-sot.md) | Server-derived role |

Status: detailed baseline. Production OIDC claim mapping remains `[NEEDS CLARIFICATION]`.

## Purpose, actors, and scope

Return the authenticated principal, role, mode, and optional live-session scope
from the server-managed session.

| Contract fact | Definition |
|---|---|
| Actor | authenticated Host or Live Ops user |
| Input | LivePilot session cookie, correlation ID |
| Output | safe principal/session projection |
| Owner | identity/session-access module |
| Event | no domain event; access observation may be audited |

## Shared boundary

Protected UI → Portal BFF → KrakenD → NestJS session guard → session store → role-aware route.

| Node | Contract | Limit |
|---|---|---|
| UI | Render role-appropriate surface | Never trusts its own role state |
| Portal BFF | Forward session context and shape DTO | Never accepts browser role headers |
| KrakenD | Authenticate and route | Does not decide live-session capability |
| NestJS guard/module | Resolve session, expiry, role, mode | Re-authorizes at domain owner |
| Session store | Return current non-revoked record | Never return raw token |

## Aggregate and lifecycle

`SESSION_PRESENTED → SESSION_RESOLVED → ROLE_RESOLVED → ACCESS_RETURNED`.

Failure path: `MISSING`, `EXPIRED`, `REVOKED`, `MALFORMED`, or `SCOPE_DENIED`.
The session record is authoritative; UI state is not.

## Frontend contract

- Redirect unauthenticated users to login.
- Render Host or Live Ops view only from server response.
- Show simulated mode and never expose cookie/token values.

## Backend contract

- Resolve the opaque cookie session reference server-side.
- Check expiry, idle timeout, revocation, mode, and role.
- Ignore browser-supplied role, tenant, or live-session headers.
- Keep authentication separate from live-session capability authorization.

## Microservice contract

| Responsibility | Contract |
|---|---|
| Validate | cookie, correlation, session format |
| Resolve | principal, role, mode, expiry, optional live_session_id |
| Authorize | delegate resource/session capability checks to owner service |
| Persist | update last-seen/idle expiry according to policy |
| Audit | safe access-denied metadata when applicable |

## Safety, idempotency, and privacy

- Raw session tokens never appear in logs, responses, events, or audit records.
- Browser-supplied role or session headers cannot elevate access.
- Read is safe to retry; it never mutates commerce state.
- A revoked or expired session cannot be refreshed implicitly.

## Errors and recovery

| Error | Retry | Expected behavior |
|---|---|---|
| missing session | no | `401 LP01001 AUTHENTICATION_REQUIRED` |
| invalid/expired session | after login | `401 LP01002 AUTHENTICATION_INVALID` |
| live-session scope denied | no | `403 LP02002 SESSION_SCOPE_DENIED` |
| session store unavailable | bounded | `503 LP07001 DEPENDENCY_UNAVAILABLE` |

## Sequence and verification

UI → Portal BFF → KrakenD → NestJS session guard → PostgreSQL session lookup →
role-aware view/API response.

| Verification | Evidence |
|---|---|
| Server authority | forged role/session headers are ignored |
| Expiry | expired and idle sessions return 401 |
| Revocation | logged-out session returns 401 |
| Scope | unauthorized live session returns 403 |
| Redaction | token absent from response/log/audit |

## Flow-specific detail

### BDD Given / When / Then

- **Given:** a valid Host session **When:** the session endpoint is requested **Then:** `HOST` and simulated mode are returned.
- **Given:** a browser role header claiming Live Ops **When:** the endpoint is requested **Then:** server-derived role remains authoritative.
- **Given:** an expired session **When:** protected state is requested **Then:** `401` is returned and no domain read occurs.

### Request contract

| Field | Required | Contract |
|---|---:|---|
| session cookie | yes | opaque server-managed credential |
| correlation_id | yes | request/observability linkage |
| role header | no | ignored as untrusted input |
| live_session_id | conditional | checked by resource owner, never inferred from UI only |

### Flow-specific state transition

| Step | Guard | Durable result | Failure path |
|---|---|---|---|
| Present | credential format | request context | AUTHENTICATION_REQUIRED |
| Resolve | hash, expiry, revocation | principal context | AUTHENTICATION_INVALID |
| Scope | capability and session ownership | authorized projection | SESSION_SCOPE_DENIED |

### Flow-specific acceptance tests

1. Valid Host and Live Ops sessions return only their server-derived roles.
2. Missing, expired, revoked, or malformed sessions return 401.
3. Browser role/session headers cannot elevate access.
4. Session scope is checked separately and returns 403 when denied.

## Definition of Done

- Session endpoint, OpenAPI, identity SOT, and flow SOT are synchronized.
- Server-side role, expiry, revocation, redaction, and scope tests pass.
