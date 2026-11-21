# LivePilot OS — Enterprise Technical Specifications SOT

> **Status:** Production-readiness target; not a production certification.  
> **Authority:** This document owns cross-cutting technical specifications and release gates.  
> **Architecture synthesis:** [overview.md](overview.md)  
> **Parent context:** [live-pilot-os-deep-context.md](live-pilot-os-deep-context.md)  
> **API SOT:** [api/README.md](api/README.md)  
> **Flow coverage:** [contracts/flows/coverage.yaml](contracts/flows/coverage.yaml)
> **Software Quality SOT:** [software-quality-sot.md](software-quality-sot.md)
> **Testing SOT:** [testing-sot.md](testing-sot.md)
> **NATS Contract Template:** [api/nats-subject-message-template.md](api/nats-subject-message-template.md)
> **Localization SOT:** [localization-sot.md](localization-sot.md)
> **Route Prefixing SOT:** [api/route-prefixing-and-boundary-invariant.md](api/route-prefixing-and-boundary-invariant.md)
> **Deployment/Runtime SOT:** [deployment/README.md](deployment/README.md)
> **Configuration/Policy SOT:** [configuration/README.md](configuration/README.md)
> **JEV Agent Runtime SOT:** [jev-agent-runtime-sot.md](jev-agent-runtime-sot.md)
> **AI Provider SOT:** [openai-provider-sot.md](openai-provider-sot.md) · [ai-provider-abstraction-sot.md](ai-provider-abstraction-sot.md)
> **AI Safety/Observability SOT:** [ai-safety-defer-sot.md](ai-safety-defer-sot.md) · [ai-observability-cost-sot.md](ai-observability-cost-sot.md)
> **Stack/Service/Provider SOT:** [technology-stack-sot.md](technology-stack-sot.md) · [service-topology-sot.md](service-topology-sot.md) · [provider-decision-sot.md](provider-decision-sot.md)
> **Production Readiness SOT:** [production-readiness-sot.md](production-readiness-sot.md)

This document consolidates the technical standards required to move LivePilot OS
from a simulated Hackathon slice toward an enterprise production system. It does
not authorize a live marketplace integration, production deployment, or a new
infrastructure component. Those require the decision and evidence gates below.

## 1. Specification authority and status

```text
Product / requirements
  → architecture overview
    → this technical specification
      → API, event, data, and integration contracts
        → implementation, deployment, and proof receipts
```

| Status | Meaning | Evidence required |
|---|---|---|
| `FROZEN` | Approved invariant or contract | Decision record and contract owner |
| `PROPOSED` | Recommended technology or design | Approved decision plus implementation plan |
| `TBD` | Missing product, provider, or operational decision | `[NEEDS CLARIFICATION]` record; blocks production claim |
| `SIMULATED` | Hackathon-only deterministic behavior | Visible mode label and no external mutation |
| `VERIFIED` | Executable evidence passed for a specific revision | Proof receipt with commands, hashes, and results |

The live demo uses `SIMULATED` inputs and platform adapters, but the deployed
runtime and architecture remain production-shaped. Frontend signal injection and
backend mock products are explicit demo boundaries; they do not disable production
authorization, policy, persistence, audit, idempotency, or reconciliation.

## 2. System topology and trust boundaries

```text
Node 1  Host / Live Ops UI
  → Node 2  Portal BFF
  → Node 3  KrakenD edge gateway
  → Node 4  Core BFF / orchestrator
  → Node 5  Node.js + NestJS domain and policy services
  → Node 6  PostgreSQL, NATS, Temporal, and platform adapters
```

### Boundary laws

| Boundary | Required behavior | Forbidden behavior |
|---|---|---|
| UI → Portal BFF | Session-scoped DTOs, safe rendering, correlation propagation | Browser authorization, direct service/platform calls |
| Portal BFF → KrakenD | Versioned HTTPS contract, request validation, auth context | Margin, inventory, approval, or adapter policy |
| KrakenD → Core BFF | TLS, authentication, rate limits, routing, versioning | Reimplementation of domain rules |
| Core BFF → internal mesh | mTLS HTTP/2 or gRPC `/internal/v1/*` routing and orchestration | Public exposure, second writer, or cross-service table reads |
| Services → persistence | Owned transactions, outbox, RLS, audit lineage | Shared tables as an implicit API |
| Services → adapters | Canonical commands, capability checks, idempotency, observation | Platform-specific rules in the domain core |

The domain core must remain independent of web frameworks, database clients,
marketplace SDKs, and message-broker implementations. Ports are owned by the
domain/application layer and adapters are injected at the boundary.

## 3. Runtime technology baseline

