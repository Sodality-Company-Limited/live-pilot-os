---
description: AI governance — Autonomous-First Agentic Delivery, Automated Verification Oracles, and Fail-Closed External Boundaries
alwaysApply: true
---

# Autonomous-First Agentic Governance

Autonomous-first engineering and fail-closed safety boundaries governing autonomous agent swarms across the Sodality ecosystem. See [docs/03-architecture/design-spec.md](../../docs/03-architecture/design-spec.md) §5 and §8.

**Knowledge governance** (artifacts, traceability, patterns): [knowledge-governance.md](../../docs/06-workflows/knowledge-governance.md) — owner/approver matrix; agents autonomously draft and verify; humans maintain strategic oversight and merge authority.

## 1. Autonomous Execution Principle (Zero-HITL Operational Blocking)

Internal engineering operations—including autonomous dialectic discovery, BDD specification, GraphBit DAG scheduling, Red-Green-Refactor TDD, 28-pillar Senior Engineering Gate verification, formal proof receipt generation, goal closing & card archival, queue reconciliation, and GitHub PR creation—execute **100% AUTONOMOUSLY without human-in-the-loop (HITL) stalling**.

Agents DO NOT block on manual human prompts for intermediate development steps. Autonomous multi-persona self-supervision (Architect, Engineer, Critic, Adversary) and automated verification oracles replace manual sign-off bottlenecks.

**Zero Mechanical Preflight Stalling Invariant:** When commanded to execute a goal (`execute <GOAL_ID>` or swarming), agents MUST NOT block or fail closed on mechanical setup discrepancies (e.g. goal currently in `draft`, branch not yet provisioned, or untracked files outside touch map). The agent autonomously prepares `feature/<GOAL_ID>`, advances status `draft` -> `ready` -> `in_progress`, and executes immediately without waiting for human intervention.

## 2. Fail-Closed External Blast Radius Boundaries (Where Human Authorization Applies)

Human-In-The-Loop (HITL) authorization is strictly reserved for high-impact, irreversible external boundary mutations:

- Merging to protected integration branches (`develop`, `main` / `master`, or production trunk) on GitHub
- Switching to integration branches (`develop` / `main`) or executing `git merge` / `git rebase` locally
- Deploying directly to **production** cloud environments
- Modifying live cloud infrastructure (IaC, cloud provider config, DNS, CDN, Kubernetes cluster topology)
- Running **destructive** database migrations against live production databases (dropping tables, dropping columns, irreversible data modifications)
- Mutating production authentication, cryptographic key vaults, or permission boundaries
- Rotating master KMS Key Encryption Keys (KEKs) or modifying statutory payout/bank account coordinates (Pillar 23: Multi-Party Authorization Quorum / 4-Eyes Principle with 24-hour time-locked escrow)
- Force-pushing, hard resetting, or executing destructive git operations on remote branches

Agent autonomously implements within goal touch map on dedicated working branch (`feature/G-xxx`, `fix/G-xxx`, `hotfix/G-xxx`, etc.), runs tests/lint, commits and pushes to `origin/<working-branch>`, and generates PR targeting the defined target branch (`develop` for features/fixes, `main` for hotfixes) for human review and merge.

## 3. Mathematical Governance & Mathematical Harness Invariant (Autonomous Zero-HITL Execution)

When system operations become more autonomous (Zero-HITL operational execution), governance CANNOT rely on stochastic LLM judgment, heuristic vibes, or superficial reviews. Autonomy MUST be mathematically grounded, formally proven, and enforced by executable mathematical harnesses:

