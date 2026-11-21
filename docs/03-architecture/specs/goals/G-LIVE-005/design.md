# G-LIVE-005 Design: Deploy Verified Live-Session Service to DigitalOcean

## Intent & Architectural Rationale

The objective of **G-LIVE-005** is to build, verify, and document the production deployment artifacts, operational runbooks, and health verification suite for deploying the verified `session-service` to a DigitalOcean Droplet runtime.

The `session-service` is the authoritative owner and writer for the live session aggregate root in LivePilot OS. Following the system architecture ([overview.md](../../overview.md)), the DigitalOcean Droplets SOT ([digitalocean-droplets-sot.md](../../deployment/digitalocean-droplets-sot.md)), the Migration and Rollback Safety SOT ([migration-rollback-sot.md](../../deployment/migration-rollback-sot.md)), and the Service Runtime Mapping SOT ([service-runtime-mapping-sot.md](../../deployment/service-runtime-mapping-sot.md)), this design specification formalizes:

1. **Multi-Stage Container Packaging & Security Invariants**:
   - Pinned Node base images (`node:22-alpine`) across builder and runner stages.
   - Non-root user execution (`USER node`, uid=1000, gid=1000).
   - Process supervision using `dumb-init` for proper PID 1 signal forwarding (`SIGTERM`/`SIGINT`).
   - Clean runtime filesystem containing only production dependencies (`npm ci --omit=dev`), compiled `dist/`, and migration SQL files. Zero secrets or devDependencies embedded.
2. **DigitalOcean Droplet Compose Topology**:
   - Explicit service configuration in `code/services/session-service/deploy/docker-compose.session-service.yml`.
   - CPU and memory ceilings (`cpus: 1.0`, `mem_limit: 512m`) preventing noisy-neighbor degradation on droplet instances.
   - Dedicated port `3004` bound strictly to `127.0.0.1:3004` and the private `livepilot-infra` Docker bridge network, preventing unauthorized public internet ingress.
   - Dependencies on healthy `postgres` and `nats` services.
3. **Operational Release Runbook & Rollback Protocol**:
   - Step-by-step release, migration, health probing, and rollback procedures in `docs/03-architecture/deployment/session-service-release-runbook.md`.
   - Forward-compatible migration execution (`001_session_state.up.sql`) prior to container start.
   - Safe rollback procedure adhering to SOT: immediate container stop, revert to previous tagged image, operator-approved down migration only when strictly necessary.
4. **Automated Static & Topology Verification**:
   - Comprehensive test suite in `code/services/session-service/test/deploymentVerification.test.mjs` executing under `node --test` to guarantee all Dockerfile, Compose, env example, and runbook invariants.

---

## Goals, Non-Goals & Anti-Goals

### Goals
- Deliver production-ready `code/services/session-service/Dockerfile`.
- Deliver `code/services/session-service/deploy/docker-compose.session-service.yml` and `session-service.env.example`.
- Deliver comprehensive release and rollback runbook `docs/03-architecture/deployment/session-service-release-runbook.md`.
- Implement `HealthController` in `code/services/session-service/src/health.controller.ts` providing `/health` and `/healthz` endpoints.
- Provide automated invariant verification in `code/services/session-service/test/deploymentVerification.test.mjs`.

### Non-Goals
- Deploying to a live remote DigitalOcean cloud server within this local build goal (this goal produces verified deployment artifacts and local verification).
- Altering the underlying `session-service` FSM or business logic established in G-LIVE-003 and G-LIVE-004.
- Exposing session-service ports to the public internet (`0.0.0.0`).

### Anti-Goals
- Running Docker containers as `root`.
- Embedding hardcoded secrets or environment credentials in images or compose files.
- Running unbuffered Node processes as PID 1 without init signal handling (`dumb-init`).
- Allowing automatic destructive database rollback (`.down.sql`) without explicit human operator authorization.

---

## Approaches Considered & Rejected Alternatives

1. **Single-Stage Alpine Dockerfile**:
   - *Trade-off*: Simpler Dockerfile, but leaves TypeScript compiler, build caches, devDependencies, and source code in the production image, increasing image size and vulnerability surface.
   - *Decision*: Rejected. Multi-stage build is strictly required to enforce least privilege and minimal attack surface.

2. **Direct Process Execution (No dumb-init)**:
   - *Trade-off*: Removes one package install, but Node.js does not handle PID 1 signal forwarding properly, causing zombie processes and ungraceful timeouts on `docker stop`.
   - *Decision*: Rejected. `dumb-init` is installed and declared as ENTRYPOINT.

3. **Exposing Container to Public Gateway Port 3000**:
   - *Trade-off*: Convenient, but port 3000 is reserved for `identity-session-service` and KrakenD edge gateway routing.
   - *Decision*: Rejected. Allocated dedicated port `3004` bound strictly to `127.0.0.1:3004` and internal network `livepilot-infra`.

---

## Selected Approach & Trade-off Analysis

Adopt a multi-stage Alpine build using `node:22-alpine`, non-root `node` user, `dumb-init` entrypoint, dedicated port `3004`, and isolated Docker Compose topology attached to `livepilot-infra`.
- **Trade-off**: Requires running migrations as a discrete step before container launch and requires explicit environment variable configuration, but guarantees 100% adherence to `digitalocean-droplets-sot.md` and `migration-rollback-sot.md`.
- **Security & Redaction**: Container binds strictly to `127.0.0.1`, communicates over private Docker network, and contains zero embedded credentials.

---

## Bounded Context & Touch Map Invariants

- **Bounded Context**: `session-service` deployment and operational infrastructure.
- **Service Boundary**:
  - Container: `livepilot-session-service`
  - Internal Port: `3004`
  - Network: `livepilot-infra`
- **Touch Map**:
  - `code/services/session-service/Dockerfile`
  - `code/services/session-service/deploy/`
  - `code/services/session-service/src/health.controller.ts`
  - `code/services/session-service/src/app.module.ts`
  - `code/services/session-service/test/deploymentVerification.test.mjs`
  - `docs/03-architecture/deployment/session-service-release-runbook.md`
  - `docs/03-architecture/specs/goals/G-LIVE-005/design.md`
  - `docs/07-backlog/goals/G-LIVE-005.md`

---

## Acceptance Test & TDD Verification Strategy

The deployment verification test suite `code/services/session-service/test/deploymentVerification.test.mjs` executes under `node --test` as part of `npm run test` in `code/services/session-service`:
1. **Dockerfile Invariants**: Validates multi-stage build, unprivileged `USER node`, `dumb-init` entrypoint, compiled `dist/main.js` CMD, healthcheck probe on port 3004, and zero hardcoded passwords or tokens.
2. **Docker Compose Invariants**: Validates container name `livepilot-session-service`, resource limits (`mem_limit: 512m`, `cpus: 1.0`), restart policy `unless-stopped`, private host binding `127.0.0.1:3004`, and healthcheck dependencies (`postgres`, `nats`).
3. **Environment Completeness**: Validates required variables in `.env.session-service.example` (`NODE_ENV`, `PORT`, `DATABASE_URL`, `NATS_URL`, `NATS_TOKEN`).
4. **Runbook SOT Adherence**: Validates presence of deployment, migration, health verification, and rollback sections citing `digitalocean-droplets-sot.md` and `migration-rollback-sot.md`.
5. **Health Controller Invariant**: Validates NestJS `@Controller()` implementing `/health` and `/healthz` returning status `healthy`.
