# Runtime Topology and Environment Ladder SOT

## Environment contract

| Environment | Purpose | State | External mutation |
|---|---|---|---|
| local | deterministic development and contract tests | local containers | disabled/simulated |
| CI | repeatable validation and image creation | ephemeral | disabled |
| DigitalOcean production | approved deployed runtime | isolated Droplet/project/network | live architecture; demo inputs/adapters may be mocked at explicit boundaries |

The current environment ladder intentionally has two environments only: local development and DigitalOcean production. CI validates changes but is not treated as a deployed environment.

Promotion is immutable image + versioned migrations + versioned configuration. Rebuilding an image between environments is prohibited.

## Six-node runtime mapping

The six nodes below are application boundaries. Nginx/ModSecurity is infrastructure
in front of Node 1; PostgreSQL, NATS, Redis, and adapters are dependencies of Node 6,
not substitute nodes.

1. UI: Next.js Host and Live Ops UI.
2. Portal BFF: session-scoped DTOs and browser boundary.
3. External KrakenD API Gateway: authenticated public `/v1/*` routing and rate limits.
4. Core BFF: screen aggregation and orchestration over private `/internal/v1/*`.
5. Internal KrakenD Mesh: mTLS service routing and schema policy.
6. Domain services: independently owned services, workers, policy, execution, and audit.

Node 6 uses PostgreSQL for authoritative state, NATS JetStream for events/jobs/DLQ,
Redis only for reconstructable cache/coordination, and isolated platform adapter workers.

Each node has an owner, image/version, readiness probe, resource budget, logs, metrics, traces, and rollback reference.

## Service health, security, and degradation contract

Every private application process uses the same internal-only probe contract:
`/internal/health/startup` validates immutable configuration and compatible
migrations, `/internal/health/live` proves only that the process can respond,
and `/internal/health/ready` proves that required durable and transport
dependencies are usable. Liveness must not depend on PostgreSQL, NATS, Redis,
or an external provider; readiness must name each failed dependency with a safe
reason code and must never disclose connection strings or secret material.
Startup, liveness, and readiness have 60-second, 250-ms, and 250-ms budgets
respectively. A readiness failure removes a process from traffic without
claiming it is dead. SIGTERM stops admission, drains for at most 30 seconds,
releases leases safely, completes only bounded audit work, and prevents new
consequential side effects before closing dependencies.

On DigitalOcean, application processes bind only to private interfaces behind
the edge gateway/internal mesh. PostgreSQL, NATS, Redis, Docker, and SSH are
never public. Each process runs as a dedicated non-root identity with a
read-only image, dropped capabilities, resource limits, explicit egress
allow-list, restart policy, and immutable image digest. Secrets are supplied
at runtime from an external secret manager or protected host injection with
least privilege, rotation and expiry records. They are not stored in Git,
images, client configuration, public API payloads, NATS messages, logs, metrics,
traces, audit records, or health responses. No public route accepts or returns
provider credentials; real marketplace credentials remain outside the pilot
service boundary and simulated adapter mode is explicit.

Required runtime signals are structured logs, metrics, traces, and audit
receipts. Correlation, causation, tenant/session scope, actor reference,
idempotency key hash, and release identity propagate across HTTP, NATS, jobs,
and audit, while raw credentials, cookies, authorization headers, payloads,
and provider responses are redacted before emission. Cardinality is bounded by
service, operation, mode, outcome, dependency, and stable error code. Alert
defaults are: readiness false for 2 minutes; three liveness restarts in 10
minutes; dependency error rate >1% for 5 minutes; queue/outbox age >60 seconds;
unknown outcomes >1% for 5 minutes; and CPU >80% or memory >85% for 10 minutes.
These thresholds page or warn according to severity and are recorded with the
release evidence and rollback reference.

Graceful degradation is explicit: Redis loss disables new cache, deduplication,
or lease decisions that cannot be proven safe but does not replace PostgreSQL;
NATS loss makes readiness false and holds outbox work without acknowledging
commands; PostgreSQL loss makes readiness false and prevents all aggregate
mutation; control-plane pause loss is treated as paused for consequential
operations; provider timeout or divergence remains `unknown` and requires
authorized reconciliation. Safe reads may return `pending`, `stale`, or
`unknown`; no degraded path may infer approval or issuance.

## Runtime invariants

- Services are stateless; durable truth is PostgreSQL, event transport is NATS JetStream, and Redis is reconstructable.
- Every process has graceful shutdown, liveness, readiness, startup timeout, CPU/memory limits, and a non-root execution identity.
- Internal traffic uses private networking plus mTLS or workload identity; only the edge is internet-facing.
- Correlation, causation, tenant, session, actor, and idempotency context propagates across HTTP, NATS, jobs, and audit.
- Clock, timezone, locale, and regional settings are explicit; records use UTC.
