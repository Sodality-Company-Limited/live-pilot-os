# Worker Briefing: G-JEVC-009

## Task Objective
Prepare `jev-copilot-service` for deployment to DigitalOcean Droplets according to Step 15 (Review และ Commit & Deploy to DO):
1. In `code/services/jev-copilot-service/`:
   - `Dockerfile`: Multi-stage non-root hardened Dockerfile (Node.js 22 LTS alpine/slim), dumb-init, healthcheck (`/livez`, `/readyz`), non-root `appuser`.
   - `package.json`: Service metadata, npm start script, and dependencies.
   - `src/index.mjs`: Server entrypoint with HTTP health server (`/livez`, `/readyz`), graceful shutdown (SIGTERM/SIGINT), NATS subscriber startup, and database connection validation.
2. In `infra/`:
   - `docker-compose.yml`: Register `jev-copilot-service` container with resource limits (CPU 1.0, RAM 512M), healthchecks, restart policy, and environment variables referencing `.env`.
   - `jev-copilot-smoke.sh`: Executable smoke test script validating container health, migration status, and HTTP/NATS connectivity on DigitalOcean droplet.
3. In `docs/03-architecture/deployment/`:
   - `jev-copilot-service-release-runbook.md`: Canonical step-by-step release runbook for DigitalOcean (Prerequisites, Droplet sizing, Environment config, Database migration up/down, Blue/green deployment, Rollback plan, and Monitoring golden signals).
4. In `docs/07-backlog/evidence/`:
   - `G-JEVC-009-do-readiness-evidence.json`: Audit evidence record capturing Dockerfile SHA, health probes, and migration receipts.
5. Populate `docs/03-architecture/specs/goals/G-JEVC-009/` specs.

## Acceptance Criteria
- [ ] Multi-stage non-root Dockerfile created.
- [ ] DigitalOcean deployment runbook & smoke script created.
- [ ] All 4 SOT checks pass green.
