# LivePilot OS — Deep Context

> Canonical deep-context entry point for LivePilot OS product intent, domain
> contracts, JEV decisioning, service topology, node boundaries, safety rules,
> and verification evidence.

## 1. Mission and authority

LivePilot OS helps live-commerce Hosts and Live Ops operators respond to audience
demand while protecting product claims, promotions, inventory, margin, and
consequential platform actions.

The canonical operating loop is:

```text
observe → classify → recommend → verify policy
→ approve/execute → reconcile → audit
```

This document is authoritative for LivePilot architectural boundaries, JEV/Decision
Engine behavior, node-to-node contracts, and non-negotiable safety invariants.
Product scope and requirement IDs remain authoritative in the Requirements Baseline.

When documents conflict, use this precedence:

1. Approved decisions and explicit acceptance contracts.
2. [Requirements Baseline (`REQ-LP-NNN`)](./live-pilot-os-requirements.md).
3. This deep-context document for LivePilot architecture and invariants.
4. The Feature Map, Domain Model, and Integration Boundaries.
5. Hypothesis documents such as the Business Model Canvas.

Unresolved product or architecture intent must be recorded as an assumption or
`[NEEDS CLARIFICATION]`. Agents must not invent platform capabilities, financial
rules, permissions, or workflow states.

## 2. Canonical source documents

### 2.1 Architecture and domain sources

- [Architecture Overview](./overview.md)
- [Production Technology Stack](./live-pilot-os-tech-stack.md)
- [Requirements Baseline](./live-pilot-os-requirements.md)
- [Feature Map](./live-pilot-os-feature-map.md)
- [Domain and Event Model](./live-pilot-os-domain-model.md)
- [Integration Boundaries](./live-pilot-os-integration-boundaries.md)
- [OpenAPI contract](./api/openapi.yaml)
- [API contract README](./api/README.md)

### 2.2 Product and UX sources

- [Project Brief](../02-product/project-brief.md)
- [Core Features](./live-pilot-os-core-features.md)
- [Sub-features](./live-pilot-os-sub-features.md)
- [Live OS Design Token Proposal](./ux/live-os-design-tokens.md)
- [Runtime Design Tokens](../../src/tokens.css)

> The token proposal is a design draft pending Product/Design approval, not a frozen implementation contract. The former G-UX-041/042 goal documents were removed; no UX goal is authorized by this source list.

## 3. Product operating model

LivePilot OS coordinates four bounded capabilities:

1. **Live Chat & Telemetry Understanding** receives chat and telemetry, normalizes
   source facts, and produces typed intent, engagement, question, and risk signals.
2. **Streamer Co-pilot HUD** turns verified signals and approved catalog facts into
   concise Host guidance, Q&A drafts, and alerts.
3. **StreamPilot Agent** proposes or executes bounded actions such as product
   pinning, vouchers, and inventory reservations.
4. **Compliance & Operator Control** governs approval, margin protection, audit,
   moderation escalation, and Emergency Pause.

The governing trace is:

```text
chat/telemetry
  → typed signal
  → JEV-backed decision proposal
  → Host cue or operator proposal
  → deterministic policy verdict
  → approval or controlled execution
  → adapter result/reconciliation
  → audit receipt
```

## 4. Canonical LivePilot domain contract

The following concepts are LivePilot domain concepts.

### 4.1 Live Session

One active broadcast or simulated scenario shared by Host and Live Ops.

```text
LiveSession
  id: uuid
  mode: simulated | sandbox | production
  status: planned | live | paused | ended
```

All signals, cues, proposals, actions, approvals, and audit receipts must carry
the same `live_session_id`.

### 4.2 Chat Message

An original viewer message received during a session. The source message is never
replaced by its AI interpretation.

```text
ChatMessage
  id: uuid
  live_session_id: uuid
  source: platform | simulator
  text: string
  occurred_at: timestamp
```

### 4.3 Intent and Risk Signal

A typed interpretation of a source message or telemetry event.

