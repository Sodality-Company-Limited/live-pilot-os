# My Soda OS App — Agent Entry Point

> **Pause before coding.** This repo uses **Soda goal-driven development** — Human defines scope, AI implements within goals.

Soda OS Template Version: `1.24.0`

Human onboarding: [docs/06-workflows/team-workflow.md](docs/06-workflows/team-workflow.md)  
Framework map: [docs/03-architecture/design-spec.md](docs/03-architecture/design-spec.md)

## Mission

Develop a high-performance application following Soda OS Agent Governance.

## Soda Agent OS — six layers

```text
Context + Skill + Goal + Governance + Approval + Audit
```

| Layer | Location | Agent job |
|-------|----------|-----------|
| **Context** | compiled action bundle | **EXECUTE:** `step-N.md` + `action-step-N.yaml` |
| **Skill** | [.agents/skills/](.agents/skills/) | Follow the matching task playbook |
| **Goal** | `docs/07-backlog/goals.md`, `docs/02-product/acceptance/` | One `ready` goal per round |
| **Governance** | [.agents/rules/](.agents/rules/) | Hard boundaries and persistent constraints |
| **Approval** | Automated evidence gate | No merge, prod, or `done` without passing validation, security, and release checks |
| **Audit** | `docs/07-backlog/changelog.md` | Log decisions |

## How this repo works

| Layer | Location | Agent job |
|-------|----------|-----------|
| **Goals** | `docs/07-backlog/goals.md` + `goals/G-PAY-001.md` (legacy `G-001.md`) | Work on **one** `ready` goal only; archive to `goals/_archived/` on close. Allocate with `soda-os goal next`. |
| **Rules** | [.agents/rules/](.agents/rules/) | Always follow; fail closed on conflicts |
| **Skills** | [.agents/skills/](.agents/skills/) + [skills-registry.yaml](docs/04-agents/skills-registry.yaml) | Read the matching skill; validate registry before review |
| **Specs** | [.agents/specs/](.agents/specs/) + `docs/02-product/`, `docs/03-architecture/` | Read the active goal's linked specifications |
| **Templates** | [.agents/templates/](.agents/templates/) | Use the applicable execution, goal, and evidence template |
| **API / data** | `docs/03-architecture/api/`, `data/` | Update contracts when goal changes APIs or domain rules |
| **API SOT generation set** | `docs/03-architecture/api/` | Read the relevant identity, resource, operation, error, mutation, realtime, async, adapter, query, and persistence SOT before generating API specs |
| **API generation skills** | `.agents/skills/soda-api-spec-generation/`, `.agents/skills/soda-api-sot-traceability/` | Trace BRD/BDD/flows before generating OpenAPI, AsyncAPI, or JSON Schema |
| **TDD generation skill** | `.agents/skills/soda-tdd-spec-generation/` | Convert approved behavior, contracts, and invariants into test-first specifications |
| **UX/UI SOT generation set** | `docs/03-architecture/ux/` | Read IA, component, state, binding, responsive, accessibility, content, realtime, testing, observability, and visual authorities before frontend implementation |
| **Error-code registry** | `docs/03-architecture/api/error-codes.yaml` | Allocate and validate public error codes before exposing errors |
| **Technical SOT** | `docs/03-architecture/technical-specifications-sot.md` | Treat cross-cutting production constraints as binding |
| **Quality SOT** | `docs/03-architecture/software-quality-sot.md` | Verify simulated behavior with production-grade quality gates |
| **Testing SOT** | `docs/03-architecture/testing-sot.md` | Define enterprise test levels, evidence, failure coverage, and release gates |
| **Testing/TDD SOT index** | `docs/03-architecture/testing/README.md` | Route subagents to test specifications, TDD records, fixtures, invariants, and evidence |
| **Deployment/runtime SOT** | `docs/03-architecture/deployment/README.md` | Govern local-to-DigitalOcean topology, release, rollback, backup, and recovery |
| **Configuration/policy SOT** | `docs/03-architecture/configuration/README.md` | Govern environment values, secrets, flags, business policies, precedence, and audit |
| **Localization SOT** | `docs/03-architecture/localization-sot.md` | Govern locale, translation, RTL, formatting, and accessibility behavior |
| **Flow SOT** | `docs/03-architecture/contracts/flows/coverage.yaml`, `source-of-truth-flows/` | Preserve feature ownership, schema status, and evidence |

### SOT-aware skill routing

