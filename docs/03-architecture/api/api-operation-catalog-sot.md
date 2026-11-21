# API Operation Catalog SOT

> **Status:** Required inventory before OpenAPI generation.
> **Output:** OpenAPI paths, schemas, examples, contract tests, and coverage registry entries.

> **Current state:** This file defines the required operation record but contains
> no approved operation inventory yet. `openapi.yaml` remains a transport draft
> until every path is registered below with complete traceability. See
> [SOT reconciliation](sot-reconciliation.md).

Every operation is registered using this record:

| Field | Required value |
|---|---|
| Operation ID | Stable lowerCamelCase identifier |
| Requirement/flow | `REQ-LP-NNN` and flow ID |
| Route | `/v1/...` or `/api/...` |
| Method | HTTP method and safety classification |
| Owner | One service and persistence owner |
| Actor/capability | Explicit authorization requirement |
| Request | Headers, path/query, body schema, limits |
| Response | Statuses, envelope, freshness, pagination |
| Events/jobs | Published facts or asynchronous work |
| Errors | Problem code, retryability, localization key |
| Idempotency | Required/optional, fingerprint, retention |
| Verification | Contract, security, integration, and E2E commands |

## Operation classes

- Safe reads: deterministic, cache policy, authorization, freshness metadata.
- Proposals: validate and enqueue; never imply execution.
- Approvals: actor separation, version check, idempotency, audit.
- Consequential mutations: policy gate, reservation/transaction, action receipt.
- Control-plane commands: pause/resume, emergency behavior, propagation evidence.
- Reconciliation: requested/accepted/observed states and unknown-result resolution.

No path may be added to OpenAPI without a catalog record and owning flow reference.

## Recommended pilot operation inventory

These are the recommended LivePilot pilot operations. They are contract proposals
until the unresolved identity, realtime, and event decisions in
[`sot-reconciliation.md`](sot-reconciliation.md) are approved.

| Operation ID | Method/path | Actor | Owner/state | Class |
|---|---|---|---|---|
| `loginTestUser` | `POST /v1/auth/login` | unauthenticated local/simulated pilot only | identity/session; session created | authentication |
| `getCurrentAuthSession` | `GET /v1/auth/session` | authenticated principal | identity/session; session read | safe read |
| `logoutTestUser` | `POST /v1/auth/logout` | authenticated principal | identity/session; session revoked | control |
| `getLiveSessionOverview` | `GET /v1/live-sessions/{session_id}/overview` | Host or Live Ops with session visibility | session/campaign read model | safe read |
| `streamLiveSessionEvents` | `GET /v1/live-sessions/{session_id}/events` | Host or Live Ops with session visibility | realtime projection; no direct writer | realtime read |
| `proposePromotion` | `POST /v1/live-sessions/{session_id}/promotions` | Live Ops or approved decision service | promotion service; `proposed → pending` | proposal |
| `decidePromotion` | `POST /v1/promotions/{promotion_id}/decision` | Live Ops approval capability only | approval-control; `pending → approved/rejected` | approval |
| `getPromotion` | `GET /v1/promotions/{promotion_id}` | Host/Live Ops with session visibility | promotion service read model | safe read |
| `getActionLog` | `GET /v1/live-sessions/{session_id}/actions` | Live Ops audit capability | audit service projection | safe read |

### `POST /v1/auth/login` — `loginTestUser`

- **Does:** creates a server-managed test session for the selected pilot user.
- **Caller:** unauthenticated only; enabled in `local` or explicitly simulated
  pilot mode. Production OIDC must reject this adapter.
- **Request:** email, password; strict schema, bounded length, no arbitrary fields.
- **Response:** `200` with principal, role, session ID, expiry, and mode; set a
  Secure, HttpOnly, SameSite cookie. Never return password or password hash.
- **Owner/state:** identity/session service; session is revocable and server-side.
- **Approval/rejection/timeout/failure:** invalid credentials return generic `401`
  and increment rate-limit counters; lockout/rate limiting returns `429`; no
  external approval or timeout path; persistence failure returns safe `503`.
- **Events/jobs:** append login audit event after session commit; no background job.
- **Duplicates:** no idempotency key; repeated valid login creates a new session
  unless the session policy explicitly enables safe reuse.
- **Proof:** `F05` auth unit/integration tests; brute-force/rate-limit test; cookie
  security test; production-mode rejection test.

### `GET /v1/auth/session` — `getCurrentAuthSession`

