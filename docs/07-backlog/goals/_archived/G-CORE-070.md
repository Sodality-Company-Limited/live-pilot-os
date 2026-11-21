---
goal_contract:
  id: G-CORE-070
  version: 2
  kind: release
  status: done
  profiles: [core, backend, sre]
  atomicity:
    outcome_count: 1
    primary_outcome: "one revision-bound DigitalOcean release verification receipt for intent-risk-service"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: critical, reasons: [production deployment and rollback]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-069]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-070: Verify the Intent/Risk service release on DigitalOcean
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** release  
**Atomic outcome:** A revision-bound DigitalOcean deployment verification receipt for `intent-risk-service`.  
**Epic:** CORE  
**Depends on:** G-CORE-069  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Context
The deployment SOT requires health, smoke, observability, rollback, and release evidence; production apply is not authorized by documentation alone.

## Intent
**Why:** Prove the service can be released and recovered on the selected Droplet topology.  
**Done when:** The release receipt records revision/image/config/policy, health, smoke, alerts, rollback decision, and limitations, with human approval for production apply.  
**Unblocks:** Intent/Risk integration with other services.

## In
- Preflight, deployment, health/smoke, observability, rollback, and release receipt for the service only.

## Out
- Cross-service integration, production marketplace actions, topology scaling, or declaring the whole platform production-ready.

## How
Follow the deployment pipeline SOT and existing `infra/deploy.sh`/hardening checks; use simulated adapter mode.

## Open questions
- [x] [NEEDS CLARIFICATION: Human approval is required before any DigitalOcean production apply.]

## Knowledge links
| Type | IDs |
|---|---|
| Deployment | `docs/03-architecture/deployment/deployment-pipeline-sot.md`; `backup-restore-dr-sot.md`; `digitalocean-droplets-sot.md` |
| Quality | `docs/03-architecture/testing-sot.md`; `docs/03-architecture/software-quality-sot.md` |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Predecessor | G-CORE-069 |
| Runtime | `infra/deploy.sh`; `infra/verify-hardening.sh` |

## Atomicity & Zero-Mock Contract
- **One outcome:** one release verification receipt.
- **Concrete execution:** health and smoke run against the deployed service; simulated mode is labeled.
- **Fail closed:** failed smoke, missing receipt fields, or rollback failure blocks release certification.

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CORE-070`; no subagents; release evidence only.

## Work steps
### Step 1 — execute the bounded release verification
**Allowed files:** `infra/**`, `docs/07-backlog/evidence/G-CORE-070-*.json`, `docs/03-architecture/specs/goals/G-CORE-070/`  
**Actions:**
1. Run preflight, deploy only after explicit human approval, execute health/smoke/observability checks, test rollback, and write the revision-bound receipt.
2. Produce the verification evidence and stop on any failed gate.
**Verification command:** `bash scripts/ci/governance-check.sh && bash infra/verify-hardening.sh` plus the documented deploy/smoke/rollback commands.  
**Completion gate:** Receipt contains environment, release ID, image digest, source/config/policy revisions, operator, timestamps, health, smoke, alerts, rollback, and `PASS`/`PASS-SIMULATED` verdict.  
**Stop condition:** No approval, public data port, failed smoke, missing backup/restore evidence, or rollback uncertainty.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Release | ADD | Intent-risk DigitalOcean verification receipt |
| Operations | VERIFY | Health, smoke, observability, and rollback |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/G-CORE-070` |
| **System Archetype** | `sre-control-plane` |
| **Bounded Context & Domain** | Release engineering for Intent-Risk runtime |
| **Ports & Adapters Topology** | Deployment control plane to private service runtime; no public DB/NATS access |
| **State Machine & Invariants** | prepared → approved → deployed → verified or rolled_back; no green receipt without evidence |
| **Zero-Mock & Conformance Gate** | Revision-bound release receipt and operational test evidence |
| **Socratic 5-Why Blueprint** | Derive from deployment failure and recovery evidence during PLAN |

## Contract impact
- Produces a release evidence receipt; does not alter domain contracts.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Human production approval remains required.

## Acceptance criteria
- [x] Deployment is blocked unless all prior service gates and required security/contract checks pass.
- [x] Post-deploy health, smoke, metrics/log visibility, and simulated-mode labeling are proven.
- [x] Rollback is executed or explicitly blocked with evidence; no release is certified on an unknown outcome.
- [x] Receipt is bound to exact source revision, image digest, config/policy revision, and environment.

## Test plan
- Deployment pipeline, health/smoke, restart, dependency outage, observability, rollback, and evidence schema checks; backup/restore limitation recorded if not in this service scope.

## Touch map
- `infra/**`
- `docs/07-backlog/evidence/G-CORE-070-*.json`
- `docs/03-architecture/specs/goals/G-CORE-070/`

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

Do not claim the whole LivePilot platform is production-ready; this receipt covers only Intent/Risk and the selected Droplet topology.

## Comprehensive Spec Design Appendix
### Mathematical & Data Invariants
Service scope, monotonic revisions, idempotency, UTC timestamps, bounded payloads, and explicit unknown/deferred states are verified as executable invariants; monetary arithmetic is out of scope for this service.

FSM: `docs/03-architecture/specs/goals/G-CORE-070/G-CORE-070-fsm-runtime-spec.md`  
Invariants: `docs/03-architecture/specs/goals/G-CORE-070/G-CORE-070-invariants-formal-spec.md`  
Threat model: `docs/03-architecture/specs/goals/G-CORE-070/G-CORE-070-threat-model.md`.

## Epistemic Proof & Evidence Classification
`PASS-SIMULATED` certifies service/runtime behavior only; it does not certify a real marketplace integration.
