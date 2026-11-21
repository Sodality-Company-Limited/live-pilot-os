---
goal_contract:
  id: G-INVT-008
  version: 2
  kind: chore
  status: done
  profiles: [core, deployment, sre]
  atomicity:
    outcome_count: 1
    primary_outcome: "Production Dockerfile, docker-compose configuration, and DigitalOcean release runbook with smoke verification."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [production container runtime, droplet deployment, and health probe verification]}
  reversibility: {level: reversible}
  external_dependencies: [G-INVT-007]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-INVT-008: Package and deploy Inventory service to DigitalOcean

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** chore  
**Atomic outcome:** Production Dockerfile, docker-compose configuration, and DigitalOcean release runbook with smoke verification.  
**Epic:** INVT  
**Depends on:** G-INVT-007  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build production Docker image, configure Docker Compose, and verify health probes | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-INVT-008; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Inventory service must run as an isolated container in the DigitalOcean Droplet runtime topology, connecting to PostgreSQL and NATS cluster with health endpoints.

## Intent
**Why:** Deliver a production-ready, independently deployable Inventory service container to DigitalOcean.  
**Done when:** Container builds cleanly with multi-stage non-root user, connects to runtime network, and /healthz endpoint passes smoke test.  
**Unblocks:** Production live deployment

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/inventory-service/Dockerfile`
- `code/services/inventory-service/package.json`
- `infra/docker-compose.yml` inventory-service entry
- `docs/03-architecture/deployment/inventory-release-runbook.md`
- `docs/03-architecture/specs/goals/G-INVT-008/`

## Out
- Marketplace third-party API adapter implementation

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-004, REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/digitalocean-droplets-sot.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Build production Docker image, configure Docker Compose, and verify health probes
**Allowed files:** `code/services/inventory-service/Dockerfile`, `code/services/inventory-service/package.json`, `infra/docker-compose.yml`, `docs/03-architecture/deployment/inventory-release-runbook.md`, `docs/03-architecture/specs/goals/G-INVT-008/`  
**Actions:**
1. Create multi-stage non-root Dockerfile and configure `/healthz` HTTP and NATS health checks.
2. Add `inventory-service` service definition to `infra/docker-compose.yml` and write DigitalOcean release runbook.
**Verification command:** docker build -t livepilot-inventory-service:latest code/services/inventory-service/ && node scripts/deployment/verify-container-smoke.mjs --service inventory-service  
**Completion gate:** Docker build succeeds, container passes smoke test, and release runbook is approved.  
**Stop condition:** Build failure, root container execution, failing health check, or missing documentation.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| inventory-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Inventory Reservation & Stock Mutation Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation; zero overselling |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Multi-stage Dockerfile runs as unprivileged user with dumb-init.
- [x] Container service definition registered in docker-compose.yml.
- [x] Healthcheck endpoint /healthz responds with HTTP 200 and healthy DB/NATS status.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/inventory-service/Dockerfile`
- `code/services/inventory-service/package.json`
- `infra/docker-compose.yml`
- `docs/03-architecture/deployment/inventory-release-runbook.md`
- `docs/03-architecture/specs/goals/G-INVT-008/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Reservations transition through requested → reserved → committed / released / expired; conflicts fail closed.

### Mathematical & Data Invariants Spec
Exact integer quantities, zero overselling (available_stock >= 0), zero-float money and quantity arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
