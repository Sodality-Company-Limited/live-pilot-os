---
goal_contract:
  id: G-APPR-007
  version: 2
  kind: release
  status: planned
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "DigitalOcean deployment bundle, multi-stage Dockerfile, systemd/k8s manifests, health probes, and rollback runbook."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [production packaging, deployment configuration, operational health]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: planned, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased}
---
# G-APPR-007: Package Approval & Control service for DigitalOcean deployment with health probes and runbook
**Status:** planned  
**Kind:** release  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** DigitalOcean deployment bundle, multi-stage Dockerfile, systemd/k8s manifests, health probes, and rollback runbook.  
**Epic:** APPR  
**Depends on:** G-APPR-006  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:------:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Create container image, deployment manifests, health probes, and deployment runbook | pending |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-APPR-007; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Package approval-control-service into a secure, minimal container image and provide complete deployment scripts and health verification for DigitalOcean.

## Intent
**Why:** Enable repeatable, zero-downtime, and observable production deployment to DigitalOcean droplets/clusters.  
**Done when:** Docker image builds cleanly, health probes respond correctly, and smoke test passes in simulated deployment.  
**Unblocks:** Cross-service production enablement

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/approval-control-service/Dockerfile`
- `code/services/approval-control-service/package.json`
- `infra/production/digitalocean-approval-deploy.sh`
- `docs/03-architecture/deployment/approval-control-release-runbook.md`
- `docs/03-architecture/specs/goals/G-APPR-007/`

## Out
- Live production cloud traffic cutover (requires human approval gate)

## Open questions
- [ ] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-013; REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md; docs/03-architecture/deployment/digitalocean-droplets-sot.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Create container image, deployment manifests, health probes, and deployment runbook
**Allowed files:** `code/services/approval-control-service/Dockerfile`, `code/services/approval-control-service/package.json`, `infra/production/digitalocean-approval-deploy.sh`, `docs/03-architecture/deployment/approval-control-release-runbook.md`, `docs/03-architecture/specs/goals/G-APPR-007/`  
**Actions:**
1. Create multi-stage hardened Dockerfile running as non-root user with minimal footprint.
2. Write deployment script, healthcheck endpoints, and operational rollback runbook.
**Verification command:** docker build -t livepilot/approval-control-service:latest -f code/services/approval-control-service/Dockerfile . && bash infra/production/digitalocean-approval-deploy.sh --dry-run  
**Completion gate:** Container builds cleanly and dry-run deployment script passes with zero errors.  
**Stop condition:** Container vulnerability check failure, root execution detected, or missing rollback procedure.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| approval-control-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Approval Control Plane & Emergency Pause Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [ ] Intent is WHAT/WHY only.
- [ ] Touch map is real and bounded.
- [ ] Acceptance criteria and verification command are executable.
- [ ] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [ ] Container runs as unprivileged user and includes liveness/readiness probes.
- [ ] Deployment script supports automated rollback on healthcheck failure.
- [ ] Release runbook provides clear operational procedures for DigitalOcean.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/approval-control-service/Dockerfile`
- `code/services/approval-control-service/package.json`
- `infra/production/digitalocean-approval-deploy.sh`
- `docs/03-architecture/deployment/approval-control-release-runbook.md`
- `docs/03-architecture/specs/goals/G-APPR-007/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Approvals transition through requested → approved | rejected | expired | revoked; emergency pause transitions through active | inactive; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
