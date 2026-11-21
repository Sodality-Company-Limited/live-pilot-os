# LivePilot OS — Technology Stack SOT

| Layer | Selected baseline | Authority/status |
|---|---|---|
| Web UI | Next.js App Router + TypeScript | production baseline |
| UI boundary | Portal BFF / server-side session DTOs | required |
| Public edge | KrakenD or equivalent stateless gateway | required before public exposure |
| Core services | Rust + Axum + Tokio + SQLx | production baseline |
| Events/jobs | NATS request/reply + JetStream | selected |
| Long workflows | Temporal | required only for long timers/compensation/reconciliation |
| Durable state | PostgreSQL | authoritative |
| Cache/coordination | Redis | reconstructable only |
| Audit archive | PostgreSQL plus S3-compatible object storage | required |
| AI orchestration | JEV | internal governed runtime |
| AI inference | OpenAI through provider port | selected candidate |
| Observability | OpenTelemetry + Prometheus/Grafana + centralized logs | required |
| Runtime | Docker Compose on DigitalOcean as current production bridge; Kubernetes/GitOps remains target | explicit bridge decision |

## Prohibited substitutions

No service may introduce Kafka, ClickHouse, OpenSearch, a second database writer,
or a new model/provider directly into a domain service without an approved decision
record, measured need, ownership, migration plan, and rollback evidence.

## Runtime rule

The deployed demo may use mock inputs, but must preserve the same service boundaries,
health probes, auth context, event contracts, policy gates, audit lineage, and failure
states required by production.