1. **Mandatory Mathematical Invariant Proofs:**
   - **Universal Multi-Currency System & Zero-Float Invariant:** All monetary amounts, balances, ledgers, token cost accounting, pricing, and quota rates across Soda OS and all downstream projects MUST be represented strictly via the universal Money Value Object pattern `(amount_minor: i64/BigInt, currency: ISO_4217, scale: u8)` as formalized in `scripts/lib/multi-currency-money.mjs`. All monetary arithmetic MUST be exact integer arithmetic parameterized dynamically by the declared ISO 4217 scale exponent $e \in \{0, 1, 2, 3, 4\}$ (e.g. 0-decimal JPY/KRW $e=0$, 2-decimal USD/EUR/GBP/THB $e=2$, 3-decimal BHD/KWD/OMR $e=3$). Floating-point representations (`f32`, `f64`, `Float`, `Double`, `number` with decimal fractions) are strictly banned. Direct cross-currency algebra without an explicit foreign exchange rate (`FxRate`) MUST fail closed (`CurrencyMismatchError`). Hardcoding country-specific currency subunits such as Satang is strictly prohibited.
   - **Algebraic Conservation Laws:** Financial revenue splits, commission allocations, fee calculations, and token transfers MUST satisfy exact integer conservation: $\sum \text{splits} \equiv \text{total}$ utilizing Fowler's remainder-preserving algorithm with zero unit loss. Rounding MUST utilize Banker's Rounding Half-Even (`div_half_even`), eliminating directional statistical drift.
   - **Double-Entry Multi-Currency Balancing:** Multi-currency ledgers MUST enforce per-currency conservation ($\sum \text{Debits}_c \equiv \sum \text{Credits}_c$ for all currencies $c$).
   - **SMT Automated Reasoning:** Numerical boundaries MUST be verified via SMT solvers (Z3 / CVC5 / Kani / CrossHair) over Quantifier-Free Linear Integer Arithmetic ($\text{QF\_LIA}$) to mathematically prove absence of integer overflow, underflow, array out-of-bounds, and unhandled divide-by-zero.
   - **Typestate FSM Proofs:** Lifecycle state transitions MUST be encoded as typestates (`Entity<State>`), mathematically preventing illegal state transitions at compile time.
   - **Axiomatic Hoare Triples:** Core domain methods MUST enforce Hoare Triples ($\{P\}\ C\ \{Q\}$), with ranking functions ($V: \text{State} \to \mathbb{N}$) proving non-divergence and total correctness.

2. **Calibrated Autonomy Routing (DAVE System 1):**
   - Autonomous routing without human oversight is ONLY permitted when the decision model's confidence is mathematically calibrated:
     - **Brier Score:** $B = \frac{1}{N} \sum_{i=1}^N (p_i - o_i)^2 \le 0.15$
     - **Expected Calibration Error (ECE):** $\text{ECE} = \sum_{m=1}^M \frac{|B_m|}{N} |\text{acc}(B_m) - \text{conf}(B_m)| \le 0.05$
     - **Binomial Confidence Interval:** Wilson score interval lower bound $p_{\text{lower}} \ge \tau$ at 95% confidence level.
     - **Strict Truth-Table Invariant:** $P(\text{proceed} \mid \text{risk} \in \{\text{high}, \text{critical}\} \land \text{evidence} == \text{unverified}) = 0$.
     - If confidence is uncalibrated ($ECE > 0.05$) or risk is high/critical without verified evidence, the autonomy router defaults fail-closed to `verify` or `human_review`.

3. **Mandatory Mathematical Harness Execution Suite:**
   For goals declaring mathematical assurance or formal proof profiles (`mathematical_proven_governance`), autonomous lifecycle transition to `review`, `approved`, and `done` verifies the formal mathematical harness suite:
   - `node scripts/harness/verification-orchestrator-harness.mjs --goal <G-xxx> --lifecycle-check done`
   - `node scripts/harness/property-invariant-harness.mjs`
   - `node scripts/harness/mutation-testing-harness.mjs` (Kill score $\ge 85\%$ when profile declared)
   - `node scripts/harness/proof-receipt-validator.mjs <G-xxx>` (Exact physical source file SHA-256 byte hash and git HEAD binding when receipt declared)
   - Target-language formal solver: Rust (`cargo kani`), Python (`crosshair check`), TypeScript (`fast-check` / `z3-solver`), Go (`nilaway` / `gopter`), Solidity (`certoraRun`), Distributed (`tlc`).
   - For all goals, running the canonical closure command `node ./cli.js goal close <GOAL_ID>` atomically validates and reconciles frontmatter lifecycle and markdown body, archiving the card to `goals/_archived/<GOAL_ID>.md`. Agents MUST NOT stall claiming a goal card is "semantically incomplete" when its implementation tests pass green.

