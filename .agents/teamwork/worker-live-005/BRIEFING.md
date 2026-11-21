# BRIEFING: worker-live-005

## Objective
Execute G-LIVE-005:
1. Create production-grade Dockerfile for `code/services/session-service/Dockerfile`:
   - Multi-stage build (build stage with node:20-alpine or node:22-alpine, production runtime stage).
   - Non-root user execution (`USER node`).
   - Pinned dependencies, clean build, healthcheck definition.
2. Create deployment artifacts in `code/services/session-service/deploy/`:
   - `docker-compose.session-service.yml`
   - `.env.session-service.example`
3. Author release runbook:
   - `docs/03-architecture/deployment/session-service-release-runbook.md`
   (target DigitalOcean droplet, port 3004 / NATS binding, health probe `/health`, migration & rollback procedure).
4. Deliver design spec to `docs/03-architecture/specs/goals/G-LIVE-005/design.md`.
5. Write and execute deployment verification test in `code/services/session-service/test/deploymentVerification.test.mjs` verifying Dockerfile invariants, docker-compose configuration, environment variable completeness, and runbook coverage.
6. Advance `docs/07-backlog/goals/G-LIVE-005.md` to `ready` -> `in_progress` -> `done`, check off criteria, and run `node ./cli.js goal close G-LIVE-005`.
7. Write terminal handoff to `.agents/teamwork/worker-live-005/handoff.md`.

## Acceptance Criteria
- [ ] Dockerfile exists, multi-stage, non-root, pinned dependencies.
- [ ] Docker compose & env example configured for DigitalOcean droplet topology.
- [ ] Release runbook and rollback plan documented.
- [ ] Deployment verification test passes 100% green.
- [ ] Goal closed and archived cleanly.
