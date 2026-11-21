---
goal_contract:
  id: G-CORE-069
  version: 2
  kind: operations
  status: done
  profiles: [core, backend, sre]
  atomicity:
    outcome_count: 1
    primary_outcome: "one production-shaped intent-risk runtime package"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: critical, reasons: [runtime isolation and deployability]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-068]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-069: Package the Intent/Risk service for DigitalOcean
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** operations  
**Atomic outcome:** A pinned, non-root, health-checked runtime package for `intent-risk-service` on the constrained DigitalOcean target.  
**Epic:** CORE  
**Depends on:** G-CORE-068  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Context
The deployment SOT says the current Compose stack contains only PostgreSQL, Redis, and NATS; application runtime is pending. This goal adds only the service runtime package and its operational controls.

## Intent
**Why:** Make the completed service deployable without exposing private infrastructure or conflating foundation deployment with application readiness.  
**Done when:** Image/build, non-root, probes, limits, private binding, logs/metrics, graceful shutdown, and rollback references pass static and local runtime checks.  
**Unblocks:** G-CORE-070.

## In
- Service image/build definition, Compose/runtime declaration, health endpoints/probes, resource limits, restart policy, log rotation, config contract, and rollback reference.

## Out
- Droplet provisioning, firewall changes, secret creation, database HA, public gateway/UI, and production apply.

## How
Extend the existing infrastructure conventions and keep `PLATFORM_ADAPTER_MODE=simulated`; no real marketplace mutation.

## Open questions
- [x] [NEEDS CLARIFICATION: Confirm whether the approved pilot uses the existing single Droplet or two-Droplet target before production apply.]

## Knowledge links
| Type | IDs |
|---|---|
| Deployment | `docs/03-architecture/deployment/README.md`; `digitalocean-droplets-sot.md`; `service-runtime-mapping-sot.md` |
| Requirement | REQ-LP-001; REQ-LP-002 |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Runtime | `infra/docker-compose.yml`; `infra/deploy.sh`; `infra/verify-hardening.sh` |
| Quality | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md` |

## Atomicity & Zero-Mock Contract
- **One outcome:** one deployable runtime package.
- **Concrete execution:** build and container checks use the actual image/package.
- **Fail closed:** health/readiness failure prevents release; secrets remain external.

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CORE-069`; no subagents; runtime manifests and tests only.

## Work steps
### Step 1 — add the runtime package
**Allowed files:** `code/**/intent-risk-service/**`, `infra/**intent-risk*`, `infra/**compose*`, `infra/**deploy*`, `docs/03-architecture/specs/goals/G-CORE-069/`  
**Actions:**
1. Add pinned image/build, non-root runtime, probes, limits, private network binding, graceful drain, log policy, and rollback reference.
2. Produce the verification evidence and stop on any failed gate.
**Verification command:** `bash scripts/ci/governance-check.sh && bash infra/verify-hardening.sh`  
**Completion gate:** Static runtime checks and local container smoke prove the service starts, reports readiness only after dependencies are usable, and stops safely.  
**Stop condition:** Public DB/NATS/admin exposure, secret in Git, mutable image tag, or missing rollback reference.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Runtime | ADD/CHANGE | Intent-risk service image and runtime declaration |
| Operations | ADD | Health, resource, shutdown, log, and rollback controls |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/G-CORE-069` |
| **System Archetype** | `sre-control-plane` |
| **Bounded Context & Domain** | Intent-Risk runtime |
| **Ports & Adapters Topology** | Private NATS/PostgreSQL/Redis links; no public data ports |
| **State Machine & Invariants** | starting → ready → draining → stopped; readiness gates dependencies |
| **Zero-Mock & Conformance Gate** | Actual image/build and hardening checks |
| **Socratic 5-Why Blueprint** | Derive from Droplet runtime limitations during PLAN |

## Contract impact
- Adds runtime mapping for `intent-risk-service`; no domain contract change.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Topology decision closed before ready.

## Acceptance criteria
- [x] Image is pinned, non-root, resource-limited, restart-safe, and emits structured redacted logs.
- [x] Liveness/readiness/graceful shutdown and dependency gating are executable.
- [x] Runtime binds privately and exposes no PostgreSQL, NATS, Redis, Docker, or admin port publicly.
- [x] Rollback command/reference is recorded and tested locally.

## Test plan
- Image/build lint, compose topology validation, hardening checks, startup/readiness/liveness, dependency outage, termination, and rollback smoke.

## Touch map
- `code/**/intent-risk-service/**`
- `infra/**intent-risk*`
- `infra/**compose*`
- `infra/**deploy*`
- `docs/03-architecture/specs/goals/G-CORE-069/`

## Notes for AI
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [ ] Architecture & Goal Conformance Harness passing
### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check. The repository's LivePilot authority remains Codex.

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement the declared atomic outcome | done |

This goal prepares deployment; it does not apply changes to DigitalOcean.

## Comprehensive Spec Design Appendix
### Mathematical & Data Invariants
Service scope, monotonic revisions, idempotency, UTC timestamps, bounded payloads, and explicit unknown/deferred states are verified as executable invariants; monetary arithmetic is out of scope for this service.

FSM: `docs/03-architecture/specs/goals/G-CORE-069/G-CORE-069-fsm-runtime-spec.md`  
Invariants: `docs/03-architecture/specs/goals/G-CORE-069/G-CORE-069-invariants-formal-spec.md`  
Threat model: `docs/03-architecture/specs/goals/G-CORE-069/G-CORE-069-threat-model.md`.

## Epistemic Proof & Evidence Classification
Runtime packaging evidence is empirical; it does not prove Droplet HA or provider availability.
