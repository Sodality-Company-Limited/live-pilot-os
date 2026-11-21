# LivePilot OS — Production Technology Stack

> **Status:** Proposed production baseline
>
> This stack is derived from the LivePilot OS deep context: low-latency live telemetry,
> evidence-grounded host guidance, deterministic margin protection, cross-channel inventory
> reservation, idempotent platform actions, approval control, Emergency Pause, and append-only
> decision auditability.

## Hackathon UI direction confirmed by the project owner

- Use the latest stable Next.js version available when implementation starts.
- Use Motion for React (Framer Motion) for purposeful UI motion.
- Keep one warm dark theme with Shopee orange as the accent.
- Treat video, chat, product activity, and offer outcomes as simulated in the Hackathon UI; do not claim a live platform integration.
- Backend, persistence, authentication, and production deployment choices remain proposed or undecided below; this Hackathon direction does not approve them.

## 1. Technology decision summary

| Concern | Recommended choice | Why it fits LivePilot OS |
|---|---|---|
| Operator and host UI | **Next.js App Router + TypeScript** | One production web surface for the Operator Console, Streamer Co-pilot HUD, onboarding, and audit views. Use server rendering for secure reads and client components only for live interaction. |
| Agentic decision layer | **LivePilot Decision Engine + JEV System One model via TypeSafe AI** | Converts typed intent/risk signals into structured, evidence-linked recommendations. JEV is a model provider inside the Decision Engine, not an authorization or execution authority. |
| Public API boundary | **KrakenD API Gateway** | Stateless edge gateway for OIDC/JWT validation, rate limits, aggregation, contract versioning, and routing to internal services. It must not contain margin or inventory business rules. |
| Domain and policy services | **Node.js LTS + NestJS + TypeScript** with typed domain modules | Shared TypeScript contracts with the Next.js surface, mature dependency ecosystem, structured modules/DI, explicit error paths, and efficient I/O-bound service execution. |
| NestJS HTTP runtime | **NestJS Node adapter** | Keeps the service runtime on Node.js LTS without introducing a second HTTP framework runtime. |
| HTTP DTO validation | **NestJS ValidationPipe + class-validator/class-transformer** | Validates request and response DTOs at the transport boundary while keeping domain validation independent. |
| Event schema validation | **Ajv + checked-in JSON Schema** | Validates versioned NATS/JetStream envelopes and event payloads at runtime. |
| PostgreSQL access | **node-postgres (`pg`) + Kysely** | Typed SQL and explicit transactions for money, inventory, outbox, RLS, and audit writes without coupling the domain core to an ORM. |
| NestJS testing | **Jest + Supertest + fast-check** | Unit, HTTP contract, integration, property-based, idempotency, replay, and failure-path coverage. |
| Internal service communication | **NATS request/reply + JetStream** | Versioned service commands, queries, immutable events, durable consumers, replay, and at-least-once delivery. |
| External/client API | **HTTPS REST + OpenAPI** | Stable consumer contract for the Next.js app, partner integrations, and operational tooling. |
| Live UI updates | **SSE first; WebSocket only where bidirectional control is required** | SSE is simpler for one-way telemetry, alerts, audit entries, and co-pilot suggestions. Use WebSocket for operator control or platform sessions that genuinely need bidirectional traffic. |
| Event backbone | **NATS JetStream** | Low-latency subjects with durable streams, replay, at-least-once delivery, pull consumers, and horizontally scalable worker groups. |
| Durable workflows | **Temporal** with dedicated workflow workers | Use for flash-voucher lifecycles, reservation expiry, approval waits, retries, compensation, and platform reconciliation—not for every telemetry message. |
| Primary database | **PostgreSQL** | Transactional source of truth for live sessions, catalog facts, money policies, inventory reservations, approvals, and audit indexes. |
| Cache and ephemeral coordination | **Redis** | Cache, short-lived deduplication windows, rate limits, and UI presence. Never make Redis the authoritative money or inventory ledger. |
| Audit/event archive | **PostgreSQL append-only tables + S3-compatible object storage** | Queryable decision history plus immutable raw payloads, evidence bundles, and replay fixtures. |
| Search/analytics | **PostgreSQL first; ClickHouse/OpenSearch later** | Avoid premature infrastructure. Add an analytical store only when audit/query volume or time-series exploration justifies it. |
| Identity | **OIDC provider** + gateway validation + session-scoped service authorization | Host, operator, moderator, and service identities without embedding authorization logic in every UI route. |
| Observability | **OpenTelemetry**, Prometheus, Grafana, centralized logs, trace backend | Correlate live event, policy verdict, worker execution, platform adapter call, and operator decision with one trace ID. |
| Runtime | **Containers on Kubernetes** with Helm/Argo CD or an equivalent GitOps runtime | Separate API, event, workflow, and adapter scaling; support rolling deploys, health checks, graceful shutdown, and isolation of platform credentials. |

