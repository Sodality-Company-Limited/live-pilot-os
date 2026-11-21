# LivePilot OS — SOT Reconciliation Before API Generation

> **Status:** incremental reconciliation gate; generation proceeds one approved
> flow at a time. Unreconciled operations remain blocked.
> **Scope:** local development and DigitalOcean production only. The production
> topology remains production-shaped; the live demo injects frontend signals,
> backend products, and simulated platform actions.

## Authority order

1. Product requirements and selected demo acceptance criteria.
2. Feature indexes and detailed flow SOTs.
3. Domain/resource state and policy SOTs.
4. Boundary, identity, error, idempotency, realtime, and event contracts.
5. API operation catalog.
6. OpenAPI/AsyncAPI/JSON Schema generated artifacts.

Generated artifacts cannot introduce behavior absent from a higher authority.

## Reconciled baseline

| Area | Reconciled decision | Evidence | API consequence |
|---|---|---|---|
| Environments | `local` and DigitalOcean `prod` only; CI is validation, not an environment | deployment README/runtime topology | No staging-only API behavior or config |
| Demo boundary | frontend mock signals, backend mock products, simulated adapter; domain services, audit, policy, and approval remain real | demo scenarios, mock-data SOT, integration boundaries | Every simulated effect is labeled and cannot imply marketplace mutation |
| Public HTTP | Portal BFF owns `/api/*`; public versioned contract is `/v1/*`; internal service ingress is `/internal/v1/*` | route-prefixing invariant | OpenAPI contains only public `/v1/*` operations |
| Domain authority | one owning service and one authoritative writer per resource | domain-resource-state SOT, service topology | No endpoint is generated from a table or cross-service write |
| AI | JEV owns orchestration; OpenAI is a provider behind the JEV port; local fixture is deterministic | JEV runtime, provider abstraction, OpenAI SOT | No direct provider endpoint or execution authority in OpenAPI |
| Marketplace | adapter is simulated for the pilot; no active TikTok/provider credential surface | integration boundaries, provider decision SOT | No marketplace OAuth or provider API paths in the pilot contract |
| Mutations | approval, policy verdict, idempotency, version, audit lineage, and explicit unknown state are required | domain state, authorization, idempotency SOTs | Mutations return pending/unknown where the effect is not confirmed |
| Realtime | SSE is the default client transport; replay, heartbeat, filtering, and retention must be fixed per surface | realtime transport SOT | No realtime endpoint is frozen until those values are approved |

## Current blockers

1. Most existing paths in `openapi.yaml` are not fully traceable to requirement,
   acceptance, flow, authorization, state transition, error, event, idempotency,
   and verification records. `createLiveSession` is the first reconciled
   operation for `F01-FLOW-001`; remaining paths stay draft until generated.
2. Production identity is still unresolved: OIDC provider, claim mapping, tenant
   authority, service identity, role/capability registry, expiry, and rotation.
   The seeded test-login contract is pilot-only and must not be presented as
   production authentication.
3. Realtime decisions are unresolved: surface mapping, replay retention,
   subscriber limits, heartbeat, filtering, and gateway timeout.
4. The NATS subject catalog has the required template but no approved subject rows,
   schemas, retry/DLQ, retention, or replay owners.
5. Resource schemas and ProblemDetails/error mappings need an operation-by-operation
   approval record; the current OpenAPI responses are incomplete for the domain
   state model (notably stale versions, unknown adapter outcomes, and policy/audit
   lineage).

## Entry gate for API generation

Generation may begin only when each proposed operation has a catalog row containing:

- requirement ID, acceptance scenario, and detailed flow ID;
- owning service, authoritative persistence owner, actor capability, and tenant scope;
- request/response schema, limits, freshness, pagination, and localized labels;
- state transition, policy revision, audit lineage, and idempotency behavior;
- synchronous errors plus async events/jobs and unknown-result behavior; and
- contract, security, integration, and end-to-end verification commands.

The existing API traceability and SOT hierarchy scripts are necessary gates, but
they do not prove that an empty catalog is semantically complete.

### Incremental result: F01-FLOW-002

