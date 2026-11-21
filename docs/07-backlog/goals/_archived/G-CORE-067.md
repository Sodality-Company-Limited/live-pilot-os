---
goal_contract:
  id: G-CORE-067
  version: 2
  kind: migration
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "one service-owned intent/risk persistence and outbox migration"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [durability and replay lineage]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-065]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-067: Establish Intent/Risk durable facts and outbox
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Atomic outcome:** A reversible service-owned schema for intent/risk facts, revisions, deduplication, and transactional outbox records.  
**Epic:** CORE  
**Depends on:** G-CORE-065  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Context
The SOT requires PostgreSQL authoritative facts, append-only evidence, monotonic projections, and atomic outbox publication. No service table may be shared implicitly.

## Intent
**Why:** Make classification and risk results durable, replayable, and auditable.  
**Done when:** Migration tests prove ownership, uniqueness, rollback, and atomic source/outbox behavior.  
**Unblocks:** G-CORE-068.

## In
- Service-owned source facts, derived decisions, evidence references, revision, idempotency fingerprint, outbox, and indexes needed by the declared flows.

## Out
- Classifier logic, API handlers, shared-table reads, UI projections, and deployment.

## How
Use the repository's migration conventions and expand/contract rules; no destructive change.

## Open questions
- [x] [NEEDS CLARIFICATION: Confirm the existing migration runner and service schema namespace from the implementation baseline before execution.]

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-001; REQ-LP-002 |
| Persistence SOT | `docs/03-architecture/api/data-persistence-contract-sot.md`; `docs/03-architecture/api/idempotency-mutation-sot.md` |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Architecture | `docs/03-architecture/technical-specifications-sot.md` |
| Deployment | `docs/03-architecture/deployment/migration-rollback-sot.md` |

## Atomicity & Zero-Mock Contract
- **One outcome:** one reversible migration set.
- **Concrete execution:** migration runs against real PostgreSQL in integration verification.
- **Fail closed:** uniqueness conflicts and unknown transaction outcomes are explicit.

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CORE-067`; no subagents; migration and migration tests only.

## Work steps
### Step 1 — add the reversible schema
**Allowed files:** `code/**/migrations/**`, `code/**/persistence/**`, `tests/**/intent-risk*`, `docs/03-architecture/specs/goals/G-CORE-067/`  
**Actions:**
1. Add service-owned tables/constraints and executable up/down or expand/contract checks.
2. Produce the verification evidence and stop on any failed gate.
**Verification command:** `npm test -- --runInBand`  
**Completion gate:** Real PostgreSQL proves atomic source plus outbox, duplicate no-op, fingerprint conflict, monotonic revision, and rollback.  
**Stop condition:** Any shared-table dependency, destructive migration, or missing rollback evidence.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Database | ADD | Intent/risk facts, revisions, evidence references, outbox |
| Verification | ADD | Migration and transaction failure tests |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/G-CORE-067` |
| **System Archetype** | `database-engine` |
| **Bounded Context & Domain** | Intent-Risk service-owned persistence |
| **Ports & Adapters Topology** | Service transaction port; PostgreSQL and outbox sink |
| **State Machine & Invariants** | append-only fact; projection revision monotonic; source/outbox atomic |
| **Zero-Mock & Conformance Gate** | Real DB integration evidence and migration rollback receipt |
| **Socratic 5-Why Blueprint** | Derive from persistence and replay SOTs during PLAN |

## Contract impact
- Adds service-owned persistence contract; no cross-service table access.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Migration runner clarification closed before ready.

## Acceptance criteria
- [x] One service schema stores immutable input/evidence and derived decision with policy/model revisions.
- [x] Duplicate key plus same fingerprint is a no-op; mismatched fingerprint is a typed conflict.
- [x] Source fact and outbox row commit atomically and migration rollback is demonstrated.

## Test plan
- Real PostgreSQL migration, constraint, transaction rollback, duplicate/replay, stale revision, and outbox recovery tests.

## Touch map
- `code/**/migrations/**`
- `code/**/persistence/**`
- `tests/**/intent-risk*`
- `docs/03-architecture/specs/goals/G-CORE-067/`

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

Read migration rollback and data-persistence SOTs. Do not add API handlers or deployment manifests.

## Comprehensive Spec Design Appendix
### Mathematical & Data Invariants
Service scope, monotonic revisions, idempotency, UTC timestamps, bounded payloads, and explicit unknown/deferred states are verified as executable invariants; monetary arithmetic is out of scope for this service.

FSM: `docs/03-architecture/specs/goals/G-CORE-067/G-CORE-067-fsm-runtime-spec.md`  
Invariants: `docs/03-architecture/specs/goals/G-CORE-067/G-CORE-067-invariants-formal-spec.md`  
Ports: transaction and outbox ports only.

## Epistemic Proof & Evidence Classification
Migration and transaction behavior are executable integration evidence, not a claim of HA.