- **Does:** returns the current server-derived principal and authorized session scope.
- **Caller:** authenticated session cookie; bearer tokens are not accepted at the
  browser boundary.
- **Request:** no body; required correlation ID; cookie is validated server-side.
- **Response:** `200` principal, tenant/workspace/session scope, role/capabilities,
  expiry, and mode; never expose raw identity-provider tokens.
- **Owner/state:** identity/session service; read-only.
- **Approval/rejection/timeout/failure:** missing/revoked/expired session → generic
  `401`; stale scope → `401`/`403` per policy; dependency timeout → `503` without
  widening access.
- **Events/jobs:** none; security access may be sampled into audit telemetry.
- **Duplicates:** naturally safe; no idempotency key.
- **Proof:** auth context, expiry, revocation, tenant-isolation, and no-token-leak tests.

### `POST /v1/auth/logout` — `logoutTestUser`

- **Does:** revokes the current session and clears the cookie.
- **Caller:** authenticated principal owning the session.
- **Request:** no body; correlation ID; CSRF protection for cookie-authenticated calls.
- **Response:** `204`; repeated logout is intentionally idempotent.
- **Owner/state:** identity/session service; active → revoked.
- **Approval/rejection/timeout/failure:** invalid session → `204` without disclosure;
  persistence timeout → `503` and cookie is not falsely reported as revoked.
- **Events/jobs:** append logout audit event after commit; no background job.
- **Duplicates:** idempotent by session ID; no idempotency key required.
- **Proof:** session revocation, CSRF, replay, and cookie-clearing tests.

### `GET /v1/live-sessions/{session_id}/overview` — `getLiveSessionOverview`

- **Does:** returns the authorized Host/Live Ops projection: session status,
  selected products, aggregate signals, alerts, current promotion, and JEV cues.
- **Caller:** authenticated Host or Live Ops with resolved tenant/session visibility.
- **Request:** path session ID, correlation ID, optional bounded `updated_since`;
  reject arbitrary filters and cross-tenant identifiers.
- **Response:** `200` versioned DTO with UTC timestamps, freshness, `mode=SIMULATED`,
  and explicit `unknown/stale` values; never return raw viewer IDs, COGS, secrets,
  or unapproved model context.
- **Owner/state:** session service owns lifecycle; read model aggregates catalog,
  telemetry, promotion, and copilot projections without becoming their writer.
- **Approval/rejection/timeout/failure:** unauthorized → privacy-safe `404`;
  stale dependency → `200` with stale/unknown metadata when safe; dependency
  timeout → `503` or partial response only if the DTO marks each unavailable field.
- **Events/jobs:** none; projection refresh is internal and asynchronous.
- **Duplicates:** safe read; cache key includes tenant/session/authorization scope.
- **Proof:** tenant isolation, freshness, redaction, partial dependency, and replay tests.

### `GET /v1/live-sessions/{session_id}/events` — `streamLiveSessionEvents`

- **Does:** streams authorized session events for Host/Live Ops UI using SSE.
- **Caller:** authenticated session with session visibility; subscription is scoped
  to one tenant/session and cannot accept a client-supplied tenant.
- **Request:** session ID, correlation ID, `Last-Event-ID`; no request body.
- **Response:** `200 text/event-stream` using the canonical envelope, monotonic
  sequence, heartbeat, bounded replay, and explicit `SIMULATED` mode.
- **Owner/state:** realtime projection owns delivery cursor; domain services remain
  authoritative writers.
- **Approval/rejection/timeout/failure:** unauthorized → privacy-safe `404`;
  expired replay cursor → `409 REPLAY_WINDOW_EXPIRED`; upstream loss → heartbeat
  then explicit `disconnected/stale` state; never silently resume from an unknown point.
- **Events/jobs:** consumes approved NATS facts; no new domain event is created by
  the HTTP stream.
- **Duplicates:** client deduplicates by `event_id` and sequence; reconnect uses
  `Last-Event-ID` and bounded replay.
- **Proof:** authorization, replay, ordering, duplicate, disconnect, backpressure,
  heartbeat, and accessibility-state tests.

### `POST /v1/live-sessions/{session_id}/promotions` — `proposePromotion`

- **Does:** records a promotion proposal for deterministic margin/policy evaluation;
  it does not issue a coupon or mutate a marketplace.
- **Caller:** authenticated Live Ops or an internal decision service with proposal
  capability; Host cannot approve through this operation.
