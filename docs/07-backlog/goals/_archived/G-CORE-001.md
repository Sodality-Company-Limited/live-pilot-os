# G-CORE-001: Synchronize Ecosystem Governance Rules, Goal-Partitioned Clarification Engine, and CI Harnesses

**Status:** done  
**Kind:** chore  
**Atomic outcome:** Synchronize missing governance rules, goal-partitioned clarification resolver, and CI verification harnesses from downstream projects into Soda OS and template distribution.  
**Epic:** CORE  
**Depends on:** —  
**Blocks:** —  
**Spec stability:** clarify done · spec check done · analyze done | n/a  

#### Plan

**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Socratic Clarification & Architectural Alignment via CLARIFICATION-G-CORE-001.md | done |
| 2 | Ingest missing governance rules into .agents/rules/ and template/.agents/rules/ | done |
| 3 | Port clarification-resolver and scorecard-scorer libraries into scripts/lib/ and template/ | done |
| 4 | Import schema-compatibility and compose-topology CI harnesses into scripts/ci/ and template/ | done |
| 5 | Update template/framework-manifest.yml and fix harness path resolution | done |
| 6 | Execute npm test and npm run test:template verification suite | done |

`pending` · `current` · `done` · `blocked` — mark one step `current` during EXECUTE.

## Context

Downstream projects (`sodality-aether`, `sodality-creator-hub`, `sodality-nextjs`, `sodality-aexis`) have organically hardened their agent governance rules (BDD, Senior SWE Code Review, LLM Wiki, TDD, Grill Me, Goal Orchestration), resolved multi-agent concurrency collisions via Goal-Partitioned Clarification state machines, and introduced advanced CI validation harnesses. Soda OS framework and its distribution template must be updated to incorporate these enhancements.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Downstream projects are diverging from Soda OS root because critical governance rules and harness fixes developed in production projects have not been unified into the central framework, causing drift and concurrency collisions.

**Done when:** All 10 evolved governance rules exist in both `soda-os/.agents/rules/` and `template/.agents/rules/`, `scripts/lib/clarification-resolver.mjs` is established, `CANONICAL_TEMPLATE_PATH` is resilient across root and downstream environments, `framework-manifest.yml` protects LLM Wiki and clarification artifacts, and all test harnesses pass 100% green.

**Unblocks:** Downstream repository upgrades via `soda-os upgrade --yes` without configuration drift or broken template references.

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable business or technical outcome.
- **No decomposition leakage:** Any second independently deployable outcome becomes a separate goal.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, hardcoded success responses, or string simulations in implementation or acceptance evidence.
- **Real boundary verification:** External dependencies use an approved sandbox, local executable implementation, recorded contract fixture, or integration environment that exercises the real boundary; a test double cannot be used to claim completion.
- **Failure behavior:** Missing dependency, unavailable model, or failed tool call must produce an explicit error/unknown state and must not be converted into success or safety.

## Quality priority

**Priority:** P1  
Use [quality-priorities.md](../../06-workflows/quality-priorities.md). P0/P1 findings block promotion; every finding needs a concrete solution, owner, and verification result.

## Gap analysis

| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-001 | P1 | 6 governance rules missing from soda-os and 4 rules missing from template | framework-engineer | Ingest rules across root and template | diff check & manifest audit | closed |
| GAP-002 | P1 | Concurrency hazard in shared CLARIFICATION.md | framework-engineer | Deploy clarification-resolver and goal-partitioned paths | unit test pass | closed |
| GAP-003 | P2 | test-goal-template-harness hardcodes template path | qa-engineer | Dynamically resolve CANONICAL_TEMPLATE_PATH | test-goal-template-harness | closed |

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:**
- Node.js ESM modules (`.mjs`) for cross-platform zero-dependency harnesses.
- Synchronized governance rules across `.agents/rules/` and `template/.agents/rules/`.
- Goal-partitioned clarification state machine (`CLARIFICATION-{GOAL-ID}.md`) with automatic archive to `docs/07-backlog/clarifications/`.
- Dynamic path resolution for `CANONICAL_TEMPLATE_PATH` checking both relative `template/` and root `.`.
- Ingestion of zero-mock CloudEvents schema compatibility checker and Docker Compose port collision / network linkage topology validator.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] All 6 architectural domains aligned and verified with human reviewer in `CLARIFICATION-G-CORE-001.md`.


