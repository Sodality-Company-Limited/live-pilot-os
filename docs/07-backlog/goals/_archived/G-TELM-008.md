---
goal_contract:
  id: G-TELM-008
  version: 2
  kind: chore
  status: done
  profiles: [core, deployment, sre]
  atomicity:
    outcome_count: 1
    primary_outcome: "Production Dockerfile, Kubernetes manifests, and CI/CD deployment configuration for telemetry-service."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [production deployment, health probes, and cluster rollout]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-TELM-008: Deploy Telemetry service to DigitalOcean
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** chore  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Production Dockerfile, Kubernetes manifests, and CI/CD deployment configuration for telemetry-service.  
**Epic:** TELM  
**Depends on:** G-TELM-007  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Construct hardened Dockerfile, Kubernetes manifests, and verify rollout against DigitalOcean | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-TELM-008; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
The certified telemetry-service requires containerization, health probes, and Kubernetes manifests for DigitalOcean cluster deployment.

## Intent
**Why:** Deliver verified Docker container build and DigitalOcean Kubernetes deployment configuration for telemetry-service.  
**Done when:** Container image builds cleanly, health probes `/healthz` and `/livez` respond 200 OK, and staging deployment succeeds.  
**Unblocks:** Epic TELM completion

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/telemetry-service/Dockerfile`
- `code/services/telemetry-service/.dockerignore`
- `infra/k8s/telemetry-service.yaml`
- `infra/docker-compose.yml`
- Health probe endpoints and resource limits
- `docs/03-architecture/specs/goals/G-TELM-008/design.md`

## Out
- Core cluster VPC provisioning
- External DNS nameserver migrations

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Construct hardened Dockerfile, Kubernetes manifests, and verify rollout against DigitalOcean
**Allowed files:** `code/services/telemetry-service/Dockerfile`, `code/services/telemetry-service/.dockerignore`, `infra/k8s/telemetry-service.yaml`, `infra/docker-compose.yml`, `docs/07-backlog/goals/G-TELM-008.md`, `docs/03-architecture/specs/goals/G-TELM-008/design.md`  
**Actions:**
1. Create multi-stage production Dockerfile (`node:22-alpine`) executing as non-root `node` user with `dumb-init` and `.dockerignore`.
2. Author Kubernetes Deployment and Service manifests (`infra/k8s/telemetry-service.yaml`) with liveness/readiness probes on port 8080, CPU/memory limits, and `NATS_URL`/`DATABASE_URL` secret bindings, plus `infra/docker-compose.yml` service entry.
**Verification command:** `kubectl apply --dry-run=client -f infra/k8s/telemetry-service.yaml && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-008.md`  
**Completion gate:** Multi-stage Dockerfile enforces non-root `node` execution with `/healthz`/`/livez`/`/readyz` probes, YAML manifests and Compose configuration validate cleanly, and goal conformance passes with 0 deviations.  
**Stop condition:** Root execution in container, unpinned base images, missing health probes, `|| true` build fallbacks, or manifest syntax errors.  
**Zero-Mock invariant check:** Production multi-stage Dockerfile (`node:22-alpine`), `.dockerignore`, Kubernetes Deployment/Service manifests (`infra/k8s/telemetry-service.yaml`), and `infra/docker-compose.yml` service definition execute real runtime health/readiness probes and migration verification with zero stubs, zero mocks, zero `|| true` fallbacks, and zero hardcoded secrets.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| telemetry-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Telemetry Signal Observation Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Dockerfile builds minimal, hardened container image running as unprivileged user.
- [x] Kubernetes deployment includes liveness probe, readiness probe, and strict CPU/memory limits.
- [x] Dry-run deployment and configuration validation pass without warnings or errors.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/telemetry-service/Dockerfile`
- `code/services/telemetry-service/.dockerignore`
- `infra/k8s/telemetry-service.yaml`
- `infra/docker-compose.yml`
- `docs/07-backlog/goals/G-TELM-008.md`
- `docs/03-architecture/specs/goals/G-TELM-008/design.md`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
