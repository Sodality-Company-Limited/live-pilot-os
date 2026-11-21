---
goal_contract:
  id: G-AUDI-008
  version: 2
  kind: chore
  status: done
  profiles: [core, deployment]
  atomicity:
    outcome_count: 1
    primary_outcome: "Production Dockerfile, Kubernetes manifests, and CI/CD deployment configuration for audit-service."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [production deployment, health probes, and cluster rollout]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-AUDI-008: Deploy Audit service to DigitalOcean
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** chore  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Production Dockerfile, Kubernetes manifests, and CI/CD deployment configuration for audit-service.  
**Epic:** AUDI  
**Depends on:** G-AUDI-007  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Construct hardened Dockerfile, Kubernetes manifests, and verify rollout against DigitalOcean | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-AUDI-008; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
The certified audit-service requires containerization, health probes, and Kubernetes manifests for DigitalOcean cluster deployment.

## Intent
**Why:** Deliver verified Docker container build and DigitalOcean Kubernetes deployment configuration for audit-service.  
**Done when:** Container image builds cleanly, health probes `/healthz` and `/livez` respond 200 OK, and staging deployment succeeds.  
**Unblocks:** Epic AUDI completion

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/audit-service/Dockerfile`
- `code/services/audit-service/.dockerignore`
- `infra/k8s/audit-service.yaml`
- `docs/03-architecture/specs/goals/G-AUDI-008/`
- `docs/07-backlog/goals/G-AUDI-008.md`

## Out
- Other microservices deployment configurations

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
**Allowed files:** `code/services/audit-service/Dockerfile`, `code/services/audit-service/.dockerignore`, `infra/k8s/audit-service.yaml`, `docs/03-architecture/specs/goals/G-AUDI-008/`, `docs/07-backlog/goals/G-AUDI-008.md`  
**Actions:**
1. Create multi-stage hardened Dockerfile running as non-root user with minimal footprint.
2. Create Kubernetes deployment and service manifests with explicit liveness/readiness probes and securityContext.
**Verification command:** kubectl apply --dry-run=client -f infra/k8s/audit-service.yaml && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-008.md  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.  
**Completion gate:** Dockerfile and manifests pass static validation, and k8s manifests validate cleanly via kubectl dry-run.  
**Stop condition:** Container build failure, root execution detected, or invalid k8s manifest syntax.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| audit-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Execution Audit & Immutable Decision Ledger Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Container runs as unprivileged user and includes health check probes.
- [x] Deployment manifests specify strict resource requests, limits, and zero-downtime rolling updates.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/audit-service/Dockerfile`
- `code/services/audit-service/.dockerignore`
- `infra/k8s/audit-service.yaml`
- `docs/03-architecture/specs/goals/G-AUDI-008/`
- `docs/07-backlog/goals/G-AUDI-008.md`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → redacted → hashed → committed; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