## Knowledge links

> Sync to [knowledge-map.json](../../02-product/knowledge-map.json) → `goals[]`. **Why** must trace to at least one `P-xxx` or accepted PDR.

| Type | IDs |
|------|-----|
| **Pains addressed** | P-DRIFT-001, P-CONCURRENCY-001 |
| **Decisions** | PDR-0001, ADR-001 |
| **Assumptions required** *(must be validated before `ready`)* | A-COMPAT-001 |
| **Evidence** | E-DIFF-001 |

## Context manifest

> **Compiler input** — like `package.json` for compile dependencies. [context-compiler.md](../../03-architecture/context-compiler.md)  
> On `compile G-CORE-001`, compiler builds progressive `.bundle/G-CORE-001/cache/G-CORE-001-{hash}/`.

| Kind | IDs / paths |
|------|-------------|
| **ADR** | ADR-001 |
| **PDR** | PDR-0001 |
| **Patterns** | ORG-GOVERNANCE-001 |
| **Acceptance** | `docs/02-product/acceptance/G-CORE-001.md` |
| **Skills** | `soda-goal-workflow` \| `soda-upgrade-os` \| `soda-quality-engineering` |
| **Profile** | `developer` |
| **Task type** | `modify_existing_api` |
| **Playbook** | PB-UPGRADE |
| **Default role** | `framework-architect` |
| **Files** | `.agents/rules/*`, `template/.agents/rules/*`, `scripts/lib/*`, `template/framework-manifest.yml` |
| **Constraints** | Zero mocks, backward compatibility with existing Soda projects |

## Work steps

Ordered execution contract for **this card only** — Antigravity or another agent executes the same list. Do not label steps as "human" vs "AI". Every implementation step must be atomic and include its allowed files, ordered actions, completion gate, and failure/stop condition. Do not use broad instructions such as “implement the feature” or “run tests”.

### Step 1 — Human Alignment & Socratic Confirmation

**Allowed files:** `CLARIFICATION-G-CORE-001.md`  
**Actions:**

1. Present 6-domain candidate blueprint to human reviewer via `ask_question` and markdown file.
2. Record human selections and transition state to `[STATE: READ_ANALYZING]`.

