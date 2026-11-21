# Local Development Runtime SOT

## Required local profile

The local profile is reproducible through a checked-in Compose-compatible definition and pinned image versions. It provides PostgreSQL, NATS JetStream, Redis, the gateway/BFFs, domain services, workers, and the UI. Temporal is optional until a workflow requires it, but the adapter boundary must remain compatible.

## Local rules

- `SIMULATED` is the default platform mode; no real marketplace credentials are accepted by default.
- Seed data is versioned, disposable, and never a source of production truth.
- Developers use a local secret file ignored by Git; committed examples contain placeholders only.
- Health, readiness, migrations, OpenAPI, NATS schema, and contract tests run before UI development is considered valid.
- Local ports may be exposed to the host only through the documented edge; databases and brokers remain container-network-only where practical.

## Definition of done

`up` → migration check → seed → health/readiness → smoke flow → contract tests → logs/metrics inspection. The command and expected evidence must be recorded by the implementation repository.
