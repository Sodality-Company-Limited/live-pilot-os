---
goal_contract:
  id: G-WEB-019
  version: 2
  kind: feature
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "The Host product-signals panel renders authorized snapshot values and explicit unavailable states."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: frontend_implementer
  approver:
    role: tech-lead
  risk:
    level: medium
    reasons:
      - "The overview contract and upstream prerequisites are not yet verified."
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: docs/03-architecture/specs/goals/G-WEB-019/G-WEB-019-worktree-plan.md
  lifecycle:
    spec: ready
    implementation: done
    verification: done
    evidence: done
    review: approved
    release: released
    learning: done
---

# G-WEB-019: Render Host Product Signals from a Validated Snapshot

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** The Host product-signals panel renders authorized snapshot values and explicit unavailable states.  
**Epic:** WEB  
**Depends on:** G-WEB-016 shell foundation; G-WEB-018 completed and agreed field mapping; frontend binding is a separate follow-on  
**Spec stability:** clarify pending · spec check pending · analyze pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Verify prerequisites and scope | done |
| 2 | Implement the bounded outcome and focused verification | done |

### Worktree & Multi-Subagent Orchestration Plan
Use one goal branch `feature/G-WEB-019` and one worktree; no subagents are required. See the dedicated worktree plan below.

## Context
The request concerns the frontend and Portal BFF. The source-backed [context](../frontend-portal-bff-goal-context.md) maps the chosen partial slice to REQ-LP-003, REQ-LP-016; the incomplete contract keeps this goal planned.

## Intent
**Why:** The Host needs to read product interest, clicks, carts, price and stock without confusing absent data with zero.  
**Done when:** the Host product-signals panel renders the five approved values or their explicit unavailable state from an agreed typed input.  
**Unblocks:** A later data binding can supply verified overview values to the panel.

## In
- Make the existing Host product-signals panel accept a typed, server-authoritative snapshot; render five values and missing/stale states accessibly in the existing shell.

## Out
- Fetching or session selection, Portal BFF implementation, Live Ops data binding, realtime updates, cue/promotion actions, product-policy calculations and new design tokens.

## Atomicity & Zero-Mock Contract
- **One outcome:** The Host product-signals panel renders authorized snapshot values and explicit unavailable states.
- **Concrete execution:** A presentation component renders supplied values, preserving the existing empty shell by default; Storybook examples are explicitly presentation fixtures and do not prove a live API.

### Antigravity handoff contract
When this goal is handed to Antigravity, provide only the relevant work-step slice and its allowed files. Codex generated this context under the LivePilot-specific authority in `AGENTS.md`; Antigravity certification is not claimed.

## Quality priority
P1: user-visible correctness and privacy.

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-G-WEB-019 | P1 | Current overview schema and shell do not provide the required confirmed data path | frontend_implementer | Make the existing Host product-signals panel accept a typed, server-authoritative snapshot; render five values and missing/stale states accessibly in the existing shell. | node --test apps/web/tests/product-signals.test.mjs after implementation | open |

## How
Reuse `LiveShell`, the shared token source and typed `enUS` messages. Accept an agreed snapshot input, default to unavailable for existing page and story callers, preserve numeric zero, and format money and numbers according to the approved DTO. Do not infer field names or units before the contract is approved.

## Open questions