**Completion gate:** `CLARIFICATION-G-CORE-001.md` reaches `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Stop condition:** Unresolved clarification points or human rejection.

### Step 2 — Governance Rule Ingestion & Template Synchronization

**Allowed files:** `.agents/rules/*`, `template/.agents/rules/*`  
**Actions:**

1. Port `bdd-specification.md`, `code-review.md`, `goal-orchestration.md`, `interactive-alignment-grill-me.md`, `llm-wiki.md`, and `tdd-execution.md` into `.agents/rules/` and `template/.agents/rules/`.
2. Sync `code-navigator.md`, `file-based-state-machine-async-qa.md`, `multimodal-vision-clarification.md`, and `text-requirement-interrogation.md` into `template/.agents/rules/`.

**Completion gate:** `diff -rq .agents/rules template/.agents/rules` reports zero missing rules.  
**Stop condition:** Syntax or YAML frontmatter parse failure.

### Step 3 — Shared Clarification Resolver Library & Harness Ingestion

**Allowed files:** `scripts/lib/*`, `template/scripts/lib/*`, `scripts/ci/*`, `template/scripts/ci/*`, `scripts/harness/*`, `template/scripts/harness/*`  
**Actions:**

1. Port `clarification-resolver.mjs` and `scorecard-scorer.mjs` into `scripts/lib/` and `template/scripts/lib/`.
2. Port `check-schema-compatibility.mjs` and `compose-topology-validator.mjs` into `scripts/ci/` and `template/scripts/ci/`.
3. Port `openapi-spectral-ruleset.yaml` into `scripts/harness/` and `template/scripts/harness/`.
4. Update `scripts/harness/test-goal-template-harness.mjs` and `template/scripts/harness/test-goal-template-harness.mjs` to dynamically resolve `CANONICAL_TEMPLATE_PATH`.
5. Harmonize `goal-template-conformance-harness.mjs`.

**Completion gate:** Unit test for `clarification-resolver.mjs` passes and template harness tests succeed.  
**Stop condition:** Any test failure or import resolution error.

### Step 4 — Framework Manifest & Scaffolding Updates

**Allowed files:** `template/framework-manifest.yml`, `template/docs/06_raw/*`, `template/docs/07-backlog/clarifications/*`, `cli.js`  
**Actions:**

1. Register new rules and `scripts/lib/` under `overwrite` in `template/framework-manifest.yml`.
2. Protect `docs/06_raw/**`, `docs/07-backlog/clarifications/**`, and `CLARIFICATION-*.md` under `never_touch`.
3. Add `docs/06_raw/index.md`, `docs/06_raw/log.md`, and `docs/07-backlog/clarifications/README.md` to `create_if_missing`.
4. Update `scripts/ia/system-admin-ai-socratic-clarifier.mjs` and `scripts/ia/ecosystem-ia-socratic-agent.mjs` to consume `clarification-resolver.mjs`.

**Completion gate:** `npm test` and `npm run test:template` pass 100% green.  
**Stop condition:** Any governance check or harness failure.

## In

- Porting 10 governance rules into root and template distributions
- Deploying `scripts/lib/clarification-resolver.mjs` and `scorecard-scorer.mjs`
- Fixing downstream template path fragility in `test-goal-template-harness.mjs`
- Ingesting schema compatibility and compose topology CI checkers
- Updating `template/framework-manifest.yml` with proper overwrite and never_touch protections
- Scaffolding LLM Wiki and clarification directories in `template/`

## Out

- Modifying existing product code in downstream repositories (e.g. `sodality-aether`, `sodality-creator-hub`)
- Re-architecting unrelated external API endpoints

## Change delta *(brownfield — required when this goal touches existing behaviour)*

| Area | Action | Path / behaviour |
|------|--------|------------------|
| Governance Rules | ADD | 6 new rules in root and 10 rules in template |
| Clarification State Machine | CHANGE | Single CLARIFICATION.md -> Goal-partitioned CLARIFICATION-{GOAL_ID}.md |
| Shared Libraries | ADD | `scripts/lib/clarification-resolver.mjs` and `scorecard-scorer.mjs` |
| Framework Manifest | CHANGE | Add rules, scripts/lib/, never_touch protections, and create_if_missing |
| CI Harnesses | ADD | `check-schema-compatibility.mjs`, `compose-topology-validator.mjs` |
| Harness Path Resolution | CHANGE | `test-goal-template-harness.mjs` supports both root and downstream paths |

## Software & Architecture Design *(AI Agent — PLAN phase)*

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/poc` |
| **System Archetype** | `sre-control-plane` |
| **Bounded Context & Domain** | Core Governance & Agent SDLC Framework |
| **Ports & Adapters Topology** | Driving Inbound: `soda-os` CLI & Agent prompts <br> Driven Outbound: File system, Git hooks, CI runners |
| **State Machine & Invariants** | FSM: `[STATE: AWAITING_HUMAN_ROUND_N]` -> `[STATE: READ_ANALYZING]` -> `[STATE: ALIGNMENT_COMPLETE]` |
| **Zero-Mock & Conformance Gate** | 100% Concrete Node.js and Bash scripts; Zero mocks; Validated via `npm test` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260928_081000_soda_os_ecosystem_gap_analysis_and_codebase_upgrade_blueprint.md` |

## Spec checklist *(required `[x]` before `ready` — unit tests for this card)*

- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is empty while `draft`; filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [x] No `[NEEDS CLARIFICATION]` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable
- [x] Touch map is real repo paths
- [x] Knowledge links: Why traces to `P-xxx` or accepted PDR
- [x] Change delta filled if modifying existing behaviour
- [x] Critical-path assumptions are not `open` + `low`
- [x] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [x] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [x] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)

## Acceptance criteria

- [x] All 10 governance rules exist in `.agents/rules/` and `template/.agents/rules/` with matching schemas.
- [x] `scripts/lib/clarification-resolver.mjs` and `template/scripts/lib/clarification-resolver.mjs` exist and pass unit tests.
- [x] `template/framework-manifest.yml` includes all updated rules, `scripts/lib/`, `never_touch` protections for `docs/06_raw/**` and `docs/07-backlog/clarifications/**`, and `create_if_missing` scaffolding.
- [x] `scripts/harness/test-goal-template-harness.mjs` dynamically resolves `CANONICAL_TEMPLATE_PATH` in both root and consumer contexts.
- [x] `scripts/ci/check-schema-compatibility.mjs` and `scripts/ci/compose-topology-validator.mjs` execute and pass self-tests.
- [x] `npm test` and `npm run test:template` execute 100% green with 0 errors.


## Test plan

- `npm test`
- `npm run test:template`
- `node scripts/ci/check-schema-compatibility.mjs --self-test`
- `node scripts/ci/compose-topology-validator.mjs`
- `node cli.js upgrade . --report`

## Touch map

- `.agents/rules/`
- `template/.agents/rules/`
- `scripts/lib/`
- `template/scripts/lib/`
- `scripts/ci/`
- `template/scripts/ci/`
- `scripts/harness/`
- `template/scripts/harness/`
- `template/framework-manifest.yml`
- `template/docs/06_raw/`
- `template/docs/07-backlog/clarifications/`
- `cli.js`

## Notes for AI

- Read: [CLARIFICATION-G-CORE-001.md](../../../CLARIFICATION-G-CORE-001.md)
- Invariant: Zero mocks, zero stubs, zero fallbacks.
- Update Plan table when phase or step changes.

---

## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Idle` | System bootstrap / Upgrade command | Validated project root & manifest | Transition to `State::Analyzing` | Abort with error message |
| `State::Analyzing` | `soda-os upgrade --report` | Zero mutation of product paths | Generate drift report | Highlight unclassified files |
| `State::MechanicalSync` | `soda-os upgrade --yes` | Strict allow-list from manifest | Overwrite framework assets | Stop on write error |
| `State::Verified` | CI governance check | 100% test pass; 0 warnings | Write `.soda-os-version` stamp | Rollback files on failure |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Currency & Monetary Math** | Exact integer arithmetic in the transaction currency's declared whole-unit representation (`i64`/`u64`); currency must be explicit and country-dependent (e.g. Satang). **ZERO float math**. |
| **Identifiers & Keys** | Time-ordered UUIDv7 (`uuid::Uuid::now_v7()`) or nanoid prefix (`g_xxx`, `core_xxx`). |
| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (`chrono::Utc::now()` / `new Date().toISOString()`). |
| **Idempotency & Deduplication** | `Idempotency-Key` header with 24-hour distributed Redis lock lease. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `CliUpgradePort` | Node.js process CLI | `cli.js` |
| **Driving (Inbound)** | `SocraticClarificationPort` | Markdown File State Machine | `scripts/lib/clarification-resolver.mjs` |
| **Driven (Outbound)** | `FileSystemPort` | Node.js `fs` / `fs/promises` | `cli.js`, `scripts/lib/` |
| **Driven (Outbound)** | `CiValidationPort` | Child process execution | `scripts/run-all-soda-harnesses.sh` |

### 4. UI/UX 5-State Matrix *(Applies when Kind is `design` or UI component)*

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | CLI and documentation surfaces rendered with clean markdown hierarchy | `bg-surface-elevated text-content-primary rounded-lg border border-border-subtle` |
| **2. Loading / Pending** | Spinner or progress stream during upgrade / harness execution | `animate-pulse bg-surface-muted rounded` |
| **3. Empty State** | Zero drift detected message | `text-content-secondary flex flex-col items-center justify-center p-8` |
| **4. Error State** | Detailed drift or failure list with remediation runbook reference | `bg-status-error-subtle text-status-error border-status-error rounded-md p-4` |
| **5. Success State** | 100% Green test certification banner | `bg-status-success-subtle text-status-success transition-all duration-200` |