### 1.1 NestJS implementation baseline

The implementation uses one TypeScript language across Next.js and backend services.
NestJS is the composition and transport framework; it is not the domain model.

```text
NestJS module/controller/consumer
  → application use case
  → domain ports and deterministic policies
  → infrastructure adapter
      → pg/Kysely
      → nats
      → Temporal TypeScript SDK
      → Redis client
      → platform adapter
```

Required package responsibilities:

| Concern | Selected implementation |
|---|---|
| NestJS composition | `@nestjs/common`, `@nestjs/core`, `@nestjs/config` |
| HTTP transport | NestJS Node adapter, controllers, guards, pipes, interceptors, and exception filters |
| OpenAPI | `@nestjs/swagger` checked against the canonical OpenAPI contract |
| Runtime HTTP validation | `ValidationPipe`, `class-validator`, and `class-transformer` |
| Event validation | Ajv with versioned JSON Schema |
| PostgreSQL | `pg` connection pools and Kysely repositories |
| NATS | Official `nats` TypeScript client with durable JetStream consumers |
| Temporal | `@temporalio/client` and `@temporalio/worker` for long-running workflows only |
| Redis | Official Node Redis client for reconstructable cache, deduplication, and rate limits |
| Observability | OpenTelemetry Node SDK plus NestJS request/consumer interceptors |
| Tests | Jest, Supertest, fast-check, and real boundary fixtures where available |

NestJS modules must not place margin, inventory, approval, or audit truth in
controllers, decorators, pipes, or framework callbacks. Those rules belong to
application services and domain ports. Database, broker, workflow, cache, and
platform SDKs are infrastructure adapters injected behind those ports.

## 2. Recommended service topology

```text
                                    ┌────────────────────────┐
                                    │  Shopee / TikTok /      │
                                    │  Lazada platform APIs   │
                                    └────────────┬───────────┘
                                                 │ webhooks / commands
┌──────────────────┐    HTTPS/SSE/WS    ┌────────▼─────────┐
│ Next.js surfaces │◄──────────────────►│ Portal BFF       │
│ Operator + Host  │                    │ UI contract      │
└────────┬─────────┘                    └────────┬─────────┘
         │ HTTPS                                  │ REST
         └──────────────────────┬─────────────────┘
                                ▼
                       ┌────────▼─────────┐
                       │ KrakenD Gateway  │
                       │ auth/rate/route  │
                       └────────┬─────────┘
                                │ REST
                                ▼
                       ┌────────▼─────────┐
                       │ Core BFF          │
                       │ orchestration     │
                       └────────┬─────────┘
                                │ NATS
                                ▼
┌────────────────────────────────────────────────────────────┐
│ Node.js + NestJS application services                      │
│ session • catalog • telemetry • decision • policy        │
│ inventory • promotion • execution • audit                │
└───────────────┬──────────────────────────────┬─────────────┘
                │                               │
                │ NATS subjects                │ SQL transactions
                ▼                               ▼
       ┌─────────────────┐              ┌────────────────────┐
       │ NATS JetStream  │              │ PostgreSQL          │
       │ events + queues │              │ source of truth     │
       └──────┬──────────┘              └────────────────────┘
              │
     ┌────────▼─────────┐       ┌─────────────────────────────┐
     │ NestJS event     │       │ Temporal workflows          │
     │ workers          │       │ voucher / approval / retry   │
     │ classify/project │       │ and compensation workers     │
     └────────┬─────────┘       └──────────────┬──────────────┘
              │                                │
              └───────────────┬────────────────┘
                              ▼
                    ┌─────────────────────┐
                    │ Platform adapters   │
                    │ isolated credentials│
                    └─────────────────────┘
```

## 3. Microservice boundaries

Start with independently deployable modules and extract a separate service only when its
scaling, security, ownership, or failure boundary is real. Do not create a network hop for
every noun.