## 4. Central Ecosystem Auto-Synchronization Invariant

Whenever Soda OS core framework files (governance rules, agent skills, verification harnesses, shared libraries, schema contracts, or CLI tools) are modified or updated:
1. The Agent MUST immediately execute central ecosystem cross-project synchronization:
   ```bash
   node ./cli.js sync-ecosystem
   ```
2. The synchronizer discovers and propagates updates across all 54 downstream repositories in `/Users/batrarethsudprasert/projects` (9 Tier A, 45 Tier B).
3. All downstream repositories MUST maintain zero drift and 100% bitwise parity against Soda OS.

## 5. PR-First Governance & Branch Isolation (Non-Negotiable Invariants)

1. **Strict Branch Isolation:** Every goal `G-xxx` operates exclusively on its dedicated working branch matching the archetype:
   - `feature/G-xxx` (e.g. `feature/G-001`, `feature/G-086`) -> for standard features, branching from and targeting `develop`.
   - `fix/G-xxx` or `bugfix/G-xxx` (e.g. `fix/G-105`) -> for bugfixes, branching from and targeting `develop`.
   - `hotfix/G-xxx` (e.g. `hotfix/G-106`) -> for urgent production hotfixes, branching from and targeting `main`.
   - `refactor/G-xxx` or `chore/G-xxx` -> for maintenance tasks, targeting `develop`.
2. **Zero Local Integration Merging:** The agent is strictly forbidden from switching to `develop` or `main`, or running `git merge` locally. Integration into integration branches happens exclusively in the cloud on GitHub via Pull Requests reviewed and merged by humans.
3. **Commit & Push on Working Branch:** All code changes, unit/integration tests, acceptance contracts (`docs/02-product/acceptance/G-xxx.md`), backlog transitions & goal archiving (`goals/_archived/G-xxx.md`), ClickUp sync metadata, and ISO audit logs (`docs/06_raw/`) MUST be committed and pushed directly to `origin/<working-branch>`.
4. **Pull Request Generation:** On `ship G-xxx` (or `open PR G-xxx`), the agent creates/generates the GitHub PR targeting the defined target integration branch (default: `develop`, or `main` for hotfix) using the filled PR template, and outputs the direct GitHub PR link alongside a structured checklist for human review and merge.

## External tools / MCP

Connectors (browser automation, design-file MCP, extra trackers, …) are **consumer-owned**. Soda OS does not ship `mcp.json` or named servers. How to connect: [external-tools.md](../../docs/06-workflows/external-tools.md).

**Agent may call an external tool only when:**

- Goal is `ready` or `in_progress` (PLAN read-only design tools: also on **`design G-xxx`** if Notes for AI list them)
- Human started the work (**`เริ่ม step N`**, or the design PLAN trigger above)
- The **current Work step** and/or **Test plan** (or Notes for AI) names the tool, target, and pass/fail
- Code goals: **Spec stability** `analyze` is `done` or `n/a`
- Target is **not production** unless **In** + human say so

**Default posture:** observe / read first. Clicks, form fills, file writes, comments, and publishes need an explicit **In** / Test plan line.

**Forbidden:** invent which MCP to use; pass `.env` secrets as tool args; use a tool to skip `ready` / `analyze` / human `done`; dump tool output as a new OS layer.

If the step needs a tool but none is named → **`clarify G-xxx`**. Do not guess Chrome vs Playwright vs Figma.

## Execution boundaries

**Allowed (within active goal touch map):**

- Edit files listed in goal **Touch map**
- Write or update tests for goal behavior
- Update goal docs, acceptance contract, API/data docs when goal requires
- Create PR (human merges)

**Forbidden:**

- Unrelated refactors or repo-wide style sweeps
- Edits outside goal **Touch map** (except linked docs above)
- Reading or committing `.env`, credentials, tokens, or key files
- Passing secrets or production URLs into external tools / MCP arguments
- Major dependency upgrades unless goal **In** scope says so
- Declaring `done` without satisfying DoD and automated verification gates (human approval is not required when automated evidence gates pass)
- Filling unspecified requirements with a guessed stack, API, or auth scheme (use `[NEEDS CLARIFICATION]` + **`clarify G-xxx`**)
- First **`เริ่ม step N`** on a code goal while **Spec stability** `analyze` is still `pending`
- Promoting code to `review` or `approved` that fails any of the 28 pillars of the Senior Engineering Gate

