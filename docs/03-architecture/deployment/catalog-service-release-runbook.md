# LivePilot Catalog Service — DigitalOcean Release & Operations Runbook

> **Goal:** `G-CATA-007`  
> **Status:** Prepared for review — **Production apply is strictly gated on explicit human approval**  
> **Governing SOTs:** [README.md](README.md), [runtime-topology-sot.md](runtime-topology-sot.md), [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md), [deployment-pipeline-sot.md](deployment-pipeline-sot.md), [migration-rollback-sot.md](migration-rollback-sot.md), [backup-restore-dr-sot.md](backup-restore-dr-sot.md), and [service-runtime-mapping-sot.md](service-runtime-mapping-sot.md).

---

## 1. DigitalOcean Runtime Topology

`catalog-service` is packaged as an immutable, stateless, non-root Node.js 24 Alpine container that serves as the **single authoritative writer** for the PostgreSQL `catalog.*` schema and communicates internally over NATS JetStream (`livepilot.v1.catalog.*`).

| Dimension | Specification |
|---|---|
| **Container Name** | `livepilot-catalog-service` |
| **Image Contract** | `livepilot/catalog-service:<git-sha>` (built from [Dockerfile](../../../code/services/catalog-service/Dockerfile)) |
| **Execution Identity** | Unprivileged `node` user (`uid=1000`, `gid=1000`), `dumb-init` PID 1, `no-new-privileges:true` |
| **Resource Budget** | `mem_limit: 512m`, `cpus: 1.0`, JSON log rotation (`20m` x `3`) |
| **Network Boundary** | Attached exclusively to internal `livepilot-infra` Docker network; **zero public or host-published ports** (`expose: ["3006"]` only) |
| **Runtime Target (Primary)** | DigitalOcean Ubuntu 24.04 LTS Droplet (`nyc3` / `sgp1`) via [docker-compose.yml](../../../infra/docker-compose.yml) |
| **App Platform Compatibility** | If promoted to DigitalOcean App Platform, deploy strictly as an **Internal Worker / Private Service** with HTTP probes targeting `127.0.0.1:3006` (`/healthz`, `/readyz`), VPC private routing to Managed PostgreSQL & NATS, and zero public routes |
| **SPOF Disclosure** | Per [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md), the current single-Droplet pilot deployment is an explicitly accepted interim topology and remains a single point of failure until scaled to ≥ 2 Droplets or Kubernetes |

### Private Dependency Boundaries
- **PostgreSQL 16 (`postgres:5432`):** Connected over internal `livepilot-infra` network (`127.0.0.1:5432` loopback-only on Droplet host, never `0.0.0.0`). Owns `catalog.product_aggregates`, `catalog.product_facts`, `catalog.product_state_history`, `catalog.catalog_outbox`, `catalog.catalog_inbox`, and `catalog.catalog_idempotency` with forced Row-Level Security (`app.tenant_id`).
- **NATS JetStream 2.10 (`nats:4222`):** Connected over internal `livepilot-infra` network (`127.0.0.1:4222` loopback-only on host). Subscribes/publishes on `livepilot.v1.catalog.product.read.request`, `livepilot.v1.catalog.product.read.reply`, `livepilot.v1.catalog.product.mutate.request`, `livepilot.v1.catalog.product.dlq.replay.request`, and `livepilot.v1.catalog.product.updated` (DLQ: `.dlq`).
- **Ingress Isolation:** Public traffic terminates solely at Nginx/ModSecurity (`443:8443` via [edge-compose.yml](../../../infra/edge-compose.yml)) -> Portal UI -> Portal BFF -> KrakenD -> Core BFF -> Internal Mesh -> NATS. `catalog-service` has zero direct public ingress.

---

## 2. Environment Variables & Secrets Handling

- **Zero Secrets in Git:** No credentials, private keys, tokens, or `.env` files may be committed. Only sanitized templates ([.env.example](../../../infra/.env.example), [catalog-service.env.example](../../../infra/production/catalog-service.env.example)) reside in version control.
- **Host Secret Storage:** On the DigitalOcean Droplet, runtime environment files are stored outside Git at `/opt/live-pilot-os/infra/.env` (or `/opt/livepilot/catalog-service.env`) owned by `root:root` with `chmod 600` (`umask 077`).
- **Simulated Mode Visibility:** While `PLATFORM_ADAPTER_MODE=simulated` and `CATALOG_EXECUTION_MODE=SIMULATED`, all `/healthz`, `/readyz`, startup logs, and NATS envelopes visibly report `simulated_boundary_visible: true` / `mode: SIMULATED`, preventing simulated catalog state from being mistaken for live marketplace mutation.

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enforces production runtime mode |
| `PORT` | Yes | `3006` | Internal HTTP health/readiness probe port |
| `HOST` | Yes | `0.0.0.0` | Container-internal interface bind (unexposed on host) |
| `APP_ENV` | Yes | `prod` | Environment discriminator (`local` \| `prod`) |
| `PLATFORM_ADAPTER_MODE` | Yes | `simulated` | Marketplace adapter boundary guard |
| `CATALOG_EXECUTION_MODE` | Yes | `SIMULATED` | Catalog envelope execution mode (`SIMULATED` \| `SANDBOX` \| `CONFIRMED`) |
| `DATABASE_URL` | Yes (Secret) | `postgres://livepilot:<secret>@postgres:5432/livepilot?sslmode=disable` | Authoritative PostgreSQL connection string (injected at runtime) |
| `NATS_URL` | Yes | `nats://nats:4222` | Private NATS JetStream endpoint |
| `NATS_TOKEN` | Yes (Secret) | `<32+-char-random-token>` | NATS JetStream authentication token (injected at runtime) |
| `LOG_LEVEL` | No | `info` | Structured JSON stdout logging verbosity |

