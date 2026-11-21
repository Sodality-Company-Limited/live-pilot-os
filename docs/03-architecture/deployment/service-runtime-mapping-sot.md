# LivePilot OS — Logical Services to Runtime Mapping SOT

## Current truth

The current `infra/docker-compose.yml` deploys the shared foundation only:

| Runtime container | Purpose | State authority |
|---|---|---|
| `livepilot-postgres` | durable domain, session, promotion, inventory, and audit storage | authoritative |
| `livepilot-redis` | cache, deduplication, rate limiting, coordination | reconstructable only |
| `livepilot-nats` | NATS JetStream commands, events, jobs, and replay | transport/event log |

No Portal BFF, Core BFF, UI, gateway, or domain-service application container is
currently declared in Compose. Therefore the 12 logical microservices are API/SOT
boundaries, not evidence that 12 production processes are deployed.

## Target application runtime mapping

The following is the intended production-shaped mapping. Consolidation is allowed
on the single DigitalOcean Droplet for the pilot, but each row retains its own
state owner, contract, authorization boundary, and observability identity.

| Logical component | Pilot runtime process | Owns state? | Contract |
|---|---|---:|---|
| Host/Live Ops UI | `portal-ui` | no | Portal BFF `/api/*` |
| Portal BFF | `portal-bff` | no | `portal-bff/openapi.yaml` |
| Edge gateway | `edge-gateway` | no | public `/v1/*` routing |
| Core BFF | `core-bff` | no | `core-bff/openapi.yaml` |
| Identity/session | `identity-session-service` | yes | auth events + internal commands |
| Live session | `session-service` | yes | lifecycle subjects |
| Telemetry | `telemetry-service` | yes | telemetry subjects |
| Intent/risk | `intent-risk-service` | yes | intent/risk subjects |
| Catalog | `catalog-service` | yes | catalog subjects |
| JEV/Copilot | `jev-copilot-service` | yes | suggestion/provider receipts |
| Promotion | `promotion-service` | yes | promotion subjects |
| Margin policy | `margin-policy-service` | yes | policy verdict subjects |
| Inventory | `inventory-service` | yes | reservation subjects |
| Approval/control | `approval-control-service` | yes | decision/pause subjects |
| Execution/adapter safety | `execution-adapter-safety-service` | yes | action/reconciliation subjects |
| Audit | `audit-service` | yes | append-only audit subjects |

## Deployment gates

Before calling the DigitalOcean runtime production-ready, each target application
process must have an image, non-root user, readiness/liveness probes, CPU/memory
limits, private network binding, logs/metrics/traces, graceful shutdown, rollback
reference, and contract-test evidence. A consolidated process must not merge
database writers or bypass service authorization.

The current infrastructure deployment is therefore **foundation deployed;
application runtime pending**. This status is intentional and prevents the API
contract set from being mistaken for a completed application deployment.
