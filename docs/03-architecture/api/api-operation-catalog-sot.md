# API Operation Catalog SOT

> **Status:** Required inventory before OpenAPI generation.
> **Output:** OpenAPI paths, schemas, examples, contract tests, and coverage registry entries.

> **Current state:** Incremental generation is active. `createLiveSession` is the
> first approved operation for F01-FLOW-001; remaining operations are generated
> one flow at a time. `openapi.yaml` remains draft for operations not yet
> reconciled. See [SOT reconciliation](sot-reconciliation.md).

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

## Generated operation inventory — F01-FLOW-001

| Operation ID | Requirement / flow | Route | Owner | Actor/capability | Request / response | Events/jobs | Errors | Idempotency | Verification |
|---|---|---|---|---|---|---|---|---|---|
| `createLiveSession` | `BR-F01-001`; `F01-FLOW-001` | `POST /v1/live-sessions` | `session-service`; PostgreSQL `live_sessions` + transactional outbox | Authenticated Host or Operator with `live_session.start`; server-authoritative channel/session scope | `CreateLiveSessionRequest` (`platform`, `channel_ref`, `mode`, `requested_at`); `201` `LiveSessionStartResponse` with `status`, per-source readiness, correlation, schema version | NATS request/reply `session.start.requested.v1`; durable facts `live.session.started.v1`; audit `audit.session.lifecycle.record.v1`; no JEV invocation | `401 AUTHENTICATION_REQUIRED`; `403 SESSION_SCOPE_DENIED`; `404 CHANNEL_NOT_FOUND`; `409 IDEMPOTENCY_KEY_CONFLICT`, `SESSION_ALREADY_LIVE`; `422 UNSUPPORTED_SESSION_MODE`; `424 CHANNEL_NOT_READY`; `429 RATE_LIMITED`; `503 DEPENDENCY_UNAVAILABLE`; `500 INTERNAL_ERROR` | Required `Idempotency-Key`; fingerprint binds actor/session scope, platform, channel, mode, requested time; same key + same fingerprint returns the committed result; mismatch returns `IDEMPOTENCY_PAYLOAD_MISMATCH` | `F01-FLOW-001` authorized/forged actor, idempotent retry, payload mismatch, adapter unavailable/readiness, outbox failure, audit trace; `node scripts/api/check-api-sot-traceability.mjs` |

The flow's internal command and event subjects are deliberately not represented
as public OpenAPI paths. OpenAPI covers the UI/BFF boundary; NATS schemas govern
Core BFF → Session Service and durable event delivery. Raw chat/commerce input is
also excluded from this operation and belongs to F01-FLOW-002.

## Flow boundary decision — F01-FLOW-002

`F01-FLOW-002` produces no public OpenAPI operation. The authoritative service
ownership matrix declares `telemetry-service` as `Public exposure: none`; the
platform adapter sends a versioned NATS command to the telemetry boundary. This
prevents browser/public clients from submitting raw provider payloads and keeps
source-fact persistence inside the telemetry owner.