| Concern | Baseline | Status and gate |
|---|---|---|
| UI | Next.js App Router + TypeScript | `PROPOSED`; secure reads server-side, live interaction client-side |
| Public API | HTTPS REST + OpenAPI 3.1 | `FROZEN` contract shape; schema compatibility must pass |
| HTTP framework | NestJS Node adapter on Node.js LTS | `FROZEN` for the current implementation wave; transport concerns stay outside the domain core |
| HTTP validation | NestJS `ValidationPipe` with `class-validator` and `class-transformer` | `FROZEN` for the current implementation wave; boundary validation must pass before use-case execution |
| Edge | KrakenD or equivalent stateless gateway | `PROPOSED`; security and latency evidence required |
| Core/domain services | Node.js LTS, NestJS, TypeScript | `FROZEN` for the current implementation wave; service ownership and failure boundaries required |
| PostgreSQL access | `pg` + Kysely repositories | `FROZEN` for the current implementation wave; explicit transactions, outbox, RLS, and audit lineage required |
| Event validation | Ajv + versioned JSON Schema | `PROPOSED`; incompatible versions must fail closed |
| Internal messaging | NATS request/reply + JetStream | `FROZEN` for the current implementation wave; durable consumer/replay/DLQ evidence required |
| Durable workflows | Temporal | `PROPOSED`; only for timers, approvals, compensation, and reconciliation |
| Primary data | PostgreSQL | `FROZEN` source-of-truth direction; migrations, RLS, backup/restore required |
| Ephemeral coordination | Redis | `PROPOSED`; reconstructable cache/dedup/rate-limit only |
| Evidence archive | Append-only PostgreSQL + S3-compatible object storage | `FROZEN` audit direction; encryption and retention required |
| Identity | OIDC provider + service-layer authorization | `TBD` provider and operational ownership |
| Observability | OpenTelemetry, Prometheus, Grafana, centralized logs | `PROPOSED`; SLO dashboards and alert runbooks required |
| Backend testing | Jest, Supertest, fast-check, real persistence/messaging fixtures | `FROZEN` for the current implementation wave; contract, adversarial, replay, and failure evidence required |
| Runtime | Containers on Kubernetes with GitOps equivalent | `PROPOSED`; deployment, rollback, DR, and credential isolation required |

No new Kafka, ClickHouse, OpenSearch, service mesh, or extra microservice is
approved without measured operational need and an explicit decision record.

## 4. Contract and schema standards

### 4.1 HTTP

- OpenAPI 3.1 is authoritative for browser-facing synchronous HTTP.
- Every consequential mutation requires bearer authorization, `X-Correlation-Id`,
  and `Idempotency-Key`.
- `ProblemDetails` is the public error shape; stable domain codes include retry
  safety and correlation context.
- Additive fields are backward compatible. Incompatible changes require a new
  major contract revision and compatibility evidence.

### 4.2 NATS and events

- Commands and queries use versioned NATS request/reply subjects.
- Facts use versioned JetStream event subjects with durable consumers.
- Every event carries `event_id`, `event_type`, `occurred_at`, `session_id`,
  `correlation_id`, `causation_id`, `schema_version`, `producer`, and `data`.
- Consumers acknowledge only after durable state transition or side effect.
- Consumers must tolerate additive fields, reject incompatible versions explicitly,
  deduplicate, handle replay, and expose dead-letter behavior.

### 4.3 Contract evidence

Every contract entry in [coverage.yaml](contracts/flows/coverage.yaml) must have:

1. one owner;
2. a version or immutable schema hash;
3. producer and consumer references;
4. compatibility and security verification;
5. a reproducible command and proof artifact.

## 5. Data, transaction, and consistency requirements

| Concern | Requirement |
|---|---|
| Money | Integer minor units, explicit ISO 4217 currency and scale; never floating point |
| Margin | Policy version, input economics, verdict, and evidence are persisted together |
| Inventory | Atomic reservation/release/commit with row/version locking and idempotency |
| Events | PostgreSQL outbox commits before JetStream publication |
| Read models | Rebuildable projections; never a second domain writer |
| Cache | Redis is evictable and reconstructable; never money/inventory truth |
| Audit | Append-only receipts link actor, input hash, policy/model version, outcome, and lineage |
| RLS | Service-owned transactions set session/user context and use least-privilege roles |
| Unknown state | Delayed or unknown adapter results remain explicit until reconciliation |
| Corrections | Append a new receipt or revision; do not overwrite historical evidence |

One service owns each authoritative aggregate. Cross-service reads use contracts,
not another service's tables. Dual writers are prohibited during migration and
after cutover.

## 6. Preemptive real-time job and message system

