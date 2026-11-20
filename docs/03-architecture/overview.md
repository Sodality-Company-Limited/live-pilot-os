# LivePilot OS — Architecture Overview

> **Status:** Canonical architecture synthesis and cross-boundary SOT for the LivePilot OS hackathon.
> **Parent Authority:** [live-pilot-os-deep-context.md](live-pilot-os-deep-context.md)
> **Requirements SOT:** [live-pilot-os-requirements.md](live-pilot-os-requirements.md)
> **Domain & Event SOT:** [live-pilot-os-domain-model.md](live-pilot-os-domain-model.md)
> **API Contracts SOT:** [api/README.md](api/README.md)
> **Integration Boundaries:** [live-pilot-os-integration-boundaries.md](live-pilot-os-integration-boundaries.md)
> **Flow SOT:** [source-of-truth-flows/live-session-control-sot.md](source-of-truth-flows/live-session-control-sot.md)
> **Technical Specifications SOT:** [technical-specifications-sot.md](technical-specifications-sot.md)
> **Localization SOT:** [localization-sot.md](localization-sot.md)
> **Route Prefixing SOT:** [api/route-prefixing-and-boundary-invariant.md](api/route-prefixing-and-boundary-invariant.md)
> **API SOT Generation Set:** [api/README.md](api/README.md)
> **UX/UI SOT Index:** [ux/README.md](ux/README.md)
> **Software Quality SOT:** [software-quality-sot.md](software-quality-sot.md)
> **Testing SOT:** [testing-sot.md](testing-sot.md)
> **Testing/TDD SOT Index:** [testing/README.md](testing/README.md)
> **Deployment/Runtime SOT:** [deployment/README.md](deployment/README.md)
> **Configuration/Policy SOT:** [configuration/README.md](configuration/README.md)

> **Realtime Job System:** The preemptive job, scheduling, and message-queue
> authority is defined in [technical-specifications-sot.md](technical-specifications-sot.md) §6.

This document is the architecture synthesis. It owns cross-boundary topology,
service ownership, runtime flow, and non-negotiable safety laws; it does not replace
the field-level authority of versioned API, event, or data schemas. The
Hackathon may use simulated telemetry and platform adapters, but it must preserve
these contracts and visibly distinguish simulated, sandbox, and confirmed behavior.

## Machine-readable contract coverage

The contract inventory is maintained through [api/README.md](api/README.md),
[`api/openapi.yaml`](api/openapi.yaml), versioned event schemas, and the domain
model. Each contract must have one named owner, an immutable revision or schema
hash, producer/consumer references, and an executable verification command.
Existing contracts are reused when their operation and semantic invariants match;
missing shapes remain explicit gaps and must not be fabricated from route names.

## Architecture authority hierarchy

```text
Product scope
  → requirements and acceptance intent
    → architecture synthesis (this document)
      → domain / integration / technology contracts
        → API, event, and data schemas
          → service implementations and platform adapters
```

Each layer may refine the layer below it, but may not silently override a higher
layer. A lower-level implementation conflict is a contract gap, not permission to
invent behavior.

### Hierarchy ownership matrix

| Layer | Owns | Does not override |
|---|---|---|
| Product scope | Goals, user outcomes, non-goals | Domain or transport implementation details |
| Architecture synthesis | Cross-boundary topology, safety laws, capability-to-service decomposition | Product scope or field-level schema definitions |
| Domain contracts | Entities, state transitions, events, business invariants | UI presentation or platform protocol quirks |
| Integration contracts | Adapter capabilities, authentication, retries, external mappings | Core margin, inventory, or approval policy |
| API / event / data schemas | Wire fields, types, versions, persistence constraints | Higher-level safety laws and product intent |
| Services and adapters | Executable behavior within the approved contracts | Any higher-level authority |

## Error Semantics & Problem Details SOT

Browser-facing errors use stable problem-details semantics, deterministic domain
codes, correlation IDs, and explicit retry behavior. Error definitions belong in
the API contract layer and must not be invented independently by a UI or adapter.

### Contract status legend

| Label | Meaning | Change rule |
|---|---|---|
| **SOT** | Authoritative source for the named concern | Update the owning source first |
| **FROZEN TARGET** | Required contract for the current hackathon scope | Change only through an explicit decision record |
| **Initial target** | Measurable goal that is not yet production evidence | Verify with tests or load experiments before claiming success |
| **Simulated** | Deterministic demonstration behavior | Must remain visibly distinct from sandbox or production |

