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

## Runtime invariants

- Services are stateless; durable truth is PostgreSQL, event transport is NATS JetStream, and Redis is reconstructable.
- Every process has graceful shutdown, liveness, readiness, startup timeout, CPU/memory limits, and a non-root execution identity.
- Internal traffic uses private networking plus mTLS or workload identity; only the edge is internet-facing.
- Correlation, causation, tenant, session, actor, and idempotency context propagates across HTTP, NATS, jobs, and audit.
- Clock, timezone, locale, and regional settings are explicit; records use UTC.