Before selecting or executing a skill, resolve the applicable SOT links from the
[skill registry](docs/04-agents/skills-registry.yaml). Architecture, API, event,
data, adapter, deployment, security, reliability, or quality work MUST read the
[architecture overview](docs/03-architecture/overview.md),
[technical specifications SOT](docs/03-architecture/technical-specifications-sot.md),
[software quality SOT](docs/03-architecture/software-quality-sot.md), and for
locale-aware or user-facing work, the [localization SOT](docs/03-architecture/localization-sot.md), and the
relevant [API](docs/03-architecture/api/README.md) or
[flow coverage](docs/03-architecture/contracts/flows/coverage.yaml) authority before
implementation. A skill may add constraints but cannot override an SOT.

## Agent reference map

Use these canonical references when selecting a skill, persona, role, or architecture context:

| Reference | Link |
|-----------|------|
| Soda skills (local playbooks) | [.agents/skills/](.agents/skills/) |
| Agent rules | [.agents/rules/](.agents/rules/) |
| Agent specs | [.agents/specs/](.agents/specs/) |
| Agent templates | [.agents/templates/](.agents/templates/) |
| Agent documentation hub | [docs/04-agents/](docs/04-agents/) |
| Skills catalog and versions | [docs/04-agents/skills-library.md](docs/04-agents/skills-library.md) |
| Machine-readable skill registry | [docs/04-agents/skills-registry.yaml](docs/04-agents/skills-registry.yaml) |
| Persona catalog | [docs/04-agents/personas/README.md](docs/04-agents/personas/README.md) |
| Persona registry implementation | [scripts/agents/lib/persona-registry.mjs](scripts/agents/lib/persona-registry.mjs) |
| Agent roles and responsibilities | [docs/04-agents/dev-roles.md](docs/04-agents/dev-roles.md) |
| Stack and system boundaries | [docs/03-architecture/overview.md](docs/03-architecture/overview.md) |
| Enterprise technical specifications | [docs/03-architecture/technical-specifications-sot.md](docs/03-architecture/technical-specifications-sot.md) |
| Software quality contract | [docs/03-architecture/software-quality-sot.md](docs/03-architecture/software-quality-sot.md) |
| Testing contract | [docs/03-architecture/testing-sot.md](docs/03-architecture/testing-sot.md) |
| Localization contract | [docs/03-architecture/localization-sot.md](docs/03-architecture/localization-sot.md) |
| UX/UI SOT index | [docs/03-architecture/ux/README.md](docs/03-architecture/ux/README.md) |
| SOT coverage registry | [docs/03-architecture/contracts/flows/coverage.yaml](docs/03-architecture/contracts/flows/coverage.yaml) |

**Goal status:** `draft` / `planned` = spec only (autonomously promoted to `ready` -> `in_progress` on `execute <GOAL_ID>` or swarming) · `ready` = may pick · `in_progress` · `review` · `blocked` · `approved` · `done`  
(Canonical terms: [design-spec.md](docs/03-architecture/design-spec.md) §8 — collaboration phase ≠ goal status.)

## Bounded subagent runtime

Subagents must use one goal, one role, exactly one declared persona, one touch map, and one finite verification scope.
The persona is a single stable identity for the entire session: it must be supplied at spawn,
included in the prompt and telemetry, and MUST NOT be omitted, combined with another persona,
or switched during execution. Role describes the work function; persona describes the single
agent identity performing it.
The shared defaults live in [.agents/runtime-budget.yaml](.agents/runtime-budget.yaml).
Use the helpers under [`scripts/agents/`](scripts/agents/) for bounded commands, compact
prompts, pre-spawn budget gates, provider lifecycle cleanup, token accounting, and compact
telemetry. Do not persist full prompts, transcripts, secrets, or raw logs.
The pre-spawn gate MUST enforce input and output ceilings independently; a large input context
must be rejected even when combined input-plus-output usage remains below the total ceiling.
It MUST also hash each complete input prompt and reject an identical prompt hash reused for the
same goal; follow-ups must send only new deltas or changed context.
Subagents MUST receive only a step-scoped partial context packet: current objective, relevant
acceptance criteria, assigned `allowed_files`, compact digest, blockers, and verification command.
The coordinator may retain the full goal context, but must never forward the full goal card,
full work plan, completed steps, unrelated criteria, or full Wiki corpus to a subagent.
Subagents MUST NOT open or read `docs/07-backlog/goals/G-xxx.md` directly; only the coordinator
may read the canonical goal file and compile its required step slice.
LLM Wiki/context retrieval is single-owner: exactly one dedicated context subagent may search
the LLM Wiki for a goal. It must return a compact, source-cited context digest. All other
subagents MUST consume that digest and their own touch-map files only; they MUST NOT perform
additional Wiki searches or receive the full Wiki/context corpus.