## 🏛️ 1. Mission & Architectural Philosophy

LivePilot OS is a real-time, policy-governed live-commerce operating system. It
coordinates Host guidance, Live Ops controls, bounded store actions, and traceable
decision-making in one live session.

The governing runtime loop is:

```text
observe → classify → recommend → verify policy
→ approve/execute → reconcile → audit
```

The system must preserve the relationship between the source signal, AI proposal,
deterministic policy decision, human approval, platform result, and audit record.

### Core Architectural Laws

1. **Source-to-audit causality:** Every consequential result preserves the chain from source signal → AI proposal → policy verdict → approval → platform result → audit receipt.
2. **Policy authority:** JEV produces structured recommendations only. Margin, inventory, approval, execution, and audit services make consequential decisions.
3. **Zero-float money:** Financial values use integer minor units with explicit ISO 4217 currency and scale.
4. **Server-authoritative scope:** Session, actor, role, and tenant context are enforced server-side; browser state is untrusted.
5. **Idempotent mutation:** Every consequential mutation has an idempotency key and reconciliation path for unknown outcomes.
6. **Adapter isolation:** Platform-specific protocols stay behind an anti-corruption layer and cannot alter domain policy rules.
7. **Fail-closed safety:** Missing evidence, stale authorization, policy failure, emergency pause, or uncertain external state blocks consequential action.

## 🌐 2. Client Surface Topology

```text
                         +------------------------------+
                         | Marketplace platforms        |
                         | Shopee / TikTok / simulators  |
                         +---------------+--------------+
                                         |
                              webhooks / adapter commands
                                         |
+----------------------+       +--------v---------+
| Streamer Co-pilot    |       | Live Ops Console  |
| Host HUD             |       | Operator Control  |
+----------+-----------+       +---------+---------+
           \\                         /
            \\ HTTPS / SSE / WS     /
             v                     v
              +-------------------+
              | LivePilot OS      |
              | Gateway + Services|
              +-------------------+
```

The Host and Operator use the same live session but receive different views,
permissions, and actions. The browser never calls domain services or marketplace
platforms directly.

## 🛡️ 3. Six-Node Enterprise Production Invariant [FROZEN TARGET]

```text
┌──────────────────────────────┐
│ Next.js Host + Operator UI   │
└──────────────┬───────────────┘
               │ HTTPS / SSE / WebSocket
┌──────────────▼───────────────┐
│ Portal BFF                    │
│ UI DTOs, session, validation  │
└──────────────┬───────────────┘
               │ versioned REST
┌──────────────▼───────────────┐
│ KrakenD API Gateway           │
│ auth, rate limits, routing    │
└──────────────┬───────────────┘
               │ versioned REST
┌──────────────▼───────────────┐
│ Core BFF                      │
│ screen aggregation/orchestration│
└──────────────┬───────────────┘
               │ mTLS HTTP/2 or gRPC /internal/v1/*
┌──────────────▼───────────────┐
│ Internal KrakenD Mesh        │
│ private routing + schemas    │
└──────────────┬───────────────┘
               │ mTLS service routes / NATS
        ▼           ▼
┌────────────────────────────────────────────────────────┐
│ Domain services                                          │
│ session · catalog · telemetry · intent/risk · decision  │
│ copilot · margin · inventory · promotion                │
│ approval/control · execution · audit                    │
└───────────────┬──────────────────────┬─────────────────┘
                │                      │
                ▼                      ▼
        ┌───────────────┐      ┌────────────────┐
        │ PostgreSQL HA │      │ NATS JetStream │
        │ service-owned │      │ events/jobs/DLQ │
        │ data          │      └───────┬────────┘
        └───────────────┘              ▼
                              ┌─────────────────┐
                              │ Adapter workers │
                              │ + reconciliation│
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │ Platform        │
                              │ adapters        │
                              │ simulated/real  │
                              └─────────────────┘
```

Platform adapters form an Anti-Corruption Layer. Domain services issue canonical
actions such as `PinProduct`, `CreateVoucher`, `ReserveInventory`, and
`GetOrderStatus`; adapters translate them into platform-specific protocols.
Adding a platform must not change JEV, margin, inventory, promotion, or approval
rules.

### Boundary responsibilities

