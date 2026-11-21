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
