# Goal backlog

> **1 goal = 1 file = 1 outcome.** Pick **one** `ready` goal per dev round. Goals in **`draft`** / **`planned`** are spec-only — do not implement until promoted to `ready`.

## Dashboard

Goal rows do **not** live on this page. Each epic has its own queue so `main` and `epic/{SLUG}` can merge without fighting the same table. Open epic on `main` first (link + empty queue), then work on the epic branch.

| Epic | Queue | Notes |
|------|-------|-------|
| CORE | [queues/CORE.md](queues/CORE.md) | Core / unscoped |
| APPR | [queues/APPR.md](queues/APPR.md) | Approval and Control Service |
| AUDI | [queues/AUDI.md](queues/AUDI.md) | Audit Service & Immutable Decision Ledger |
| CATA | [queues/CATA.md](queues/CATA.md) | Catalog Service |
| DAVE | [queues/DAVE.md](queues/DAVE.md) | DAVE Decision System & Governance |
| EXEC | [queues/EXEC.md](queues/EXEC.md) | Execution & Platform Adapter Safety |
| IDEN | [queues/IDEN.md](queues/IDEN.md) | Identity and Session Service |
| INTE | [queues/INTE.md](queues/INTE.md) | Intent/Risk Service |
| INVT | [queues/INVT.md](queues/INVT.md) | Inventory Service |
| JEVC | [queues/JEVC.md](queues/JEVC.md) | JEV/Copilot Service |
| LIVE | [queues/LIVE.md](queues/LIVE.md) | Live-session service |
| MARG | [queues/MARG.md](queues/MARG.md) | Margin Policy Service |
| ML | [queues/ML.md](queues/ML.md) | Machine Learning & Cognitive Calibration |
| OPS | [queues/OPS.md](queues/OPS.md) | DAVE Operations & Deployment Governance |
| PAY | [queues/PAY.md](queues/PAY.md) | Active queue |
| PROOF | [queues/PROOF.md](queues/PROOF.md) | DAVE Mathematical Invariant & Assurance Proofs |
| SEC | [queues/SEC.md](queues/SEC.md) | DAVE Multimodal Security & Privacy Controls |
| TELM | [queues/TELM.md](queues/TELM.md) | Telemetry Service |
| TEMPLATE | [queues/TEMPLATE.md](queues/TEMPLATE.md) | Active queue |
| UX | [queues/UX.md](queues/UX.md) | Multimodal UX/UI Design Decision Layer |
| WEB | [queues/WEB.md](queues/WEB.md) | DAVE Exact Web Application Pipeline |

When you register a new epic on `main`, add one row here and create `queues/{EPIC}.md`. After that, **do not edit this table from the epic branch.**

---

## Layout

| Location | Purpose |
|----------|---------|
| [`goals/G-PAY-001.md`](goals/_template.md) (or legacy `G-001.md`) | Active goal — filename **equals the ID** (no title slug) |
| [`queues/{EPIC}.md`](queues/CORE.md) | Active + archived **rows for one epic only** |
| [`goals/_archived/`](goals/_archived/) | Completed goal cards (`done`) — moved here on close |
| [`goals/_template.md`](goals/_template.md) | Copy when creating a new goal |
| [`epics.md`](epics.md) + [`goal-id-registry.yaml`](goal-id-registry.yaml) | Epic namespace + reserved sequences |
| [changelog-goals.md](changelog-goals.md) | Optional rollup after merge to `main` — not edited on epic branches |

**Agent rule:** Execute **`ready`** goals (or autonomously promote unblocked `draft` goals with complete specs on execute command). Advance to **`done`** and archive when all automated verification and release gates pass. On close → set `done`, move file to `goals/_archived/`, update **`queues/{EPIC}.md` only**.

**Design goals:** if a goal's **Kind** is `design` (or **Profile** `designer`), run [`soda-design`](../../.agents/skills/soda-design/SKILL.md) during PLAN **before** any UI code — produce the UX flow + UI spec, then stop for human approval. Build happens only after promote to `ready`. See [design-loop.md](../06-workflows/design-loop.md).

## Status flow

```text
draft → ready → in_progress → review → approved → done → goals/_archived/
              ↘ blocked ↗
```

| Collaboration phase | Goal status |
|---------------|-------------|
| DEFINE | `draft`, `planned` |
| PLAN | `ready` (waiting for command trigger **"ทำ G-PAY-001"** / legacy **"ทำ G-001"**) |
| EXECUTE | `in_progress` |
| REVIEW | `review`, `approved` |
| SHIP | `done` → archived |

Alias in goal Plan tables: **Soda phase** = collaboration phase (DEFINE–SHIP subset). Full cycle includes IMPROVE. See [design-spec.md](../03-architecture/design-spec.md) §8.

## Active queue

Rows live in [`queues/{EPIC}.md`](queues/CORE.md) **Active** tables. Kind values: `feature` · `design` · `api` · `migration` · `qa` · `chore`. A **`design`** goal routes to `soda-design` in PLAN.

Do not add goal rows on this page.

## Archived

Cards: [`goals/_archived/`](goals/_archived/). Per-epic rows: the **Archived** table in `queues/{EPIC}.md`. Optional rollup: [changelog-goals.md](changelog-goals.md) (update on `main` after the epic PR lands — not on the epic branch).

## Create a goal

IDs are **`G-{EPIC}-{NNN}`** (example `G-PAY-001`). Legacy `G-001` stays valid (implicit epic `CORE`). Contract: [goal-id.md](../06-workflows/goal-id.md).

1. On **`main`**: register the epic in [`epics.md`](epics.md), add `PAY:` to the registry, add `queues/PAY.md`, add a Dashboard link
2. On the epic branch, allocate when you need a card: `soda-os goal next PAY` — do **not** pick a number by scanning files, do **not** reserve a batch unless two people share the same epic
3. Copy [`goals/_template.md`](goals/_template.md) → `goals/G-PAY-001.md` — filename equals the ID; see [goal-spec-guide.md](../06-workflows/goal-spec-guide.md)
4. Fill **Plan**, **In**, **Out**, **Touch map**, **Acceptance criteria**, **Test plan**, **Depends on**
5. Add a row to **`queues/PAY.md`** only — not to this file
6. When promoting to `ready`, create `docs/02-product/acceptance/G-PAY-001.md` from [acceptance/_template.md](../02-product/acceptance/_template.md)
7. Tell human: say **"ทำ G-PAY-001"** when approved

> **UI/UX goal?** Set **Kind: `design`**, and in the Context manifest set `Profile: designer` · `Task type: design_ui` · `Skills: soda-design`. On **"design G-xxx"** the agent produces the UX flow + UI spec and stops for approval; build happens after promote to `ready`. See [design-loop.md](../06-workflows/design-loop.md).

## Close a goal

1. Acceptance criteria `[x]` in `goals/G-xxx.md`; all plan steps `done`
2. Status → **`done`** (only from **`approved`**)
3. **Move** `goals/G-PAY-001.md` → `goals/_archived/G-PAY-001.md` (filename stays equal to the ID)
4. Move the row in **`queues/PAY.md`** from Active → Archived
5. Do **not** append [changelog-goals.md](changelog-goals.md) or [changelog.md](changelog.md) on the epic branch (EOF conflicts). Roll up on `main` after the PR merges if needed.

## Plan legend

Update the matching row in **`queues/{EPIC}.md`** and the **Plan** table in the goal file when status or step changes.

| Symbol | Meaning |
|--------|---------|
| **●** | Current step / collaboration phase |
| ○ | Pending |
| ✓ | Done |
| ⏸ | Blocked |