| Flow | Public OpenAPI operation | Internal contract | Owner | Current gap |
|---|---|---|---|---|
| `F01-FLOW-002` | None by design | `livepilot.v1.telemetry.signal.ingest` → telemetry service; durable telemetry event after commit | `telemetry-service` | Flow SOT names `telemetry.ingest.requested.v1 → telemetry.source.received.v1`, while the canonical NATS catalog names the command `livepilot.v1.telemetry.signal.ingest` and the event `livepilot.v1.telemetry.signal.detected`; Async contract reconciliation is required before generation is considered complete. |
| `F01-FLOW-003` | None by design | `telemetry.normalize.requested.v1 → telemetry.normalized.v1` (internal NATS contract) | `telemetry-service` | The normalization command/event pair and canonical payload schema are not yet registered in the NATS catalog; no HTTP route is generated. |
| `F01-FLOW-004` | None by design | `telemetry.duplicate.detected.v1` (internal deduplication fact) | `telemetry-service` | Deduplication is an atomic no-op/receipt decision inside the telemetry owner; the flow subject and duplicate-result schema are not yet registered in the NATS catalog. |
| `F01-FLOW-005` | None by design | `telemetry.late.received.v1 → projection.reconciled.v1` (internal reconciliation contract) | `telemetry-service + projection-worker` | Late events update a monotonic projection revision without rewriting immutable source history; the subject pair and reconciliation schema are not yet registered in the NATS catalog. |
| `F01.1-FLOW-001` | None by design | `intent.classify.requested.v1 → telemetry.intent.detected.v1` | `intent-risk-service` | Classification is an internal, confidence-aware signal; low confidence cannot trigger commerce mutation and the subject/schema pair is not yet registered in the canonical NATS catalog. |
| `F01.1-FLOW-002` | None by design | `intent.classify.requested.v1 → telemetry.intent.detected.v1` | `intent-risk-service` | Product-question classification remains an internal signal with question entity, confidence, and SKU status; `UNSUPPORTED_QUESTION_TYPE` and unresolved catalog context remain explicit. |
| `F01.1-FLOW-003` | None by design | `telemetry.intent.detected.v1` | `intent-risk-service` | Discount/voucher request classification emits a typed signal only; it does not create a promotion or voucher. `UNSUPPORTED_PROMOTION_TERM` and low confidence remain non-actionable outcomes. |
| `F01.1-FLOW-004` | None by design | `telemetry.intent.detected.v1` | `intent-risk-service + catalog-service` | Stock/size intent emits `STOCK_QUERY` or `SIZE_QUERY` with SKU confidence; `SKU_UNRESOLVED`, `CATALOG_STALE`, and low confidence cannot trigger commerce action. |
| `F01.1-FLOW-005` | None by design | `catalog.entity.resolve.requested.v1 → catalog.entity.resolved.v1` | `catalog-service` | Catalog-owned resolution returns one SKU, multiple candidates, or explicit unresolved state; catalog version and evidence are required, and no SKU may be invented. |
| `F01.1-FLOW-006` | None by design | `telemetry.claim.unsupported.v1` | `intent-risk-service` | Unsupported claims produce a redacted `UNSUPPORTED_CLAIM` signal with review-needed status; policy/evidence uncertainty cannot become verified product guidance. |
| `F01.1-FLOW-007` | None by design | `chat.question.clustered.v1` | `intent-risk-service` | Clustering produces a `QuestionCluster` with count, representative question, time window, product context, and evidence IDs; it is a rebuildable projection, not a source-fact writer. |
| `F01.1-FLOW-008` | None by design | `telemetry.intent.deferred.v1` | `intent-risk-service` | Uncertain intent is explicitly deferred to review with confidence/evidence and no action trigger; missing threshold configuration or unavailable review queue cannot become success. |
| `F01.2-FLOW-001` | None by design | `moderation.screen.requested.v1 → telemetry.risk.detected.v1` | `intent-risk-service` | Spam/toxic detection emits a typed risk signal with confidence, policy version, and redacted evidence; model or policy unavailability remains deferred/stale, not safe success. |
| `F01.2-FLOW-002` | None by design | `telemetry.risk.detected.v1` | `intent-risk-service` | Off-platform detection emits a risk signal with pattern evidence and confidence; unsupported language, unavailable pattern set, and low confidence remain explicit non-actionable states. |
| `F01.2-FLOW-003` | None by design | `telemetry.risk.detected.v1` | `intent-risk-service` | Scam-pattern detection emits redacted risk evidence and confidence under a versioned pattern set; pattern mismatch, model outage, or redaction failure cannot be treated as clear/safe content. |
| `F01.2-FLOW-004` | None by design | `telemetry.risk.detected.v1` | `intent-risk-service` | Coordinated-bot detection emits an aggregate risk signal keyed by session/window/fingerprint; invalid windows, unavailable fingerprints, and aggregation lag remain explicit stale/deferred states. |
| `F01.2-FLOW-005` | None by design | `risk.severity.ranked.v1` | `intent-risk-service` | Risk ranking produces severity and recommended handling from a versioned policy; missing policy, out-of-range scores, or missing context cannot produce a trusted severity. |
| `F01.2-FLOW-006` | None by design | `moderation.case.created.v1` | `moderation-case-service` | Moderator escalation creates a traceable case only after severity/evidence authorization; case-create failure, evidence unavailability, and forbidden actor context remain explicit failures. |
| `F01.2-FLOW-007` | None by design | `audit.moderation.recorded.v1` | `audit-service` | Moderation evidence is appended immutably with actor context, source event, policy/model versions, hashes, and correlation lineage; hash mismatch or missing actor context never overwrites history. |
| `F01.P-FLOW-001` | None by design | `commerce.cart_added.v1 → purchase.signal.updated.v1` | `telemetry-service + purchase-projection` | Cart-add remains a distinct, session/SKU-scoped purchase-interest fact; unresolved SKU, inactive session, and duplicate commerce event do not create a false increment. |
| `F01.P-FLOW-002` | None by design | `commerce.checkout_completed.v1 → purchase.signal.updated.v1` | `telemetry-service + purchase-projection` | Checkout completion is a distinct durable funnel fact with order/cart reference, session/SKU scope, source evidence, and idempotent replay behavior. |
| `F01.P-FLOW-003` | None by design | `commerce.order_updated.v1 → purchase.signal.updated.v1` | `purchase-projection` | Payment/order state is reconciled as a versioned projection; invalid state, stale revision, or missing order never overwrites the source order authority. |
| `F01.P-FLOW-004` | None by design | `purchase.signal.updated.v1` | `purchase-projection` | Cart-to-checkout conversion is a derived, windowed metric exposing numerator, denominator, window, projection revision, and freshness without changing source counts. |
| `F01.P-FLOW-005` | None by design | `purchase.signal.updated.v1` | `purchase-projection` | High-interest/low-conversion detection emits an evidence window and thresholded signal only when configuration and source data are complete; stale/incomplete data cannot trigger a trusted recommendation. |
| `F01.P-FLOW-006` | None by design | `purchase.voucher.correlated.v1` | `purchase-projection` | Voucher usage is correlated to purchase with voucher/order references, window, and attribution confidence; missing references, unavailable links, or duplicate voucher events remain explicit. |
| `F01.P-FLOW-007` | None by design | `product.interest.updated.v1` | `purchase-projection` | Product purchase-interest ranking emits SKU-ranked scores with component evidence, scoring/config version, session scope, and freshness; unresolved SKU or stale projection is not a trusted rank. |
| `F01.P-FLOW-008` | None by design | `purchase.signal.updated.v1` | `telemetry-service + purchase-projection` | Purchase counts remain stable across replay by enforcing source-event identity, stage separation, provider revision, dedup key, and monotonic projection revision; mismatched fingerprints never overwrite facts. |
| `F01.3-FLOW-001` | `getLiveSessionOverview` | `GET /v1/live-sessions/{session_id}/overview` | `projection-worker` | Dashboard projection exposes product-interest, question, purchase, engagement, sentiment, freshness, and revision; input lag, invalid window, or unavailable source is marked stale/deferred rather than empty success. |
| `F01.3-FLOW-002` | `getLiveSessionOverview` | `GET /v1/live-sessions/{session_id}/overview` | `projection-worker` | Behavioral metrics remain separately defined and sourced; counter conflict or stale source revision is surfaced explicitly and never merged into a misleading aggregate. |
| `F01.3-FLOW-003` | `getLiveSessionOverview` | `GET /v1/live-sessions/{session_id}/overview` | `projection-worker + intent-risk-service` | Sentiment and engagement are exposed with model/language metadata, window, confidence, freshness, and revision; unavailable or invalid inputs remain stale/deferred. |
| `F01.3-FLOW-004` | `getLiveSessionOverview`, `streamLiveSessionEvents` | `GET /v1/live-sessions/{session_id}/overview`; `GET /v1/live-sessions/{session_id}/events` | `projection-worker` | Hype-window detection is a versioned threshold/baseline signal with evidence window, confidence, freshness, and revision; unavailable baseline or stale data is explicit. |
| `F01.3-FLOW-005` | `getLiveSessionOverview`, `streamLiveSessionEvents` | `GET /v1/live-sessions/{session_id}/overview`; `GET /v1/live-sessions/{session_id}/events` | `projection-worker + alert-service` | Dashboard alerts are policy-driven, session-scoped, deduplicated, and freshness-aware; unavailable policy or stale projection never emits a false alert. |
| `F01.3-FLOW-006` | `getLiveSessionOverview`, `streamLiveSessionEvents` | `GET /v1/live-sessions/{session_id}/overview`; `GET /v1/live-sessions/{session_id}/events` | `projection-worker` | Failed projections are rebuilt from immutable source events into a new monotonic revision; invalid source range, concurrent rebuild, or event gaps remain explicit recovery states. |
| `F01-INTEGRATION-001` | `streamLiveSessionEvents` | `GET /v1/live-sessions/{session_id}/events` consumes safe projection; outbound `copilot.signal.available.v1` remains internal | `signal-publisher` | Co-pilot receives redacted, session-scoped signals with confidence, freshness, and expiry; consumer outage or redaction failure never becomes delivered success. |
| `F01-INTEGRATION-002` | `streamLiveSessionEvents` | `GET /v1/live-sessions/{session_id}/events` consumes safe projection; outbound `streampilot.product-interest.available.v1` remains internal | `signal-publisher` | StreamPilot receives product-interest only with catalog evidence, confidence, freshness, and revision; missing evidence or stale projection blocks downstream action. |
| `F01-INTEGRATION-003` | `streamLiveSessionEvents` | `GET /v1/live-sessions/{session_id}/events` consumes safe projection; outbound `compliance.risk.detected.v1` remains internal | `risk-publisher + audit-service` | Compliance receives redacted risk evidence with policy version, source lineage, severity, and correlation; missing policy/evidence or compliance outage blocks valid delivery. |
| `F01-INTEGRATION-004` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE safe projection; outbound `product.interest.stock-aware.v1` remains internal | `purchase-projection + inventory-service` | Purchase interest is correlated with SKU stock snapshot and freshness as available/constrained/unavailable/unknown; stale or unavailable inventory blocks unsafe recommendation. |
| `F01-INTEGRATION-005` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE safe projection; outbound `telemetry.action_outcome.recorded.v1` remains internal | `telemetry-service` | Downstream action outcomes are appended with action ID, provider status, causation, reconciliation state, and session lineage; unknown or duplicate outcomes remain explicit. |

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

