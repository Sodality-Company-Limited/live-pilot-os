---
goal_contract:
  id: G-CORE-078
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "NestJS session-service scaffold with executable migration verification"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [new service runtime and persistence boundary]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-078: Establish the NestJS session-service scaffold
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check pending | analyze pending  
**Atomic outcome:** A minimal NestJS/TypeScript session-service workspace with `pg` + Kysely wiring and an executable migration verification command.  
**Epic:** CORE  
**Depends on:** G-CORE-050  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Create and verify the NestJS service scaffold | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-CORE-078; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
The canonical technology SOT selects Node.js LTS, NestJS, TypeScript, `pg`, Kysely, NATS JetStream, and Jest/Supertest/fast-check. `G-CORE-051` cannot execute until this scaffold exists.

## Intent
**Why:** Establish the approved runtime and reproducible migration test foundation for `session-service`.  
**Done when:** The service installs, type-checks, starts a health-capable NestJS process, and exposes a real migration verification command.  
**Unblocks:** G-CORE-051.

## How
Use the approved NestJS baseline with domain/application ports separated from adapters, `pg` + Kysely repositories, and a real PostgreSQL migration check. No placeholder service behavior.

## In
- NestJS workspace/package metadata, minimal module/bootstrap, configuration boundary, database adapter, migration directory, and migration test command.

## Out
- Lifecycle domain rules, NATS handlers, authorization policy, UI/BFF, DigitalOcean deployment, and production secrets.

## Open questions
- [x] None; use the canonical technology-stack SOT.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-016 |
| Architecture | `docs/03-architecture/technology-stack-sot.md`; `docs/03-architecture/technical-specifications-sot.md` |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/technology-stack-sot.md`; `docs/03-architecture/testing-sot.md` |
| Deployment | `docs/03-architecture/deployment/README.md` |

## Atomicity & Zero-Mock Contract
- **One outcome:** one executable NestJS service scaffold and migration verification foundation.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated passing tests.
- **Fail closed:** missing database configuration or failed migration verification blocks success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — create and verify the NestJS service scaffold
**Allowed files:** `code/services/session-service/`, `docs/03-architecture/specs/goals/G-CORE-078/`  
**Actions:**
1. Create the minimal approved NestJS/TypeScript workspace and `pg`/Kysely migration harness.
2. Run install/typecheck/startup/migration verification and stop at the checkpoint.
**Verification command:** the scaffold's recorded `npm` typecheck and migration verification commands  
**Completion gate:** Reproducible green scaffold, real migration check, and no secrets or external service mutation.  
**Stop condition:** invented stack, missing real database verification, scope drift, or failed Codex review.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Session service | ADD | NestJS/TypeScript scaffold and database adapter boundary |
| Verification | ADD | Executable migration verification command and tests |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Live-session lifecycle supporting domain |
| Ports & Adapters | NestJS transport/application ports; `pg` + Kysely persistence adapter |
| State & Safety | No lifecycle mutation in scaffold; missing DB readiness fails closed |
| Stack Authority | `docs/03-architecture/technology-stack-sot.md` |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] `code/services/session-service/` has a valid NestJS/TypeScript package and bootstrap.
- [x] `pg` + Kysely adapter wiring and migration directory are present without secrets.
- [x] A real migration verification command is documented and passes against PostgreSQL.
- [x] Independent Codex review approves the scoped diff.

## Test plan
- Package/typecheck and startup tests.
- Real PostgreSQL migration apply/repeat/rollback-safe verification.
- Secret scan, scope check, and architecture/SOT checks.

## Touch map
- `code/services/session-service/`
- `docs/03-architecture/specs/goals/G-CORE-078/`

## Notes for AI
Read the technology-stack, technical-specifications, deployment, testing, and G-CORE-050 contract SOTs. Do not implement lifecycle behavior in this prerequisite.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Scaffold states are `uninitialized → configured → ready`; missing configuration or failed migration verification cannot reach `ready`.

### Mathematical & Data Invariants Spec
Migration verification is repeat-safe; no destructive down migration is automatic; service-owned data remains tenant-scoped.

### Hexagonal Inbound & Outbound Ports Specification
NestJS bootstrap and configuration are inbound composition; `pg`/Kysely is an outbound persistence adapter behind an application port.