The job system is a bounded, durable execution layer for latency-sensitive work.
It is not an in-memory queue and it is not a replacement for domain ownership.
NATS JetStream provides durable transport, PostgreSQL provides job/audit truth, and
Temporal owns long-lived timers and compensation workflows.

### 6.1 Job model

Every job has a stable `job_id`, `job_type`, `schema_version`, `session_id`,
`tenant_id`, `correlation_id`, `causation_id`, `idempotency_key`, `priority`,
`deadline_at`, `not_before`, `attempt`, `lease_owner`, `lease_expires_at`,
`state`, `created_at`, and `updated_at`. Job payloads are immutable after enqueue;
corrections create a new job or a cancellation/replacement command.

Canonical states are `queued`, `leased`, `running`, `succeeded`, `failed`,
`retry_wait`, `cancel_requested`, `cancelled`, `expired`, `dead_lettered`, and
`unknown`. `unknown` is terminal for the attempt but not proof of external failure;
reconciliation must resolve consequential unknown outcomes before retry.

### 6.2 Scheduling and preemption

- Scheduling is priority-aware and deadline-aware: urgent safety/control-plane jobs
  preempt ordinary projection or enrichment work, subject to reserved capacity.
- Preemption is cooperative. Workers checkpoint only at declared safe points and
  must never interrupt a transaction, reservation commit, audit append, or external
  consequential call without an explicit cancellation protocol.
- Each queue has weighted fair scheduling, per-tenant quotas, maximum concurrency,
  reserved emergency capacity, and an aging rule to prevent starvation.
- A preempted job returns to `queued` with its attempt and checkpoint metadata;
  duplicate execution remains safe through idempotency and lease fencing.
- Deadlines are enforced at admission, dispatch, worker execution, and result
  publication. Expired work is visible and auditable, not silently dropped.

### 6.3 Queue and message guarantees

| Concern | Required contract |
|---|---|
| Transport | Versioned NATS JetStream subjects with durable pull consumers |
| Delivery | At-least-once; consumers acknowledge after durable state/effect |
| Ordering | Ordering only within a declared key such as session, SKU, or aggregate |
| Deduplication | Message ID plus job idempotency key; duplicate delivery is harmless |
| Lease | Renewable, fenced lease; expired workers cannot commit results |
| Retry | Exponential backoff with jitter, bounded attempts, retry classification |
| Failure | Explicit DLQ with reason, last error, attempt history, and replay owner |
| Backpressure | Queue depth, age, consumer lag, and admission limits drive load shedding |
| Cancellation | Versioned cancel command; result race resolves by state/version guard |
| Replay | Operator-authorized replay with original lineage and a new replay ID |

### 6.4 Real-time path

The hot path is:

```text
signal → admission/policy → priority queue → lease → worker
  → domain transaction → outbox → JetStream publication → UI projection
```

The hot path must avoid synchronous third-party calls where a bounded asynchronous
job can preserve correctness. User-visible state must show `queued`, `running`,
`preempted`, `pending`, `unknown`, `failed`, or `succeeded`; a timeout is never
rendered as success. Control-plane pause cancels admission and prevents new
consequential leases while allowing safe cleanup and audit completion.

### 6.5 Production controls

- Use monotonic clocks for lease/deadline comparisons and UTC timestamps for records.
- Bound payload size, execution time, memory, concurrency, retries, and queue age.
- Persist state transitions and audit lineage transactionally with domain effects.
- Propagate trace, correlation, causation, tenant, session, and idempotency context.
- Apply authorization again at dispatch; queue possession is not permission.
- Test duplicate delivery, stale lease commit, preemption during dispatch, pause,
  deadline expiry, poison messages, broker outage, worker loss, replay, and recovery.
- Simulated adapters must preserve these semantics and visibly mark simulated mode.

## 7. Security and privacy baseline

1. Public TLS terminates at an approved edge boundary; internal traffic uses mTLS
   or an approved workload identity mechanism.
2. Identity is server-derived. Browser-supplied role, tenant, session, or capability
   headers are never treated as authority.
3. Session authorization is enforced in the service layer, not only in the UI or gateway.
4. Platform credentials live in a managed secret store and are available only to
   the owning adapter with least privilege and rotation evidence.
5. Logs, model prompts, browser responses, and events exclude tokens, credentials,
   unnecessary PII, COGS, and supplier-sensitive data.
6. Webhooks require signature verification, replay protection, and constant-time
   comparison before state mutation.
7. Emergency Pause is an auditable control-plane write with actor, reason, time,
   revision, and propagation evidence.
8. Threat-model cases cover spoofing, tampering, repudiation, information disclosure,
   denial of service, and elevation of privilege.