| Service | Owns | Must not own |
|---|---|---|
| **Identity & Session Access Service** | Authenticated Host, Operator, Moderator, and service identities; session-scoped permissions | Product, margin, or promotion rules |
| **Live Session Service** | Live-room/session lifecycle, host presence, session roles, channel bindings | Margin calculation or raw platform credentials |
| **Catalog Service** | Approved product facts, SKU/variant state, claim registry, catalog version | AI-generated facts or unverified claims |
| **Telemetry Ingestion Service** | Webhook/chat/order ingestion, normalization, deduplication, event publication | Final promotion decisions |
| **Intent & Risk Service** | Intent classification, question clustering, spam/off-platform risk signals | Direct platform mutations |
| **Decision Engine Service** | Evidence/context assembly, JEV invocation, structured decision validation, confidence and recommendation routing | Margin verdicts, inventory mutations, approval bypass, or platform commands |
| **Co-pilot Service** | Glanceable suggestions, answer drafts, host approval UX state | Unverified catalog answers or financial verdicts |
| **Margin Policy Service** | Integer minor-unit margin computation, fee/COGS rules, floor verdicts | UI state or platform API retries |
| **Inventory Service** | Atomic reservations, release/commit, cross-channel stock view | AI ranking or voucher copy |
| **Promotion Service** | Voucher/pin proposals and promotion state machine | Bypassing margin or inventory gates |
| **Approval & Control Service** | Approval mode, Emergency Pause, operator decisions, kill switches | Recomputing domain facts |
| **Execution Orchestrator** | Durable workflow state, retries, timeouts, compensation, reconciliation | Source-of-truth financial state |
| **Platform Adapter Services** | Shopee/TikTok/Lazada protocol translation, webhook verification, idempotency keys | Shared cross-platform policy decisions |
| **Audit Service** | Decision trace, actor, input hash, policy verdict, execution outcome | Mutable business state without an owning service |

### Service boundary rule

`Margin Policy`, `Inventory`, `Approval & Control`, and `Audit` are consequential boundaries.
Any action that changes money, stock, promotion state, or external platform state must pass
through their explicit ports and emit a traceable decision event.

## 4. Event, worker, job, and workflow model

### 4.1 Events — facts that happened

Use immutable CloudEvents-like envelopes on NATS subjects. Examples:

```text
live.chat.received
telemetry.intent.detected
telemetry.risk.detected
catalog.fact.versioned
copilot.suggestion.created
decision.proposal.created
decision.deferred
promotion.proposed
margin.verdict.recorded
inventory.reservation.created
approval.decision.recorded
platform.action.requested
platform.action.completed
platform.action.failed
audit.decision.appended
```

Every event should carry at least:

```json
{
  "event_id": "evt_01...",
  "event_type": "inventory.reservation.created",
  "occurred_at": "2026-11-20T00:00:00Z",
  "session_id": "session_01",
  "correlation_id": "trace_01",
  "causation_id": "evt_00",
  "schema_version": 1,
  "producer": "inventory-service",
  "data": {}
}
```

Platform adapters implement one canonical contract for `PinProduct`,
`CreateVoucher`, `ReserveInventory`, `GetOrderStatus`, and `ReceiveChatEvent`.
Platform-specific SDKs, permissions, payloads, and status codes remain inside the
adapter Anti-Corruption Layer. Unsupported capabilities return a typed result;
unknown external outcomes are reconciled before retry.

### 4.2 Workers — long-running consumers

Workers consume durable JetStream pull consumers and acknowledge only after the side effect
and idempotency record are committed. Recommended worker groups:

- `telemetry-normalizer`: validates, deduplicates, and publishes normalized signals.
- `intent-classifier`: batches bounded chat windows for classification.
- `risk-screening`: evaluates moderation and off-platform risk.
- `decision-engine`: assembles bounded context, invokes JEV, validates the structured decision,
  and routes recommendations or deferrals.
- `projection-worker`: builds dashboard/read models from immutable events.
- `adapter-dispatcher`: sends bounded commands to marketplace adapters.
- `reconciliation-worker`: compares requested, accepted, and observed platform state.
- `audit-indexer`: writes searchable audit projections without mutating the original receipt.

### 4.3 Jobs — bounded asynchronous tasks

Use jobs for finite work that can be retried independently:

- expire an uncompleted inventory reservation;
- close an exhausted or expired voucher;
- refresh a catalog snapshot;
- replay a failed adapter command with the same idempotency key;
- rebuild a read model from a known event range;
- generate an evidence bundle for an audit or support case.

### 4.4 Workflows — durable multi-step business processes

Use Temporal workflows when the process has timers, human approval, retries, compensation,
or external state reconciliation:

```text
PromotionWorkflow
  → evaluate margin
  → reserve inventory
  → await approval / policy mode
  → issue platform voucher
  → observe platform acknowledgement
  → commit or release reservation
  → append audit receipt
```

The workflow orchestrates; the NestJS domain services remain authoritative for calculations and
transactions. Temporal activities must call those services rather than reimplement policies.

## 5. Data and consistency rules