- **Request:** product ID, promotion type, proposed discount, claim limit, reason,
  policy context version, correlation ID, and required `Idempotency-Key`; reject
  client-supplied margin/stock verdicts and unknown fields.
- **Response:** `202` proposal ID, status `pending`, policy evaluation reference,
  resource version, and audit reference.
- **Owner/state:** promotion service; `proposed → pending`; catalog/inventory are
  read authorities, never written by this endpoint.
- **Approval/rejection/timeout/failure:** invalid product/stock/policy → stable
  `422`; policy refusal → `422`; evaluation timeout → `202` with `pending`, never
  auto-approve; persistence/outbox failure → `503` with no partial mutation.
- **Events/jobs:** transactionally emits `promotion.proposed` and enqueues policy
  evaluation after commit; outbox retry is safe.
- **Duplicates:** idempotency fingerprint binds tenant, session, product, payload,
  and actor; same key/same fingerprint returns original result; same key/different
  fingerprint → `409`; retention is defined by the idempotency SOT.
- **Proof:** margin-floor, catalog binding, idempotency, outbox, timeout, and no-
  execution-before-approval integration tests.

### `POST /v1/promotions/{promotion_id}/decision` — `decidePromotion`

- **Does:** approves or rejects a pending promotion; approval starts only the
  simulated issuance workflow after policy and margin checks.
- **Caller:** Live Ops principal with explicit approval capability; proposer and
  approver must satisfy separation-of-duties policy.
- **Request:** decision `approve|reject`, reason required for rejection, expected
  resource version, correlation ID, and `Idempotency-Key`.
- **Response:** `202` with promotion status, decision ID, resource version, and
  action reference; final issuance is asynchronous.
- **Owner/state:** approval-control owns decision; promotion transitions
  `pending → approved|rejected`.
- **Approval/rejection/timeout/failure:** stale version → `409`; policy/SoD failure
  → `403`/`422`; rejection emits no issuance; issuance timeout → `unknown` and
  requires reconciliation, never blind retry; failure preserves the decision audit.
- **Events/jobs:** emits `promotion.approved` or `promotion.rejected`; approved
  decision enqueues simulated issuance/reservation saga.
- **Duplicates:** idempotency fingerprint includes promotion/version/decision/actor;
  same request returns the original decision; conflicting decision → `409`.
- **Proof:** SoD, stale-version, approve/reject, saga compensation, unknown-result,
  audit-integrity, and emergency-pause tests.

### `GET /v1/promotions/{promotion_id}` — `getPromotion`

- **Does:** returns promotion, policy verdict, approval decision, simulated issuance,
  reservation, and current action status.
- **Caller:** Host or Live Ops with session visibility; sensitive margin/COGS fields
  are restricted to Live Ops capability.
- **Request:** promotion ID, correlation ID, optional bounded `include=details`.
- **Response:** `200` versioned resource with explicit status and `unknown` external
  effect; redacted representation for Host.
- **Owner/state:** promotion service owns promotion state; action and inventory
  statuses are linked read projections.
- **Approval/rejection/timeout/failure:** inaccessible → privacy-safe `404`; stale
  projection includes freshness; unavailable linked service → marked `unknown`.
- **Events/jobs:** none.
- **Duplicates:** safe read; authorization-scoped cache only.
- **Proof:** redaction, state-transition, freshness, tenant isolation, and unknown
  outcome tests.

### `GET /v1/live-sessions/{session_id}/actions` — `getActionLog`

- **Does:** returns the operator-visible immutable action/audit timeline.
- **Caller:** Live Ops with audit-read capability; Host receives only approved
  user-facing status through the overview, not the full audit log.
- **Request:** session ID, correlation ID, bounded cursor pagination, optional event
  type/status filters; no arbitrary SQL-like filter expression.
- **Response:** `200` ordered page with cursor, tamper-evidence metadata, actor
  references, decision/result, timestamps, and redacted payload summaries.
- **Owner/state:** audit service; append-only records, corrections are superseding
  records rather than updates/deletes.
- **Approval/rejection/timeout/failure:** unauthorized → privacy-safe `404`; invalid
  cursor/filter → `400`; archive unavailable → `503` with no fabricated history.
- **Events/jobs:** audit append is emitted by owning services after commit; export is
  a separate future operation and is not implied by this read.
- **Duplicates:** read-only; cursor and event IDs provide stable pagination.
- **Proof:** append-only integrity, redaction, pagination consistency, authorization,
  and archive-outage tests.
