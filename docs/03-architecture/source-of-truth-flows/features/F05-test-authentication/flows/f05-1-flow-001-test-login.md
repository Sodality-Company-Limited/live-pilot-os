# F05.1-FLOW-001 — Sign In as a Seeded Test User

> Flow-level Source of Truth for Feature F05. Local/simulated only; production
> authentication remains OIDC-based.

## Machine-readable contract coverage

| Source | Link | Coverage |
|---|---|---|
| Requirement | [REQ-LP-017](../../../../../live-pilot-os-requirements.md) | Authenticated demo entry |
| API | [POST /v1/auth/login](../../../../../api/authentication.md) | Login contract |
| Feature index | [F05 index](../index.md) | Parent scope |
| Identity SOT | [identity SOT](../../../../../api/identity-tenancy-authorization-sot.md) | Server-derived authority |

Status: detailed baseline. Production OIDC provider and claim mapping remain
`[NEEDS CLARIFICATION]`.

## Purpose, actors, and scope

Authenticate a seeded Host or Live Ops test account and create a revocable
server-managed session before protected demo routes are available.

| Contract fact | Definition |
|---|---|
| Actor | unauthenticated test user |
| Input | email, password, optional live_session_id, correlation ID |
| Output | safe user projection, role, simulated mode, session cookie |
| Owner | identity/session-access module |
| Events | `auth.login.succeeded` or `auth.login.failed` |

## Shared boundary

Login UI → Portal BFF → KrakenD → NestJS identity module → PostgreSQL session store → audit.

| Node | Contract | Limit |
|---|---|---|
| UI | Collect credentials and render safe states | Never authorizes by browser state |
| Portal BFF | Validate DTO, locale, correlation, and mode | Never owns password truth or role authority |
| KrakenD | Authenticate boundary, rate-limit, and route | Never verifies credentials |
| NestJS identity module | Verify Argon2id hash, create session, emit audit | Owns authentication fact only |
| PostgreSQL/audit | Persist session hash and append receipt | Never store plaintext password or raw token |

## Aggregate and lifecycle

`RECEIVED → VALIDATED → AUTHENTICATED → SESSION_CREATED → AUDITED`

Failure path: `INVALID`, `RATE_LIMITED`, `DISABLED`, or `DEPENDENCY_UNAVAILABLE`.
Guards are mode, schema, rate limit, Argon2id verification, persistence, redaction,
and server-derived role.

## Frontend contract

- Show one generic invalid-credentials message for unknown email and wrong password.
- Never persist password or raw session token in local storage, URL, or telemetry.
- Redirect only after server session success and render simulated-mode labeling.

## Backend contract

- Validate email, password presence, locale, correlation, and runtime mode.
- Forward only the typed login command; never log the password.
- Verify Argon2id, create a hashed opaque session token, and return a safe projection.
- Fail closed when the test adapter is enabled outside local/simulated mode.

## Microservice contract

| Responsibility | Contract |
|---|---|
| Validate | DTO, runtime mode, rate limit, correlation, locale |
| Authenticate | Constant-shape credential result; no account enumeration |
| Persist | Session hash, principal, role, mode, expiry, idle timeout |
| Publish | Versioned auth event with redacted principal reference |
| Security | Argon2id, redaction, server-derived role, fail-closed mode gate |

Event fields: event_id, event_type, occurred_at, principal_ref, role, mode,
correlation_id, schema_version, producer, and redacted outcome.

## Safety, idempotency, and privacy

- Passwords, password hashes, raw tokens, and cookies never enter logs or events.
- Unknown account and wrong password return the same public error.
- Login attempts are rate-limited; no session is created after failure.
- Session creation is recorded before success is returned.

## Errors and recovery

| Error | Retry | Expected behavior |
|---|---|---|
| invalid request | no | `400 LP03001 REQUEST_INVALID` |
| invalid credentials | after user correction | `401 LP01002 AUTHENTICATION_INVALID` |
| rate limit | retry after delay | `429 LP06001 RATE_LIMITED` |
| test adapter disabled | no | `401 LP01002 AUTHENTICATION_INVALID` |
| session store outage | bounded dependency retry | `503 LP07001 DEPENDENCY_UNAVAILABLE`; no success |

## Sequence and verification

Login UI → Portal BFF → KrakenD → NestJS identity module → Argon2id verifier →
PostgreSQL session transaction → audit receipt → safe response/cookie.

| Verification | Evidence |
|---|---|
| Authentication | valid Host and Live Ops fixtures create correct roles |
| Enumeration resistance | unknown account and wrong password share response/status |
| Redaction | password, hash, token, and cookie absent from logs/events |
| Mode gate | production configuration rejects test adapter |
| Session | created session is server-managed and expires/idle-times out |
| Audit | actor/mode/correlation/outcome linked without secrets |

## Flow-specific detail

### BDD Given / When / Then

- **Given:** a seeded account and local/simulated mode **When:** valid credentials are submitted **Then:** a role-scoped session is created.
- **Given:** an unknown account or wrong password **When:** credentials are submitted **Then:** the same authentication-invalid error is returned and no session is created.

### Request contract

| Field | Required | Contract |
|---|---:|---|
| email | yes | normalized; never used to reveal account existence |
| password | yes | transient secret; never persisted or logged |
| correlation_id | yes | stable across request and audit receipt |
| locale | conditional | `th` or `en`; default `th` |
| idempotency_key | no | login is not a consequential domain mutation |

### Flow-specific state transition

| Step | Guard | Durable result | Failure path |
|---|---|---|---|
| Receive | schema, mode, correlation | received receipt | INVALID_CONTRACT |
| Verify | rate limit, account, Argon2id | authenticated result | AUTHENTICATION_INVALID |
| Create session | transaction and expiry | session hash + audit outbox | DEPENDENCY_UNAVAILABLE |
| Respond | receipt committed, redaction complete | safe projection | AUDIT_WRITE_FAILED |

### Flow-specific acceptance tests

1. Valid Host and Live Ops credentials create valid sessions.
2. Wrong password, unknown account, and disabled adapter create no session.
3. Repeated invalid attempts produce rate limiting.
4. No credential material appears in logs, events, responses, or audit data.
5. Browser role/session headers cannot elevate access.

## Definition of Done

- Login contract, OpenAPI, flow SOT, and error references are synchronized.
- Sessions are server-managed, revocable, expiring, and role-scoped.
- Host and Live Ops routes enforce the session server-side.
- Invalid login, rate limit, redaction, mode rejection, and audit tests pass.
