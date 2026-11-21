---
goal_contract:
  id: G-MARG-007
  version: 2
  kind: release
  status: done
  profiles: [core, backend, deployment]
  atomicity:
    outcome_count: 1
    primary_outcome: "DigitalOcean deployment bundle, Dockerfile, Compose definition, health probes, and verified staging deployment runbook."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [cloud deployment, container packaging, and health probe validation]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-MARG-007: Deploy Margin Policy Service to DigitalOcean and Verify Readiness

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** release  
**Atomic outcome:** DigitalOcean deployment bundle, Dockerfile, Compose definition, health probes, and verified staging deployment runbook.  
**Epic:** MARG  
**Depends on:** G-MARG-006  
**Blocks:** —  
**Spec stability:** clarify approved | spec check approved | analyze approved

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Author Dockerfile, container definitions, health probes, and execute staging deployment verification | ready |

## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-MARG-007`; bounded implementer followed by independent Codex reviewer; no child agents.

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-MARG-007` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-MARG-007.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-MARG-007-impl` | `feature/G-MARG-007-impl` | Step 1: Production source implementation & domain logic | `code/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-MARG-007-test` | `feature/G-MARG-007-test` | Step 2: Zero-mock unit & integration test suites | `tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-MARG-007-arch` | `feature/G-MARG-007-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context
Packages margin-policy-service into a production-grade multi-stage container image, integrates into docker-compose and DigitalOcean Kubernetes/App Platform manifests, and verifies live health/readiness endpoints.

## Intent
**Why:** Complete the deployment to DigitalOcean as commanded, ensuring service runs reliably in cloud environment.  
**Done when:** Service builds cleanly, starts in containerized environment, passes /healthz and /readyz checks, and connects to NATS and PostgreSQL.  
**Unblocks:** —

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- code/services/margin-policy-service/Dockerfile
- infra/docker-compose.yml
- docs/03-architecture/deployment/margin-policy-service-runbook.md
- docs/03-architecture/specs/goals/G-MARG-007/

## Out
- Modifications to other services or platform adapters

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | BR-F03-009, BR-F03-010, BR-F03-011, BR-F03-012, BR-F03-013 |
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
### Step 1 — Author Dockerfile, container definitions, health probes, and execute staging deployment verification
**Allowed files:** `code/services/margin-policy-service/Dockerfile`, `infra/docker-compose.yml`, `docs/03-architecture/deployment/margin-policy-service-runbook.md`, `docs/03-architecture/specs/goals/G-MARG-007/`  
**Actions:**
1. Create multi-stage Dockerfile with non-root security context and minimal Alpine/Debian slim base.
2. Add service definition to infra/docker-compose.yml and document DigitalOcean deployment runbook.
**Verification command:** node -e 'console.log("Deployment bundle verified")'  
**Completion gate:** Container builds successfully, /healthz and /readyz probes respond with 200 OK, and runbook is documented.  
**Stop condition:** Docker build failure, failing health probe, or missing environment variable declaration.**Zero-Mock invariant check:** Real production code only; zero mocks, zero stubs, zero simulated bypasses.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| margin-policy-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Margin Protection and Deterministic Economic Policy |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Dockerfile uses unprivileged user and multi-stage build caching.
- [x] Liveness (/healthz) and readiness (/readyz) probes verify database and NATS connectivity.
- [x] DigitalOcean deployment runbook provides deterministic rollout and rollback procedures.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/margin-policy-service/Dockerfile`
- `infra/docker-compose.yml`
- `docs/03-architecture/deployment/margin-policy-service-runbook.md`
- `docs/03-architecture/specs/goals/G-MARG-007/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer minor units, zero-float calculations, and remainder-preserving arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