| Boundary | Owns | Must not do |
|---|---|---|
| UI → Portal BFF | UI session, DTO, validation, and presentation contract | Authorize by browser state or call domain services directly |
| Portal BFF → KrakenD | Versioned public `/v1/*` REST contract | Contain domain policy or financial rules |
| KrakenD → Core BFF | Authenticated `/v1/*` routing and versioned REST contract | Reimplement domain rules |
| Core BFF → Internal KrakenD | mTLS HTTP/2 or gRPC `/internal/v1/*` contract | Expose private routes publicly or connect directly to PostgreSQL |
| Internal KrakenD → domain services | Private schema routing and service identity | Reimplement domain rules |
| Core BFF/service → service | NATS request/reply, JetStream events, and durable jobs | Read another service's database |
| Service → platform adapter | Isolated protocol translation and idempotent execution | Leak platform-specific rules into the domain core |

## 🏗️ 4. Decoupled Backend Services Fleet

The product hierarchy is **product capabilities → bounded services → adapters**.
The four product capabilities are logical groupings; the services below are the
independently deployable boundaries. Services may initially share a repository, but
they retain separate ownership, contracts, persistence boundaries, and failure behavior.

| Product capability | Services |
|---|---|
| **Session & live context** | `session-service`, `catalog-service` |
| **Signals & decisioning** | `telemetry-service`, `intent-risk-service`, `decision-engine-service`, `copilot-service` |
| **Policy & commerce controls** | `margin-policy-service`, `inventory-service`, `promotion-service` |
| **Approval, execution & evidence** | `approval-control-service`, `execution-service`, `platform-adapter-service`, `audit-service` |

| Service | Bounded responsibility | Authoritative data |
|---|---|---|
| `session-service` | Live session lifecycle, Host/Operator presence, session roles, channel bindings | Session and access state |
| `catalog-service` | Approved products, SKUs, variants, catalog facts, claim registry | Brand-approved catalog |
| `telemetry-service` | Chat/order/engagement ingestion, normalization, deduplication | Normalized source signals |
| `intent-risk-service` | Intent classification, question clustering, moderation risk | Intent and risk signals |
| `decision-engine-service` | Evidence/context assembly, JEV invocation, structured decision validation, confidence and recommendation routing | Decision proposals and deferrals |
| `copilot-service` | Host cues, Q&A drafts, alerts, Host decisions | Co-pilot presentation state |
| `margin-policy-service` | Contribution-margin arithmetic, floor policy, verdicts | Policy versions and verdicts |
| `inventory-service` | Atomic reservations, release/finalization, stock state | Reservation ledger |
| `promotion-service` | Product pin and voucher proposals, lifecycle state | Promotion state machine |
| `approval-control-service` | Approval modes, approvals, Emergency Pause, kill switches | Control-plane state |
| `execution-service` | Durable action dispatch, retry, timeout, reconciliation | Execution state and adapter correlation |
| `platform-adapter-service` | Adapter registry, capability negotiation, protocol translation, webhook verification, external idempotency | Shared business policy or unaudited platform mutation |
| `audit-service` | Immutable decision and action trace, evidence references | Audit receipts |

Consequential boundaries are `margin-policy-service`, `inventory-service`,
`approval-control-service`, `execution-service`, and `audit-service`. Any action
that changes money, stock, promotion state, or external platform state must pass
through their explicit contracts.

### Canonical Service Hierarchy

```text
Product capability
  → bounded service
    → versioned contract
      → service-owned persistence
        → platform adapter (when external)
```

### Decision-Control Hierarchy

```text
Source signal
  → evidence-grounded recommendation
    → deterministic policy verdict
      → human or explicitly authorized approval
        → durable execution command
          → platform result / unknown outcome
            → reconciliation
              → immutable audit receipt
```

No layer may skip the policy verdict, approval requirement, or reconciliation step
for a consequential action. A recommendation is never itself an execution command.

## ⚡ 5. Event Mesh & Command Flow [FROZEN TARGET]

Events describe facts that happened. Commands request a bounded action. JEV output
is a structured recommendation, never a platform command.

```text
chat.received
  → telemetry normalized
  → intent/risk signal detected
  → Decision Engine invokes JEV
  → structured recommendation with evidence and confidence
  → product interest aggregated
  → Host cue or operator proposal
  → margin and inventory checks
  → approval / Emergency Pause check
  → idempotent adapter command
  → platform acknowledgement or unknown result
  → reconciliation
  → audit receipt
```

The currently selected Hackathon demonstration follows the [requirements baseline](live-pilot-os-requirements.md) and [project brief](../02-product/project-brief.md):