---

## 3. Healthcheck (`/healthz`) and Readiness (`/readyz`)

`catalog-service` uses identical probe paths across local and DigitalOcean runtimes:

1. **Liveness Probe (`GET /healthz`, alias `/health`):**
   - Used by Docker `HEALTHCHECK` (`interval=10s`, `timeout=3s`, `start-period=5s`, `retries=3`).
   - Returns HTTP `200 OK` with JSON:
     ```json
     {
       "status": "healthy",
       "service": "catalog-service",
       "mode": "SIMULATED",
       "platform_adapter_mode": "simulated",
       "uptime_seconds": 42,
       "timestamp": "2026-11-21T08:35:00.000Z"
     }
     ```
2. **Readiness Probe (`GET /readyz`):**
   - Used by Docker Compose `healthcheck` and deployment smoke gates.
   - Verifies:
     1. Presence of `001_catalog_product_facts.up.sql` migration artifact.
     2. Non-blocking TCP connectivity (1500ms timeout) to PostgreSQL (`DATABASE_URL`) and NATS (`NATS_URL`).
   - Returns HTTP `200 OK` (`{"status":"ready","dependencies":{"postgres":"reachable","nats":"reachable"},...}`) when all checks pass, or **fails closed** with HTTP `503 Service Unavailable` (`{"status":"not_ready",...}`) if any dependency or config is missing/unreachable.

---

## 4. Pre-Deployment Migrations & Smoke Verification

### 4.1 Apply Forward Database Migration (Expand-Only)
Before starting or updating `catalog-service`, verify PostgreSQL is healthy and apply [001_catalog_product_facts.up.sql](../../../code/services/catalog-service/migrations/001_catalog_product_facts.up.sql):
```bash
docker exec -i livepilot-postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  < code/services/catalog-service/migrations/001_catalog_product_facts.up.sql
```

### 4.2 Build & Validate Container Image
```bash
GIT_SHA="$(git rev-parse --short HEAD)"
docker build -t "livepilot/catalog-service:${GIT_SHA}" -t livepilot/catalog-service:latest \
  code/services/catalog-service/
```

### 4.3 Run Smoke & Contract Verification Commands
```bash
# 1. Offline / CI static + isolated Catalog service test suite (4 suites)
bash infra/catalog-smoke.sh --static-only

# 2. Live container smoke verification (once started in livepilot-infra)
bash infra/catalog-smoke.sh

# 3. Direct internal probe inspection (from Droplet via docker exec; no host port published)
docker exec livepilot-catalog-service wget -qO- http://127.0.0.1:3006/healthz
docker exec livepilot-catalog-service wget -qO- http://127.0.0.1:3006/readyz
docker logs --tail 50 livepilot-catalog-service

# 4. Repository governance & infrastructure hardening checks
bash infra/verify-hardening.sh
bash scripts/ci/governance-check.sh
```

---

## 5. Automated Rollback Runbook

Per [migration-rollback-sot.md](migration-rollback-sot.md), rollback is a controlled state transition:

### 5.1 Automatic Stop Conditions
Halt rollout and initiate rollback immediately if any of the following occur:
- `/readyz` returns HTTP `503` or container exits/restarts within 60 seconds of deploy.
- Error rate spikes (`LP11003` / `LP07001` / `LP07002` > 1%), outbox DLQ depth increases (`catalog_outbox` `status = 'dlq'`), or p99 latency breaches SLO.
- Any public port exposure (`0.0.0.0:3006`, `:5432`, `:4222`, `:6379`) is detected by `ss -tulpn` or `docker port`.

### 5.2 Controlled Rollback Procedure
```bash
# Step 1: Stop failing catalog-service container immediately to drain traffic
docker compose --env-file /opt/live-pilot-os/infra/.env \
  -f /opt/live-pilot-os/infra/docker-compose.yml stop catalog-service

# Step 2: Re-tag and start the last verified immutable image revision
PREV_REVISION="<PREVIOUS_VERIFIED_GIT_SHA>"
docker tag "livepilot/catalog-service:${PREV_REVISION}" livepilot/catalog-service:latest
docker compose --env-file /opt/live-pilot-os/infra/.env \
  -f /opt/live-pilot-os/infra/docker-compose.yml up -d --no-build catalog-service

# Step 3: Verify restored health and readiness
bash /opt/live-pilot-os/infra/catalog-smoke.sh
```

