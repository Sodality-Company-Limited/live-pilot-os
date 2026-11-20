# Active Goals Architectural Audit & Lifecycle State Machine Investigation

**Date/Time:** 2026-10-15T08:16:00+07:00  
**Author:** Antigravity Autonomous Systems Architect  
**Investigation Scope:** Soda OS Core Framework (`/Users/batrarethsudprasert/projects/soda-os`) & Sodality Ecosystem Downstream Repositories  
**Audit Purpose:** Deep architectural investigation into the existence, origins, lifecycle states, and governance semantics of active goals across the Sodality ecosystem.

---

## 1. Executive Findings & State Matrix

An exhaustive empirical inspection across `/Users/batrarethsudprasert/projects/` reveals the following exact state regarding active goals:

| Repository | Active Goals in `goals/` | Archived Goals in `goals/_archived/` | Queue Status | Primary Cause of Active Files |
| :--- | :---: | :---: | :---: | :--- |
| **`soda-os` (Central Framework)** | **0** | **107** | All 8 queues empty (`*(none)*`) | All 107 framework goals fully completed, proven, and archived. |
| **`sodality-creator-hub`** | **10** | **318** | Active table in `CORE` & `PROOF` | In-flight Pure BFF delegation wave (`G-CORE-327..335`, `G-PROOF-019`) on `epic/mvp-001-rebrand`. |
| **`sodality-rabbit-app`** | **23** | **0** | Unsplit backlog | Legacy performance sprint goals (`G-PERF-001..032`) drafted prior to modular queues. |
| **`litter-green-api`** | **7** | **0** | Unsplit backlog | Legacy mobile/kiosk backlog goals (`G-006..012`). |
| **`sodality-aether`** | **0** | **34** | Empty queues | All goals archived. |
| **`sodality-aexis`** | **0** | **42** | Empty queues | All goals archived. |
| **`sodality-nextjs`** | **0** | **18** | Empty queues | All goals archived. |

---

## 2. Soda OS Goal Lifecycle State Machine Mechanics

In Soda OS Goal-Driven Architecture, the active directory `docs/07-backlog/goals/` and epic queue tables in `docs/07-backlog/queues/<EPIC>.md` are governed by a deterministic, non-bypassable state machine:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THE SODA OS GOAL LIFECYCLE                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ Socratic Planning ]
             │
             ▼
      ┌──────────────┐
      │    draft     │  (Specification definition, requirements extraction, boundary setting)
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐
      │   planned    │  (Touch map established, dependencies wired, waiting in DAG queue)
      └──────┬───────┘
             │ (Preconditions met, dependencies archived)
             ▼
      ┌──────────────┐
      │    ready     │  (Waiting for explicit human trigger: "ทำ G-xxx" or "เริ่ม step N")
      └──────┬───────┘
             │ (Implementation begins on dedicated feature branch)
             ▼
      ┌──────────────┐
      │ in_progress  │  (Zero mocks, 100% operational implementation within touch map)
      └──────┬───────┘
             │ (Tests pass green, analyzers clear)
             ▼
      ┌──────────────┐
      │    review    │  (Code review, mathematical proofs, invariant receipts generated)
      └──────┬───────┘
             │ (HUMAN SIGN-OFF GATE - AI STRICTLY FORBIDDEN TO BYPASS)
             ▼
      ┌──────────────┐
      │   approved   │  (Explicit human confirmation received)
      └──────┬───────┘
             │ (`soda-os goal close <G-xxx>`)
             ▼
      ┌──────────────┐
      │     done     │  ───► Atomically moved to `goals/_archived/<G-xxx>.md`
      └──────────────┘       Queue table row moved from ## Active to ## Archived
