# G-TELM-008 Pre-Execution Design Specification (Invariant 13)

## 1. Intent & Architectural Rationale

Package and deploy the certified `telemetry-service` (`G-TELM-007`) for DigitalOcean Kubernetes and Docker Compose runtimes while enforcing Soda OS deployment, security, and process-isolation invariants (`docs/03-architecture/deployment/README.md`, `runtime-topology-sot.md`, `digitalocean-droplets-sot.md`). Because `telemetry-service` is an internal-only domain service owning PostgreSQL schema `telemetry` (`telemetry_signals`, `telemetry_lineage`, `telemetry_inbox`, `telemetry_outbox`) and subscribing to NATS JetStream subject `livepilot.v1.telemetry.signal.ingest`, its container image and manifests must enforce non-root execution (`node` uid/gid 1000), minimal multi-stage Alpine packaging, PID 1 signal forwarding (`dumb-init`), explicit CPU/memory limits, liveness/readiness probes (`/livez`, `/healthz`, `/readyz`) on port `8080`, and private-network-only exposure (`ClusterIP` in Kubernetes, `expose` on `livepilot` network in Compose).

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Build a hardened multi-stage `code/services/telemetry-service/Dockerfile` using `node:22-alpine` that validates SQL migrations (`scripts/verify-migrations.mjs`) during build, emits a deterministic runtime HTTP health/readiness entrypoint (`dist/runtime.mjs`), installs `dumb-init`, and executes strictly as non-root `USER node`.
  - Provide `code/services/telemetry-service/.dockerignore` excluding tests, local artifacts, secrets (`.env*`), VCS metadata, and build caches from the Docker build context.
  - Define `infra/k8s/telemetry-service.yaml` containing a Kubernetes `Deployment` (`replicas: 2`, `RollingUpdate`, `NATS_URL` and `DATABASE_URL` secret references, CPU `250m`/`1000m`, Memory `256Mi`/`512Mi`, `/livez` liveness and `/readyz` readiness probes on port `8080`) and a `ClusterIP` `Service` on port `8080`.
  - Register `telemetry-service` in `infra/docker-compose.yml` on the `livepilot` bridge network with `postgres` and `nats` health-checked dependencies, `no-new-privileges:true`, resource ceilings, and `/readyz` healthcheck.
- **Non-Goals / Anti-Goals:**
  - Provisioning live DigitalOcean Kubernetes clusters, Terraform state, or external DNS records (covered by infrastructure provisioning).
  - Exposing `telemetry-service` directly to the public internet (`0.0.0.0` host port binding or Kubernetes `LoadBalancer`/`NodePort`).
  - Running containers as `root`, embedding hardcoded credentials/secrets, or using `|| true` fallbacks in build steps.

## 3. Approaches Considered & Rejected Alternatives

1. **Single-Stage Node Dockerfile Running as Root (Rejected):** Leaves build/verification artifacts in the runtime layer and violates non-root execution and least-privilege container security invariants.
2. **Host-Published Port Mapping (`ports: 8080:8080`) in Docker Compose (Rejected):** Collides with `krakend-edge` on port `8080` and violates `runtime-topology-sot.md` and `telemetry-service.md` (which forbid direct public exposure of internal domain services).
3. **Multi-Stage `node:22-alpine` Image + Private `ClusterIP` K8s Manifests + Internal Compose Service (Selected):** Produces a minimal Alpine image running as `node`, validates migrations at build time without `|| true` masking, uses `dumb-init` for clean `SIGTERM`/`SIGINT` draining, and restricts ingress strictly to internal cluster/bridge networks.

## 4. Selected Approach & Trade-off Analysis

- **Container Runtime (`Dockerfile`):** Stage 1 (`builder`) copies `package.json`, `tsconfig.json`, `src/`, `migrations/`, and `scripts/`, runs `node scripts/verify-migrations.mjs` (fail-closed), generates `dist/runtime.mjs` importing the real `telemetry-service` TypeScript modules and serving `/healthz`, `/livez`, and `/readyz` (checking migration presence and live TCP reachability to PostgreSQL and NATS), and verifies syntax with `node --check`. Stage 2 (`runner`) installs `dumb-init`, copies only runtime files with `--chown=node:node`, switches to `USER node`, exposes `8080`, and configures `HEALTHCHECK` against `http://127.0.0.1:8080/healthz`.
- **Kubernetes Topology (`infra/k8s/telemetry-service.yaml`):** Uses 2 replicas with `RollingUpdate` (`maxUnavailable: 0`, `maxSurge: 1`) for zero-downtime rollouts, drops all Linux capabilities with `readOnlyRootFilesystem: true`, injects `DATABASE_URL` and `NATS_URL` via `secretKeyRef`, enforces CPU (`250m`/`1000m`) and memory (`256Mi`/`512Mi`) bounds, and attaches `ClusterIP` service routing on port `8080`.
- **Docker Compose Integration (`infra/docker-compose.yml`):** Adds `telemetry-service` on network `livepilot` with `expose: ["8080"]`, `depends_on` healthy `postgres` and `nats`, and `/readyz` healthcheck.

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly within the declared `G-TELM-008` touch map:
- `code/services/telemetry-service/Dockerfile`
- `code/services/telemetry-service/.dockerignore`
- `infra/k8s/telemetry-service.yaml`
- `infra/docker-compose.yml`
- `docs/07-backlog/goals/G-TELM-008.md`
- `docs/03-architecture/specs/goals/G-TELM-008/design.md`

## 6. Acceptance Test & TDD Verification Strategy

1. **YAML & Kubernetes Schema Validation:**
   - Parse `infra/k8s/telemetry-service.yaml` and `infra/docker-compose.yml` with YAML parser (`python3` `yaml.safe_load_all`) to verify zero syntax errors.
   - Validate Kubernetes manifests via `kubectl apply --dry-run=client -f infra/k8s/telemetry-service.yaml` (if cluster/client validation is available, or offline schema checks if no API server is reachable).
2. **Container & Runtime Entrypoint Syntax Validation:**
   - Verify `Dockerfile` and `.dockerignore` invariants (multi-stage `node:22-alpine`, `USER node`, `EXPOSE 8080`, `HEALTHCHECK`, zero `|| true`, zero hardcoded secrets).
   - Run `node code/services/telemetry-service/scripts/verify-migrations.mjs` and `node --test code/services/telemetry-service/test/certification/telemetry-certification.spec.ts` to confirm zero regression in the service.
3. **Goal Conformance Gate:**
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-008.md`