No public OpenAPI path is generated for this flow. The service ownership SOT
explicitly gives `telemetry-service` no public exposure; ingestion remains an
adapter-to-NATS contract. The flow and NATS catalog still require reconciliation
of command/event names and payload coverage before the async contract can be
marked complete.

### Incremental result: F01-FLOW-003

No public OpenAPI path is generated for normalization. The operation is an
internal telemetry-service transformation from an accepted source event to a
canonical event. The flow's `telemetry.normalize.requested.v1` and
`telemetry.normalized.v1` subjects are not present in the canonical NATS subject
catalog yet, so the async schema/subject reconciliation remains open.

### Incremental result: F01-FLOW-004

No public OpenAPI path is generated for duplicate suppression. The provider
event ID, session ID, and payload fingerprint must be checked atomically by
`telemetry-service`; a matching retry returns the original receipt with
`duplicate=true`, while a mismatched fingerprint produces a conflict. The
flow's `telemetry.duplicate.detected.v1` fact and its schema are not yet in the
canonical NATS catalog, so async contract generation remains open.

### Incremental result: F01-FLOW-005

No public OpenAPI path is generated for late or out-of-order handling. The
telemetry source fact remains immutable; `occurred_at` drives event-time metrics,
`received_at` is retained for audit, and reconciliation creates a monotonic
projection revision. The flow's `telemetry.late.received.v1` and
`projection.reconciled.v1` contracts are not yet registered in the canonical
NATS catalog, so async schema generation remains open.

### Incremental result: F01.1-FLOW-001

No public OpenAPI path is generated for product-interest classification. The
`intent-risk-service` owns the signal, persists taxonomy/model/policy evidence,
and publishes only after durable commit. `PRODUCT_INTEREST` may include an
optional SKU, but low-confidence output is reviewable UI context only and cannot
trigger commerce mutation. The flow's intent command/event pair is not yet
registered in the canonical NATS catalog.

### Incremental result: F01.1-FLOW-002

No public OpenAPI path is generated for product-question classification. The
internal signal carries the question entity, confidence, catalog/SKU status,
correlation lineage, and evidence. Low confidence, unresolved catalog context,
and `UNSUPPORTED_QUESTION_TYPE` remain explicit outcomes; the shared intent
command/event pair still requires NATS catalog registration.

### Incremental result: F01.1-FLOW-003

No public OpenAPI path is generated for promotion-request classification. The
output is a typed `DISCOUNT_REQUEST` or `VOUCHER_REQUEST` signal and never a
promotion mutation. Low confidence, catalog uncertainty, and
`UNSUPPORTED_PROMOTION_TERM` must remain explicit and non-actionable until a
downstream policy/approval flow handles them.

### Incremental result: F01.1-FLOW-004

No public OpenAPI path is generated for stock/size intent classification. The
intent-risk and catalog boundaries jointly provide typed `STOCK_QUERY` or
`SIZE_QUERY` context with SKU confidence. Unresolved SKU, stale catalog facts,
and low confidence remain explicit non-actionable states; the event schema and
consumer compatibility contract still require async registration.

### Incremental result: F01.1-FLOW-005

No public OpenAPI path is generated for product-entity resolution. The
`catalog-service` owns the approved catalog and may return exactly one SKU,
multiple candidates, or an explicit unresolved result with catalog version and
evidence. `CATALOG_UNAVAILABLE`, `AMBIGUOUS_ENTITY`, and
`CATALOG_VERSION_MISMATCH` must not be converted into an inferred product.

### Incremental result: F01.1-FLOW-006

No public OpenAPI path is generated for unsupported-claim rejection. The
intent-risk/compliance boundary emits a redacted `UNSUPPORTED_CLAIM` signal and
review-needed status, preserving evidence and policy lineage without presenting
the claim as verified guidance. `POLICY_UNAVAILABLE`, `CLAIM_SCOPE_UNKNOWN`,
and low confidence remain explicit non-success outcomes.

### Incremental result: F01.1-FLOW-007

No public OpenAPI path is generated for repeated-question clustering. The
worker emits a rebuildable `QuestionCluster` projection with count,
representative question, product/time-window context, and evidence IDs. Invalid
input, invalid windows, or model unavailability remain rejected/deferred states;
the `chat.question.clustered.v1` event schema still needs canonical registry
coverage.