```text
Mock shampoo live and chat
  → group promotion questions and calculate two-minute audience interest
  → show Host product details, metrics, and talking points
  → AI proposes a discount; deterministic margin policy checks the 10% floor
  → Live Ops approves or rejects
  → on approval, simulate coupon, stock reservation, viewer banner, and countdown
  → on rejection, show not-approved status and end without an alternative offer
```

### Event subjects

Initial event vocabulary is versioned from the LivePilot domain model:

```text
live.chat.received
telemetry.intent.detected
telemetry.risk.detected
telemetry.question.clustered
live.engagement.updated
product.interest.updated
copilot.suggestion.created
copilot.alert.created
decision.proposal.created
decision.deferred
promotion.proposed
margin.verdict.recorded
inventory.reservation.created
inventory.reservation.released
approval.decision.recorded
platform.action.requested
platform.action.completed
platform.action.failed
emergency.pause.activated
emergency.pause.released
audit.decision.appended
```

Every event carries at least:

```json
{
  "event_id": "evt_01...",
  "event_type": "decision.proposal.created",
  "occurred_at": "2026-11-20T00:00:00Z",
  "session_id": "session_01",
  "correlation_id": "trace_01",
  "causation_id": "evt_00",
  "schema_version": 1,
  "producer": "decision-engine-service",
  "model_provider": "jev",
  "model_version": "jev-system-one@version",
  "confidence": 0.0,
  "data": {}
}
```

NATS JetStream provides durable event delivery and replay. Consumers must be
idempotent and acknowledge only after their state transition or side effect is
durably recorded.

## 🧱 6. Hexagonal Service Architecture

Each domain service follows ports and adapters:

```text
Driving adapters
  REST controllers, NATS consumers, workflow activities
                 │
                 ▼
Domain core
  use cases, aggregates, policies, domain events
                 │
                 ▼
Driven adapters
  PostgreSQL repositories, NATS publishers/consumers, Redis cache,
  platform clients, object storage
```

The domain core must not import web frameworks, database clients, marketplace SDKs,
or message-broker implementations. Infrastructure dependencies are injected through
ports owned by the domain/application layer.

## 🔐 7. Data, Security & Consistency Laws [FROZEN TARGET]

| Data | Store | Rule |
|---|---|---|
| Money, fees, COGS, margin | PostgreSQL integer minor units | No floating-point financial arithmetic |
| Inventory reservation | PostgreSQL transaction and version/row locks | Atomic, idempotent, released or finalized once |
| Domain events | PostgreSQL outbox + NATS JetStream | Publish after the owning transaction commits |
| Short-lived cache and deduplication | Redis | Reconstructable; never the money or inventory ledger |
| Audit evidence and raw payloads | Append-only PostgreSQL records + object storage | Hash-bound, encrypted, retention-controlled |
| Read models | Rebuildable PostgreSQL projections | Never become the domain source of truth |

Services must not share tables as an implicit API. Cross-service reads use explicit
NATS request/reply queries or rebuildable event-driven projections.

### Safety Invariants

1. Product Q&A uses approved catalog facts only; unknown or medical claims are
   escalated rather than guessed.
2. Every promotion or voucher passes the server-side margin floor before issuance.
3. Inventory reservations cannot be double-counted and must reconcile with terminal
   payment, expiry, cancellation, or unknown outcomes.
4. `RECOMMEND_ONLY`, `ASSISTED`, and `AUTONOMOUS` approval modes are explicit and
   recorded per action.
5. Emergency Pause stops automated pinning, voucher issuance, new reservations, and
   scenario actions while signal capture and audit logging continue.
6. An uncertain or delayed adapter response must not cause a duplicate consequential
   effect. Retries reuse the same idempotency key.
7. Simulated, sandbox, and production adapter modes are visible and cannot be
   represented interchangeably.
8. Every consequential action includes session, actor, trigger,
   policy verdict, correlation ID, result, and timestamp.
9. Tokens, platform credentials, customer PII, COGS, and supplier data are excluded
   from browser responses, model prompts, and ordinary logs.
10. Session authorization is enforced in the service layer, not only at the gateway
    or UI.

## 🔌 8. API & Communication Standards

- Browser-facing APIs use HTTPS REST, OpenAPI 3.1, JSON Schema, stable problem-details
  errors, and versioned routes.