## Senior Engineering Gate Invariant (Mandatory for Review & Approval)

Before any goal can transition from `in_progress` to `review`, and prior to advancing to `approved` (via automated verification or human sign-off), the implementation MUST satisfy the **Unified 28-Pillar Senior Engineering Gate** across all 7 enterprise domains codified in [.agents/rules/code-review.md](code-review.md):

1. **Domain I: Algorithmic Correctness, Data Integrity & Formal Verification** (Pillars 1–4)
   - Zero-Mock Constitution, minor currency integer units, bounded connection pooling, IAM & Row-Level Security (RLS) tenant isolation, and 10-point Formal Verification Checklist compliance.
2. **Domain II: Concurrency, Deadlock Prevention & Distributed State** (Pillars 5–8)
   - Async sagas with compensation rollbacks, strict global lock hierarchy & distributed mutex fencing tokens, Read-Your-Own-Writes (RYOW) anti-entropy, and chaos resilience with half-open circuit breakers.
3. **Domain III: Consensus, Flow Control & Partition Tolerance** (Pillars 9–12)
   - Distributed consensus quorum ($Q = \lfloor N/2 \rfloor + 1$) & leader lease fencing, backpressure gradient limiters & bounded CoDel queues, OpenAPI 3.1 schema governance, and SRE Golden Signals telemetry.
4. **Domain IV: Migration Safety, Release Engineering & DevSecOps** (Pillars 13–16)
   - Zero-downtime expand-contract schema transitions, feature flag canary killswitches, DevSecOps SSRF IP-pinning & KMS envelope encryption, and SLSA Level 3 supply chain provenance.
5. **Domain V: Cryptography, Memory Hygiene & Zero-Trust Defense** (Pillars 17–20)
   - Zero-trust SPIFFE/SPIRE mTLS workload identity, sensitive memory hygiene (`ZeroizeOnDrop` / `mlock` RAM pinning), statutory data residency geo-fencing, and tamper-evident Merkle DAG audit trails.
6. **Domain VI: AI Agent Governance, LLM Firewalls & Autonomous Safety** (Pillars 21–24)
   - Dual-LLM prompt injection firewalls, autonomous tool sandboxing with 64MB memory caps & POSIX signal containment (`SIGSTOP`/`SIGCONT`/`SIGKILL`), multi-party quorum (4-Eyes Principle) with RFC 3161 TSA timestamping, and empirical zero-mock test verification.
7. **Domain VII: SRE Sustainability, Multi-Region DR & Operational Longevity** (Pillars 25–28)
   - Leak-free memory soak slope ($< 1\text{MB}/\text{hr}$), FinOps tenant cost quotas, multi-region active-active disaster recovery ($RTO \le 30\text{s}, RPO \le 5\text{s}$), and automated WAL PITR restore verification.

Automated verification harness: `node scripts/harness/senior-engineering-gate-harness.mjs <diff-or-goal>`

## Goal status flow (Autonomous State Machine)

Execution proceeds autonomously through the lifecycle state machine without requiring manual human prompts at intermediate steps:

```text
draft → ready → in_progress → review → approved → done
              ↘ blocked ↗
```

