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
| `F01-SAFETY-001` | `getLiveSessionOverview`, `streamLiveSessionEvents` | `GET /v1/live-sessions/{session_id}/overview`; `GET /v1/live-sessions/{session_id}/events` | `Core BFF + session/policy services` | Degraded read-only mode is represented as explicit session/projection state; safe reads and logging continue while actions requiring unavailable truth are blocked server-side. |
| `F01-SAFETY-002` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE pause state; outbound `control.emergency_pause.activated.v1` remains internal | `approval-control + session-service` | Emergency Pause propagation is server-side and traceable; consequential actions stop while telemetry, safe reads, reconciliation, and audit continue. |
| `F01-SAFETY-003` | `getActionLog`, `getLiveSessionOverview` | `GET /v1/live-sessions/{session_id}/actions`; overview may expose redacted trace status; outbound `audit.decision_trace.recorded.v1` remains internal | `audit-service` | End-to-end trace links source event, signal, recommendation, outcome, and audit receipt using correlation/causation IDs, hashes, and append-only evidence. |
| `F02-FLOW-001` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-session-service` | Opens an authorized active-session HUD snapshot with suggestions, alerts, freshness, confidence, and evidence status; inactive/forbidden/unavailable snapshot states remain explicit. |
| `F02-FLOW-002` | `streamLiveSessionEvents` | Existing SSE surface | `copilot-delivery-service` | Delivers session-filtered real-time suggestions with revision/Last-Event-ID replay, duplicate safety, freshness, and explicit disconnect state. |
| `F02-FLOW-003` | `streamLiveSessionEvents` | Existing SSE surface | `copilot-rendering-service` | Delivers glanceable, localized, bounded guidance; message length, locale, or missing context failures never become fabricated content. |
| `F02-FLOW-004` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-lifecycle-service` | Expires stale guidance using revision/freshness policy and exposes expired state; no expired suggestion remains actionable. |
| `F02-FLOW-005` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-lifecycle-service` | Withdraws unsafe guidance with policy lineage and withdrawal receipt; unknown policy state never leaves unsafe guidance active. |
| `F02-FLOW-006` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing session-scoped surfaces | `copilot-session-service` | Enforces server-side session/actor isolation across snapshot, stream, cache, and evidence; scope mismatch never leaks another session's guidance. |
| `F02.1-FLOW-001` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-generation-service` | Repeated-question talking points include cluster freshness, catalog grounding, confidence, and evidence; stale cluster or unavailable generation is explicit refusal/defer. |
| `F02.1-FLOW-002` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-generation-service` | Host answer suggestions are catalog-grounded and policy-checked; missing catalog facts, low confidence, or blocked answer policy never produce verified guidance. |
| `F02.1-FLOW-003` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-generation-service` | Rising-product-attention alerts carry threshold version, signal freshness, SKU evidence, and confidence; stale/unresolved signals remain non-actionable. |
| `F02.1-FLOW-004` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-generation-service` | Next-product recommendation carries ranking/policy/stock evidence and freshness; stale ranking, unknown stock, or policy block is explicit. |
| `F02.1-FLOW-005` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-rendering-service` | Selling-rhythm guidance respects speaking state, bounded prompt length, locale, and delivery backpressure; it never invents context. |
| `F02.1-FLOW-006` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-prioritization-service` | Low-value notification suppression is deduplicated and policy-versioned; missing priority policy or full queue remains explicit. |
| `F02.1-FLOW-007` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-evidence-service` | Suggestions expose evidence IDs/source revision and redacted summaries; missing/stale evidence or redaction failure blocks verified guidance. |
| `F02.1-FLOW-008` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-policy-service` | Low-confidence guidance is labeled/deferred with threshold, evidence freshness, and review state; it cannot trigger consequential action. |
| `F02.2-FLOW-001` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `product-qa-service` | Product answers are generated only from approved catalog facts with catalog version, evidence, confidence, and freshness. |
| `F02.2-FLOW-002` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `product-qa-service` | Unsupported product claims produce a safe refusal and policy/evidence reason; they are never rendered as verified guidance. |
| `F02.2-FLOW-003` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `product-qa-service` | Unverified medical claims are refused with safety policy lineage, low-confidence state, and redacted evidence. |
| `F02.2-FLOW-004` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `product-qa-service` | Evidence source display exposes safe source references, catalog revision, and freshness without raw provider secrets or private payloads. |
| `F02.2-FLOW-005` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `product-qa-service` | Catalog version changes invalidate/re-evaluate guidance; stale or unavailable catalog state is explicit and never silently reused. |
| `F02.2-FLOW-006` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `product-qa-service` | Ambiguous product questions return clarification/unresolved state with candidate evidence; no product/SKU is invented. |
| `F02.2-FLOW-007` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `product-qa-service` | Current stock is reflected only from authorized fresh inventory facts; stale, unavailable, or unknown stock is visible and non-actionable. |
| `F02.3-FLOW-001` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-alert-service` | Low-stock alert includes SKU, threshold/policy version, stock freshness, evidence, and severity; unknown stock never becomes a low-stock claim. |
| `F02.3-FLOW-002` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-alert-service` | Out-of-stock alert is emitted only from authoritative inventory state and remains visible as stale/unknown when unavailable. |
| `F02.3-FLOW-003` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-alert-service` | High-order-volume alert carries window, count, threshold, freshness, and deduplication identity; incomplete data is explicit. |
| `F02.3-FLOW-004` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-alert-service` | Best-selling highlight carries ranked SKU evidence, ranking revision, stock state, and freshness; stale ranking is not presented as current. |
| `F02.3-FLOW-005` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-alert-service` | Voucher-limit alert exposes usage/limit freshness and promotion state; unknown or stale voucher state blocks a trusted alert. |
| `F02.3-FLOW-006` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-alert-service` | Abnormal price/promotion alert includes catalog/promotion revision and evidence; state mismatch or unresolved catalog remains explicit. |
| `F02.3-FLOW-007` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-alert-service` | Flash-voucher countdown is derived from authoritative expiry and clock metadata; revoked voucher, invalid time, or clock skew is shown as unavailable/stale. |
| `F02.4-FLOW-001` | None by design; decision state may appear in overview/SSE | Internal host-decision contract | `host-decision-service` | Host use of a suggestion requires authorized actor, current suggestion revision, evidence, and audit receipt; forbidden/stale/withdrawn guidance cannot be used. |
| `F02.4-FLOW-002` | None by design; decision state may appear in overview/SSE | Internal host-decision contract | `host-decision-service` | Edited guidance is revalidated against content policy and suggestion revision before use; policy block or revision conflict remains explicit. |
| `F02.4-FLOW-003` | None by design; decision state may appear in overview/SSE | Internal host-decision contract | `host-decision-service` | Rejection records actor, suggestion, reason, revision, and audit lineage; missing suggestion or final decision is not silently accepted. |
| `F02.4-FLOW-004` | None by design; evidence state may appear in overview/SSE | Internal host-decision/evidence contract | `host-decision-service + evidence-service` | Request-more-details preserves suggestion/evidence lineage and redaction; missing evidence or redaction failure remains deferred. |
| `F02.4-FLOW-005` | Existing `decidePromotion` only when the resource is a promotion; no generic host route | Internal approval-control contract | `approval-control integration` | Consequential action requires server-side approval mode, policy, idempotency, and pause checks; `APPROVAL_REQUIRED`, unavailable mode, or active pause blocks execution. |
| `F02.4-FLOW-006` | None by design | Internal host-decision contract | `host-decision-service` | Approval is capability-checked server-side with actor context and revocation; UI role/persona is never authorization evidence. |
| `F02.4-FLOW-007` | None by design | Internal host-decision contract | `host-decision-service` | Same idempotency key/fingerprint returns one decision receipt; mismatch or already-final decision is a conflict, never a second effect. |
| `F02.4-FLOW-008` | Existing overview/SSE pause state; no generic host route | Internal approval-control contract | `approval-control integration` | Emergency Pause blocks approval before commit and preserves pause revision/state; unknown or stale pause state fails closed. |
| `F02-SAFETY-001` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `copilot-policy-service` | AI output is grounded in approved evidence/catalog/policy versions; empty/stale evidence or unsupported claims produce refusal/blocked state. |
| `F02-SAFETY-002` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing safe DTO/SSE surfaces | `copilot-redaction-service` | HUD DTOs redact tokens, COGS, provider credentials, raw PII, and unnecessary sensitive fields; redaction failure blocks delivery. |
| `F02-SAFETY-003` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE degraded state | `copilot-session-service + Core BFF` | Co-pilot outage exposes last-known snapshot, disconnected/stale state, and recovery metadata without claiming fresh guidance. |
| `F02-SAFETY-004` | `getActionLog`, `getLiveSessionOverview` | Existing action log/overview surfaces; internal audit receipt | `audit-service` | Every host decision is append-only audited with actor, suggestion/revision, outcome, correlation/causation, and evidence hash. |
| `F02-INTEGRATION-001` | `streamLiveSessionEvents` | Existing SSE safe projection; internal F01 signal consumer | `signal-ingestion-service` | F01 signals are schema/version/session validated before entering copilot context; unsupported schema, session mismatch, or stale source is rejected/deferred. |
| `F02-INTEGRATION-002` | `getActionLog`, `streamLiveSessionEvents` | Existing audit/SSE projection; internal compliance event | `host-decision-service` | Host decisions are sent to compliance only after committed decision receipt and redaction; compliance outage never fabricates delivery. |
| `F02-INTEGRATION-003` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces; internal StreamPilot state consumer | `state-ingestion-service` | StreamPilot state is schema/version/session validated and freshness-marked before host display; stale or mismatched state remains explicit. |
| `F03-FLOW-001` | `proposePromotion` | `POST /v1/live-sessions/{session_id}/promotions` | `signal-ingestion-service` | Accepts only verified session-scoped product-interest signals; missing/stale lineage cannot start a proposal. |
| `F03-FLOW-002` | `proposePromotion` | Existing promotion proposal route | `catalog-service` | Proposal precondition verifies approved catalog membership and catalog revision before any action. |
| `F03-FLOW-003` | `proposePromotion` | Existing promotion proposal route | `catalog-service` | Unknown SKU is rejected with explicit evidence; no product action or promotion is created. |
| `F03-FLOW-004` | `proposePromotion`, `decidePromotion` | Existing proposal/decision routes | `approval-control-service` | Approval mode is server-authoritative and checked before and at consequential commit; unsupported mode fails closed. |
| `F03.1-FLOW-001` | None by design; state may appear in `getPromotion` | Internal pinning contract | `product-pinning-service` | Resolves a verified product/SKU against approved catalog and session context; ambiguity remains unresolved. |
| `F03.1-FLOW-002` | None by design; state may appear in `getPromotion` | Internal inventory precondition | `inventory-service` | Pinning requires fresh available stock; unknown/stale inventory blocks the action. |
| `F03.1-FLOW-003` | None by design; state may appear in `getPromotion` | Internal pinning policy | `product-pinning-service` | Repinning is rate/window limited and idempotent; excessive attempts are rejected with policy evidence. |
| `F03.1-FLOW-004` | None by design; state may appear in `getPromotion` | Internal adapter command | `execution-adapter-safety-service` | Product pin executes only after approval/policy/idempotency checks and succeeds only after observed-state confirmation. |
| `F03.1-FLOW-005` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `product-pinning-service` | Host sees pin context, evidence, approval, simulated mode, and observed state without provider secrets. |
| `F03.1-FLOW-006` | `getPromotion`, `getActionLog` | Existing promotion/action-log reads | `execution-adapter-safety-service` | Pin failure preserves requested/observed/unknown state, retry classification, and audit evidence. |
| `F03.1-FLOW-007` | None by design | Internal execution idempotency | `execution-adapter-safety-service` | Duplicate pin commands return one action receipt; conflicting fingerprint or final state is a conflict. |
| `F03.2-FLOW-001` | `proposePromotion` | `POST /v1/live-sessions/{session_id}/promotions` | `promotion-service` | Creates a voucher proposal only after catalog, margin, approval-mode, session, and idempotency preconditions; proposal is not issuance. |
| `F03.2-FLOW-002` | `getPromotion` | `GET /v1/promotions/{promotion_id}` | `promotion-service` | Flash-voucher schedule exposes explicit pending/scheduled/unknown timing and policy state; no countdown implies issuance success. |
| `F03.2-FLOW-003` | `getPromotion` | Existing promotion status route | `promotion-service` | Claim limit is enforced atomically with explicit usage/limit evidence; over-limit claims are rejected without inflation. |
| `F03.2-FLOW-004` | `getPromotion` | Existing promotion status route | `promotion-service` | Unused voucher expiry is time/policy governed and append-only; expired state cannot be reused or presented as active. |
| `F03.2-FLOW-005` | `getPromotion` | Existing promotion status route | `promotion-service` | Voucher cancellation is authorized, idempotent, and auditable; final/unknown state is reconciled before retry. |
| `F03.2-FLOW-006` | `proposePromotion` | Existing proposal route | `promotion-service` | Voucher eligibility is validated against session, catalog, policy, and audience scope; ineligible requests are explicit refusals. |
| `F03.2-FLOW-007` | `proposePromotion` | Existing proposal route | `promotion-service` | Malformed voucher payloads fail validation before persistence or adapter calls; no partial voucher is created. |
| `F03.2-FLOW-008` | `getPromotion` | Existing promotion status route | `promotion-service + execution-adapter-safety-service` | Delayed voucher responses remain pending/unknown until observed-state reconciliation; blind retry is prohibited. |
| `F03.3-FLOW-001` | `proposePromotion` | Existing proposal route | `margin-policy-service` | Contribution margin uses integer minor units, explicit ISO currency/scale, policy version, and immutable input evidence. |
| `F03.3-FLOW-002` | `decidePromotion` | `POST /v1/promotions/{promotion_id}/decision` | `margin-policy-service + approval-control-service` | Safe discount approval requires margin floor, policy verdict, actor capability, separation of duties, and idempotent decision receipt. |
| `F03.3-FLOW-003` | `proposePromotion`, `decidePromotion` | Existing proposal/decision routes | `margin-policy-service` | Loss-making discount is rejected with deterministic margin evidence; no execution or inventory mutation follows. |
| `F03.3-FLOW-004` | `decidePromotion` | Existing decision route | `approval-control-service` | Human approval is explicit, authorized, time-bounded, version-checked, and auditable; approval is never inferred from UI state. |
| `F03.3-FLOW-005` | `proposePromotion` | Existing proposal route | `margin-policy-service` | Safer alternative includes margin evidence, policy version, and bounded recommendation; it does not execute a discount. |
| `F03.3-FLOW-006` | `proposePromotion` | Existing proposal route | `margin-policy-service` | Money arithmetic rejects floating-point inputs and persists integer minor units/currency scale only. |
| `F03.3-FLOW-007` | `getPromotion`, `getActionLog` | Existing promotion/action-log reads | `margin-policy-service + audit-service` | Margin evidence preserves inputs, policy/model version, verdict, actor/correlation lineage, and immutable receipt. |
| `F03.3-FLOW-008` | `proposePromotion`, `getPromotion` | Existing proposal/status routes | `margin-policy-service` | Changed economics trigger deterministic re-evaluation against current catalog/stock/policy revision before approval or execution. |
| `F03.4-FLOW-001` | `getPromotion` | Existing promotion status projection; reservation command is internal | `inventory-service` | Stock reservation is atomic, session/promotion scoped, quantity bounded, and returns an explicit reservation receipt or refusal. |
| `F03.4-FLOW-002` | `getPromotion` | Existing promotion status projection | `inventory-service` | Available stock is protected by authoritative locking/version checks; concurrent reservations cannot oversell and conflicts remain explicit. |
| `F03.4-FLOW-003` | `proposePromotion`, `getPromotion` | Existing proposal/status routes | `inventory-service + promotion-service` | Insufficient or stale stock blocks the proposal/workflow with current quantity evidence; no adapter command is emitted. |
| `F03.4-FLOW-004` | `getPromotion` | Existing promotion status projection; payment/order command is internal | `inventory-service + order-service` | Stock commits only after an authoritative payment/order confirmation; pending, failed, and unknown payment states do not consume stock silently. |
| `F03.4-FLOW-005` | `getPromotion` | Existing promotion status projection; expiry worker is internal | `inventory-service` | Expired reservations are released by a durable, idempotent worker using reservation version/expiry evidence; late release cannot overwrite a newer state. |
| `F03.4-FLOW-006` | `getPromotion` | Existing promotion status projection; order synchronization is internal | `order-service + inventory-service` | Order state is reconciled from authoritative observations with correlation/causation metadata; divergence remains pending or unknown. |
| `F03.4-FLOW-007` | `getLiveSessionOverview`, `streamLiveSessionEvents` | Existing overview/SSE surfaces | `inventory-service + copilot-alert-service` | Low-stock facts are freshness-marked, threshold/policy versioned, and never presented as current when inventory observation is stale. |
| `F03.4-FLOW-008` | `getPromotion`, `getActionLog` | Existing status/action evidence reads; reservation command is internal | `inventory-service + audit-service` | Reservation idempotency key and request fingerprint return one receipt; mismatch, final state, or unknown outcome requires reconciliation rather than duplicate mutation. |
| `F03.5-FLOW-001` | `proposePromotion`, `getPromotion` | Existing proposal/status routes; scenario trigger is internal | `scenario-service + signal-ingestion-service` | Repeated-question trigger uses verified, session-scoped facts, bounded time windows, deduplication, and policy revision before creating a proposal. |
| `F03.5-FLOW-002` | `proposePromotion`, `getPromotion` | Existing proposal/status routes; engagement trigger is internal | `scenario-service + signal-ingestion-service` | High-engagement trigger requires fresh threshold evidence, cooldown/idempotency, and approval/policy preconditions; it cannot directly mutate a platform. |
| `F03.5-FLOW-003` | `proposePromotion`, `getPromotion` | Existing proposal/status routes; margin trigger is internal | `scenario-service + margin-policy-service` | Margin-floor trigger evaluates current integer-money economics and policy version before proposing a bounded response; stale economics fail closed. |
| `F03.5-FLOW-004` | `proposePromotion`, `getPromotion` | Existing proposal/status routes; stock trigger is internal | `scenario-service + inventory-service` | Low-stock trigger uses authoritative freshness/threshold evidence and deduplicates repeated alerts or proposals while inventory is unresolved. |
| `F03.5-FLOW-005` | `getPromotion`, `getActionLog` | Existing status/audit evidence reads; configuration mutation is internal | `scenario-service + policy-service` | Scenario configuration is versioned, scoped, auditable, and evaluated with the exact policy revision captured in the resulting evidence. |
| `F03.5-FLOW-006` | `getPromotion`, `getActionLog` | Existing status/audit evidence reads; disable command is internal | `scenario-service + policy-service` | Disabling a scenario is fail-safe and idempotent: new triggers stop, in-flight work is reconciled, and the disabled revision is visible in audit evidence. |
| `F03.5-FLOW-007` | `getPromotion`, `getActionLog` | Existing status/audit evidence reads; loop guard is internal | `scenario-service + audit-service` | Scenario actions carry causal chain, trigger fingerprint, depth/cooldown, and idempotency metadata so self-triggered or recursive loops are rejected. |
| `F03-WORKFLOW-001` | `proposePromotion`, `decidePromotion`, `getPromotion` | Existing promotion proposal/decision/status routes; durable workflow is internal | `promotion-workflow-service` | Promotion execution is a durable state machine with approval, policy, reservation, adapter, and observed-state gates; response remains pending until confirmed. |
| `F03-WORKFLOW-002` | `getPromotion`, `streamLiveSessionEvents` | Existing status/SSE pause projection; pause check is internal | `approval-control-service + promotion-workflow-service` | Emergency Pause stops before consequential commit and preserves pause revision/state; stale or unavailable pause state fails closed. |
| `F03-WORKFLOW-003` | `getPromotion`, `getActionLog` | Existing status/action evidence reads; reconciliation is internal | `promotion-workflow-service + execution-adapter-safety-service` | Requested, accepted, observed, and unknown states are reconciled using correlation/idempotency evidence before completion is claimed. |
| `F03-WORKFLOW-004` | `getPromotion`, `getActionLog` | Existing status/action evidence reads; retry scheduler is internal | `promotion-workflow-service` | Retry occurs only for classified transient failures with the same idempotency fingerprint; unknown external outcomes reconcile before another command. |
| `F03-WORKFLOW-005` | `getPromotion`, `getActionLog` | Existing status/action evidence reads; dead-letter path is internal | `promotion-workflow-service + audit-service` | Non-retryable or exhausted failures enter a durable dead-letter state with reason, evidence, replay authorization, and no hidden side effect. |
| `F03-WORKFLOW-006` | `getPromotion`, `getActionLog` | Existing promotion/action-log reads | `audit-service` | Complete action trace includes actor/capability, policy and catalog revisions, request/observed state, correlation/causation, idempotency, adapter mode, and outcome evidence. |
| `F04.1-FLOW-001` | `proposePromotion`, `getActionLog` | Existing proposal/action-log routes; receipt command is internal | `audit-service` | Incoming proposals are session-scoped, capability-checked, idempotent, redacted, and recorded as append-only receipts before downstream control decisions. |
| `F04.1-FLOW-002` | `proposePromotion`, `getActionLog` | Existing proposal/action-log routes; verdict receipt is internal | `audit-service + approval-control-service` | Policy verdicts preserve policy/revision, evidence, actor, correlation/causation, and propagation state; no verdict is silently overwritten. |
| `F04.1-FLOW-003` | `streamLiveSessionEvents`, `getActionLog` | Existing SSE/action-log surfaces | `audit-service` | Live decision sequence is a safe, freshness-marked projection of append-only receipts with session isolation and no secret/raw-PII leakage. |
| `F04.1-FLOW-004` | `getActionLog` | Existing action-log route; identity capture is internal | `audit-service` | Actor identity records principal reference and capability context without exposing credentials; missing or unverifiable identity blocks consequential action. |
| `F04.1-FLOW-005` | `getActionLog` | Existing action-log route; failure receipt is internal | `audit-service` | Failure, retry classification/count, unknown state, and recovery evidence are append-only and linked to the original correlation/idempotency lineage. |
| `F04.1-FLOW-006` | `getActionLog` | Existing safe audit projection | `audit-service` | Operator detail is redacted and explainable: status, evidence IDs, revisions, and safe recovery are visible while tokens, COGS, credentials, and raw PII remain hidden. |
| `F04.1-FLOW-007` | `getActionLog` | Existing action-log route; append-only storage is internal | `audit-service` | History cannot be updated or deleted in place; corrections create a new receipt and deterministic projections can be rebuilt from the ledger. |
| `F04.2-FLOW-001` | `decidePromotion`, `getPromotion` | Existing decision/status routes; mode gate is internal | `approval-control-service` | RECOMMEND_ONLY records and surfaces recommendations but blocks consequential execution; server-side mode and capability are authoritative. |
| `F04.2-FLOW-002` | `decidePromotion`, `getPromotion` | Existing decision/status routes; mode gate is internal | `approval-control-service` | ASSISTED mode requires explicit authorized approval at commit, with revision, policy, idempotency, and audit evidence checks. |
| `F04.2-FLOW-003` | `decidePromotion`, `getPromotion` | Existing decision/status routes; mode gate is internal | `approval-control-service` | AUTONOMOUS mode is allowed only for policy-authorized actions and still checks pause, capability, revision, idempotency, and observed-state gates. |
| `F04.2-FLOW-004` | `decidePromotion`, `getActionLog` | Existing decision/action-log routes; authorization check is internal | `approval-control-service + audit-service` | Unauthorized approval is rejected before mutation and produces a redacted denial receipt with actor/capability and policy evidence. |
| `F04.2-FLOW-005` | `getPromotion`, `getActionLog` | Existing status/action-log routes; expiry worker is internal | `approval-control-service` | Expired approval requests cannot be committed; expiry is revisioned, idempotent, and auditable with no late approval replay. |
| `F04.2-FLOW-006` | `decidePromotion`, `getActionLog` | Existing decision/action-log routes; replay guard is internal | `approval-control-service + audit-service` | A decision key/fingerprint can produce one receipt only; reused, stale, or conflicting approval is rejected and reconciled. |
| `F04.2-FLOW-007` | `getPromotion`, `getActionLog` | Existing status/action-log routes; mode change command is internal | `approval-control-service` | Approval-mode changes are capability-checked, revisioned, effective at a defined boundary, and fail closed when propagation is unknown. |
| `F04.3-FLOW-001` | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getActionLog` | Existing overview/SSE/action-log projections; pause command is internal | `emergency-control-service` | Operator activation creates a revisioned pause fact with actor, scope, idempotency, propagation, and audit receipt before consequential work is blocked. |
| `F04.3-FLOW-002` | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getActionLog` | Existing risk/overview/SSE/action-log projections; critical-risk trigger is internal | `emergency-control-service + risk-service` | CRITICAL risk can activate the same server-side pause control; trigger evidence and propagation remain explicit and auditable. |
| `F04.3-FLOW-003` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; pin stop is internal | `emergency-control-service + product-pinning-service` | Active pause prevents new or in-flight consequential product-pin commits; blocked state includes pause revision and recovery evidence. |
| `F04.3-FLOW-004` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; voucher stop is internal | `emergency-control-service + promotion-service` | Active pause blocks voucher issuance/commit while preserving proposal and unknown state; no pause bypass or false success is exposed. |
| `F04.3-FLOW-005` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; reservation stop is internal | `emergency-control-service + inventory-service` | Active pause rejects new stock reservations at the authoritative inventory boundary; existing reservations remain explicitly reconciled. |
| `F04.3-FLOW-006` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; scenario stop is internal | `emergency-control-service + scenario-service` | Active pause disables new scenario-triggered proposals and records the pause revision; in-flight work cannot silently continue to commit. |
| `F04.3-FLOW-007` | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getActionLog` | Existing overview/SSE/action-log surfaces | `emergency-control-service + telemetry-service + audit-service` | Pause leaves telemetry, safe projections, reconciliation, and append-only logging available with explicit degraded/blocked state. |
| `F04.3-FLOW-008` | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getActionLog` | Existing control projection surfaces; release command is internal | `emergency-control-service` | Pause release is capability-checked, revision/idempotency guarded, propagated, and auditable; release does not imply resumed execution until downstream readiness is confirmed. |
| `F04.3-FLOW-009` | `getLiveSessionOverview`, `getActionLog` | Existing control/action projections; resume guard is internal | `emergency-control-service + approval-control-service` | Unsafe resume is rejected when risk, propagation, approval, adapter, or reconciliation prerequisites are unknown/stale; denial is preserved as evidence. |
| `F04.4-FLOW-001` | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getActionLog` | Existing overview/SSE/action-log surfaces; risk command is internal | `risk-control-service` | LOW risk is recorded with severity, source evidence, policy revision, session scope, and explicit no-escalation response. |
| `F04.4-FLOW-002` | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getActionLog` | Existing overview/SSE/action-log surfaces | `risk-control-service` | MEDIUM risk emits a deduplicated operator alert with freshness, evidence, policy version, and acknowledgement state; it does not imply a mutation. |
| `F04.4-FLOW-003` | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getActionLog` | Existing overview/SSE/action-log surfaces; high-risk control is internal | `risk-control-service + emergency-control-service` | HIGH risk applies the configured control response, preserving actor/evidence/revision and blocking or requiring approval for consequential actions. |
| `F04.4-FLOW-004` | `getLiveSessionOverview`, `streamLiveSessionEvents`, `getActionLog` | Existing overview/SSE/action-log surfaces; critical response is internal | `risk-control-service + emergency-control-service` | CRITICAL risk activates the authoritative pause/control response and blocks consequential mutation while telemetry and audit remain available. |
| `F04.4-FLOW-005` | `getActionLog`, `getLiveSessionOverview` | Existing action-log/overview evidence surfaces | `risk-control-service + audit-service` | Risk evidence preserves source event, model/policy version, severity, redaction, correlation/causation, and immutable evidence references. |
| `F04.4-FLOW-006` | `getActionLog`, `getLiveSessionOverview` | Existing action-log/overview surfaces; case resolution is internal | `risk-control-service` | Moderation case resolution is capability-checked, revisioned, idempotent, and append-only; resolution cannot erase the original risk evidence. |
| `F04.4-FLOW-007` | `getActionLog`, `getLiveSessionOverview` | Existing action-log/overview surfaces; deduplication is internal | `risk-control-service + audit-service` | Same source/risk fingerprint yields one escalation/case; conflicts or stale revisions are explicit and do not create duplicate operator work. |
| `F04.5-FLOW-001` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; command validation is internal | `adapter-safety-service` | External commands are schema, capability, pause, policy, scope, idempotency, and adapter-allowlist validated before dispatch. |
| `F04.5-FLOW-002` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; adapter command is internal | `adapter-safety-service` | Every command carries correlation/causation, idempotency, policy/control revision, simulated-mode label, and durable receipt; browser never calls a platform. |
| `F04.5-FLOW-003` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; retry scheduler is internal | `adapter-safety-service` | Only classified transient failures retry with bounded backoff and the same idempotency key; each attempt is auditable. |
| `F04.5-FLOW-004` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; reconciliation is internal | `adapter-safety-service` | Unknown adapter results remain unknown/reconciling and cannot be blindly retried or reported as success. |
| `F04.5-FLOW-005` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; failure handling is internal | `adapter-safety-service` | Adapter failures expose explicit blocked/rejected/dead-letter/reconciling state with sanitized reason and recovery evidence. |
| `F04.5-FLOW-006` | `getPromotion`, `getActionLog` | Existing promotion/action-log projections; observed-state query is internal | `adapter-safety-service` | Completion requires authoritative observed-state confirmation linked to the requested command; mismatch remains unresolved and blocks downstream claims. |
| `F04.5-FLOW-007` | `getActionLog` | Existing redacted audit projection; credential access is internal | `adapter-safety-service` | Platform credentials remain isolated to the adapter boundary, never enter browser/BFF/audit payloads, and credential failures are redacted and auditable. |
| `F04.6-FLOW-001` | `getActionLog` | Existing action-log route; receipt append is internal | `audit-service` | Complete decision receipt includes actor/capability, session, mode/severity, policy/control revisions, request/observed state, evidence, and outcome before projection. |
| `F04.6-FLOW-002` | `getActionLog` | Existing action-log route; lineage linking is internal | `audit-service` | Correlation and causation form a validated chain across proposal, policy, approval, pause, adapter, and outcome receipts; orphan lineage is explicit. |
| `F04.6-FLOW-003` | `getActionLog`, `getPromotion` | Existing action-log/promotion status routes; duplicate proof is internal | `audit-service + promotion-service` | Voucher effect evidence proves one idempotency fingerprint/observed outcome per action; duplicate or conflicting receipts remain detectable and unresolved. |
| `F04.6-FLOW-004` | `getActionLog` | Existing action-log route; export job is internal | `audit-service` | Evidence export is capability-checked, session-scoped, redacted, integrity-linked, and reports incomplete/unknown records rather than fabricating a complete bundle. |
| `F04.6-FLOW-005` | `getActionLog`, `getLiveSessionOverview` | Existing action-log/overview projections; rebuild is internal | `audit-service` | Audit projections rebuild deterministically from append-only receipts, preserve revision/checkpoint evidence, and never mutate the source ledger. |

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
