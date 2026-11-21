# Worker Briefing: G-AUDI-008 Hardened Dockerfile & DigitalOcean Kubernetes Manifests

## Objective
Deliver containerization and DigitalOcean Kubernetes deployment configuration for `audit-service`:
1. `code/services/audit-service/Dockerfile`:
   - Multi-stage production build (`node:22-alpine` builder + runner)
   - Executes non-root `node` user (uid=1000, gid=1000)
   - Installs `dumb-init` for deterministic signal forwarding (SIGTERM / SIGINT)
   - Implements `/healthz`, `/livez`, and `/readyz` probes in runtime bootstrapper
   - Fails closed on missing migrations or broken dependencies
2. `code/services/audit-service/.dockerignore`:
   - Excludes `.git`, `node_modules`, `test`, `coverage`, and `.DS_Store`
3. `infra/k8s/audit-service.yaml`:
   - Kubernetes Deployment with 2 replicas, RollingUpdate strategy (maxUnavailable: 0, maxSurge: 1)
   - ClusterIP Service exposing port 8080
   - SecurityContext: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `drop: [ALL]`, `seccompProfile: RuntimeDefault`
   - Resources: requests (250m cpu, 256Mi mem) and limits (1000m cpu, 512Mi mem)
   - Liveness (`/livez`) and readiness (`/readyz`) HTTP probes
   - Environment variables wired to `DATABASE_URL` and `NATS_URL` secret references
4. Author `docs/03-architecture/specs/goals/G-AUDI-008/design.md` satisfying Invariant 13.
5. Update `docs/07-backlog/goals/G-AUDI-008.md` touch map, set status to `done`, check off criteria `[x]`, phase `SHIP`.