### Incremental result: F01.P-FLOW-002

No public OpenAPI path is generated for checkout telemetry ingestion. The
purchase projection records checkout separately from cart-add and payment/order
state, preserving order/cart reference, event identity, session scope, and
revision evidence. Missing order reference, duplicate commerce event, and
inactive session remain explicit failure/deferred outcomes.

### Incremental result: F01.P-FLOW-003

No public OpenAPI path is generated for payment/order-state ingestion. The
`purchase-projection` owns only the read projection and consumes versioned order
facts; it does not become the order source of truth. `ORDER_STATE_INVALID`,
`STALE_ORDER_REVISION`, and `ORDER_NOT_FOUND` remain explicit outcomes and must
not be rendered as a successful payment state.

### Incremental result: F01.P-FLOW-004

No public OpenAPI path is generated for conversion calculation. The projection
exposes numerator, denominator, window, revision, and freshness, while preserving
cart and checkout as separate source measures. Invalid windows, undefined
division, and stale projection data remain explicit rejected/deferred/stale
states rather than fabricated zero or success values.

### Incremental result: F01.P-FLOW-005

No public OpenAPI path is generated for high-interest/low-conversion detection.
The purchase projection emits the signal with threshold version, source counts,
window, revision, and freshness only when the window is complete. Missing
threshold configuration, incomplete windows, and stale data remain explicit
rejected/deferred/stale outcomes.

### Incremental result: F01.P-FLOW-006

No public OpenAPI path is generated for voucher attribution. The
`purchase-projection` emits a voucher-correlated purchase signal only with
voucher/order references, session/window scope, evidence, and attribution
confidence. `VOUCHER_REF_MISSING`, `ORDER_LINK_UNAVAILABLE`, and duplicate
voucher events remain explicit non-success outcomes.

### Incremental result: F01.P-FLOW-007

No public OpenAPI path is generated for purchase-interest ranking. The internal
projection exposes ranked SKUs, score components, scoring/config version,
session/window scope, evidence, revision, and freshness. `SKU_UNRESOLVED`,
`SCORE_CONFIG_MISSING`, and stale projection data remain explicit outcomes and
cannot be used as authoritative recommendation evidence.

### Incremental result: F01.P-FLOW-008

No public OpenAPI path is generated for purchase-signal inflation prevention.
Telemetry and purchase projection jointly enforce source identity, stage
separation, provider revision, deduplication, and monotonic revisions so replay
cannot inflate cart, checkout, payment, voucher, or conversion counts.
`IDEMPOTENCY_PAYLOAD_MISMATCH`, `STALE_REVISION`, and dedup-store unavailability
remain explicit conflict/deferred states.

### Incremental result: F01.3-FLOW-001

This flow is covered by the existing public `getLiveSessionOverview` operation;
no duplicate endpoint is generated. The overview DTO must expose projection
revision, window, freshness, and explicit stale/deferred state for product
interest metrics. `PROJECTION_INPUT_LAG`, invalid windows, and source
unavailability cannot be represented as healthy empty metrics.

### Incremental result: F01.3-FLOW-002

This flow is covered by `getLiveSessionOverview`; no new public path is added.
The DTO must preserve separate behavioral measures and their definitions,
source revision, freshness, and evidence. `METRIC_DEFINITION_MISSING`,
`COUNTER_CONFLICT`, and `SOURCE_REVISION_STALE` remain explicit degraded or
error states rather than silently combined counts.

### Incremental result: F01.3-FLOW-003

This flow is covered by `getLiveSessionOverview`; no new public path is added.
Sentiment and engagement fields must carry model/language coverage, confidence,
input window, projection revision, and freshness. `MODEL_UNAVAILABLE`,
`LANGUAGE_COVERAGE_GAP`, and invalid input windows remain explicit stale or
deferred states and must not be shown as measured sentiment.

### Incremental result: F01.3-FLOW-004

This flow is covered by the existing overview and SSE operations; no new public
path is added. Hype windows must include baseline, threshold/config version,
evidence window, confidence, revision, and freshness. `BASELINE_UNAVAILABLE`,
missing threshold configuration, and stale data remain explicit degraded or
deferred states and cannot trigger an implied action.