| Goal status | Autonomous Swarm Action | Automated Quality Gate | ClickUp Sync State |
|---|---|---|---|
| `draft` / `planned` | AI-to-AI Autonomous Socratic Dialectic Discovery: deconstructs root intent across Architect, Engineer, Critic, and Adversary personas; formulates BDD Given-When-Then specification. | Zero-HITL Socratic Convergence: 0 remaining ambiguities, quantitative SLAs locked. | `TO DO` / `Draft / Backlog` |
| `ready` | Goal scheduled for execution. Auto-dispatched by GraphBit DAG runner, `parallel-goal-planner`, or CLI `soda-os goal execute <G-xxx>`. | Conformance harness pass (`scripts/harness/goal-template-conformance-harness.mjs`). | `TO DO` / `Ready / To Do` |
| `in_progress` | Autonomous Red-Green-Refactor TDD implementation within declared Touch Map. Failing test written first, followed by 100% operational code. Zero mocks, zero stubs. | Automated test suite compilation and execution (`cargo test`, `pytest`, `npm test`). | `IN PROGRESS` |
| `blocked` | Fail-closed halt upon unresolvable dependency cycle, physical hardware limitation, or security violation. Emits structured diagnostic log. | Fail-closed quarantine. | `BLOCKED` |
| `review` | Automated Senior Engineering Review: verifies implementation against all 28 operational pillars across 7 enterprise domains. | Unified Senior Engineering Gate Harness (`scripts/harness/senior-engineering-gate-harness.mjs`). | `IN REVIEW` |
| `approved` | Autonomous Certification: all tests, compiler warnings, lints, and mathematical proof receipts pass 100% green. Card marked approved. | Exact-HEAD SHA256 cryptographic proof receipt validation (`proof-receipt-validator.mjs`). | `COMPLETE` / `Approved` |
| `done` | Atomic Goal Closure: executed via `soda-os goal close <G-xxx>`. Card moved to `_archived/`, epic queues reconciled, snapshot updated, git branch pushed to `origin/<branch>`, and PR created for human merge into `develop`. | Advisory multi-lock mutual exclusion, zero lost updates, bitwise queue parity. | `COMPLETE` / `Done` |

### ClickUp Synchronization Invariant (Mandatory)

Every goal state change across the lifecycle above MUST be synchronized to ClickUp using `soda-os sync-clickup G-xxx --status-only` (or `node scripts/goals/sync-clickup.js G-xxx --status-only`).
- **Trigger Points:** (1) `draft`/`planned` creation, (2) promotion to `ready`, (3) first step execution (`in_progress`), (4) blocker encountered (`blocked`), (5) handoff to `review`, (6) `approved` (automated verification or human sign-off), (7) goal closed to `done` / archived.
- **Invariant:** Changing a goal's status markdown file without executing ClickUp status sync violates framework governance when ClickUp configuration (`scripts/clickup.config.json`) is active.

## Context loading (before collaboration phase EXECUTE)

Load in order:

1. [AGENTS.md](../../AGENTS.md)
2. [docs/00-project-snapshot.md](../../docs/00-project-snapshot.md) (if present)
3. [docs/02-product/knowledge-map.json](../../docs/02-product/knowledge-map.json) (if filled — graph + coverage)
4. [docs/02-product/knowledge-digest.md](../../docs/02-product/knowledge-digest.md) (if filled)
5. [docs/02-product/assumptions.md](../../docs/02-product/assumptions.md) — block if open assumptions on critical path
6. [docs/02-product/project-brief.md](../../docs/02-product/project-brief.md)
7. Active goal in [docs/07-backlog/goals.md](../../docs/07-backlog/goals.md)
8. Acceptance contract `docs/02-product/acceptance/G-xxx.md` (if present)
9. Linked ADR / PDR in `docs/05-decisions/`
10. Relevant API/data docs in `docs/03-architecture/`
11. Matching `soda-*` skill for the task

Stop and ask if context is missing or goal scope is ambiguous. Do **not** guess — **`clarify G-xxx`**.

## Operating modes

Governance overlay — not collaboration phases. Canonical definitions: [design-spec.md](../../docs/03-architecture/design-spec.md) §8.

| Operating mode | When | Rules |
|------|------|-------|
| **Normal** | Default | Full review; no hotfix without goal + review |
| **Incident** | Human declares incident | [soda-incident-response](../skills/soda-incident-response/SKILL.md); human may authorize emergency path |

## Audit

After significant agent actions, human may append to [docs/07-backlog/changelog.md](../../docs/07-backlog/changelog.md).

## CI enforcement

GitHub Actions run [scripts/ci/governance-check.sh](../../scripts/ci/governance-check.sh) on PRs — see [github-governance.md](../../docs/06-workflows/github-governance.md). Humans enable protected branches; agents do not merge.
