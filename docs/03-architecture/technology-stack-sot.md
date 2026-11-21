# LivePilot OS — Technology Stack SOT

> **Decision:** The current LivePilot implementation wave uses Node.js LTS + NestJS + TypeScript for domain services. PostgreSQL access uses `pg` + Kysely; NATS JetStream remains the internal event transport. Rust/Axum is not an approved service baseline for this wave.

| Layer | Selected baseline | Authority/status |
|---|---|---|
| Web UI | Next.js App Router + TypeScript | production baseline |
| UI boundary | Portal BFF / server-side session DTOs | required |
| Public edge | KrakenD or equivalent stateless gateway | required before public exposure |
| Core services | Node.js LTS + NestJS + TypeScript | production baseline for the current implementation wave |
| Events/jobs | NATS request/reply + JetStream | selected |
| Long workflows | Temporal | required only for long timers/compensation/reconciliation |
| Durable state | PostgreSQL | authoritative |
| PostgreSQL access | `pg` + Kysely repositories | explicit transactions, outbox, RLS, and audit lineage required |
| Cache/coordination | Redis | reconstructable only |
| Audit archive | PostgreSQL plus S3-compatible object storage | required |
| AI orchestration | JEV | internal governed runtime |
| AI inference | OpenAI through provider port | selected candidate |
| Observability | OpenTelemetry + Prometheus/Grafana + centralized logs | required |
| Backend testing | Jest + Supertest + fast-check | contract, integration, replay, and failure-path evidence required |
| Runtime | Docker Compose on DigitalOcean as current production bridge; Kubernetes/GitOps remains target | explicit bridge decision |

## Prohibited substitutions

No service may introduce Kafka, ClickHouse, OpenSearch, a second database writer,
or a new model/provider directly into a domain service without an approved decision
record, measured need, ownership, migration plan, and rollback evidence.

## Runtime rule

The deployed demo may use mock inputs, but must preserve the same service boundaries,
health probes, auth context, event contracts, policy gates, audit lineage, and failure
states required by production.