- Internal commands and queries use versioned NATS request/reply contracts.
- Asynchronous facts use versioned NATS JetStream event schemas with durable consumers.
- Every consequential mutation requires an `Idempotency-Key` and returns an action or
  decision identifier.
- Every request propagates `X-Correlation-Id`, live-session scope, and authorization
  context.
- Additive fields remain backward compatible; incompatible changes require a new major
  contract version.

## 📊 9. Observability, Audit & Non-Functional Baseline

These are initial targets to verify with automated tests and load experiments; they are
not claims of achieved production performance.

| Path | Initial target |
|---|---|
| Operator read / catalog lookup | p95 < 150 ms, excluding third-party calls |
| Margin verdict | p95 < 50 ms |
| Chat-to-signal publication | p95 < 1 s under target load |
| Co-pilot suggestion delivery | p95 < 3 s |
| Inventory reservation decision | p95 < 150 ms, serialized per SKU/variant |
| Gateway and control-plane availability | 99.95% target |
| Data/event recovery | RPO ≤ 1 minute; RTO defined per deployment tier |

## 🧪 10. Hackathon-to-Production Evolution

The Hackathon may use seeded chat, simulated telemetry, a simulated platform adapter,
and a reduced deployment footprint. It must preserve the production contracts and the
visible distinction between simulated and confirmed platform behavior.

The intended evolution is:

```text
Microservice contracts + simulated adapters
  → live event ingestion and durable workers
  → real platform adapters behind the same contract
  → Temporal workflows for timers, approval waits, retries, and compensation
  → independent service scaling and production reconciliation
```

Do not put margin, inventory, approval, or platform mutations in Next.js Server
Actions, KrakenD plugins, or LLM prompts. Do not add infrastructure such as Kafka,
ClickHouse, or a service mesh without measured operational need.

## 🔗 11. Key Reference & Governance Links

### Source-of-Truth Precedence

When documents disagree, use this order of authority:

1. `project-brief.md` — product scope and non-goals.
2. `live-pilot-os-requirements.md` — requirements and traceability IDs.
3. `live-pilot-os-domain-model.md` — domain vocabulary, entities, and events.
4. `live-pilot-os-integration-boundaries.md` — external adapter contracts.
5. `api/README.md` and linked schemas — wire-level contract details.
6. `live-pilot-os-tech-stack.md` — deployment and technology choices.
7. This document — cross-boundary synthesis and safety invariants.

Specificity wins within the owning layer: a domain schema owns its fields, an
integration contract owns adapter behavior, and this overview owns cross-boundary
invariants. A lower layer must raise a contradiction instead of silently changing
an invariant owned above it. No code-first implementation, test fixture, or route
name may become the SOT by accident.

If the conflict affects a consequential action, record `[NEEDS CLARIFICATION]` and
do not invent a new contract.

### Required Architecture Verification Gates

Before a consequential goal is marked ready, verify:

1. The affected service, API/event contract, persistence owner, and adapter boundary are named.
2. The flow includes authorization, idempotency, policy evaluation, failure behavior, reconciliation, and audit evidence.
3. Money and inventory paths use the data invariants in section 7.
4. Simulated, sandbox, and production behavior are separately represented in tests and operator-visible status.
5. Any unresolved cross-document contradiction is recorded as `[NEEDS CLARIFICATION]` rather than silently resolved.

- [Project brief](../02-product/project-brief.md)
- [LivePilot OS deep context](live-pilot-os-deep-context.md)
- [Requirements baseline](live-pilot-os-requirements.md)
- [Feature map](live-pilot-os-feature-map.md)
- [Domain and event model](live-pilot-os-domain-model.md)
- [Integration boundaries](live-pilot-os-integration-boundaries.md)
- [Production technology stack](live-pilot-os-tech-stack.md)
- [Enterprise technical specifications SOT](technical-specifications-sot.md)
- [API contracts](api/README.md)
- [Live session control flow SOT](source-of-truth-flows/live-session-control-sot.md)
- [Contract coverage registry](contracts/flows/coverage.yaml)
- [F01 telemetry flow index](source-of-truth-flows/features/F01-live-chat-telemetry/index.md)
- [F02 host co-pilot flow index](source-of-truth-flows/features/F02-host-screen-assistant/index.md)
- [F03 profit-protection flow index](source-of-truth-flows/features/F03-streampilot-agent/index.md)
- [F04 operator-control flow index](source-of-truth-flows/features/F04-risk-operator-control/index.md)
- [Folder structure](folder-structure.md)