Coordinators may fan out only within the declared budget and disjoint write sets. Planner,
implementer, tester, and reviewer sessions do not spawn children. Stop at checkpoints;
do not poll indefinitely, keep persistent sessions alive, or retry an identical failure
without new evidence. Every session returns `complete`, `blocked`, `needs-review`, or
`idle`, and reports changed files, tests, failures, blockers, and next action.

## Autonomous release gates

The agent may advance a goal, archive it, and prepare or ship its PR when all executable
verification, code-review, security, scope, dependency, and release checks pass. Human approval
is not a required workflow state. The agent must fail closed on failed tests, unresolved scope,
missing evidence, protected-branch violations, destructive migrations, production deployment,
infrastructure changes, or auth/security-boundary changes unless the goal explicitly authorizes
the action and the applicable automated security and release gates pass.

See [.agents/rules/governance.md](.agents/rules/governance.md), [.agents/rules/commits.md](.agents/rules/commits.md), and [.agents/rules/security.md](.agents/rules/security.md).

## Collaboration cycle (every session)

```text
DEFINE → PLAN → EXECUTE → REVIEW → SHIP (PR-First)
```

Each name is a **collaboration phase** — not an operating mode, bundle mode, or response level. See [design-spec.md](docs/03-architecture/design-spec.md) §8.

For any `execute <GOAL_ID>`, `implement G-xxx`, or `เริ่ม step N` request, Codex, Claude,
Antigravity, and every execution agent MUST first read and follow
[.agents/templates/execute-goal.md](.agents/templates/execute-goal.md). That template is the
shared authoritative execution protocol; task-specific skills add constraints but do not replace it.

For the generic request **"spawning subagents to execute active goals"**, the coordinator must
perform active-goal inventory and safe preflight remediation automatically. It must not stop only
because the branch is not yet goal-specific, the worktree is dirty, or derived gates are pending;
it must isolate unrelated changes, prepare the eligible goal context, and dispatch only after
touch-map, dependency, persona, and token gates pass. Stop only for a genuine human decision or
unsafe external mutation.

1. **DEFINE** — Discovery interview → distill knowledge → record decisions → then goals ([knowledge-loop.md](docs/06-workflows/knowledge-loop.md))
2. **PLAN** — Confirm In/Out/touch map; acceptance contract; ClickUp sync (`ready`); branch preparation (`feature/G-xxx`)
3. **EXECUTE** — Implement with task skill (API, migration, …) within touch map on `feature/G-xxx`; ClickUp sync (`in_progress`). Coordinators autonomously resolve derivable placeholder goal metadata from repository evidence and record assumptions; they do not wait for human clarification unless product intent, security authority, destructive scope, or external approval is genuinely ambiguous.
4. **REVIEW** — Run code-review skill, tests, security, scope, and evidence gates; automated approval → `approved`
5. **SHIP (PR-First)** — Close goal (`goals/_archived/`), ClickUp sync (`done`), commit & push to `origin/feature/G-xxx`, and create the configured PR after all automated gates pass

## Context loading (before collaboration phase EXECUTE)

**Do not** load the full list below on every step — use the **context compiler**:

| Command trigger | Load |
|---------|------|
| **ทำ G-xxx** | `goals/G-xxx.md` only |
| **compile G-xxx** / hydrate | Build `.bundle/` per [context-compiler.md](docs/03-architecture/context-compiler.md) |
| **เริ่ม step N** | `step-N.md` + `action-step-N.yaml` + allowed_files |
| **continue G-xxx** | `delta.md` + changed paths only |

Full project context (bootstrap, discovery, new goal draft) — load in order:

1. This file (`AGENTS.md`)
2. [docs/00-project-snapshot.md](docs/00-project-snapshot.md)
3. [docs/02-product/project-brief.md](docs/02-product/project-brief.md)
4. Active goal in [docs/07-backlog/goals.md](docs/07-backlog/goals.md)
5. Acceptance contract `docs/02-product/acceptance/G-xxx.md` (if present)
6. Linked ADR in `docs/05-decisions/`
7. Relevant API/data docs
8. Matching `soda-*` skill

## Read first (in order)

