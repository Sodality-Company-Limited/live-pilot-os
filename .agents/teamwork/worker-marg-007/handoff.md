# Subagent Handoff Payload: worker-marg-007

- **Goal:** `G-MARG-007` (Deploy Margin Policy Service to DigitalOcean and Verify Readiness)
- **Role:** `implementer`
- **Persona:** `Lead Cloud Architect & SRE Specialist`
- **Status:** `COMPLETE`

## Deliverables Summary
1. **HTTP Runtime Server & Health Probes (`code/services/margin-policy-service/src/server.mjs`):**
   - Zero-dependency HTTP server listening on port 8084.
   - `/healthz` (and `/health`) liveness probe returning HTTP 200 OK.
   - `/readyz` (and `/ready`) readiness probe with non-blocking TCP socket connectivity checks to PostgreSQL (`5432`) and NATS (`4222`), with structured degraded payload on failures and SIMULATED mode support.
   - Graceful shutdown listeners for SIGTERM / SIGINT.

2. **Multi-Stage Production Dockerfile (`code/services/margin-policy-service/Dockerfile`):**
   - Stage 1 (`builder`): Installs dependencies, runs test suite to guarantee invariant integrity.
   - Stage 2 (`runner`): Minimal `node:22-alpine` base, unprivileged `node` user (`uid=1000`), port 8084 exposed, container healthcheck configured.

3. **Docker Compose Definition (`infra/docker-compose.yml`):**
   - Container `livepilot-margin-policy` added with memory limit 512m, 1.0 CPU, `no-new-privileges:true`.
   - Bound to `127.0.0.1:8084:8084` on internal `livepilot-infra` network.
   - Configured `depends_on` healthy `postgres` and `nats`.

4. **DigitalOcean Deployment Runbook (`docs/03-architecture/deployment/margin-policy-service-runbook.md`):**
   - Documents runtime topology, secret storage invariants, health probe specs, step-by-step Droplet deployment commands, and rollback procedures.

5. **Verification & Tests (`code/services/margin-policy-service/test/health-probes.test.mjs`):**
   - Comprehensive test suite covering `/healthz`, `/readyz`, TCP probing, degraded fallback, and route matching.

## Verification Evidence
- `node code/services/margin-policy-service/test/health-probes.test.mjs`:
  - 7/7 tests passed (100% green).
- `npm test --prefix code/services/margin-policy-service`:
  - 20/20 tests passed across 16 suites (100% green).
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-007.md`:
  - 100% Conformance Verified (51/51 sections passed).

## Next Actions for Coordinator
- Synthesize worker handoff.
- Run independent Codex code review.
- Advance G-MARG-007 status to done and archive.
