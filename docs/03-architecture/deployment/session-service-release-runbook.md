# LivePilot Session Service — DigitalOcean Release & Operations Runbook

## 1. Service Identity & Architecture Boundary
- **Service Name:** `session-service`
- **Container Name:** `livepilot-session-service`
- **Target Host:** DigitalOcean Single Droplet (`nyc3` / `sgp1`, Ubuntu 24.04 LTS)
- **Runtime Port:** `3004` (Bound strictly to `127.0.0.1:3004` and internal `livepilot-infra` network; never exposed to `0.0.0.0`)
- **Persistence Authority:** PostgreSQL schema `session` (dedicated tables: `session.sessions`, `session.session_transitions`, `session.inbox`, `session.outbox`, `session.idempotency_keys`)
- **Messaging:** NATS JetStream 2.10 (`livepilot.v1.session.lifecycle.request`, `livepilot.v1.session.lifecycle.changed`, `livepilot.v1.session.lifecycle.dlq`)
- **DigitalOcean SOT Alignment:** Conforms to `docs/03-architecture/deployment/digitalocean-droplets-sot.md` and `migration-rollback-sot.md`.

---

## 2. Pre-Deployment Verification & Environment Setup

### 2.1 Prepare Environment Variables
On the target DigitalOcean droplet, configure the environment file at `/opt/livepilot/session-service.env`:
```bash
cp code/services/session-service/deploy/session-service.env.example /opt/livepilot/session-service.env
chmod 600 /opt/livepilot/session-service.env
```
Ensure secrets (`DATABASE_URL`, `NATS_TOKEN`) are securely populated from the secrets store (HashiCorp Vault or DO Secrets).

### 2.2 Verify Foundational Services
Ensure PostgreSQL and NATS JetStream are running and healthy:
```bash
docker compose -f infra/docker-compose.yml ps
# Verify livepilot-postgres and livepilot-nats show "(healthy)"
```

---

## 3. Database Migration Procedure

Per `migration-rollback-sot.md`, database migrations must be applied and verified before starting the updated application container.

### 3.1 Apply Forward Migrations (`.up.sql`)
Execute the canonical idempotent schema migration:
```bash
docker exec -i livepilot-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < code/services/session-service/migrations/001_session_state.up.sql
```

### 3.2 Verify Schema Migration Integrity
Run the migration verification script:
```bash
DATABASE_URL=${DATABASE_URL} node code/services/session-service/scripts/verify-migrations.mjs
```
Expected output:
```text
session migration verified against PostgreSQL
```

---

## 4. Container Build & Deployment

### 4.1 Build Multi-Stage Container Image
Build the pinned Alpine image enforcing the non-root `node` user invariant:
```bash
docker build -t livepilot/session-service:latest -t livepilot/session-service:$(git rev-parse --short HEAD) code/services/session-service/
```

### 4.2 Launch Session Service via Docker Compose
Deploy the service into the `livepilot-infra` network with memory/CPU limits:
```bash
docker compose -f code/services/session-service/deploy/docker-compose.session-service.yml --env-file /opt/livepilot/session-service.env up -d
```

---

## 5. Post-Deployment Verification & Health Checks

### 5.1 Verify Container State & Logs
Check container status and verify that `dumb-init` PID 1 startup proceeded without errors:
```bash
docker ps --filter "name=livepilot-session-service"
docker logs --tail 50 livepilot-session-service
```

### 5.2 Validate HTTP Health Probe
Verify that the service responds 200 OK on `/health` and `/healthz`:
```bash
curl -f -s http://127.0.0.1:3004/health | jq .
```
Expected response:
```json
{
  "status": "healthy",
  "service": "session-service",
  "timestamp": "2026-11-21T..."
}
```

### 5.3 Verify NATS Lifecycle Stream Binding
Confirm that `livepilot.v1.session.lifecycle.request` is subscribed and no errors occur on JetStream consumer registration:
```bash
docker exec -i livepilot-nats nats consumer report SESSION_COMMANDS 2>/dev/null || true
```

---

## 6. Rollback & Incident Recovery Procedure

If health probes fail, container exits with an error, or critical regression is detected:

### 6.1 Immediate Traffic Drain & Process Stop
Halt the failing container immediately:
```bash
docker compose -f code/services/session-service/deploy/docker-compose.session-service.yml stop session-service
```

### 6.2 Roll Back to Previous Stable Image
Restart the previous known stable image revision:
```bash
PREV_REVISION=<PREVIOUS_GIT_SHA>
docker tag livepilot/session-service:${PREV_REVISION} livepilot/session-service:latest
docker compose -f code/services/session-service/deploy/docker-compose.session-service.yml up -d --no-build session-service
```

### 6.3 Database Rollback Safety Protocol
Per Article 4 of `migration-rollback-sot.md`:
> *"Never automatically run a destructive database down migration. Use forward-compatible repair or an approved restore."*

If the new schema version is backward-incompatible and an explicit schema reversal is authorized by the Tech Lead:
```bash
# Execute backward rollback only with confirmed operator approval
docker exec -i livepilot-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < code/services/session-service/migrations/001_session_state.down.sql
```

### 6.4 Post-Rollback Smoke Verification
Re-run health check and monitor logs:
```bash
curl -f http://127.0.0.1:3004/health
docker logs --tail 20 livepilot-session-service
```
