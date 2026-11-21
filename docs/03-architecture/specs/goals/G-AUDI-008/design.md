# G-AUDI-008 Pre-Execution Design Specification (Invariant 13)

## 1. Intent & Architectural Rationale

Package and deploy the certified `audit-service` (`G-AUDI-007`) for DigitalOcean Kubernetes runtimes while enforcing Soda OS deployment, security, and process-isolation invariants (`docs/03-architecture/deployment/README.md`, `runtime-topology-sot.md`, `digitalocean-droplets-sot.md`). Because `audit-service` is an internal-only domain service owning PostgreSQL schema `audit` (`audit_records`, `audit_inbox`, `audit_outbox`) and subscribing to NATS JetStream subjects (`livepilot.v1.audit.receipt.append`, `livepilot.v1.audit.receipt.recorded`, `livepilot.v1.audit.receipt.dlq`), its container image and manifests must enforce non-root execution (`node` uid/gid 1000), minimal multi-stage Alpine packaging, PID 1 signal forwarding (`dumb-init`), explicit CPU/memory limits, liveness/readiness probes (`/livez`, `/healthz`, `/readyz`) on port `8080`, and private-network-only exposure (`ClusterIP` in Kubernetes).

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Build a hardened multi-stage `code/services/audit-service/Dockerfile` using `node:22-alpine` that validates SQL migrations (`scripts/verify-migrations.mjs`) during build, emits a deterministic runtime HTTP health/readiness entrypoint (`dist/runtime.mjs`), installs `dumb-init`, and executes strictly as non-root `USER node`.
  - Provide `code/services/audit-service/.dockerignore` excluding tests, local artifacts, secrets (`.env*`), VCS metadata, and build caches from the Docker build context.
  - Define `infra/k8s/audit-service.yaml` containing a Kubernetes `Deployment` (`replicas: 2`, `RollingUpdate`, `NATS_URL` and `DATABASE_URL` secret references, CPU `250m`/`1000m`, Memory `256Mi`/`512Mi`, `/livez` liveness and `/readyz` readiness probes on port `8080`) and a `ClusterIP` `Service` on port `8080`.
- **Non-Goals / Anti-Goals:**
  - Provisioning live DigitalOcean Kubernetes clusters, Terraform state, or external DNS records (covered by infrastructure provisioning).
  - Exposing `audit-service` directly to the public internet (`0.0.0.0` host port binding or Kubernetes `LoadBalancer`/`NodePort`).
  - Running containers as `root`, embedding hardcoded credentials/secrets, or using `|| true` fallbacks in build steps.

## 3. Approaches Considered & Rejected Alternatives

1. **Single-Stage Node Dockerfile Running as Root (Rejected):** Leaves build/verification artifacts in the runtime layer and violates non-root execution and least-privilege container security invariants.
2. **Host-Published Public Port Mapping (Rejected):** Violates `runtime-topology-sot.md` and `audit-service` architecture invariants forbidding direct public exposure of internal immutable ledger services.
3. **Multi-Stage `node:22-alpine` Image + Private `ClusterIP` K8s Manifests (Selected):** Produces a minimal Alpine image running as `node`, validates migrations at build time without `|| true` masking, uses `dumb-init` for clean `SIGTERM`/`SIGINT` draining, and restricts ingress strictly to internal cluster networks.

## 4. Selected Approach & Trade-off Analysis

- **Container Runtime (`Dockerfile`):** Stage 1 (`builder`) copies `package.json`, `tsconfig.json`, `src/`, `migrations/`, and `scripts/`, runs `node scripts/verify-migrations.mjs` (fail-closed), generates `dist/runtime.mjs` importing the real `audit-service` TypeScript modules and serving `/healthz`, `/livez`, and `/readyz` (checking migration presence and live TCP reachability to PostgreSQL and NATS), and verifies syntax with `node --check`. Stage 2 (`runner`) installs `dumb-init`, copies only runtime files with `--chown=node:node`, switches to `USER node`, exposes `8080`, and configures `HEALTHCHECK` against `http://127.0.0.1:8080/healthz`.
- **Kubernetes Topology (`infra/k8s/audit-service.yaml`):** Uses 2 replicas with `RollingUpdate` (`maxUnavailable: 0`, `maxSurge: 1`) for zero-downtime rollouts, drops all Linux capabilities with `readOnlyRootFilesystem: true`, injects `DATABASE_URL` and `NATS_URL` via `secretKeyRef`, enforces CPU (`250m`/`1000m`) and memory (`256Mi`/`512Mi`) bounds, and attaches `ClusterIP` service routing on port `8080`.

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly within the declared `G-AUDI-008` touch map:
- `code/services/audit-service/Dockerfile`
- `code/services/audit-service/.dockerignore`
- `infra/k8s/audit-service.yaml`
- `docs/03-architecture/specs/goals/G-AUDI-008/design.md`
- `docs/07-backlog/goals/G-AUDI-008.md`

## 6. Acceptance Test & TDD Verification Strategy

1. **YAML & Kubernetes Schema Validation:**
   - Parse `infra/k8s/audit-service.yaml` to verify zero syntax errors.
   - Validate Kubernetes manifests via `kubectl apply --dry-run=client -f infra/k8s/audit-service.yaml`.
2. **Container & Runtime Entrypoint Syntax Validation:**
   - Verify `Dockerfile` and `.dockerignore` invariants (multi-stage `node:22-alpine`, `USER node`, `EXPOSE 8080`, `HEALTHCHECK`, zero `|| true`, zero hardcoded secrets).
   - Run `node code/services/audit-service/scripts/verify-migrations.mjs` and unit/integration tests to confirm zero regression in the service.
3. **Goal Conformance Gate:**
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-008.md`.

## 7. Operational & Rollback Considerations

- **Rollout Strategy:** Rolling updates with zero unavailable pods (`maxUnavailable: 0`, `maxSurge: 1`) ensure uninterrupted audit receipt recording.
- **Rollback Mechanism:** Standard Kubernetes deployment rollback (`kubectl rollout undo deployment/audit-service`) is fully supported since schema migrations are backwards-compatible and additive.
- **Observability:** Health and readiness endpoints report TCP dependency health for PostgreSQL and NATS JetStream, with structured JSON logging on startup and termination.