```text
Signal
  id: uuid
  type: PRODUCT_INTEREST | DISCOUNT_REQUEST | PRODUCT_QUESTION
       | STOCK_QUERY | SIZE_QUERY | VOUCHER_REQUEST
       | COMPLAINT | SPAM | TOXIC
  confidence: number
  evidence_ids: [uuid]
  resolved_sku: uuid | null
  risk_level: NONE | LOW | MEDIUM | HIGH | CRITICAL
```

An unresolved product reference remains unresolved. The system must not guess a
SKU because a model produced a plausible string.

### 4.4 JEV Decision Proposal

A structured recommendation produced by the LivePilot Decision Engine using JEV.
It is advisory and cannot mutate a platform.

```text
DecisionProposal
  id: uuid
  live_session_id: uuid
  decision_type: HOST_CUE | PRODUCT_PIN_PROPOSAL
                  | VOUCHER_PROPOSAL | ESCALATION
  recommendation: object
  confidence: number
  uncertainty: object
  evidence_ids: [uuid]
  model_provider: "jev"
  model_version: string
  status: PROPOSED | DEFERRED | NEEDS_REVIEW | ACCEPTED | REJECTED
```

### 4.5 Host Cue

A short recommendation shown to the Host. It identifies the related product or
topic and can be used, edited, dismissed, or escalated.

### 4.6 Promotion and Margin Decision

A promotion may be a product pin, voucher, or bounded offer. Every discount or
voucher passes the deterministic Margin Policy Service.

```text
MarginDecision
  result: APPROVED | NEEDS_APPROVAL | REJECTED
  policy_version: string
  inputs_hash: string
  reason_code: string
  evidence: object
```

### 4.7 Inventory Reservation

A temporary stock allocation associated with a promotion or order flow. It must
be created, released, or finalized exactly once for a terminal outcome.

### 4.8 Operator Action and Audit Receipt

Every consequential action records actor, trigger, proposal, policy verdict,
approval, adapter request/result, retries, and final outcome.

## 5. Required domain invariants

1. A `LiveSession` is the correlation boundary for all live operations.
2. Source chat and telemetry remain distinguishable from model interpretations.
3. Product Q&A uses approved catalog facts only.
4. Unresolved product references never trigger automatic actions.
5. JEV proposals are advisory until deterministic policy and approval gates accept
   them.
6. Margin decisions use integer minor-unit arithmetic and never production
   floating-point money calculations.
7. Inventory reservations are atomic, idempotent, and reconciled exactly once.
8. Emergency Pause stops automated mutations while signal capture and audit
   logging continue.
9. An unknown adapter response cannot produce a duplicate consequential effect.
10. Simulated, sandbox, and production adapter outcomes are visibly distinct.
11. Every consequential action is traceable to source evidence, model/policy
    versions, actor, correlation ID, and outcome.

## 6. Current architecture evidence

The repository currently defines a proposed production baseline with:

- Next.js Host HUD and Live Ops Console;
- KrakenD API Gateway;
- Core BFF for screen aggregation and use-case orchestration;
- Rust domain services;
- NATS JetStream for durable events and replay;
- PostgreSQL as transactional source of truth;
- Redis for cache, deduplication windows, and rate limits;
- Temporal for timer/retry/approval/compensation workflows;
- JEV through the LivePilot Decision Engine for structured recommendations;
- simulated platform behavior for the Hackathon;
- OpenTelemetry correlation across signal, decision, policy, execution, and audit.

These are proposed architecture choices, not evidence that production platform
integrations or every service are already deployed.

## 7. Target node protocol

The logical runtime path is:

```text
Node 1 — Host/Operator UI
  → Node 2 — Portal BFF
  → Node 3 — KrakenD Edge
  → Node 4 — Core BFF/API
  → Node 5 — Domain Services and Decision Engine
  → Node 6 — Persistence, Event, and Platform Integration Boundaries
```

The exact deployment names and routes require runtime verification. The node model
is a contract map, not proof that all six nodes are currently deployed.

### 7.1 Node responsibilities