### Incremental result: F01.3-FLOW-005

This flow is covered by the existing overview and SSE operations; no new public
path is added. Alerts must carry policy version, source evidence, deduplication
identity, severity, session scope, and freshness. `ALERT_POLICY_UNAVAILABLE`,
`ALERT_DEDUP_CONFLICT`, and stale projection remain explicit failure/deferred
states rather than silent or duplicate alerts.

### Incremental result: F01.3-FLOW-006

This flow is covered by the existing overview and SSE operations; no new public
path is added. Projection rebuild is an internal recovery operation over
immutable source events, producing a new revision and freshness receipt without
becoming a second writer. `SOURCE_RANGE_INVALID`, `REBUILD_ALREADY_RUNNING`,
and `SOURCE_EVENT_GAP` remain explicit failure/deferred states.

### Incremental result: F01-INTEGRATION-001

No new public OpenAPI path is generated. Safe co-pilot-facing signal delivery is
internal via `copilot.signal.available.v1`; the public SSE surface may expose
only the redacted, authorized projection. `CONSUMER_UNAVAILABLE`,
`DTO_REDACTION_FAILED`, and `SIGNAL_EXPIRED` remain explicit delivery states.

### Incremental result: F01-INTEGRATION-002

No new public OpenAPI path is generated. Product-interest delivery to StreamPilot
uses internal `streampilot.product-interest.available.v1`; any public SSE view is
limited to the authorized safe projection. `CONSUMER_UNAVAILABLE`,
`CATALOG_EVIDENCE_MISSING`, and `STALE_PROJECTION` remain explicit delivery or
deferred states and cannot authorize a product action.

### Incremental result: F01-INTEGRATION-003

No new public OpenAPI path is generated. Compliance delivery uses internal
`compliance.risk.detected.v1` and must preserve redacted evidence, policy
version, severity, actor/source lineage, and correlation/causation.
`COMPLIANCE_UNAVAILABLE`, `EVIDENCE_REDACTION_FAILED`, and
`POLICY_VERSION_MISSING` remain explicit failure/deferred states.

### Incremental result: F01-INTEGRATION-004

No new public OpenAPI path is generated. The overview/SSE surfaces may expose
only the safe stock-aware projection; the internal `product.interest.stock-aware.v1`
contract links ranked purchase interest to SKU, inventory state, snapshot
freshness, and lineage. `STOCK_SNAPSHOT_STALE`, `SKU_UNRESOLVED`, and
`INVENTORY_UNAVAILABLE` remain explicit unknown/deferred states and cannot
authorize promotion.

### Incremental result: F01-INTEGRATION-005

No new public OpenAPI path is generated. Action outcomes return to telemetry via
internal `telemetry.action_outcome.recorded.v1`; any overview/SSE representation
must mark pending/unknown/reconciled state and preserve action ID,
provider-status hash, causation, and session lineage. `ACTION_ID_MISSING`,
`UNKNOWN_OUTCOME`, and duplicate outcome remain explicit recovery states.

### Incremental result: F01-SAFETY-001

This safety flow is exposed only through the existing overview/SSE state; no
public command path is added. The DTO must identify degraded/read-only mode,
affected dependencies, freshness, and blocked-action reasons while preserving
safe reads and audit logging. `HEALTH_SIGNAL_INVALID`,
`MODE_TRANSITION_CONFLICT`, and audit unavailability remain explicit states.

### Incremental result: F01-SAFETY-002

No public pause command path is generated for this F01 flow. Pause activation
propagates internally via `control.emergency_pause.activated.v1`; overview/SSE
may expose only authorized pause state and propagation receipt. `FORBIDDEN`,
`PAUSE_PROPAGATION_TIMEOUT`, and `PAUSE_STATE_CONFLICT` remain explicit failure
or reconciliation states, while telemetry and audit continue safely.

### Incremental result: F01-SAFETY-003

