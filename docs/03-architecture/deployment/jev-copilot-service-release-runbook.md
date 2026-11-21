# LivePilot JEV Copilot Service — DigitalOcean Release & Operations Runbook

> **Goal:** `G-JEVC-009`  
> **Status:** Prepared for review — **Production apply is strictly gated on explicit human approval**  
> **Governing SOTs:** [README.md](README.md), [runtime-topology-sot.md](runtime-topology-sot.md), [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md), [deployment-pipeline-sot.md](deployment-pipeline-sot.md), [migration-rollback-sot.md](migration-rollback-sot.md), [backup-restore-dr-sot.md](backup-restore-dr-sot.md), and [service-runtime-mapping-sot.md](service-runtime-mapping-sot.md).

---

## 1. DigitalOcean Runtime Topology

`jev-copilot-service` is packaged as an immutable, stateless, non-root Node.js 22 Alpine container that provides real-time AI copilot assistance, signal cue parsing, calibrated confidence scoring, suggestion generation, and outbox event streaming to NATS JetStream (`livepilot.v1.copilot.*`).

| Dimension | Specification |
|---|---|
| **Container Name** | `livepilot-jev-copilot-service` |
| **Image Contract** | `livepilot/jev-copilot-service:<git-sha>` (built from [Dockerfile](../../../code/services/jev-copilot-service/Dockerfile)) |
| **Execution Identity** | Unprivileged `node` user (`uid=1000`, `gid=1000`), `no-new-privileges:true`, `dumb-init` init process |
| **Resource Budget** | `mem_limit: 512m`, `cpus: 1.0`, JSON log rotation (`20m` x `3`) |
| **Network Boundary** | Attached exclusively to internal `livepilot-infra` Docker network; loopback host mapping `127.0.0.1:8085:8085` for internal cluster access |
| **Runtime Target (Primary)** | DigitalOcean Ubuntu 24.04 LTS Droplet (`nyc3` / `sgp1`) via [docker-compose.yml](../../../infra/docker-compose.yml) |
| **App Platform Compatibility** | Deployable as an **Internal Worker / Private Service** with HTTP probes targeting `127.0.0.1:8085` (`/healthz`, `/readyz`), VPC private routing to Managed PostgreSQL & NATS, and zero direct public internet ingress |
| **SPOF Disclosure** | Per [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md), the current single-Droplet pilot deployment is an explicitly accepted interim topology and remains a single point of failure until scaled to ≥ 2 Droplets or Kubernetes (DOKS) |

### Private Dependency Boundaries
- **PostgreSQL 16 (`postgres:5432`):** Connected over internal `livepilot-infra` network (`127.0.0.1:5432` loopback-only on Droplet host). Owns `jev_suggestions`, `jev_provider_receipts`, `jev_outbox`, `jev_inbox`, and `jev_idempotency_records` with forced Row-Level Security (`app.tenant_id`).
- **NATS JetStream 2.10 (`nats:4222`):** Connected over internal `livepilot-infra` network (`127.0.0.1:4222` loopback-only on host). Subscribes on signal cues (`livepilot.v1.signal.cue`) and publishes suggestion lifecycle events (`livepilot.v1.copilot.suggestion.*`).
- **LLM Provider API Boundary:** Outbound HTTPS traffic to OpenAI / Google Gemini API endpoints. Egress via host NAT; zero inbound traffic from providers.

---

## 2. Environment Variables & Secrets Handling