| Node                    | Owns                                                           | Must not do                                                   |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Host/Operator UI        | Presentation, session interaction, display state               | Authorize access or issue platform mutations                  |
| Portal BFF              | UI DTOs, session handling, input validation, response shaping  | Calculate margin or own inventory/policy truth                |
| KrakenD Edge            | TLS, authentication, rate limits, routing, contract versioning | Reimplement domain rules                                      |
| Core BFF/API            | Use-case orchestration and screen aggregation                  | Become the authority for JEV, margin, inventory, or approvals |
| Domain Services         | Typed business decisions, state transitions, and domain events | Read another service's tables                                 |
| Persistence/Event/Adapter Boundaries | Durable data, event delivery, external protocol translation | Hide unknown external outcomes or bypass audit |

### 7.2 Mandatory per-hop fields

Every hop must preserve or explicitly reject:

```text
authenticated actor identity
live_session_id
session role/capability context
X-Correlation-Id
traceparent
contract version
idempotency key for mutations
X-Locale: th | en
```

Browser-supplied identity or role headers are never authoritative.

### 7.3 Platform extensibility boundary

Node 6 is a logical extensibility boundary, not one process. PostgreSQL and NATS
are infrastructure boundaries; platform adapters are an Anti-Corruption Layer
between LivePilot's canonical domain actions and external platform protocols.

The domain uses platform-neutral commands and facts:

```text
PinProduct
CreateVoucher
ReserveInventory
GetOrderStatus
ReceiveChatEvent
```

Platform-specific SDKs, payloads, permissions, rate limits, and status codes must
remain inside an adapter. Adding a platform must not require changes to Margin,
Inventory, Promotion, JEV, or Approval domain rules.

```text
Execution Service
  → PlatformAction(command, platform, capability)
  → Adapter Registry
  → Selected Platform Adapter
  → External Platform
  → Reconciliation Worker
  → Audit Service
```

Every adapter declares each capability as `supported`, `sandbox_only`, `simulated`,
or `unsupported`. Unsupported capabilities return a typed
`UNSUPPORTED_CAPABILITY` result. Unknown external outcomes are reconciled before
retry, and simulated/sandbox/production modes remain visibly distinct.

## 8. Microservice ownership contract

Services may share a repository, but each service owns its contract, persistence
boundary, deployment unit, failure behavior, and verification scope.

| Service                    | Owns                                                                                 | Must not own                                                       |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `session-service`          | Session lifecycle, Host/Operator presence, session roles, channel bindings           | Margin or raw platform credentials                                 |
| `catalog-service`          | Approved products, SKUs, variants, claims, catalog version                           | AI-generated facts or promotion decisions                          |
| `telemetry-service`        | Chat/order/engagement ingestion, normalization, deduplication                        | Final promotion decisions                                          |
| `intent-risk-service`      | Intent classification, question clustering, moderation risk                          | Direct platform mutations                                          |
| `decision-engine-service`  | Context/evidence assembly, JEV invocation, output validation, confidence and routing | Margin verdicts, inventory mutations, approvals, platform commands |
| `copilot-service`          | Host cues, Q&A drafts, alerts, Host decisions                                        | Unverified catalog answers or financial verdicts                   |
| `margin-policy-service`    | Deterministic margin arithmetic, fee/COGS rules, floor verdicts                      | UI state or adapter retries                                        |
| `inventory-service`        | Atomic reservations, release/finalization, stock state                               | AI ranking or voucher copy                                         |
| `promotion-service`        | Pin/voucher proposals and lifecycle                                                  | Bypassing policy, inventory, or approval gates                     |
| `approval-control-service` | Approval modes, approvals, Emergency Pause, kill switches                            | Recomputing domain facts                                           |
| `execution-service`        | Dispatch, retry, timeout, compensation, reconciliation                               | Source-of-truth margin or inventory state                          |
| `platform-adapter-service` | Adapter registry, capability negotiation, protocol translation, webhook verification, external idempotency | Shared business policy or unaudited platform mutation |
| `audit-service`            | Immutable decision/action trace and evidence references                              | Unattributed mutable business state                                |

## 9. JEV and Decision Engine contract

JEV is the TypeSafe AI System One model used by LivePilot's Decision Engine for
structured software decisions. The Decision Engine is the governed service around
the model; JEV is not the whole service.

