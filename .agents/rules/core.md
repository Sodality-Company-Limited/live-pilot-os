---
description: Core standards for all work in this project
alwaysApply: true
---

# Core

- Read `AGENTS.md`, the selected goal card, and only the rules and skill required by the
  goal's risk and touch map. Do not load the entire rule catalog by default. IDs:
  [goal-id.md](../../docs/06-workflows/goal-id.md).
- Respect `project-brief.md` (In / Out Scope) — do not build out-of-scope features without a new goal.
- **Autonomous Goal Execution** — execute `ready` or `in_progress` goals. When commanded with `execute <GOAL_ID>` or swarming on an unblocked `draft`/`planned` goal with complete specs, autonomously advance to `ready` -> `in_progress` per [governance.md](governance.md) and provision `feature/<GOAL_ID>` without stalling.
- **Spec stability** — [goal-spec-guide.md](../../docs/06-workflows/goal-spec-guide.md): no guess (`clarify`); Intent ≠ How; **`analyze G-xxx`** before first execute.
- Smallest correct diff; no drive-by refactors; stay within goal **Touch map**.
- Follow [security.md](security.md) — no secrets in repo; no prod commands without human approval.
- External tools / MCP: [external-tools.md](../../docs/06-workflows/external-tools.md) — consumer connects; OS only gates when.
- Follow [artifact-conservation.md](artifact-conservation.md) — discussion ≠ implementation; no new artifacts without explicit command.
- Follow [platform-consumer.md](platform-consumer.md) — platform stays generic; no consumer product names in this repo.
