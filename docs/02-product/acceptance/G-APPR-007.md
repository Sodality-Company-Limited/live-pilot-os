# Acceptance Contract: G-APPR-007

**Goal:** [G-APPR-007](../../07-backlog/goals/G-APPR-007.md)  
**Title:** Package Approval & Control service for DigitalOcean deployment with health probes and runbook  
**Status:** in_progress  
**Assigned:** `developer`  
**Atomic Outcome:** DigitalOcean deployment bundle, multi-stage Dockerfile, systemd/k8s manifests, health probes, and rollback runbook.

## Given-When-Then Specification

### Scenario 1: Multi-Stage Container Packaging and Health Probes
- **Given** the `approval-control-service` codebase and PostgreSQL migration files are present
- **When** the multi-stage Dockerfile and HTTP health probe server are built and verified
- **Then** container runs as unprivileged non-root user (`nodejs:10001`), incorporates `dumb-init`, exposes port `8086`, and responds HTTP 200 OK to `/healthz` and `/readyz` probes.

### Scenario 2: Automated Deployment Script and Dry-Run Verification
- **Given** the deployment script `infra/production/digitalocean-approval-deploy.sh`
- **When** executed with `--dry-run`
- **Then** it validates preflight invariants, executes migration checks, runs 100% green test passes, and exits with status 0 without mutating production containers.

### Scenario 3: Automated Fail-Closed Rollback
- **Given** a failed deployment or unhealthy container probe
- **When** healthcheck threshold fails
- **Then** the deployment orchestrator automatically triggers rollback to the previous known-good tag (`:previous`), preserving system availability and logging forensic state.

## Traceability Matrix
- **Goal Card:** [`G-APPR-007.md`](../../07-backlog/goals/G-APPR-007.md)
- **Primary Queue:** [queues/APPR.md](../../07-backlog/queues/APPR.md)
- **Touch Map Boundaries:**
  - `code/services/approval-control-service/Dockerfile`
  - `code/services/approval-control-service/package.json`
  - `infra/production/digitalocean-approval-deploy.sh`
  - `docs/03-architecture/deployment/approval-control-release-runbook.md`
  - `docs/03-architecture/specs/goals/G-APPR-007/`
