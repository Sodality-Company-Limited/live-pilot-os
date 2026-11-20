---
description: Soda OS Goal Workflow Rule — Autonomous Lifecycle, State Machine & Execution Protocol
alwaysApply: true
---

# Soda OS Goal Workflow Protocol

This document defines the mandatory, autonomous goal workflow protocol for Soda OS, governing how agents discover, plan, execute, verify, review, close, and ship goals under the PR-First governance model.

See [soda-goal-workflow](../skills/soda-goal-workflow/SKILL.md) and [execute-goal.md](../templates/execute-goal.md) for full execution templates.

---

## 1. The Core Lifecycle Principle

```text
DEFINE → PLAN → EXECUTE → REVIEW → SHIP (PR-First)
```

1. **One Goal = One Card = One Outcome:**
   - Active goals reside in `docs/07-backlog/goals/G-xxx.md`.
   - Completed goals reside in `docs/07-backlog/goals/_archived/G-xxx.md`.
   - Allocations and queues are tracked in `docs/07-backlog/queues/{EPIC}.md`.

2. **Goal State Flow:**
   ```text
   draft → ready → in_progress → review → approved → done → goals/_archived/
                 ↘ blocked ↗
   ```

---

## 2. Command Trigger Matrix

| User Trigger | Collaboration Phase | Mandatory Agent Action |
|---|---|---|
| **"execute G-xxx"** / **"execute G-xxx ... ship it to archived"** | EXECUTE / SHIP | Ensure on working branch `feature/G-xxx`. If goal is `draft` or `planned` with verified specs, autonomously promote to `ready` -> `in_progress`. Execute steps within touch map. When tests pass 100% green, autonomously update card, run `node ./cli.js goal close G-xxx`, commit, push, and open PR without stalling. |
| **"ทำ G-xxx"** / **"ทำ G-PAY-001"** | PLAN | Fast path: read goal card, emit **TodoWrite** step tracker in chat (≤3 lines). Zero application code. No promote nag. |
| **"เริ่ม step N"** / **"ทำต่อ G-xxx"** | EXECUTE | Read `step-N.md` + `action-step-N.yaml` or goal Step N; execute operational code on `feature/G-xxx` within touch map. |
| **"clarify G-xxx"** / **"spec check G-xxx"** / **"analyze G-xxx"** | PLAN | Goal documentation only. Run conformance harness; update spec checklist or open questions. Zero application code. |
| **"set goal"** / **"สร้าง goal"** / feature request without ID | DEFINE / PLAN | Allocate ID via `soda-os goal next <EPIC>`, draft `docs/07-backlog/goals/G-xxx.md` from `_template.md`, run conformance harness, index in queue. Zero application code. |
| **"ship G-xxx"** / **"archive G-xxx"** | SHIP | Mark all work steps and acceptance criteria done (`- [x]`), set card `status: done`, run `node ./cli.js goal close G-xxx`, and push to `origin/feature/G-xxx`. |

---

## 3. Autonomous Execution & Zero-Stall Invariants

1. **Zero Mechanical Stalling:** Agents MUST NOT block or fail closed on mechanical setup discrepancies (e.g. goal marked `draft`, branch not yet provisioned, or unrelated untracked files outside touch map). The agent autonomously prepares `feature/G-xxx`, advances status `draft` -> `ready` -> `in_progress`, and executes immediately.
2. **Mandatory Card Status Updating & Archival on Done:** When implementation and verification pass green, the executing agent MUST NOT refuse, hesitate, or stall claiming that the goal card is draft or "semantically incomplete". Active goal cards naturally have pending work steps and unchecked acceptance criteria during development; green tests confirm semantic fulfillment.
3. **Atomic Closure Execution:** The executing agent itself explicitly updates the goal card:
   - Sets frontmatter `goal_contract.status: done` and `lifecycle` to `ready`/`done`/`approved`/`released`.
   - Sets Markdown header `**Status:** done` and 5-phase table to SHIP (`| ○ | ○ | ○ | ○ | **●** |`).
   - Checks off all completed Work Steps, satisfied acceptance criteria, and spec checklist items (`- [x]`).
   - Runs `node ./cli.js goal close G-xxx` (or `soda-os goal close G-xxx`), which atomically moves the card to `goals/_archived/G-xxx.md`, updates `queues/{EPIC}.md`, synchronizes `docs/00-project-snapshot.md` and `docs/07-backlog/goals.md`, and maintains 100% bitwise parity with `template/`.
4. **Branch Isolation & PR-First Delivery:** All work occurs on dedicated `feature/G-xxx` branch. Agent never merges locally to `develop` or `main`. All code, tests, acceptance contracts, and archive files are committed and pushed directly to `origin/feature/G-xxx` for GitHub PR creation.