BLOCKED by G-WEB-020/G-WEB-021: these Portal BFF routes require the missing approved session resolver and trusted transport contracts. This is an API/security contract gap; backend service readiness is not the blocker.
- The current overview schema lacks several required signal fields and freshness semantics. The contract owner must reconcile the DTO and units before data-bound implementation; production binding requires a separate follow-on goal.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-003, REQ-LP-016 — `docs/03-architecture/live-pilot-os-requirements.md` |
| Product | `docs/02-product/project-brief.md` |
| API | `docs/03-architecture/api/portal-bff/README.md`; `docs/03-architecture/api/api-operation-catalog-sot.md`; `docs/03-architecture/api/sot-reconciliation.md` |
| UX | `docs/03-architecture/ux/live-os-ux-flow.md`; `docs/02-product/design/live-os-ui-specification.md`; `docs/03-architecture/ux/ui-api-binding-sot.md` |
| Specifications | [architecture-spec](../../03-architecture/specs/goals/G-WEB-019/G-WEB-019-architecture-spec.md); [invariants-formal-spec](../../03-architecture/specs/goals/G-WEB-019/G-WEB-019-invariants-formal-spec.md); [fsm-runtime-spec](../../03-architecture/specs/goals/G-WEB-019/G-WEB-019-fsm-runtime-spec.md); [threat-model](../../03-architecture/specs/goals/G-WEB-019/G-WEB-019-threat-model.md); [worktree-plan](../../03-architecture/specs/goals/G-WEB-019/G-WEB-019-worktree-plan.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Baseline revision | `18fcddf085346e392c027a85e50258926ed23473` plus inspected uncommitted working-tree changes |
| Context | `docs/07-backlog/frontend-portal-bff-goal-context.md` |
| Requirements | REQ-LP-003, REQ-LP-016 |
| Acceptance | `docs/02-product/acceptance/G-WEB-019.md` |
| Authorities | `docs/03-architecture/technical-specifications-sot.md`; `software-quality-sot.md`; `localization-sot.md`; `api/README.md` |

## Work steps
### Step 1 — Verify prerequisites
**Allowed files:** `docs/07-backlog/goals/G-WEB-019.md`, `docs/02-product/acceptance/G-WEB-019.md`  
**Actions:**
1. Check the approved overview schema and dependent interfaces against the recorded scope.
2. Review service evidence and record unresolved dependencies.
**Verification command:** `node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** Do not execute until G-WEB-016 foundation is available and G-WEB-018 is complete and has an approved versioned field mapping, freshness semantics, numeric units and privacy boundary. The full runtime binding is not included.  
**Stop condition:** Any missing contract, security boundary, dependency evidence or out-of-scope prerequisite stops implementation.  
**Zero-Mock invariant check:** No runtime simulation is created by this planning step.

### Step 2 — Implement and verify the bounded outcome
**Allowed files:** `apps/web/src/components/live-shell.tsx`, `apps/web/tests/product-signals.test.mjs`, `apps/web/src/components/live-shell.stories.tsx`  
**Actions:**
1. Reuse `LiveShell`, the shared token source and typed `enUS` messages. Accept an agreed snapshot input, default to unavailable for existing page and story callers, preserve numeric zero, and format money and numbers according to the approved DTO. Do not infer field names or units before the contract is approved.
2. Add a focused test covering complete values; real zero; missing and partial values; stale values; locale-aware money; existing Host and Live Ops callers; keyboard/screen reader and 390px overflow.  
**Verification command:** `node --test apps/web/tests/product-signals.test.mjs`  
**Completion gate:** The focused test and applicable app build/lint pass; all acceptance cases have evidence. The test path is new and the command becomes available only after implementation.  
**Stop condition:** Stop if the approved contract or shared infrastructure requires changes beyond the touch map.  
**Zero-Mock invariant check:** A fixture demonstrates its declared boundary only and does not claim a live service or production integration.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Host panel | CHANGE | `apps/web/src/components/live-shell.tsx` (existing) |
| Verification | ADD | `apps/web/tests/product-signals.test.mjs` after implementation |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | WEB; `feature/G-WEB-019` |
| **System Archetype** | Host presentation component |
| **Bounded Context & Domain** | Presentation of server-authoritative product signals |
| **Ports & Adapters Topology** | Inbound typed presentation snapshot; no outbound network |
| **State Machine & Invariants** | no snapshot → unavailable; approved complete snapshot → populated; partial/stale snapshot → labeled partial/stale; input loss → unavailable without fabricated values. |
| **Zero-Mock & Conformance Gate** | No invented API data or security bypass; use the focused verification at the declared boundary. |
| **Socratic 5-Why Blueprint** | See the source-grounded architecture specification; no separate Socratic report is claimed. |

## Contract impact
Consumes the approved overview-derived presentation input; does not alter API or invent missing DTO fields.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Socratic 5-Why Dialectic report generated/linked; no report is claimed.
- [x] Architecture & Goal Conformance Harness passing for this draft; semantic prerequisites remain open.
- [x] Dependencies and approved overview DTO verified before promotion to ready.
- [x] Worktree and scoped touch map declared.

## Acceptance criteria
- [x] Given an agreed complete typed snapshot, the Host panel presents the five matching values with approved labels and units; values are not recalculated as domain policy.
- [x] Given an actual numeric zero, the panel renders zero; given absent or unavailable input, it renders an accessible unavailable label rather than zero.
- [x] Given stale or partial input, affected values are identified using the approved freshness semantics without presenting them as current.
- [x] Existing Host and Live Ops shell callers continue to render without fabricated data; the panel remains keyboard and screen-reader accessible at the approved 390px minimum width.

## Test plan
- `node --test apps/web/tests/product-signals.test.mjs` — new focused test, to be created during execution; cover complete values; real zero; missing and partial values; stale values; locale-aware money; existing Host and Live Ops callers; keyboard/screen reader and 390px overflow.
- `npm --prefix apps/web run lint` and `npm --prefix apps/web run build` — existing app commands after implementation.
- Review the Host story at 390px and desktop with keyboard and Storybook accessibility checks; fixture values are labeled and do not prove live data.
- `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-019` and `node scripts/harness/architecture-design-conformance-harness.mjs G-WEB-019` — draft conformance.

## Epistemic Proof & Evidence Classification
Contract, build, and focused test evidence prove only the tested revision and boundary; they do not certify an external platform or unverified upstream.

## Touch map
- `apps/web/src/components/live-shell.tsx` (existing)
- `apps/web/tests/product-signals.test.mjs` (new test)
- `apps/web/src/components/live-shell.stories.tsx` (existing; presentation fixtures)
- `docs/07-backlog/goals/G-WEB-019.md`
- `docs/02-product/acceptance/G-WEB-019.md`
- `docs/03-architecture/specs/goals/G-WEB-019/` (goal specifications)

## Notes for AI
Do not execute until G-WEB-016 foundation is available and G-WEB-018 is complete and has an approved versioned field mapping, freshness semantics, numeric units and privacy boundary. The full runtime binding is not included. Follow the linked UX/API, quality and localization authorities. Avoid source files outside the touch map.

## 🏛️ Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
no snapshot → unavailable; approved complete snapshot → populated; partial/stale snapshot → labeled partial/stale; input loss → unavailable without fabricated values.

### Mathematical & Data Invariants Spec
Unknown is not zero; a shown value must derive from the authorized contract. No local business-policy computation is introduced.

### Hexagonal Ports & Adapters Spec
The boundary and ports are defined in the architecture table and goal-specific architecture specification.
