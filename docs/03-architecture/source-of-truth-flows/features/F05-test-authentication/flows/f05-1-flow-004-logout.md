# F05.1-FLOW-004 — Log Out and Revoke the Session

> Flow-level Source of Truth for Feature F05. Logout revokes the server session
> before success is returned and is safe to repeat.

## Machine-readable contract coverage

| Source | Link | Coverage |
|---|---|---|
| Requirement | [REQ-LP-017](../../../../../live-pilot-os-requirements.md) | Session termination |
| API | [POST /v1/auth/logout](../../../../../api/authentication.md) | Logout contract |
| Feature index | [F05 index](../index.md) | Parent scope |
| Identity SOT | [identity SOT](../../../../../api/identity-tenancy-authorization-sot.md) | Revocation authority |

Status: detailed baseline. Production OIDC logout and SLO remain `[NEEDS CLARIFICATION]`.

## Purpose, actors, and scope

Revoke the current test session, clear the browser cookie, and prevent the old
credential from accessing protected LivePilot routes.

| Contract fact | Definition |
|---|---|
| Actor | authenticated Host or Live Ops user |
| Input | session cookie, correlation ID |
| Output | HTTP 204 and cleared cookie |
| Owner | identity/session-access module |
| Event | `auth.session.revoked` |

## Shared boundary

Logout UI → Portal BFF → KrakenD → NestJS session module → PostgreSQL revocation → audit.

| Node | Contract | Limit |
|---|---|---|
| UI | Submit logout and clear local display state | Cannot revoke by UI state alone |
| Portal BFF | Validate session and correlation | Never owns session truth |
| KrakenD | Authenticate and route | Never silently retry unsafe command |
| NestJS session module | Revoke session and emit event | Must commit revocation before 204 |
| Session store/audit | Persist revocation and receipt | Never store raw token |

## Aggregate and lifecycle

`SESSION_ACTIVE → REVOCATION_REQUESTED → REVOKED → COOKIE_CLEARED`.

Failure path: `MISSING`, `ALREADY_REVOKED`, or `DEPENDENCY_UNAVAILABLE`.
The session record and append-only receipt are authoritative.

## Frontend contract

- Clear local user projection after server response.
- Redirect to login after successful revocation.
- Never display or persist the raw cookie/token.

## Backend contract

- Resolve the session server-side and mark it revoked transactionally.
- Emit `auth.session.revoked` with safe principal/session references.
- Return 204 only after durable revocation is committed.
- Treat repeated logout as idempotent.

## Microservice contract

| Responsibility | Contract |
|---|---|
| Validate | session credential and correlation |
| Revoke | server-side session status transition |
| Publish | versioned revocation event after durable commit |
| Audit | actor, session reference, timestamp, correlation, outcome |
| Security | no token leakage; no browser-only revocation |

## Safety, idempotency, and privacy

- Revocation is idempotent for the same session.
- Raw tokens and cookies never enter logs, events, or audit records.
- A revoked session cannot be renewed by a repeated request.
- Logout does not mutate LivePilot commerce state.

## Errors and recovery

| Error | Retry | Expected behavior |
|---|---|---|
| missing session | no | `401 LP01001 AUTHENTICATION_REQUIRED` |
| already revoked | safe repeat | return 204 after cookie clear |
| session store outage | bounded | `503 LP07001 DEPENDENCY_UNAVAILABLE`; do not claim revocation |
| audit failure | no false success | block response until receipt policy is satisfied |

## Sequence and verification

UI → Portal BFF → KrakenD → NestJS session module → PostgreSQL revocation/outbox →
audit event → 204 and cookie clear.

| Verification | Evidence |
|---|---|
| Revocation | old cookie returns 401 after logout |
| Idempotency | repeated logout creates one state transition |
| Durability | 204 is not returned before revocation commit |
| Redaction | token absent from logs/events/audit |
| Audit | actor/session/correlation/outcome linked |

## Flow-specific detail

### BDD Given / When / Then

- **Given:** an active session **When:** logout is submitted **Then:** the session is revoked and 204 is returned.
- **Given:** a revoked session **When:** logout is repeated **Then:** the result remains safe and idempotent.
- **Given:** a stale cookie **When:** protected state is requested after logout **Then:** 401 is returned.

### Request contract

| Field | Required | Contract |
|---|---:|---|
| session cookie | yes | opaque server-managed credential |
| correlation_id | yes | request/audit linkage |
| idempotency_key | no | session revocation is naturally idempotent |
| live_session_id | conditional | existing session scope only; logout cannot broaden scope |

### Flow-specific state transition

| Step | Guard | Durable result | Failure path |
|---|---|---|---|
| Resolve | session format and identity | active/revoked record | AUTHENTICATION_REQUIRED |
| Revoke | transaction and revision | revoked session + outbox | DEPENDENCY_UNAVAILABLE |
| Respond | receipt committed and cookie cleared | HTTP 204 | AUDIT_WRITE_FAILED |

### Flow-specific acceptance tests

1. Active session logout returns 204 and clears the cookie.
2. Old cookie cannot read protected state after logout.
3. Repeated logout does not duplicate the transition or event.
4. Failure before commit does not claim successful revocation.

## Definition of Done

- Logout endpoint, OpenAPI, identity SOT, and flow SOT are synchronized.
- Revocation, idempotency, redaction, audit, and stale-cookie tests pass.
