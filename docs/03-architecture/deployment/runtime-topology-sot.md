# Runtime Topology and Environment Ladder SOT

## Environment contract

| Environment | Purpose | State | External mutation |
|---|---|---|---|
| local | deterministic development and contract tests | local containers | disabled/simulated |
| CI | repeatable validation and image creation | ephemeral | disabled |
| DigitalOcean production | approved deployed runtime | isolated Droplet/project/network | simulated only until live integration approval |

The current environment ladder intentionally has two environments only: local development and DigitalOcean production. CI validates changes but is not treated as a deployed environment.

Promotion is immutable image + versioned migrations + versioned configuration. Rebuilding an image between environments is prohibited.

## Six-node runtime mapping

1. UI: Next.js Host and Live Ops UI.
2. Portal BFF: session-scoped DTOs and browser boundary.
3. Edge gateway: TLS, authentication, rate limits, public routing.
4. Core BFF: screen aggregation and orchestration.
5. Domain services: Rust services, workers, policy, execution, audit.
6. State and adapters: PostgreSQL, NATS JetStream, Redis, object storage, platform adapters.

Each node has an owner, image/version, readiness probe, resource budget, logs, metrics, traces, and rollback reference.

## Runtime invariants

- Services are stateless; durable truth is PostgreSQL, event transport is NATS JetStream, and Redis is reconstructable.
- Every process has graceful shutdown, liveness, readiness, startup timeout, CPU/memory limits, and a non-root execution identity.
- Internal traffic uses private networking plus mTLS or workload identity; only the edge is internet-facing.
- Correlation, causation, tenant, session, actor, and idempotency context propagates across HTTP, NATS, jobs, and audit.
- Clock, timezone, locale, and regional settings are explicit; records use UTC.