This flow is covered by the existing `getActionLog` and redacted overview
surfaces; no new public path is added. Internal `audit.decision_trace.recorded.v1`
receipts must link source event, classification/signal, recommendation, action
outcome, actor, correlation/causation, hashes, and evidence without overwriting
history. `TRACE_LINK_MISSING`, `AUDIT_WRITE_FAILED`, and
`INTEGRITY_CHECK_FAILED` remain explicit audit failures.

### F02 HUD session and delivery

F02-FLOW-001 through F02-FLOW-006 are covered by the existing overview/SSE
surfaces; no duplicate public paths are generated. HUD responses remain scoped
to `live_session_id` and host capability, carry freshness/revision/confidence/
evidence metadata, and expose pending, stale, withdrawn, expired, disconnected,
or blocked states explicitly. Session isolation is enforced server-side, not by
client route or cache keys alone.

### F02.1 Host Copilot

F02.1-FLOW-001 through F02.1-FLOW-008 reuse the existing overview/SSE surfaces;
no duplicate public paths are generated. Copilot outputs must carry session
scope, confidence, freshness, evidence/source revision, policy or catalog
version, localization state, and explicit blocked/deferred/withdrawn status.
Generation, priority, evidence, or review failures must never be rendered as
verified guidance or trigger a consequential action.

### F02.2 Product Q&A

F02.2-FLOW-001 through F02.2-FLOW-007 reuse the existing overview/SSE surfaces;
no separate public Q&A path is generated. Every answer or refusal carries
approved-catalog version, evidence/source reference, confidence, freshness, and
safe localization metadata. Catalog revocation/version change, ambiguity,
unsupported or medical claims, and unknown stock remain visible refusal or
degraded states.

### F02.3 Stock and Order Alerts

F02.3-FLOW-001 through F02.3-FLOW-007 reuse the existing overview/SSE surfaces;
no separate alert endpoints are generated. Alerts must include session/SKU
scope, severity, threshold or policy version, source revision, freshness, and
deduplication identity. Low/out stock, order volume, best-seller, voucher,
price, promotion, and countdown states remain explicit when source truth is
stale, unknown, revoked, or unavailable.

### F02.4 Host Approval UI

F02.4-FLOW-001 through F02.4-FLOW-008 do not create a generic public
host-decision endpoint. The existing `decidePromotion` operation applies only
when the resource is a promotion; other host decisions remain internal until a
pilot operation is explicitly approved. Every decision requires actor capability,
suggestion/resource revision, policy/evidence checks, idempotency, audit, and
Emergency Pause enforcement. Unauthorized, stale, withdrawn, final, or unknown
states fail closed.

### F02 safety and integration

F02-SAFETY-001 through F02-SAFETY-004 and F02-INTEGRATION-001 through
F02-INTEGRATION-003 reuse existing overview, SSE, and action-log surfaces; no
new public paths are generated. Grounding, redaction, outage, audit, F01 signal,
compliance, and StreamPilot state contracts remain session-scoped and carry
schema/version, freshness, evidence, correlation/causation, and explicit
stale/degraded/blocked states. Sensitive or unverified content fails closed.

### Incremental result: F01.1-FLOW-008

No public OpenAPI path is generated for uncertain-intent escalation. The
`intent-risk-service` publishes a deferred/review-needed outcome with confidence,
evidence, correlation, and policy metadata; it must not trigger commerce action.
`THRESHOLD_CONFIG_MISSING`, `REVIEW_QUEUE_UNAVAILABLE`, and low confidence stay
explicitly observable, and `telemetry.intent.deferred.v1` requires NATS catalog
registration.

### Incremental result: F01.2-FLOW-001

No public OpenAPI path is generated for spam/toxic screening. The
`intent-risk-service` owns the moderation signal and preserves redacted evidence,
confidence, policy version, and session lineage. Invalid input, model outage,
and risk-policy unavailability remain explicit rejected/deferred states; the
moderation command/event pair requires NATS catalog registration.

### Incremental result: F01.2-FLOW-002

No public OpenAPI path is generated for off-platform-attempt detection. The
internal risk signal retains pattern-set version, language handling, confidence,
redacted evidence, and session lineage. `PATTERN_SET_UNAVAILABLE`,
`LANGUAGE_UNSUPPORTED`, and low confidence remain explicit outcomes and do not
become automatic enforcement or commerce actions.