1. [docs/02-product/project-brief.md](docs/02-product/project-brief.md) — canonical spec
2. [docs/03-architecture/overview.md](docs/03-architecture/overview.md) — stack & boundaries
3. [docs/03-architecture/design-spec.md](docs/03-architecture/design-spec.md) — framework map
4. [docs/07-backlog/goals.md](docs/07-backlog/goals.md) — pick **one** active goal
5. [docs/06-workflows/definition-of-done.md](docs/06-workflows/definition-of-done.md)
6. [docs/03-architecture/technical-specifications-sot.md](docs/03-architecture/technical-specifications-sot.md)
7. [docs/03-architecture/software-quality-sot.md](docs/03-architecture/software-quality-sot.md)

## Work loop (every round — PR-First)

1. Select a goal: When commanded with `execute G-xxx` or swarming, if the goal is `draft` or `planned` with verified specs, autonomously promote it to `ready` -> `in_progress`. Ensure dedicated branch `feature/G-xxx` (autonomously provisioned if not checked out). Skip only when dependencies are blocked or genuine `[NEEDS CLARIFICATION]` exists.
2. Confirm **In / Out / Touch map / Acceptance criteria** — stop only if unresolved `[NEEDS CLARIFICATION]` exists.
3. Advance goal status → `in_progress` (collaborative phase `EXECUTE`). Sync ClickUp → `in_progress`.
4. Load matching **soda-** skill; implement within goal scope on `feature/G-xxx`.
5. Set goal status → `review` (sync ClickUp); run **soda-testing** + **soda-code-review**.
6. Automated review, security, scope, dependency, and evidence gates pass → `approved` (sync ClickUp).
7. Mark goal `done`: When commanded with `execute G-xxx` or swarming, if all tests and verifications pass green, the executing agent MUST NOT refuse or stall claiming the goal card is draft or incomplete; the agent itself autonomously marks all work steps done, checks off satisfied acceptance criteria and spec checklist items (`- [x]`), updates goal card header and frontmatter to `status: done`, and runs `node ./cli.js goal close G-xxx` (or `soda-os goal close G-xxx`) to atomically archive the card to `goals/_archived/G-xxx.md` and reconcile the epic queue. Sync ClickUp.
8. **SHIP (PR-First):** Commit and push all changes directly to `origin/feature/G-xxx`. Generate the configured PR and output the direct PR URL plus automated evidence.

Full workflow: [docs/06-workflows/dev-loop.md](docs/06-workflows/dev-loop.md)

## Dev agent roles

| Role | Reads | Does |
|------|-------|------|
| **Planner** | brief, digest, assumptions | Break work into goals |
| **Implementer** | active goal + architecture + skill | Code in scope on `feature/G-xxx` |
| **Tester** | acceptance contract + test plan | Tests green (`soda-testing`) |
| **Reviewer** | DoD + diff | Approve (`soda-code-review`) |
| **Shipper** | deploy / PR goal | PR generation & staging deploy (`soda-deploy-staging`) |

Details: [docs/04-agents/dev-roles.md](docs/04-agents/dev-roles.md)