### 5.3 Database & Outbox Reconciliation Guard
- **NEVER** automatically execute [001_catalog_product_facts.down.sql](../../../code/services/catalog-service/migrations/001_catalog_product_facts.down.sql) in production; down migrations are destructive. Use forward-compatible schema repair or an approved database restore.
- Reconcile any `catalog.catalog_idempotency` records in `accepted` / `pending` / `unknown` state and inspect `catalog.catalog_outbox` (`status = 'dlq'`) before authorizing operator-scoped DLQ replay via `livepilot.v1.catalog.product.dlq.replay.request` (disabled by default; requires Catalog-owner + audit capability).
- Record an incident receipt capturing previous image digest, schema version, config version, operator, and follow-up action.

---

## 6. Backup, Restore & Disaster Recovery (DR) Procedures

Conforms to [backup-restore-dr-sot.md](backup-restore-dr-sot.md) (Target: **RPO ≤ 1 minute**, explicitly measured **RTO**):

### 6.1 Protected State Scope
- **Authoritative:** PostgreSQL `catalog.*` tables (`product_aggregates`, `product_facts`, `product_state_history`, `catalog_outbox`, `catalog_inbox`, `catalog_idempotency`), WAL/PITR archive, and migration metadata.
- **Event Log:** NATS JetStream `/data` volume (`livepilot_nats_data`) containing pending `livepilot.v1.catalog.product.updated` streams and `.dlq` messages.
- **Reconstructable (Not Backup Authority):** Redis cache (`livepilot_redis_data`) and stateless container filesystem.

### 6.2 Backup & Restore Verification Commands
```bash
# Encrypted logical snapshot of catalog schema (supplementing WAL/PITR continuous archiving)
BACKUP_TS="$(date -u +%Y%m%dT%H%M%SZ)"
docker exec livepilot-postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  --schema=catalog --format=custom --file="/tmp/catalog_${BACKUP_TS}.dump"

# Backup NATS JetStream stream configuration & state
docker exec livepilot-nats nats stream backup /tmp/nats_backup_${BACKUP_TS} 2>/dev/null || true

# Scheduled restore drill to an isolated verification database (must emit proof receipt)
docker exec -i livepilot-postgres createdb -U "${POSTGRES_USER}" "livepilot_restore_drill_${BACKUP_TS}"
docker exec -i livepilot-postgres pg_restore -U "${POSTGRES_USER}" -d "livepilot_restore_drill_${BACKUP_TS}" \
  "/tmp/catalog_${BACKUP_TS}.dump"
docker exec -i livepilot-postgres psql -U "${POSTGRES_USER}" -d "livepilot_restore_drill_${BACKUP_TS}" \
  -c "SELECT count(*) AS facts_count FROM catalog.product_facts;"
```

### 6.3 Canonical DR Recovery Order
Execute recovery strictly in this sequence:
1. **Network & Identity:** Provision Droplet firewall (`ufw` 443 + admin CIDR SSH only) and `/opt/live-pilot-os/infra/.env` secrets.
2. **PostgreSQL:** Restore PostgreSQL volume / PITR snapshot and verify `catalog.*` RLS policies and row counts.
3. **NATS Streams:** Restore `livepilot_nats_data` JetStream streams and verify consumer offsets.
4. **Configuration & Policy:** Verify `PLATFORM_ADAPTER_MODE` / `CATALOG_EXECUTION_MODE` and emergency pause state (fail closed if uncertain).
5. **Services:** Start `catalog-service` and wait for `/readyz` HTTP `200 OK`.
6. **Edge:** Start Nginx/ModSecurity WAF edge (`infra/edge-compose.yml`).
7. **Smoke & Reconciliation:** Execute `infra/catalog-smoke.sh`, reconcile pending outbox/idempotency entries, and record the DR restore receipt.

---

## 7. Human Approval Gate (Production Apply Strictly Held)

> [!IMPORTANT]
> **G-CATA-007 authorizes deployment bundle preparation and verification ONLY.**  
> Autonomous execution of `infra/deploy.sh deploy`, `terraform apply`, or live DigitalOcean Droplet mutation is **PROHIBITED** without explicit human sign-off.

| Gate Check | Required Evidence | Status |
|---|---|---|
| Immutable multi-stage `Dockerfile` & non-root `node` user | [Dockerfile](../../../code/services/catalog-service/Dockerfile) | Prepared & Verified |
| Private network Compose integration (zero public ports) | [docker-compose.yml](../../../infra/docker-compose.yml) | Prepared & Verified |
| `/healthz`, `/readyz`, smoke, rollback & DR runbook | [catalog-service-release-runbook.md](catalog-service-release-runbook.md) | Prepared & Verified |
| Verification evidence JSON receipt | [G-CATA-007-catalog-deployment-readiness.json](../../07-backlog/evidence/G-CATA-007-catalog-deployment-readiness.json) | Generated |
| **DigitalOcean Production Apply (`deploy.sh deploy`)** | **Explicit Tech Lead / Operator approval sign-off** | **HELD — Awaiting Human Approval** |