| Data | Store | Consistency rule |
|---|---|---|
| Money, fees, COGS, margin | PostgreSQL `BIGINT` minor units + ISO currency/scale | No floating-point financial arithmetic; cross-currency operations require an explicit FX rate. |
| Inventory reservation | PostgreSQL transaction and row/version locks | Reservation, floor verdict, and state transition are atomic and idempotent. |
| Event durability | NATS JetStream + PostgreSQL outbox | Publish after the owning transaction commits; never rely on an in-memory event only. |
| Short cache / rate limit | Redis | Evictable and reconstructable; never authoritative. |
| Raw evidence / payload | S3-compatible object storage | Content-addressed or hash-bound, encrypted, retention-controlled. |
| Read models | PostgreSQL projections initially | Rebuildable from events; no read model becomes the domain source of truth. |

## 6. API and contract standards

- External API: OpenAPI 3.1, JSON Schema, explicit error envelope, idempotency key for every
  consequential mutation, and `correlation_id` propagation.
- Internal API: versioned NATS request/reply for commands and queries; JetStream messages
  for immutable facts, durable delivery, replay, and backward-compatible evolution.
- Events: schema registry or checked-in JSON Schema/Protobuf definitions; consumers must tolerate
  additive fields and reject incompatible versions explicitly.
- Platform adapters: one adapter contract, one implementation per platform; credentials and
  platform-specific quirks never leak into the domain core.

## 7. Production NFR baseline

These are initial budgets to verify with load tests, not claims of achieved performance:

| Path | Target |
|---|---|
| Operator read / catalog lookup | p95 < 150 ms excluding third-party calls |
| Margin verdict | p95 < 50 ms from service receipt |
| Chat-to-signal publication | p95 < 1 s under target load |
| Co-pilot suggestion delivery | p95 < 3 s, matching the glanceable host interaction model |
| Reservation decision | p95 < 150 ms and strictly serialized per SKU/variant key |
| External adapter command | Timeout and retry policy per platform; never retry without idempotency key |
| Availability | 99.95% for gateway and core control plane; degraded read-only mode during adapter outage |
| Recovery | RPO ≤ 1 minute for event/data stores; RTO defined per deployment tier and tested quarterly |

## 8. Security and operational guardrails

- Terminate public TLS at the load balancer or gateway; use mTLS or workload identity internally.
- Store marketplace credentials in a managed secret store; adapters receive least-privilege,
  short-lived credentials where the platform supports them.
- Enforce session authorization in the service layer, not only in Next.js or KrakenD.
- Redact COGS, supplier data, tokens, and customer PII from logs and model prompts.
- Emergency Pause must be a control-plane write with an auditable actor, timestamp, reason,
  and fast propagation to promotion and adapter workers.
- Every worker has bounded concurrency, retry policy, dead-letter handling, graceful shutdown,
  and a replay procedure.

## 9. What not to do

- Do not put margin, inventory, or approval logic in Next.js Server Actions or KrakenD plugins.
- Do not use Redis as the inventory ledger or as the only job queue.
- Do not use Kafka, ClickHouse, service mesh, or a dozen microservices on day one without a
  measured need; NATS + PostgreSQL + a small set of NestJS services is the baseline.
- Do not make every event synchronous or require every consumer to be online for a live signal.
- Do not let JEV or any LLM directly issue platform mutations; the path must be
  structured proposal → deterministic policy verdict → approval/control → idempotent
  adapter command. JEV output is advisory until policy and approval gates accept it.

## 10. Delivery sequence

1. **Foundation:** Next.js, KrakenD, one NestJS API, PostgreSQL, OIDC, OpenTelemetry.
2. **Live loop:** NATS JetStream, telemetry ingestion, intent/risk workers, Decision Engine with
   JEV adapter, and SSE co-pilot feed.
3. **Guardrails:** Margin Policy, Inventory, Approval & Control, audit receipts, Emergency Pause.
4. **Execution:** Promotion service, platform adapter boundary, idempotent dispatcher, reconciliation.
5. **Durability:** Temporal workflows for voucher expiry, approval waits, retries, and compensation.
6. **Scale-out:** Split services by measured load and failure boundary; add analytical/search stores only
   when production telemetry proves the need.

## Related source of truth

- [LivePilot OS Deep Context](./live-pilot-os-deep-context.md)
- [Architecture Overview](./overview.md)
- [API source of truth](./api/README.md)
- [Data source of truth](./data/README.md)

## References

- [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [KrakenD documentation](https://www.krakend.io/docs/)
- [NATS JetStream](https://docs.nats.io/concepts/jetstream)
- [NATS pull consumers](https://docs.nats.io/learn/jetstream/pull-consumers)
- [Temporal documentation](https://docs.temporal.io/)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