```text
Intent/Risk Signal
  → bounded context and evidence retrieval
  → JEV System One inference
  → schema validation
  → confidence/uncertainty evaluation
  → recommendation, deferral, or human-review route
  → deterministic policy service
```

The Decision Engine must:

- provide only approved catalog, session, and policy context to JEV;
- require a versioned output schema;
- attach confidence, uncertainty, evidence IDs, model provider, and model version;
- reject malformed, unsupported, stale, or low-confidence output according to the
  configured routing policy;
- never expose hidden chain-of-thought as an application contract;
- emit `decision.proposal.created` or `decision.deferred` with correlation and
  causation IDs;
- route consequential proposals to Margin, Inventory, Approval, and Emergency
  Pause gates before execution.

JEV output is advisory. No prompt, model response, frontend route, or Decision
Engine endpoint may directly mutate a marketplace.

## 10. Unit-to-unit contract invariant

Every unit boundary is a typed, versioned, verified contract. A unit includes the
frontend, BFF, gateway, Core BFF, service, event consumer, adapter, and database
transaction boundary.

Every contract must be:

1. **Explicit** — OpenAPI 3.1, JSON Schema, Protobuf, or an approved equivalent.
2. **Syntactically valid** — required fields, enums, formats, errors, and versions
   pass automated lint and compatibility checks.
3. **Semantically valid** — preconditions, postconditions, session authorization,
   lifecycle transitions, money representation, and safety rules are testable.
4. **Idempotent where retried** — duplicate delivery cannot repeat side effects.
5. **Context-complete** — actor, session, role, trace, correlation, locale, and
   contract version are propagated or explicitly absent by policy.
6. **Fail-closed** — invalid, stale, unauthorized, or incompatible input returns
   the approved RFC 7807 error and causes no partial mutation.
7. **Operationally verified** — real route tests cover timeout, retry, duplicate,
   partition, restart, and recovery behavior where applicable.

### 10.1 Contract proof receipt

Any goal that changes or consumes a contract must attach:

- contract identifier, version, producer, consumer, and source file;
- schema hash or immutable revision;
- precondition/postcondition and lifecycle transition matrix;
- compatibility result against the previous contract;
- positive, negative, malformed, authorization, and replay test results;
- idempotency and duplicate-side-effect evidence;
- trace/context propagation evidence;
- timeout/retry/partition/restart evidence where distributed;
- exact command, exit status, and artifact paths.

## 11. Node-to-node contract invariant

Every communicating node must agree on, enforce, and continuously verify the same
contract. A node-to-node contract is invalid if the sender accepts a field that the
receiver rejects, reinterprets, silently defaults, or drops.

For every node pair, verify:

- **Identity agreement:** sender and receiver authenticate expected service identity
  and audience.
- **Schema agreement:** both validate the same immutable schema revision and error
  envelope.
- **Decision agreement:** JEV model version, confidence, evidence, and routing
  status remain intact across the boundary.
- **Temporal agreement:** timestamps, contract versions, and state versions prevent
  stale or out-of-order writes.
- **Delivery agreement:** at-least-once delivery is assumed; deduplication is
  deterministic and atomic.
- **Failure agreement:** timeout, retry, cancellation, partition, and partial
  failure behavior are explicit.
- **Convergence agreement:** restart or temporary partition cannot silently create
  divergent money, stock, promotion, or action state.
- **Observability agreement:** trace, correlation, node, contract version, and
  redacted outcome evidence are retained.

### 11.1 Node verification gate

The boundary is valid only when applicable checks pass at producer, consumer, and
real route levels:

1. schema lint and bidirectional compatibility;
2. producer/consumer contract fixture test;
3. session authorization and negative isolation tests;
4. malformed, missing, stale, duplicate, replayed, and out-of-order tests;
5. timeout, retry, cancellation, partition, and restart tests;
6. idempotency and no-duplicate-side-effect proof;
7. recovery/convergence proof with an explicit authoritative state;
8. proof receipt with command, exit status, schema revision, and artifacts.

## 12. End-to-end production-readiness gate

The architecture is not production-ready when only individual services pass local
tests. Evidence must cover the complete chain:

```text
Host/Operator UI
  → Portal BFF contract
  → KrakenD auth/route/rate-limit
  → Core BFF orchestration
  → Decision Engine/JEV contract
  → deterministic policy services
  → execution/idempotency
  → PostgreSQL/NATS/audit proof
  → failure, recovery, and observability evidence
```

A passing model invocation test alone does not prove a valid JEV integration.
The structured output, policy routing, audit linkage, timeout behavior, and
downstream no-mutation safety must also pass.

## 13. UX/UI contract invariant

The frontend is a contract-bearing node, not an authorization authority. Every
LivePilot screen must be traceable through:

```text
Persona and job
  → UX flow and state
  → approved layout/tokens
  → component contract
  → frontend type
  → BFF/OpenAPI operation
  → service authorization
  → runtime evidence
```

Required UX states include loading, empty, success, partial/degraded, error,
unauthorized, forbidden, stale session, approval pending, policy blocked,
Emergency Pause active, adapter unknown, rate-limited, maintenance, and recovery.

The UI must not imply that an AI suggestion was spoken, approved, or executed until
the corresponding event and decision receipt exist.

## 14. Portal and user-story contract

LivePilot has two primary operating surfaces:

| Surface               | Primary user                              | Required behavior                                                              |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Streamer Co-pilot HUD | Host                                      | Glanceable cues, catalog-grounded Q&A, alerts, edit/use/dismiss actions        |
| Live Ops Console      | Operator, moderator, brand representative | Signals, decision proposals, policy results, approvals, audit, Emergency Pause |

Every user story must specify:

```text
As a [Host/Operator/Moderator]
I want to [action]
During [live session]
So that [observable outcome]
```

Each story must identify the route/screen, session capability, primary and
alternate paths, denial/recovery states, event consequence, API contract, and
verification artifact.

Required cross-surface journeys:

1. Chat signal appears in the Live Ops Console.
2. The same signal produces a JEV-backed Host cue.
3. Host edits, uses, or dismisses the cue.
4. Operator reviews a product-pin or voucher proposal.
5. Margin blocks a below-floor offer.
6. Emergency Pause prevents later automated mutations.
7. Audit reconstructs source, proposal, verdict, approval, and result.

## 15. Canonical payload and event contract

All wire payloads must use versioned schemas. A decision proposal includes:

```json
{
  "decision_id": "decision_01",
  "live_session_id": "session_01",
  "decision_type": "HOST_CUE",
  "status": "PROPOSED",
  "recommendation": {},
  "confidence": 0.0,
  "uncertainty": {},
  "evidence_ids": ["evidence_01"],
  "model_provider": "jev",
  "model_version": "jev-system-one@version",
  "correlation_id": "trace_01",
  "causation_id": "evt_00",
  "schema_version": 1
}
```

Required event subjects include:

```text
live.chat.received
telemetry.intent.detected
telemetry.risk.detected
product.interest.updated
decision.proposal.created
decision.deferred
copilot.suggestion.created
promotion.proposed
margin.verdict.recorded
inventory.reservation.created
approval.decision.recorded
emergency.pause.activated
platform.action.requested
platform.action.completed
platform.action.failed
audit.decision.appended
```

Events describe facts that happened. Commands request bounded actions. JEV output
is a recommendation, never a platform command.

## 16. Audit, observability, and data protection

Every consequential action produces an append-only receipt containing:

```text
audit_id
live_session_id
actor type and actor id
trigger event id
decision/proposal/action ids
model provider and model version
policy version and verdict
adapter mode and external correlation
result, retry, and failure state
occurred_at / recorded_at
trace_id / correlation_id
input and evidence hashes
```

OpenTelemetry spans and metrics must correlate source event, JEV inference,
policy verdict, worker execution, adapter call, operator decision, and outcome.
Tokens, credentials, customer PII, COGS, and supplier data must not appear in
ordinary logs or prompts.

## 17. Localization and wire-format contract

- Propagate `X-Locale` as `th` or `en`; default to `th`.
- User-facing RFC 7807 `title` and `detail` require Thai/English parity.
- Wire payloads use ISO 4217 integer minor units and ISO-8601 UTC timestamps.
- Locale-aware formatting occurs at the UI/document boundary, never in domain
  calculations.