- **Branch Isolation** — all work on dedicated `feature/G-xxx` branch; agent autonomously provisions `feature/G-xxx` upon execution.
- **Zero Local Integration Merging** — agent never merges locally; all integration into `develop` occurs via GitHub PRs.
- **Commit & Push on Feature Branch** — all code, tests, acceptance contracts, archived goals, ClickUp syncs, and `docs/06_raw/` logs pushed to `origin/feature/G-xxx`.
- **Autonomous Goal Progression** — when commanded with `execute G-xxx`, agents autonomously promote unblocked `draft` goals with complete specs to `ready` -> `in_progress` and provision branches without stalling.
- **One goal per commit** — no drive-by refactors or multi-goal commits.
- **Touch map only** — no repo-wide changes outside goal scope.
- **Spec stability** — do not guess; Intent is WHAT/WHY; **`analyze G-xxx`** before first execute.
- **Semantic goal generation** — Codex, Claude, Antigravity, and other agents must ground every generated goal section in project evidence. Structural template conformance alone is insufficient; generic template examples, irrelevant stack assumptions, placeholder work steps, and invented commands must be removed.
- **Goal completeness** — for LivePilot OS, generated goals must cite `REQ-LP-NNN` from [the requirements baseline](docs/03-architecture/live-pilot-os-requirements.md) and pass [the completeness contract](docs/03-architecture/goal-generation-completeness.md) before `ready`.
- **Technical SOT compliance** — goals affecting architecture, APIs, events, persistence, adapters, deployment, or quality MUST read and remain within [the technical specifications SOT](docs/03-architecture/technical-specifications-sot.md). New contracts must be registered in [coverage.yaml](docs/03-architecture/contracts/flows/coverage.yaml).
- **Production-grade simulation** — simulated adapters and fixtures MUST use real validation, authorization, lifecycle, idempotency, timeout, unknown-result, reconciliation, audit, and mode-label behavior. Simulation is not permission to bypass production controls.
- **Provider parity** — Codex, Claude, and Antigravity must use the same `soda-goal-generation` skill and the same repository-grounded context. Goal quality must not vary by model; provider-specific goal shortcuts are forbidden.
- **Context authority** — For deep-context requests, Antigravity is the designated context and goal-generation authority. Codex and Claude must consume Antigravity’s generated context and canonical goal artifacts for execution; they must not independently reinterpret goal intent, scope, dependencies, touch maps, or acceptance criteria.
- **Antigravity generation gate (Goal Drafting Only — Not Execution Gate)** — Deep-context goal generation requires a persisted, source-cited Antigravity context artifact containing derived intent, atomic outcomes, repository evidence, and validation evidence. If it is absent, stale, or inconsistent during goal drafting, Codex and Claude fail closed and request a fresh Antigravity context pass. This gate applies ONLY to authoring new goals from scratch; during active goal execution (`execute G-xxx`), Codex and Claude MUST NOT invoke this gate or claim the goal card is "semantically incomplete" to refuse closure when implementation and tests pass 100% green. The agent autonomously updates the card and archives it.
- **External tools / MCP** — consumer connects; agent calls them only when the goal step names them ([external-tools.md](docs/06-workflows/external-tools.md)).
- **Tests before goal status `review`** — do not mark complete if tests or analyzer fail.
- **SOT hierarchy before review** — run `node scripts/architecture/check-sot.mjs`; any missing flow ownership, contract coverage, lifecycle, error/recovery, verification, session scope, idempotency, or audit evidence blocks `review`.
- **Quality evidence before approval** — run the applicable software-quality scorecard and attach a revision-bound receipt. `PASS-SIMULATED` proves core software behavior only; it never certifies an unavailable external platform.
- **Skill registry integrity** — every skill must have a valid `SKILL.md` frontmatter (`name`, semver `version`, and `description`), match its directory name, and be linked from the skills catalog. Run `node scripts/agents/check-skill-registry.mjs` before review; failures block review.
- **SOT-linked skill selection** — architecture-impacting skills must be selected with an explicit SOT touch map; missing or stale SOT links block execution until resolved.
- **Automated evidence before `done`** — status must reach `approved` only after all required automated gates pass; no human sign-off state is required.
- **Respect Project Scope** — no out-of-scope features without a new goal row.
- **Minimize diff** — smallest change that satisfies acceptance criteria.
- **Do not deploy to production** unless goal explicitly includes it and human confirms.
- **No secrets** — never commit or expose `.env`, tokens, keys (see `security.md`).

## Operating modes

Governance overlay — not collaboration phases. See [design-spec.md](docs/03-architecture/design-spec.md) §8.

| Operating mode | Rules |
|------|-------|
| **Normal** | Full review; no hotfix without goal + review |
| **Incident** | Human declares; follow `soda-incident-response`; emergency path requires explicit authorization |

## Standard commands

```bash
# Replace with your stack — run from repo root; app lives in code/
# cd code && npm test && npm run lint
# cd code && dart analyze && flutter test
# cd code && go test ./... && golangci-lint run
node scripts/architecture/check-sot.mjs
node scripts/agents/check-skill-registry.mjs
node scripts/contract-check/error-code-registry.mjs
node scripts/api/check-api-sot-traceability.mjs
node scripts/testing/check-tdd-traceability.mjs
npm run lint:check
npm run test
npm run build
```

## Soda standard skills (registry-backed)

The repository currently contains 102 local skills. The complete inventory is
derived from `.agents/skills/*/SKILL.md`; the machine-readable contract is
[skills-registry.yaml](docs/04-agents/skills-registry.yaml), and the human catalog is
[skills-library.md](docs/04-agents/skills-library.md). Do not add a skill only to this
summary table: add its `SKILL.md`, catalog entry, and registry validation coverage.

Core routing skills:

| Skill | Command triggers |
|-------|------|
| [soda-discovery](.agents/skills/soda-discovery/SKILL.md) | `discover`, `coverage`, `knowledge audit` (DEFINE) |
| [soda-atomic-unit-scoping](.agents/skills/soda-atomic-unit-scoping/SKILL.md) | `scope down`, `atomic goal`, `reduce scope`, `too big`, `split goal` (DEFINE/PLAN) |
| [soda-executive-briefing](.agents/skills/soda-executive-briefing/SKILL.md) | `management update`, `executive briefing`, `leadership summary`, `exec summary` (REVIEW/SHIP) |
| [soda-post-mortem](.agents/skills/soda-post-mortem/SKILL.md) | `post-mortem`, `rca`, `root cause analysis`, `bug writeup`, `/post-mortem` (REVIEW/SHIP) |
| [soda-scrutinize](.agents/skills/soda-scrutinize/SKILL.md) | `scrutinize`, `audit plan`, `second opinion`, `review PR`, `/scrutinize` (PLAN/REVIEW) |
| [soda-debug-mantra](.agents/skills/soda-debug-mantra/SKILL.md) | `debug`, `broken`, `failing`, `stack trace`, `/debug-mantra` (EXECUTE) |
| [soda-node-consensus-contracts](.agents/skills/soda-node-consensus-contracts/SKILL.md) | `consensus`, `node contract`, `inter-node`, `distributed agreement`, `raft`, `paxos`, `fencing token` (PLAN/EXECUTE/REVIEW) |
| [soda-node-contract-invariants](.agents/skills/soda-node-contract-invariants/SKILL.md) | `contract invariant`, `payload contract`, `multi-node contract`, `krakend contract`, `bff contract` (PLAN/EXECUTE/REVIEW) |
| [soda-learning-loop](.agents/skills/soda-learning-loop/SKILL.md) | `observe`, `learn`, `post-ship G-xxx` (evolve map) |
| [soda-goal-workflow](.agents/skills/soda-goal-workflow/SKILL.md) | Any G-PAY-001 / G-xxx work · `clarify` · `spec check` · `analyze` · `soda-os goal next` |
| [soda-design](.agents/skills/soda-design/SKILL.md) | `design G-xxx`, `ux flow`, `tokens`, `ui spec`, `design review` (UI/UX goals) |
| [soda-rest-api](.agents/skills/soda-rest-api/SKILL.md) | API endpoints |
| [soda-testing](.agents/skills/soda-testing/SKILL.md) | Tests & CI |
| [soda-code-review](.agents/skills/soda-code-review/SKILL.md) | Before done / PR |
| [soda-deploy-staging](.agents/skills/soda-deploy-staging/SKILL.md) | Staging deploy |
| [soda-upgrade-os](.agents/skills/soda-upgrade-os/SKILL.md) | Upgrade OS in existing projects (Phase 2) |
| [soda-incident-response](.agents/skills/soda-incident-response/SKILL.md) | Incidents |
| [soda-db-migration](.agents/skills/soda-db-migration/SKILL.md) | Schema migrations |
| [soda-iso29110](.agents/skills/soda-iso29110/SKILL.md) | `iso scan`, `iso generate`, `iso screenshots`, `iso publish`, `iso validate` — 23 WPs + five consumer MCPs |

Catalog & versions: [docs/04-agents/skills-library.md](docs/04-agents/skills-library.md)

Add `{project}-*` skills only for project-specific conventions; register in the catalog.

## Cursor rules

Persistent constraints: [.agents/rules/](.agents/rules/) — `core`, `governance`, `security`, `guidelines`, stack-specific `{stack}.md`.

## CI & GitHub hard guards

| Asset | Purpose |
|-------|---------|
| [docs/06-workflows/github-governance.md](docs/06-workflows/github-governance.md) | Protected branches + setup |
| [.github/workflows/governance.yml](.github/workflows/governance.yml) | Goal reference, commit format, secret scan |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | App test/lint |
| [.github/pull_request_template.md](.github/pull_request_template.md) | PR checklist |

Copy [.github/ci-config.example.yml](.github/ci-config.example.yml) → `ci-config.yml` at G-001 bootstrap.

Run locally: `bash scripts/ci/governance-check.sh` · `bash scripts/ci/app-ci.sh`

**Existing projects:** [soda-os upgrade](soda-os upgrade) — two-phase: Phase 1 script, Phase 2 [soda-upgrade-os](.agents/skills/soda-upgrade-os/SKILL.md) · [upgrade-agent-os.md](docs/06-workflows/upgrade-agent-os.md) · [framework-manifest.yml](framework-manifest.yml)