```

### The Invariant of "Active Goals"
Under Soda OS governance:
1. **A file residing directly in `docs/07-backlog/goals/<ID>.md` is by definition an ACTIVE GOAL.**
2. A goal file MUST remain in `docs/07-backlog/goals/` throughout all intermediate phases: `draft` $\to$ `planned` $\to$ `ready` $\to$ `in_progress` $\to$ `review` $\to$ `approved`.
3. **No file is ever moved to `docs/07-backlog/goals/_archived/` until it reaches `done`.**
4. **No AI agent may unilaterally mark a goal `done` or move it to `_archived/` without human sign-off (`approved` $\to$ `done`).**

---

## 3. Deep Dive: Why Active Goals Exist in `sodality-creator-hub`

In `/Users/batrarethsudprasert/projects/sodality-creator-hub`, exactly 10 active goals exist:

### Active Goal Registry & Status Breakdown
1. **`G-CORE-327.md`** — `status: planned` / `phase: REVIEW`
   - *Title:* Pure BFF Monolithic TikTok Partner, Live & Logistics Route De-Duplication & Sub-Router Cutover.
   - *State Reason:* Implemented in branch `epic/mvp-001-rebrand`; code modifications made to extract legacy routes; awaiting formal PR review and acceptance sign-off.
2. **`G-CORE-328.md`** — `status: planned` / `phase: REVIEW`
   - *Title:* Pure BFF Creator Mobile Showcase & Sample Application Delegation to `tiktok-partner-service:8099`.
   - *State Reason:* Sub-router created; test suites added; sitting in active review queue.
3. **`G-CORE-329.md`** — `status: planned` / `phase: REVIEW`
   - *Title:* Pure BFF TikTok Developer OAuth & Creator Video Sync Delegation to `tiktok-crawl-auth:8089`.
   - *State Reason:* Handlers migrated to BFF client delegation; awaiting verification run.
4. **`G-CORE-330.md`** — `status: planned` / `phase: REVIEW`
   - *Title:* Pure BFF Video Clip Preflight Scan & Sync Verification Delegation to `clip-worker:8083`.
   - *State Reason:* Integration test suite completed; waiting for DAG downstream gate.
5. **`G-CORE-331.md`** — `status: draft` / `phase: REVIEW`
   - *Title:* Pure BFF Internal CRM & Omnichannel Timeline Delegation to `community-service:8098` and `identity-service:8094`.
   - *State Reason:* Scaffolding complete; routes mapped; waiting for dependency resolution.
6. **`G-CORE-332.md`** — `status: draft` / `phase: REVIEW`
   - *Title:* Pure BFF Runtime Tenancy & Workspace Context Delegation to `identity-service:8094`.
   - *State Reason:* Tenancy RLS handlers decoupled; waiting for architectural cutover.
7. **`G-CORE-333.md`** — `status: draft` / `phase: REVIEW`
   - *Title:* Pure BFF Admin Session Authentication & Identity Delegation to `identity-service:8094`.
   - *State Reason:* Session delegation mapped; pending security audit pass.
8. **`G-CORE-334.md`** — `status: review` / `phase: REVIEW`
   - *Title:* Pure BFF Payment Checkout, Settlement & Statutory Tax Presentation Sub-Router Consolidation.
   - *State Reason:* Consolidated routes into `bff::brand`; financial adversarial tests passing; waiting for human review.
9. **`G-CORE-335.md`** — `status: draft` / `phase: PLAN`
   - *Title:* Decommission In-Memory Domain Engines & Deprecated Procedural Dispatchers from Core API AppState.
   - *State Reason:* Final monorepo cleanup capstone in the Pure BFF DAG; strictly blocked until `G-CORE-331..334` are closed.
10. **`G-PROOF-019.md`** — `status: draft` / `phase: PLAN`
    - *Title:* Monorepo AST Pure BFF Router Zero-Exemption & Complete Decoupling Verification Gate.
    - *State Reason:* Automated AST verification gate that proves zero direct database queries or in-memory domain engines remain in `code/apps/backend/api/src/lib.rs`.

### Architectural Root Cause
These 10 goals exist because an autonomous multi-agent swarm (`orchestrator_17..20`, `worker`, `challenger`, `auditor`) was recently executed on branch `epic/mvp-001-rebrand` to decompose the legacy monolith into a Pure BFF. The swarm systematically generated the DAG of goals (`G-CORE-327..335` and `G-PROOF-019`) to partition the work into atomic, verifiable units per Soda OS principles. Because the work is currently in progress / awaiting human review on that branch, these cards are legitimately active.

---

## 4. Why Central `soda-os` Has Zero Active Goals

In the central framework `/Users/batrarethsudprasert/projects/soda-os`:
1. All 107 framework capabilities spanning Core Engine (`G-CORE-001..012`), DAVE Decision Layer (`G-DAVE-001..006`), Cognitive ML & Calibration (`G-ML-001..028`), Operations & HA (`G-OPS-001`), Formal Mathematical Proofs (`G-PROOF-001..013`), Multimodal Security (`G-SEC-001`), DAVE Web Applications (`G-WEB-001..015`), and Multimodal UX Design System (`G-UX-001..028`) have passed all verification harnesses and have been closed via `soda-os goal close <G-xxx>`.
2. Each closed goal card was moved to `docs/07-backlog/goals/_archived/<GOAL_ID>.md`.
3. Each corresponding queue file (`docs/07-backlog/queues/<EPIC>.md`) had its row moved to `## Archived`.
4. Therefore, `soda-os` has **zero active goals** remaining in its backlog.

---

## 5. Governance Directives & Next Steps

1. **Do Not Prematurely Archive In-Flight Goals:**
   - Active goals in downstream repositories (`sodality-creator-hub`) represent active engineering work in progress. Forcibly archiving them without executing the required tests and obtaining human sign-off would directly violate Article I (Zero Stubs) and Article II (Mandatory Verification) of the Global Engineering Constitution.
2. **Standard Workflow for Closing Active Goals:**
   - When an active goal's implementation and test pass are complete:
     ```bash
     soda-os goal close <G-xxx>
     ```
   - This atomically updates the status to `done`, moves the file to `_archived/`, updates the epic queue markdown table, and verifies the proof receipt.
3. **Respecting Working Directory Boundaries:**
   - In accordance with user rules, all active operations remain strictly within `/Users/batrarethsudprasert/projects/soda-os`. Downstream repositories are synchronized only via `node ./cli.js sync-ecosystem`.
