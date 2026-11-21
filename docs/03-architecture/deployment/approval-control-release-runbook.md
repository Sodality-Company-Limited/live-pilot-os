# LivePilot Approval & Control Service — DigitalOcean Release & Operations Runbook

> **Goal:** `G-APPR-007`  
> **Status:** Prepared for review — **Production apply is strictly gated on explicit human approval**  
> **Governing SOTs:** [README.md](README.md), [runtime-topology-sot.md](runtime-topology-sot.md), [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md), [deployment-pipeline-sot.md](deployment-pipeline-sot.md), [migration-rollback-sot.md](migration-rollback-sot.md), [backup-restore-dr-sot.md](backup-restore-dr-sot.md), and [service-runtime-mapping-sot.md](service-runtime-mapping-sot.md).

---

## 1. DigitalOcean Runtime Topology

`approval-control-service` is packaged as an immutable, hardened, non-root Node.js 22 Alpine container executing deterministic approval request validations, optimistic locking on decision states, authority role/capability assertions, Separation of Duty (SoD) enforcement, and fail-closed emergency pause circuit breakers across the LivePilot ecosystem.

| Dimension | Specification |
|---|---|
| **Container Name** | `livepilot-approval-control-service` |
| **Image Contract** | `livepilot/approval-control-service:<git-sha>` (built from [Dockerfile](../../../code/services/approval-control-service/Dockerfile)) |
| **Execution Identity** | Unprivileged `nodejs` user (`uid=10001`, `gid=10001`), `no-new-privileges:true`, `dumb-init` signal supervisor |
| **Resource Budget** | `mem_limit: 512m`, `cpus: 1.0`, JSON log rotation (`50m` x `3`) |
| **Network Boundary** | Attached exclusively to internal `livepilot` Docker network; loopback host mapping `127.0.0.1:8086:8086` for internal cluster health & readiness probes |
| **Runtime Target (Primary)** | DigitalOcean Ubuntu 24.04 LTS Droplet (`nyc3` / `sgp1`) via [digitalocean-approval-deploy.sh](../../../infra/production/digitalocean-approval-deploy.sh) |
| **App Platform Compatibility** | If promoted to DigitalOcean App Platform, deploy strictly as an **Internal Worker / Private Service** with HTTP probes targeting `127.0.0.1:8086` (`/healthz`, `/readyz`), VPC private routing to Managed PostgreSQL & NATS, and zero direct public internet ingress |
| **SPOF Disclosure** | Per [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md), the single-Droplet pilot deployment is an explicitly accepted interim topology and remains a single point of failure until scaled to ≥ 2 Droplets or Kubernetes (DOKS) |

### Private Dependency Boundaries
- **PostgreSQL 16 (`postgres:5432`):** Connected over internal `livepilot` network (`127.0.0.1:5432` loopback-only on Droplet host). Owns `approval_requests`, `approval_decisions`, `approval_control_modes`, `emergency_pause_records`, and `approval_idempotency_records` with forced Row-Level Security (`app.tenant_id`).
- **NATS JetStream 2.10 (`nats:4222`):** Connected over internal `livepilot` network (`127.0.0.1:4222` loopback-only on host). Subscribes to command subjects (`livepilot.v1.control.approval.decision.request`, `livepilot.v1.control.mode.update.request`, `livepilot.v1.control.pause.request`) and emits events (`livepilot.v1.control.approval.decision.recorded`, `livepilot.v1.control.mode.updated`, `livepilot.v1.control.emergency_pause.changed`).
- **Ingress Isolation:** Zero public internet ingress (`0.0.0.0`). All external traffic is mediated via KrakenD Gateway and Backend-For-Frontend (BFF) layers.

---

## 2. Environment Variables & Secrets Handling