### Flow-to-boundary reconciliation

Not every detailed flow becomes a public HTTP endpoint. The following mapping is
intentional: browser-visible reads and operator commands use OpenAPI; ingestion,
classification, JEV orchestration, policy evaluation, projections, adapter safety,
and audit append use authenticated internal routes or NATS/JetStream contracts.

| SOT flow family | Public operation(s) | Internal contract and owner | Pilot status |
|---|---|---|---|
| F01 initialization, signal ingestion, normalization, duplicate/late handling, intent/risk classification, product resolution, metric projection, integrations, and safety flows | `getLiveSessionOverview`, `streamLiveSessionEvents` | session/telemetry/intent-risk/catalog services; versioned NATS commands/events; PostgreSQL authoritative state plus Redis projections | active; frontend signal injection is explicitly mock input |
| F02 host HUD, realtime suggestions, grounding, stale/unsafe withdrawal, session isolation, and catalog/stock alerts | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getPromotion` | JEV/copilot and catalog services; suggestion facts and withdrawal events through NATS; no direct AI/provider route | active read surface; host decision mutations are not yet selected for the demo |
| F03 product-interest handling, catalog/stock verification, margin evaluation, voucher proposal, approval workflow, reservation, expiry, reconciliation, retry, DLQ, and action trace | `proposePromotion`, `decidePromotion`, `getPromotion` | promotion, margin, inventory, approval-control, execution/adapter-safety, and audit services; simulated adapter only | selected promotion scenario; pinning and real marketplace mutation excluded |
| F04 decision logging, approval modes, emergency pause/resume, risk escalation, adapter command safety, reconciliation, credential isolation, and evidence | `getActionLog`; approval is exposed through `decidePromotion` only | control-plane, adapter-safety, and audit services; pause/commands/reconciliation are internal control contracts until pilot scope approves public routes | safety invariants active; extra operator commands are deferred |
| F05 test login, invalid credentials, session read, and logout | `loginTestUser`, `getCurrentAuthSession`, `logoutTestUser` | identity/session service and audit; versioned auth events; Argon2id test accounts only in local/simulated mode | selected pilot entry; production OIDC remains a launch gate |

The F01–F04 detailed flow files remain authoritative for internal event behavior.
Their repeated `OPEN-001` route decisions are resolved here as “internal
contract unless explicitly listed as a public operation”; payload and subject
schemas still require the NATS catalog before AsyncAPI generation.

### Exact flow traceability for the public operations

| Operation | Requirement / detailed flow authorities |
|---|---|
| `createLiveSession` | `BR-F01-001`; `F01-FLOW-001` |
| `loginTestUser` | `REQ-LP-017`; `F05.1-FLOW-001`, `F05.1-FLOW-002` |
| `getCurrentAuthSession` | `REQ-LP-017`; `F05.1-FLOW-003` |
| `logoutTestUser` | `REQ-LP-017`; `F05.1-FLOW-004` |
| `getLiveSessionOverview` | `REQ-LP-003`, `REQ-LP-004`, `REQ-LP-006`, `REQ-LP-016`; `F01.3-FLOW-001` through `F01.3-FLOW-006`; `F02-FLOW-001`, `F02-FLOW-003`, `F02.3-FLOW-001` through `F02.3-FLOW-007`; `F03-FLOW-001` through `F03-FLOW-004` |
| `streamLiveSessionEvents` | `REQ-LP-003`, `REQ-LP-004`, `REQ-LP-016`; `F01-INTEGRATION-001` through `F01-INTEGRATION-005`; `F02-FLOW-002`, `F02-FLOW-004`, `F02-FLOW-005`, `F02-INTEGRATION-001`, `F02-INTEGRATION-003`; `F04.1-FLOW-003` |
| `proposePromotion` | `REQ-LP-008`, `REQ-LP-009`, `REQ-LP-013`; `F03.2-FLOW-001` through `F03.2-FLOW-008`; `F03.3-FLOW-001` through `F03.3-FLOW-008`; `F04.1-FLOW-001`, `F04.1-FLOW-002` |
| `decidePromotion` | `REQ-LP-013`; `F03.3-FLOW-002` through `F03.3-FLOW-005`; `F02.4-FLOW-005` through `F02.4-FLOW-008`; `F04.2-FLOW-001` through `F04.2-FLOW-006`; `F04.3-FLOW-004`, `F04.3-FLOW-008`, `F04.3-FLOW-009` |
| `getPromotion` | `REQ-LP-008`, `REQ-LP-009`, `REQ-LP-010`, `REQ-LP-013`; `F03-WORKFLOW-001` through `F03-WORKFLOW-006`; `F03.2-FLOW-002` through `F03.2-FLOW-008`; `F03.4-FLOW-001` through `F03.4-FLOW-008`; `F04.5-FLOW-004` through `F04.5-FLOW-006` |
| `getActionLog` | `REQ-LP-012` (future/full audit) and selected promotion evidence; `F04.1-FLOW-001` through `F04.1-FLOW-007`; `F04.6-FLOW-001` through `F04.6-FLOW-005`; `F03-WORKFLOW-006` |

F01 classifier, F02 JEV, F03 workflow, and F04 control flows that are not listed
as public operations are covered by the NATS subjects in the subject catalog and
must not be exposed through browser-originated routes.

### Endpoint error allocation

| Operation | 400 | 401 | 403/404 | 409 | 422 | 429 | 503/504 | 202/unknown |
|---|---|---|---|---|---|---|---|---|
| `loginTestUser` | `REQUEST_INVALID` | `AUTHENTICATION_INVALID` | — | — | — | `RATE_LIMITED` | `DEPENDENCY_UNAVAILABLE` | — |
| `getCurrentAuthSession` | — | `AUTHENTICATION_REQUIRED` | — | — | — | `RATE_LIMITED` | `DEPENDENCY_UNAVAILABLE` | — |
| `logoutTestUser` | — | `AUTHENTICATION_REQUIRED` | — | — | — | `RATE_LIMITED` | `DEPENDENCY_UNAVAILABLE` | — |
| `getLiveSessionOverview` | `REQUEST_INVALID` | `AUTHENTICATION_REQUIRED` | `SESSION_SCOPE_DENIED` / privacy-safe not found | — | — | `RATE_LIMITED` | `DEPENDENCY_UNAVAILABLE` | partial fields marked stale/unknown |
| `streamLiveSessionEvents` | `REQUEST_INVALID` | `AUTHENTICATION_REQUIRED` | `SESSION_SCOPE_DENIED` / privacy-safe not found | `REPLAY_WINDOW_EXPIRED` | — | `RATE_LIMITED` | `DEPENDENCY_TIMEOUT` | disconnected/stale event |
| `proposePromotion` | `REQUEST_INVALID` | `AUTHENTICATION_REQUIRED` | `SESSION_SCOPE_DENIED` | `IDEMPOTENCY_KEY_CONFLICT` / `RESOURCE_VERSION_CONFLICT` | `POLICY_REJECTED` / `APPROVAL_REQUIRED` | `RATE_LIMITED` | `DEPENDENCY_UNAVAILABLE` | `ACTION_PENDING` |
| `decidePromotion` | `REQUEST_INVALID` | `AUTHENTICATION_REQUIRED` | capability denial / privacy-safe not found | `IDEMPOTENCY_KEY_CONFLICT` / `RESOURCE_VERSION_CONFLICT` | `POLICY_REJECTED` | `RATE_LIMITED` | `DEPENDENCY_TIMEOUT` | `ACTION_PENDING` / `ACTION_UNKNOWN` |
| `getPromotion` | `REQUEST_INVALID` | `AUTHENTICATION_REQUIRED` | privacy-safe not found | — | — | `RATE_LIMITED` | `DEPENDENCY_UNAVAILABLE` | linked state marked unknown |
| `getActionLog` | `REQUEST_INVALID` | `AUTHENTICATION_REQUIRED` | capability denial / privacy-safe not found | — | — | `RATE_LIMITED` | `DEPENDENCY_UNAVAILABLE` | — |

`REPLAY_WINDOW_EXPIRED` must be added to the public error registry before the SSE
contract is frozen. Every response uses the canonical ProblemDetails schema and
the error registry's `LP` code, localization key, retry policy, and correlation ID.

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
