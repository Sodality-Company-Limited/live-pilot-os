# F05.1-FLOW-002 — Reject Invalid Credentials

> Flow-level Source of Truth for Feature F05. Invalid credentials never create a
> session and never reveal account existence.

## Machine-readable contract coverage

| Source | Link | Coverage |
|---|---|---|
| Requirement | [REQ-LP-017](../../../../../live-pilot-os-requirements.md) | Invalid-login behavior |
| API | [POST /v1/auth/login](../../../../../api/authentication.md) | 401/429 contract |
| Feature index | [F05 index](../index.md) | Parent scope |

Status: detailed baseline. Production identity remains `[NEEDS CLARIFICATION]`.

## Purpose, actors, and scope

Reject unknown accounts, wrong passwords, disabled test mode, and excessive login
attempts without creating a session or exposing credential/account information.

| Contract fact | Definition |
|---|---|
| Actor | unauthenticated test user |
| Input | email, password, correlation ID |
| Output | ProblemDetails only; no cookie |
| Owner | identity/session-access module |
| Event | `auth.login.failed` with redacted metadata |

## Shared boundary

Login UI → Portal BFF → KrakenD → NestJS identity module → rate limiter/session store → audit.

| Node | Contract | Limit |
|---|---|---|
| UI | Render generic failure and retry guidance | Must not infer account existence |
| Portal BFF | Validate DTO and preserve correlation | Must not log password |
| KrakenD | Apply route and rate limit | Must not implement credential semantics |
| Identity module | Compare Argon2id and return constant-shape errors | Must not create session on failure |
| Audit | Record safe failure metadata | Must not store credential material |

## Aggregate and lifecycle

`RECEIVED → VALIDATED → REJECTED` or `RECEIVED → RATE_LIMITED`.

Source of truth is the append-only authentication receipt plus rate-limit state.
No live-session or commerce aggregate may change.

## Frontend contract

- Use one localized message for unknown email and wrong password.
- Do not show password policy details that reveal account state.
- Keep password only in the transient form state until the request completes.

## Backend contract

- Normalize email and validate password presence.
- Compare with Argon2id using constant-shape public outcomes.
- Return `LP01002` for invalid credentials or disabled test adapter.
- Return `LP06001` after the configured failure threshold.

## Microservice contract

| Responsibility | Contract |
|---|---|
| Validate | schema, mode, correlation, locale |
| Reject | same public response for unknown account and wrong password |
| Persist | safe failure metadata and rate-limit state only |
| Audit | timestamp, correlation, mode, redacted principal reference, category |
| Security | password/hash/token redaction and no session creation |

## Safety, idempotency, and privacy

- Password, hash, raw token, and cookie are never returned, logged, or emitted.
- Repeating the same invalid request has no domain side effect.
- Rate limiting is keyed by a privacy-safe account/network reference.
- The browser cannot override the mode or role with headers or query parameters.

## Errors and recovery

| Error | Retry | Expected behavior |
|---|---|---|
| malformed input | no | `400 LP03001 REQUEST_INVALID` |
| invalid credentials | after correction | `401 LP01002 AUTHENTICATION_INVALID` |
| rate limit | retry after delay | `429 LP06001 RATE_LIMITED` |
| auth store unavailable | bounded | `503 LP07001 DEPENDENCY_UNAVAILABLE`; no success |

## Sequence and verification

UI → Portal BFF → KrakenD → NestJS validation → rate-limit check → Argon2id
comparison → redacted audit → ProblemDetails response.

| Verification | Evidence |
|---|---|
| Enumeration | unknown and wrong credentials have identical status/body shape |
| No session | failed paths do not set a cookie or create a session |
| Rate limit | threshold returns 429 and preserves audit metadata |
| Redaction | credential material absent from logs/events/audit |
| Correlation | request and failure receipt share correlation ID |

## Flow-specific detail

### BDD Given / When / Then

- **Given:** an unknown email or wrong password **When:** login is submitted **Then:** `401 LP01002` is returned without account detail.
- **Given:** repeated invalid attempts **When:** the threshold is exceeded **Then:** `429 LP06001` is returned and no session is created.

### Request contract

| Field | Required | Contract |
|---|---:|---|
| email | yes | normalized, privacy-safe lookup |
| password | yes | transient secret |
| correlation_id | yes | request/audit linkage |
| locale | conditional | `th` or `en` |
| idempotency_key | no | no consequential domain mutation |
| live_session_id | no | must remain absent; invalid login creates no live-session scope |

### Flow-specific state transition

| Step | Guard | Durable result | Failure path |
|---|---|---|---|
| Receive | schema and mode | received metadata | INVALID_CONTRACT |
| Verify | rate limit and Argon2id | rejected receipt | AUTHENTICATION_INVALID |
| Audit | redaction and correlation | append-only failure receipt | AUDIT_WRITE_FAILED |

### Flow-specific acceptance tests

1. Unknown and wrong credentials return identical public errors.
2. Failure paths never create or refresh a session.
3. Rate limiting blocks repeated attempts.
4. Credential material is absent from all output and evidence.

## Definition of Done

- Invalid-login API, OpenAPI, error code, and flow SOT are synchronized.
- Enumeration, rate-limit, redaction, and no-session tests pass.
