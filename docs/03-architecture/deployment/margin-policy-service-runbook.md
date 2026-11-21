# LivePilot Margin Policy Service — DigitalOcean Release & Operations Runbook

> **Goal:** `G-MARG-007`  
> **Status:** Prepared for review — **Production apply is strictly gated on explicit human approval**  
> **Governing SOTs:** [README.md](README.md), [runtime-topology-sot.md](runtime-topology-sot.md), [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md), [deployment-pipeline-sot.md](deployment-pipeline-sot.md), [migration-rollback-sot.md](migration-rollback-sot.md), [backup-restore-dr-sot.md](backup-restore-dr-sot.md), and [service-runtime-mapping-sot.md](service-runtime-mapping-sot.md).

---

## 1. DigitalOcean Runtime Topology

`margin-policy-service` is packaged as an immutable, stateless, non-root Node.js 22 Alpine container that executes deterministic margin protection evaluations, enforces floor profit thresholds, calculates safe discount alternatives, and emits transactional outbox events to NATS JetStream (`livepilot.v1.margin.*`).

| Dimension | Specification |
|---|---|
| **Container Name** | `livepilot-margin-policy` |
| **Image Contract** | `livepilot/margin-policy-service:<git-sha>` (built from [Dockerfile](../../../code/services/margin-policy-service/Dockerfile)) |
| **Execution Identity** | Unprivileged `node` user (`uid=1000`, `gid=1000`), `no-new-privileges:true` |
| **Resource Budget** | `mem_limit: 512m`, `cpus: 1.0`, JSON log rotation (`20m` x `3`) |
| **Network Boundary** | Attached exclusively to internal `livepilot-infra` Docker network; loopback host mapping `127.0.0.1:8084:8084` for internal cluster access |
| **Runtime Target (Primary)** | DigitalOcean Ubuntu 24.04 LTS Droplet (`nyc3` / `sgp1`) via [docker-compose.yml](../../../infra/docker-compose.yml) |
| **App Platform Compatibility** | If promoted to DigitalOcean App Platform, deploy strictly as an **Internal Worker / Private Service** with HTTP probes targeting `127.0.0.1:8084` (`/healthz`, `/readyz`), VPC private routing to Managed PostgreSQL & NATS, and zero direct public internet ingress |
| **SPOF Disclosure** | Per [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md), the current single-Droplet pilot deployment is an explicitly accepted interim topology and remains a single point of failure until scaled to ≥ 2 Droplets or Kubernetes (DOKS) |

### Private Dependency Boundaries
- **PostgreSQL 16 (`postgres:5432`):** Connected over internal `livepilot-infra` network (`127.0.0.1:5432` loopback-only on Droplet host). Owns `margin_policies`, `margin_verdicts`, `margin_outbox`, `margin_inbox`, and `margin_idempotency` with forced Row-Level Security (`app.tenant_id`).
- **NATS JetStream 2.10 (`nats:4222`):** Connected over internal `livepilot-infra` network (`127.0.0.1:4222` loopback-only on host). Subscribes on `livepilot.v1.margin.evaluation.request` and emits verdicts to `livepilot.v1.margin.verdict.recorded` (DLQ: `livepilot.v1.margin.verdict.recorded.dlq`).
- **Ingress Isolation:** Zero public internet ingress. All incoming traffic is routed via internal microservices mesh and NATS JetStream event bus.

---

## 2. Environment Variables & Secrets Handling