## 8. Reliability, delivery, and recovery

### Required behavior

- JetStream consumers use bounded concurrency, durable delivery, replay, graceful
  shutdown, and dead-letter handling.
- Consequential commands reuse the same idempotency key through retry and reconciliation.
- Unknown external outcomes are reconciled before retry; blind retry is prohibited.
- Temporal workflows own timers, approval waits, retries, compensation, and expiry;
  domain services remain authoritative for calculations and transactions.
- Deployments use health checks, readiness gates, graceful termination, rolling or
  canary strategy, and a tested rollback path.

### Initial SLO budgets

These are targets, not achieved production evidence:

| Path | Initial target |
|---|---|
| Operator read / catalog lookup | p95 < 150 ms excluding third-party calls |
| Margin verdict | p95 < 50 ms from service receipt |
| Chat-to-signal publication | p95 < 1 s under target load |
| Co-pilot suggestion | p95 < 3 s |
| Inventory reservation | p95 < 150 ms, serialized per SKU/variant |
| Gateway/control plane | 99.95% target |
| Event/data recovery | RPO ≤ 1 minute; RTO defined per deployment tier |

Before production, each target needs a load method, traffic profile, measurement
window, alert threshold, owner, and runbook.

## 9. Observability and auditability

The minimum trace joins:

```text
source signal
  → recommendation
    → policy verdict
      → approval
        → command
          → adapter request/result
            → reconciliation
              → audit receipt
```

Required telemetry:

- W3C trace context and `X-Correlation-Id` across every node;
- metrics for latency, error rate, queue lag, consumer age, retries, DLQ depth,
  reservation conflicts, policy rejects, pause propagation, and adapter unknowns;
- structured logs with redaction and stable event/action IDs;
- dashboards for each SLO and alert routing to an owned runbook;
- append-only audit evidence with source revision, policy/model version, actor,
  causation, correlation, idempotency key, and observed outcome.

## 10. Production readiness gates

Production readiness is blocked until all gates pass for the exact release revision:

| Gate | Required evidence |
|---|---|
| Contract | OpenAPI/event/data schemas linted, versioned, hashed, and compatibility-checked |
| Ownership | One writer, one contract owner, one persistence owner per aggregate |
| Security | Threat-model cases, auth/RLS tests, secret scan, redaction scan, dependency review |
| Reliability | Retry, timeout, idempotency, unknown outcome, DLQ, replay, and reconciliation tests |
| Data | Migration rollback, backup/restore, RLS isolation, outbox, and projection rebuild tests |
| Performance | Load evidence against each SLO budget with representative traffic |
| Operations | Dashboards, alerts, runbooks, on-call owner, deploy/rollback procedure |
| DR | RPO/RTO test per deployment tier and documented degraded read-only behavior |
| Audit | End-to-end receipt linking source, decision, policy, approval, action, and result |
| Release | Proof receipt bound to commit, file hashes, commands, exit codes, and artifacts |

Passing unit tests alone is not production evidence. A release is not certified when
any required gate is missing, stale, or based only on a mock/simulation.

## 11. Hackathon-to-production boundary

The Hackathon may use simulated video, chat, telemetry, coupon issuance, countdown,
and stock reservation. The UI and audit trail must label these as simulated. No live
platform credentials, payment, real inventory, or external mutation is permitted.

Production integration remains `TBD` until each adapter has approved platform
documentation, scopes, request/response schema, timeout/retry policy, idempotency,
webhook verification, rate limits, certification, reconciliation, and owner.

## 12. Open decisions blocking certification

- Identity provider, tenant/session authority, and operational owner.
- Production Kubernetes/GitOps topology, regions, network policy, and workload identity.
- Exact RTO per deployment tier and quarterly recovery test procedure.
- Canonical event schema registry and async compatibility checker.
- Error-code registry and localized ProblemDetails catalog.
- Platform adapter provider, permissions, certification, and webhook contracts.
- Retention, deletion, encryption-key rotation, and access policy for audit evidence.
- Approved SLO traffic profile, alert thresholds, and on-call ownership.

Each unresolved item remains `[NEEDS CLARIFICATION]` and blocks a production-ready
claim until it has an owner, decision record, contract update, and verification evidence.

## Related SOTs

- [Architecture overview](overview.md)
- [Production technology stack](live-pilot-os-tech-stack.md)
- [Integration boundaries](live-pilot-os-integration-boundaries.md)
- [LivePilot flow coverage](contracts/flows/coverage.yaml)
- [Live session control flow SOT](source-of-truth-flows/live-session-control-sot.md)
- [API contract index](api/README.md)
- [Verification architecture guide](verification-architecture-guide.md)