### Incremental result: F01.2-FLOW-003

No public OpenAPI path is generated for scam-pattern detection. The internal
risk signal preserves pattern version, redacted evidence, confidence, and
correlation lineage. `PATTERN_VERSION_MISMATCH`, model unavailability, and
`EVIDENCE_REDACTION_FAILED` remain explicit rejected/deferred outcomes and never
become a clean-content assertion.

### Incremental result: F01.2-FLOW-004

No public OpenAPI path is generated for coordinated-bot detection. The internal
moderation aggregate is bounded by live session, time window, and fingerprint
version, with redacted evidence and correlation lineage. `WINDOW_INVALID`,
`FINGERPRINT_UNAVAILABLE`, and `AGGREGATION_LAG` must remain visible as
rejected/deferred/stale states rather than being silently treated as no risk.

### Incremental result: F01.2-FLOW-005

No public OpenAPI path is generated for risk-severity ranking. The
`intent-risk-service` owns the versioned policy verdict and emits severity,
recommended handling, score evidence, and lineage only after validation.
`POLICY_NOT_FOUND`, `SCORE_OUT_OF_RANGE`, and `CONTEXT_MISSING` remain explicit
rejected/deferred outcomes; the ranking event requires NATS catalog coverage.

### Incremental result: F01.2-FLOW-006

No public OpenAPI path is generated for moderator escalation. The internal
`moderation-case-service` creates a traceable case only with authorized actor
context, severity, redacted evidence, and source lineage. `CASE_CREATE_FAILED`,
`EVIDENCE_UNAVAILABLE`, and forbidden actor context remain explicit failure or
deferred states; case creation requires async contract registration.

### Incremental result: F01.2-FLOW-007

No public OpenAPI path is generated for moderation audit persistence. The
`audit-service` owns append-only receipts linking actor, source event, policy and
model versions, evidence hashes, and correlation/causation. `AUDIT_WRITE_FAILED`,
`ACTOR_CONTEXT_MISSING`, and `HASH_MISMATCH` remain visible failures; historical
records are never overwritten and the audit event requires registry coverage.

### Incremental result: F01.P-FLOW-001

No public OpenAPI path is generated for cart-add telemetry ingestion. The
commerce adapter and purchase projection preserve cart-add as a separate
session/SKU measure with source event identity, idempotency, and revision
evidence. `SKU_UNRESOLVED`, `SESSION_NOT_ACTIVE`, and duplicate commerce events
remain explicit outcomes; the commerce/purchase event contract needs registry
coverage.

### F02 explicit flow coverage

The grouped decisions above apply to each detailed flow ID explicitly:

- `F02-FLOW-001`, `F02-FLOW-002`, `F02-FLOW-003`, `F02-FLOW-004`, `F02-FLOW-005`, `F02-FLOW-006`
- `F02.1-FLOW-001`, `F02.1-FLOW-002`, `F02.1-FLOW-003`, `F02.1-FLOW-004`, `F02.1-FLOW-005`, `F02.1-FLOW-006`, `F02.1-FLOW-007`, `F02.1-FLOW-008`
- `F02.2-FLOW-001`, `F02.2-FLOW-002`, `F02.2-FLOW-003`, `F02.2-FLOW-004`, `F02.2-FLOW-005`, `F02.2-FLOW-006`, `F02.2-FLOW-007`
- `F02.3-FLOW-001`, `F02.3-FLOW-002`, `F02.3-FLOW-003`, `F02.3-FLOW-004`, `F02.3-FLOW-005`, `F02.3-FLOW-006`, `F02.3-FLOW-007`
- `F02.4-FLOW-001`, `F02.4-FLOW-002`, `F02.4-FLOW-003`, `F02.4-FLOW-004`, `F02.4-FLOW-005`, `F02.4-FLOW-006`, `F02.4-FLOW-007`, `F02.4-FLOW-008`
- `F02-SAFETY-001`, `F02-SAFETY-002`, `F02-SAFETY-003`, `F02-SAFETY-004`
- `F02-INTEGRATION-001`, `F02-INTEGRATION-002`, `F02-INTEGRATION-003`