## 18. Failure, recovery, and rollout contract

Distributed behavior must define timeout, retry, cancellation, circuit breaking,
backpressure, and compensation. Cross-service mutations use state-tracked workflow
behavior rather than undocumented partial success.

The system must support:

- degraded read-only operation when an adapter is unavailable;
- replay of durable events without duplicate consequential effects;
- explicit reconciliation after unknown external results;
- rollback or feature-flag disablement for JEV, automation, and adapter changes;
- restoration of PostgreSQL, NATS streams, audit records, and projections;
- Emergency Pause effectiveness during worker restart or partial network failure.

Initial verification budgets:

| Path                               | Target                                         |
| ---------------------------------- | ---------------------------------------------- |
| Operator read/catalog lookup       | p95 < 150 ms excluding third-party calls       |
| JEV Decision Engine proposal       | p95 < 3 s including model response             |
| Margin verdict                     | p95 < 50 ms                                    |
| Chat-to-signal publication         | p95 < 1 s under target load                    |
| Inventory reservation decision     | p95 < 150 ms serialized per SKU/variant        |
| Gateway/control-plane availability | 99.95% target                                  |
| Event/data recovery                | RPO ≤ 1 minute; RTO defined by deployment tier |

The JEV latency target is a budget to validate, not an achieved performance claim.

## 19. Hackathon cut line

The selected Hackathon trace is defined by the [Requirements Baseline](./live-pilot-os-requirements.md) and [Project Brief](../02-product/project-brief.md):

```text
Mock shampoo live and chat
  → group promotion questions and calculate the two-minute audience-interest ratio
  → show Host product details, audience metrics, and talking points
  → AI proposes a discount; deterministic margin policy enforces the 10% floor
  → policy adjusts the discount if needed and shows original/adjusted evidence to Live Ops
  → Live Ops approval or rejection
  → on approval, simulate coupon issue, stock reservation, viewer banner, and countdown to live end
  → on rejection, show not-approved status and optional reason; end without another offer
```

Use seeded events, a fictional catalog, mock inventory, and a simulated adapter with
no live-platform connection. The 3-minute initial timer is a working assumption; the
coupon expires when the mock live ends. This selected demo does not include product
pinning, an alternative bundle, or Emergency Pause.

## 20. Non-goals

- Real marketplace mutations without approved adapter contracts and authorization.
- JEV directly executing vouchers, pins, reservations, or platform commands.
- Treating model output as catalog truth, margin truth, inventory truth, or approval.
- Multi-tenant hierarchy in the Hackathon baseline.
- Multi-region deployment, logistics, matchmaking, or unsupported production scope.
- Replacing deterministic policy services with prompts or model confidence alone.

## 21. Context loading and goal readiness

For LivePilot work, load this document first, then only the linked source document
required by the goal touch map. A goal that changes a flow must identify the
affected capability, live session, JEV/Decision Engine contract, policy gate,
operator control, and verification evidence.

Any goal that changes JEV or a node-to-node contract must prove both producer and
consumer compatibility. Any goal that changes consequential execution must include
negative tests for malformed output, low confidence, stale decisions, replay,
duplicate delivery, Emergency Pause, timeout, and unknown adapter result.

No contract is production-ready from isolated unit tests alone. The minimum proof
path is:

```text
Frontend
  → Portal BFF
  → KrakenD route/auth
  → Core BFF/session authorization
  → Decision Engine/JEV
  → deterministic policy services
  → execution/idempotency
  → PostgreSQL/NATS/audit
  → failure/recovery/observability evidence
```

## Related architecture

- [Architecture Overview](./overview.md)
- [Production Technology Stack](./live-pilot-os-tech-stack.md)
- [Requirements Baseline](./live-pilot-os-requirements.md)
- [Feature Map](./live-pilot-os-feature-map.md)
- [Domain and Event Model](./live-pilot-os-domain-model.md)
- [Integration Boundaries](./live-pilot-os-integration-boundaries.md)
- [API contract source](./api/README.md)
- [Data policy source](./data/README.md)
- [Soda OS design specification](./design-spec.md)