- **Zero Secrets in Git:** No credentials, private keys, or tokens may be committed to version control.
- **Host Secret Storage:** On the DigitalOcean Droplet, runtime environment files are stored outside Git at `/opt/live-pilot-os/infra/approval-control-service.env` owned by `root:root` with permissions `chmod 600`.
- **Simulated Mode Guard:** When `APPROVAL_EXECUTION_MODE=SIMULATED`, `/readyz` visibly reports `mode: SIMULATED` and allows operation when PostgreSQL or NATS are offline for staging verification. In production, `APPROVAL_EXECUTION_MODE=PRODUCTION` strictly enforces live TCP reachability.

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enforces production runtime optimizations |
| `PORT` | Yes | `8086` | Internal HTTP health/readiness probe port |
| `HOST` | Yes | `0.0.0.0` | Container-internal interface bind |
| `APP_ENV` | Yes | `prod` | Environment discriminator (`local` \| `staging` \| `prod`) |
| `APPROVAL_EXECUTION_MODE` | Yes | `PRODUCTION` | Execution mode (`SIMULATED` \| `PRODUCTION`) |
| `DATABASE_URL` | Yes (Secret) | `postgres://livepilot:<secret>@postgres:5432/livepilot?sslmode=disable` | Authoritative PostgreSQL connection string |
| `NATS_URL` | Yes | `nats://nats:4222` | Private NATS JetStream endpoint |
| `NATS_TOKEN` | Yes (Secret) | `<32+-char-random-token>` | NATS JetStream authentication token |
| `LOG_LEVEL` | No | `info` | Structured JSON stdout logging verbosity |
| `OUTBOX_POLL_INTERVAL_MS` | No | `500` | Polling frequency for transactional outbox dispatch |
| `OUTBOX_BATCH_SIZE` | No | `50` | Maximum messages per outbox batch |

---

## 3. Healthcheck (`/healthz`) and Readiness (`/readyz`) Probes

`approval-control-service` provides deterministic, zero-external-dependency HTTP probes:

1. **Liveness Probe (`GET /healthz`, aliases `/health`, `/livez`):**
   - Used by Docker `HEALTHCHECK` (`interval=10s`, `timeout=3s`, `start-period=5s`, `retries=3`).
   - Returns HTTP `200 OK` with JSON:
     ```json
     {
       "status": "ok",
       "service": "approval-control-service",
       "version": "0.1.0",
       "uptime_seconds": 42,
       "timestamp": "2026-11-21T16:00:00.000Z"
     }
     ```

2. **Readiness Probe (`GET /readyz`, alias `/ready`):**
   - Verifies migration contract existence on disk and live TCP connectivity to PostgreSQL (`5432`) and NATS JetStream (`4222`).
   - Returns HTTP `200 OK` when healthy:
     ```json
     {
       "status": "ready",
       "service": "approval-control-service",
       "environment": "prod",
       "node_env": "production",
       "mode": "PRODUCTION",
       "migration_present": true,
       "dependencies": {
         "database": { "ok": true },
         "nats": { "ok": true }
       },
       "timestamp": "2026-11-21T16:00:00.000Z"
     }
     ```
   - Returns HTTP `503 Service Unavailable` with `status: "degraded"` if any required dependency fails to connect.

---

## 4. DigitalOcean Droplet Deployment Steps

### Step 1: Pre-Flight Invariant Checks
Execute on Droplet host before deploying:
```bash
# Verify Docker runtime
docker --version

# Verify core infra dependencies are running and healthy
docker ps --filter "name=livepilot-postgres" --filter "name=livepilot-nats"
```

### Step 2: Validate Deployment Dry-Run
Run the automated deployment script in dry-run mode:
```bash
bash infra/production/digitalocean-approval-deploy.sh --dry-run
```

### Step 3: Run Live Deployment
```bash
bash infra/production/digitalocean-approval-deploy.sh deploy
```

### Step 4: Verify Post-Deployment Health
```bash
# Query HTTP health endpoint
curl -s http://127.0.0.1:8086/healthz | jq .

# Query HTTP readiness endpoint
curl -s http://127.0.0.1:8086/readyz | jq .

# Check container logs
docker logs --tail 50 livepilot-approval-control-service
```

---

## 5. Rollback & Disaster Recovery Procedures

If `approval-control-service` fails health checks or reports degraded readiness post-deployment:

1. **Automatic Script Rollback:**
   The `digitalocean-approval-deploy.sh` script automatically detects probe failures (15 retries), halts fail-closed, captures container logs, and restores `livepilot/approval-control-service:previous`.

2. **Manual Rollback to Previous Image:**
   ```bash
   # Stop degraded container
   docker stop livepilot-approval-control-service
   docker rm livepilot-approval-control-service

   # Restart with previous known-good tag
   docker run -d \
     --name livepilot-approval-control-service \
     --restart unless-stopped \
     --network livepilot \
     -p 127.0.0.1:8086:8086 \
     livepilot/approval-control-service:previous
   ```

3. **Database Schema Rollback (if schema migration caused failure):**
   ```bash
   docker exec -i livepilot-postgres psql -U livepilot -d livepilot < code/services/approval-control-service/migrations/001_approval_control_persistence.down.sql
   ```

4. **Post-Rollback Audit:**
   Audit NATS JetStream Dead Letter Queues (`*.dlq`) for unhandled messages:
   ```bash
   nats stream view livepilot.v1.control.approval.decision.dlq
   ```