- **Zero Secrets in Git:** No credentials, private keys, or API tokens may be committed in version control.
- **Host Secret Storage:** On the DigitalOcean Droplet, runtime environment files are stored outside Git at `/opt/live-pilot-os/infra/.env` owned by `root:root` with permissions `chmod 600`.
- **Simulated Mode Guard:** When `JEV_EXECUTION_MODE=SIMULATED`, `/readyz` visibly reports `mode: SIMULATED` and runs against in-memory fallback state if PostgreSQL or NATS are offline or during staging initialization.

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enforces production runtime optimizations |
| `PORT` | Yes | `8085` | Internal HTTP health/readiness probe port |
| `HOST` | Yes | `0.0.0.0` | Container-internal interface bind |
| `APP_ENV` | Yes | `prod` | Environment discriminator (`local` \| `staging` \| `prod`) |
| `JEV_EXECUTION_MODE` | Yes | `SIMULATED` | Execution mode (`SIMULATED` \| `PRODUCTION`) |
| `DATABASE_URL` | Yes (Secret) | `postgres://livepilot:<secret>@postgres:5432/livepilot?sslmode=disable` | Authoritative PostgreSQL connection string |
| `NATS_URL` | Yes | `nats://nats:4222` | Private NATS JetStream endpoint |
| `NATS_TOKEN` | Yes (Secret) | `<32+-char-random-token>` | NATS JetStream authentication token |
| `AI_PROVIDER` | Yes | `openai` | Inference adapter provider (`openai` \| `gemini`) |
| `OPENAI_API_KEY` | Conditional | `<secret>` | API key when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | No | `gpt-4o` | Model identifier |
| `GEMINI_API_KEY` | Conditional | `<secret>` | API key when `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | No | `gemini-1.5-pro` | Model identifier |
| `LOG_LEVEL` | No | `info` | Structured JSON stdout logging verbosity |

---

## 3. Healthcheck (`/healthz`) and Readiness (`/readyz`) Probes

`jev-copilot-service` provides deterministic zero-dependency HTTP endpoints:

1. **Liveness Probe (`GET /healthz`, alias `/livez`, `/health`):**
   - Used by Docker `HEALTHCHECK` (`interval=10s`, `timeout=3s`, `start-period=5s`, `retries=3`).
   - Returns HTTP `200 OK` with JSON:
     ```json
     {
       "status": "ok",
       "service": "jev-copilot-service",
       "uptime_seconds": 120,
       "timestamp": "2026-11-21T08:50:00.000Z"
     }
     ```

2. **Readiness Probe (`GET /readyz`, alias `/ready`):**
   - Verifies active TCP connectivity to PostgreSQL (`5432`) and NATS JetStream (`4222`).
   - Returns HTTP `200 OK` when healthy:
     ```json
     {
       "status": "ready",
       "service": "jev-copilot-service",
       "environment": "prod",
       "node_env": "production",
       "mode": "PRODUCTION",
       "dependencies": {
         "database": { "ok": true },
         "nats": { "ok": true }
       },
       "timestamp": "2026-11-21T08:50:00.000Z"
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

### Step 2: Database Schema Migration
Per `migration-rollback-sot.md`, apply idempotent SQL migrations before container startup:
```bash
# Apply schema migration forward
docker exec -i livepilot-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} \
  < code/services/jev-copilot-service/migrations/001_create_jev_persistence.sql
```

### Step 3: Build Multi-Stage Container Image
```bash
docker compose -f infra/docker-compose.yml build jev-copilot-service
```

### Step 4: Start Container with Resource Constraints
```bash
docker compose -f infra/docker-compose.yml up -d jev-copilot-service
```

### Step 5: Verification & Smoke Testing
Run the automated smoke test script:
```bash
bash infra/jev-copilot-smoke.sh
```

---

## 5. Rollback Procedure

If `jev-copilot-service` fails health checks or reports degraded readiness post-deployment:

### Immediate Container Rollback
```bash
# Stop degraded container
docker compose -f infra/docker-compose.yml stop jev-copilot-service

# Rollback to previously tagged stable image
docker compose -f infra/docker-compose.yml up -d --no-build jev-copilot-service
```

### Migration Rollback
If schema migration needs reversal, roll back tables:
```bash
docker exec -i livepilot-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "
  DROP TABLE IF EXISTS jev_idempotency_records CASCADE;
  DROP TABLE IF EXISTS jev_inbox CASCADE;
  DROP TABLE IF EXISTS jev_outbox CASCADE;
  DROP TABLE IF EXISTS jev_provider_receipts CASCADE;
  DROP TABLE IF EXISTS jev_suggestions CASCADE;
"
```

---

## 6. Monitoring & SRE Golden Signals

| Signal | Metric / Log Marker | SLA / Target | Action on Breach |
|---|---|---|---|
| **Latency** | Inference completion time | P95 < 2000ms | If latency spikes, degrade gracefully (`INFERENCE_OUTCOMES.FAILED_TIMEOUT`) |
| **Traffic** | NATS cue ingestion rate (`livepilot.v1.signal.cue`) | Nominal: 10-50 cues/min | Scale worker threads or partition sessions across workers |
| **Errors** | HTTP 5xx responses on `/readyz` or provider errors (`LP05001`-`LP05005`) | Error rate < 0.1% | Trigger emergency circuit breaker pause (`PauseGuard`) |
| **Saturation** | Memory usage (`mem_limit: 512m`) & CPU (`cpus: 1.0`) | Memory < 80% (410MB) | Inspect heap retention and recycle container |
