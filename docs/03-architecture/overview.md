# LivePilot OS — Architecture Overview

> **Status:** Proposed microservice architecture. The Hackathon uses simulated
> telemetry and platform adapters; production platform integrations require approved
> adapter contracts, permissions, and operational validation.

## System purpose

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

## System context

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

## Microservice topology

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
               │ NATS request/reply/events
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
        │ PostgreSQL    │      │ NATS JetStream │
        │ service-owned │      │ events/workers │
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
| Portal BFF → KrakenD | Versioned public REST contract | Contain domain policy or financial rules |
| KrakenD → Core BFF | Authenticated routing and versioned REST contract | Reimplement domain rules |
| Core BFF → domain services | Screen aggregation and use-case orchestration | Reimplement catalog, margin, inventory, approval, or audit rules |
| Core BFF/service → service | Versioned NATS request/reply and JetStream events | Read another service's database |
| Service → platform adapter | Isolated protocol translation and idempotent execution | Leak platform-specific rules into the domain core |

## Bounded contexts and service ownership

The system uses four product capabilities implemented as independently deployable
service boundaries. Services may initially share a repository, but they retain
separate ownership, contracts, persistence boundaries, and failure behavior.

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

## Command, event, and action flow

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

The Hackathon demonstration follows this trace:

```text
Chat asks for shade 02
  → classify product interest
  → update product signal
  → show Host cue
  → propose SKU pinning
  → reject below-floor offer
  → append decision trace
  → activate Emergency Pause
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

## Hexagonal service architecture

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

## Data ownership and consistency

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

## Safety and security invariants

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

## API and communication standards

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

## Non-functional baseline

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

## Hackathon and production evolution

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

## Related architecture documents

- [Project brief](../02-product/project-brief.md)
- [LivePilot OS deep context](live-pilot-os-deep-context.md)
- [Requirements baseline](live-pilot-os-requirements.md)
- [Feature map](live-pilot-os-feature-map.md)
- [Domain and event model](live-pilot-os-domain-model.md)
- [Integration boundaries](live-pilot-os-integration-boundaries.md)
- [Production technology stack](live-pilot-os-tech-stack.md)
- [API contracts](api/README.md)
- [Folder structure](folder-structure.md)