- **Zero Secrets in Git:** No credentials, private keys, or tokens may be committed in version control.
- **Host Secret Storage:** On the DigitalOcean Droplet, runtime environment files are stored outside Git at `/opt/live-pilot-os/infra/.env` owned by `root:root` with permissions `chmod 600`.
- **Simulated Mode Guard:** When `MARGIN_EXECUTION_MODE=SIMULATED`, `/readyz` visibly reports `mode: SIMULATED` and runs against in-memory ACID fallback tables if PostgreSQL or NATS are offline or during staging initialization.

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enforces production runtime optimizations |
| `PORT` | Yes | `8084` | Internal HTTP health/readiness probe port |
| `HOST` | Yes | `0.0.0.0` | Container-internal interface bind |
| `APP_ENV` | Yes | `prod` | Environment discriminator (`local` \| `staging` \| `prod`) |
| `MARGIN_EXECUTION_MODE` | Yes | `SIMULATED` | Margin execution mode (`SIMULATED` \| `PRODUCTION`) |
| `DATABASE_URL` | Yes (Secret) | `postgres://livepilot:<secret>@postgres:5432/livepilot?sslmode=disable` | Authoritative PostgreSQL connection string |
| `NATS_URL` | Yes | `nats://nats:4222` | Private NATS JetStream endpoint |
| `NATS_TOKEN` | Yes (Secret) | `<32+-char-random-token>` | NATS JetStream authentication token |
| `LOG_LEVEL` | No | `info` | Structured JSON stdout logging verbosity |

---

## 3. Healthcheck (`/healthz`) and Readiness (`/readyz`)

`margin-policy-service` provides deterministic zero-dependency HTTP endpoints:

1. **Liveness Probe (`GET /healthz`, alias `/health`):**
   - Used by Docker `HEALTHCHECK` (`interval=10s`, `timeout=3s`, `start-period=5s`, `retries=3`).
   - Returns HTTP `200 OK` with JSON:
     ```json
     {
       "status": "ok",
       "service": "margin-policy-service"
     }
     ```

2. **Readiness Probe (`GET /readyz`, alias `/ready`):**
   - Verifies active TCP connectivity to PostgreSQL (`5432`) and NATS JetStream (`4222`).
   - Returns HTTP `200 OK` when healthy:
     ```json
     {
       "status": "ready",
       "service": "margin-policy-service",
       "environment": "prod",
       "node_env": "production",
       "mode": "PRODUCTION",
       "dependencies": {
         "database": { "ok": true },
         "nats": { "ok": true }
       }
     }
     ```
   - Returns HTTP `503 Service Unavailable` with `status: "degraded"` if any required dependency fails to connect.

---

## 4. DigitalOcean Droplet Deployment Steps

### Step 1: Pre-Flight Invariant Checks
Execute on host before triggering build:
```bash
# Verify Docker and Compose are operational
docker --version && docker compose version

# Verify required core infra services are healthy
docker compose -f infra/docker-compose.yml ps postgres nats
```

### Step 2: Build Multi-Stage Container Image
```bash
docker compose -f infra/docker-compose.yml build margin-policy-service
```

### Step 3: Database Migration Verification
Ensure migration `001_create_margin_tables.up.sql` has executed against PostgreSQL:
```bash
docker compose -f infra/docker-compose.yml exec postgres psql -U livepilot -d livepilot -c "\dt margin_*"
```

### Step 4: Up Service with Health Waiting
```bash
docker compose -f infra/docker-compose.yml up -d margin-policy-service
```

### Step 5: Verification of Health and Readiness
```bash
# Verify container is healthy
docker compose -f infra/docker-compose.yml ps margin-policy-service

# Query HTTP health endpoint
curl -s http://127.0.0.1:8084/healthz | jq .

# Query HTTP readiness endpoint
curl -s http://127.0.0.1:8084/readyz | jq .
```

---

## 5. Rollback Procedure

If `margin-policy-service` fails health checks or reports degraded readiness post-deployment:

1. **Immediate Service Isolation:**
   ```bash
   docker compose -f infra/docker-compose.yml stop margin-policy-service
   ```
2. **Revert to Previous Known-Good Container Tag:**
   ```bash
   docker tag livepilot/margin-policy-service:previous livepilot/margin-policy-service:latest
   docker compose -f infra/docker-compose.yml up -d margin-policy-service
   ```
3. **Database Schema Rollback (if required):**
   If database schema changes caused failure:
   ```bash
   docker compose -f infra/docker-compose.yml exec -T postgres psql -U livepilot -d livepilot < code/services/margin-policy-service/migrations/001_create_margin_tables.down.sql
   ```
4. **Post-Rollback Audit:**
   Check logs for DLQ records and unexpected restarts:
   ```bash
   docker compose -f infra/docker-compose.yml logs --tail 200 margin-policy-service
   ```
