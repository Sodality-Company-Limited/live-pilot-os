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

## Promotion service runtime contract

`promotion-service` is a private, non-root process on the DigitalOcean private
network. It is reachable only from Core BFF/internal mesh routes and NATS; it
has no public listener and no browser route. Its image is immutable and
identified by release ID and digest. PostgreSQL is the authoritative dependency,
NATS JetStream is required for commands/events and outbox delivery, and Redis is
only reconstructable coordination/cache state. A Redis outage must not be
treated as healthy coordination: new work that needs a deduplication or lease
decision is rejected or held pending, while authoritative reads remain
available when their PostgreSQL evidence is trusted.

The runtime exposes internal-only probes:

| Probe | Passing condition | Failure action |
|---|---|---|
| `/internal/health/startup` | configuration/schema/error-code registry loaded and migrations are compatible | do not receive traffic; restart or fail deployment |
| `/internal/health/live` | event loop/process responds within 250 ms | restart the process; it does not assert dependency health |
| `/internal/health/ready` | startup complete; PostgreSQL ping, NATS JetStream connection/consumer health, and current control-plane pause snapshot are valid | remove from traffic and stop consequential work; return dependency-unavailable/pending safely |

Readiness may be false while liveness remains true during dependency recovery.
The probe response contains only `status`, service/release identity, probe
timestamp, and safe dependency reason codes; it never contains DSNs, tokens,
headers, query text, or provider data. Startup timeout is 60 seconds, probe
timeouts are 250 ms, and the process drains HTTP/NATS work for 30 seconds on
SIGTERM: stop admission, release uncommitted leases, finish only bounded audit
append, then close connections. No new reservation or execution side effect is
started while draining.

The service uses a dedicated non-root UID, read-only image filesystem except for
an ephemeral scratch directory, dropped Linux capabilities, CPU/memory limits,
and private egress allow-listing to PostgreSQL, NATS, Redis, the internal mesh,
and approved adapter-safety boundaries. Marketplace credentials are not
configured in this service. Any future adapter secret belongs in an external
secret manager with least privilege, rotation/expiry metadata, and injection
only into an isolated adapter worker; it must never be a public API field,
image layer, Git value, log, metric label, NATS envelope, audit record, or probe
response.

Runtime evidence is emitted with service, release, environment, tenant-safe
hash, session reference, correlation ID, causation ID, operation, mode, and
safe error code. Logs are structured JSON with redaction before serialization;
allow-listed identifiers are used instead of raw payloads. Metrics and traces
use bounded-cardinality labels and omit tenant IDs, promotion IDs, credentials,
tokens, cookies, authorization headers, and provider responses. Alerts are
owned by the promotion service: readiness false for 2 minutes, liveness restart
loop (3 restarts in 10 minutes), PostgreSQL/NATS error rate above 1% for 5
minutes, oldest outbox/DLQ item above 60 seconds, or unknown outcomes above 1%
for 5 minutes are page-worthy. Sustained CPU > 80% or memory > 85% for 10
minutes is a capacity warning.
