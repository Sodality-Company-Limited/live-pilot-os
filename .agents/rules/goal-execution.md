---
description: "ทำ G-xxx" = TodoWrite step tracker in chat (fast, read-only)
alwaysApply: true
---

# Goal execution — todos first

See [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md) §0.2–§0.3. Terminology: [design-spec.md](../../docs/03-architecture/design-spec.md) §8. IDs: [goal-id.md](../../docs/06-workflows/goal-id.md) (`G-PAY-001` or legacy `G-001`).

| User says | Agent must |
|-----------|------------|
| **"ทำ G-xxx"** / **"ทำ G-PAY-001"** | Read `goals/<ID>.md` → **TodoWrite** → **≤3 lines** chat. **No code. No promote nag. No repo explore.** |
| **"compile G-xxx"** / hydrate / resolve | Build `.bundle/` per [context-compiler.md](../../docs/03-architecture/context-compiler.md) — no code |
| **"promote G-xxx ready"** | Goal docs only — no `code/`. Block if `[NEEDS CLARIFICATION]` or spec check incomplete. **Sync ClickUp status → ready**. |
| **"clarify G-xxx"** / **"spec check G-xxx"** / **"analyze G-xxx"** | Goal docs only — [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md) §0.5 |
| **"execute G-xxx"** / **"execute G-xxx ... ship it to archived"** / **"เริ่ม step N"** / **"ทำต่อ G-xxx"** | Ensure on working branch `(feature|fix|hotfix)/G-xxx` (autonomously created/checked out if needed) → compileStep if missing → `step-N.md` + `action-step-N.yaml` → execute if `ready`/`in_progress` (if `draft`/`planned` without unresolved questions, autonomously promote to `ready` -> `in_progress`). **On first step: sync ClickUp status → in_progress**. If commanded to ship or archive upon completion, automatically update card to `status: done`, run `node ./cli.js goal close G-xxx`, and commit/push without halting. |
| **"continue G-xxx"** | `shared-memory.yaml` + `delta.md` + changed files — no full bundle |
| **"set goal"** / **"set new goal"** / **"สร้าง goal"** / feature without G-xxx | Follow [goal-creation.md](goal-creation.md) — Draft `docs/07-backlog/goals/G-xxx.md` from `_template.md` (`draft`/`planned`), Intent (WHAT/WHY only), `[NEEDS CLARIFICATION]` in Open questions, register in the relevant epic queue. **Zero application code.** |
| **"brief G-xxx"** | Full Plan briefing (optional) |
| **"ship G-xxx"** / **"archive G-xxx"** / **"open PR G-xxx"** / **"สร้าง PR"** | Check all completed steps and acceptance criteria, set card `status: done`, run `node ./cli.js goal close G-xxx` to archive card, commit and push to `origin/<working-branch>`, and create GitHub PR targeting defined target branch (`develop` for features/fixes, `main` for hotfixes), outputting direct PR link. |

Hard rules:

- **"ทำ G-xxx"** → **TodoWrite is the UI** — do not paste long briefing tables
- Read **one file** (`goals/G-xxx.md`) on **"ทำ G-xxx"** — not AGENTS.md, not `code/`, not broad search
- **EXECUTE** follows **recipe checklist** — update `shared-memory.yaml` each turn (`EXECUTE` = collaboration phase, not bundle mode alone)
- Never nag promote on **"ทำ G-xxx"** — on **"execute G-xxx"** or **"เริ่ม step N"**, autonomously advance unblocked goals to `ready` -> `in_progress` and provision `feature/G-xxx`; do not block on mechanical setup. Block code only when genuine `[NEEDS CLARIFICATION]` remains unresolved.
- One `in_progress` todo at a time during execution
- After step done: under autonomous execution (`execute G-xxx` or swarming), the agent automatically advances to Step N+1 until all steps and criteria are verified green; do not halt for manual **"เริ่ม step N+1"** prompts. (Interactive manual step-by-step mode only applies when the user explicitly prompts individual `เริ่ม step N` commands).
- **Branch Isolation (Mandatory Invariant):** All work for `G-xxx` MUST execute on dedicated working branch `feature/G-xxx`, `fix/G-xxx`, `hotfix/G-xxx`, etc. Never work on integration branches (`develop` or `main`).
- **Zero Local Integration Merging (Mandatory Invariant):** The agent will NEVER switch to `develop` or `main`, and will NEVER execute `git merge` or `git rebase` locally. All integration occurs via GitHub PRs reviewed and merged by humans.
- **Single Branch Push (Mandatory Invariant):** All code, tests, acceptance contracts (`docs/02-product/acceptance/G-xxx.md`), backlog transitions (`goals/_archived/G-xxx.md`), ClickUp sync records, and ISO audit logs (`docs/06_raw/`) MUST be committed and pushed directly to `origin/<working-branch>`.
- **ClickUp State Synchronization (Mandatory Invariant):** Every goal state change (`draft`/`planned` → `ready` → `in_progress` → `blocked` → `review` → `approved` → `done`) MUST synchronize status to ClickUp (`soda-os sync-clickup G-xxx --status-only` or `node scripts/goals/sync-clickup.js G-xxx --status-only`). Never leave ClickUp out of sync with goal state.
- **Mandatory Goal Closure & Archival on Green Tests (Mandatory Invariant):** When implementation and verification tests pass 100% green without errors, the agent MUST NOT refuse, hesitate, or stall claiming that the goal card is draft or "semantically incomplete". The active goal card naturally has pending steps and unchecked criteria during development; green tests signify semantic fulfillment. The agent is explicitly required to perform the card update itself upon verifying green tests:
  1. Update the goal card `docs/07-backlog/goals/G-xxx.md`: set `status: done`, set 5-phase table to SHIP, check off all completed steps, satisfied acceptance criteria, and spec checklist items (`- [x]`).
  2. Run atomic closure: `node ./cli.js goal close G-xxx` (or `soda-os goal close G-xxx`), archiving to `goals/_archived/G-xxx.md` and reconciling epic queues. This atomically updates frontmatter lifecycle and markdown body.
  3. Commit and push directly to `origin/feature/G-xxx` and generate the PR. Do not leave verified green goals active or in draft.
