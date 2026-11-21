# Subagent Briefing: G-MARG-007

## Objective
Author the production deployment packaging, HTTP server with health probes, docker-compose service definition, and DigitalOcean deployment runbook for `margin-policy-service`.

## Requirements
1. **HTTP Server & Probes (`code/services/margin-policy-service/src/server.mjs`):**
   - Provide minimal, zero-dependency Node.js HTTP server listening on `PORT` (default 8084).
   - `/healthz` (liveness probe) returns 200 OK with `{"status":"ok","service":"margin-policy-service"}`.
   - `/readyz` (readiness probe) checks database and NATS connection status, returning 200 OK when ready or 503 when degraded.

2. **Multi-Stage Dockerfile (`code/services/margin-policy-service/Dockerfile`):**
   - Stage 1: Build & test stage.
   - Stage 2: Minimal runtime image based on `node:20-alpine`.
   - Security: Non-root user `node`.
   - Expose port 8084.
   - `CMD ["node", "src/server.mjs"]`.

3. **Docker Compose (`infra/docker-compose.yml`):**
   - Add `margin-policy-service` definition:
     - build context: `../code/services/margin-policy-service`
     - container_name: `livepilot-margin-policy`
     - ports: `"8084:8084"`
     - environment: `PORT=8084`, `DATABASE_URL`, `NATS_URL`, `NODE_ENV=production`
     - healthcheck on `/healthz`
     - depends_on: `nats`, `postgres`

4. **DigitalOcean Deployment Runbook (`docs/03-architecture/deployment/margin-policy-service-runbook.md`):**
   - Document DO Droplet / App Platform / Kubernetes deployment steps, environment variables, health verification commands, rollback procedures, and simulated-mode runbook.

5. **Test Probes (`code/services/margin-policy-service/test/health-probes.test.mjs`):**
   - Test `/healthz` and `/readyz` endpoints over HTTP.
