# Global Agentic Engineering Constitution & Socratic Invariants

## Codex loading contract

This file is the shared Soda OS governance entry point for every downstream repository.
When a repository contains Soda OS, Codex must read this file together with the repository
root `AGENTS.md`, then load the applicable files from `.agents/rules/` and `.agents/skills/`.
At minimum, every implementation task must load `core.md`, `governance.md`, `security.md`,
and `guidelines.md`; the matching `soda-*` skill is required before implementation.

Project-local instructions define scope and product intent, but cannot override these shared
governance constraints. Missing or contradictory governance context is a fail-closed condition:
pause and report it before changing code.

This document establishes the **Global Engineering Constitution**, **Anti-Hallucination Multimodal Socratic Clarification Protocol**, and **Multi-Round File-Based State Machine (Async Q&A via Markdown)** across all repositories and workspaces.

### Single-persona subagent invariant

Every spawned subagent MUST receive exactly one explicit, stable persona at spawn time.
The persona must be a single string, remain unchanged for the full session, and be carried
through the prompt, session identity, and telemetry. A role is a work function and does not
permit persona switching, persona composition, or adopting additional personas.

### Single-owner context retrieval invariant

For each goal, only one dedicated context subagent may search the LLM Wiki or retrieve broad
reference context. It must emit a compact, source-cited digest. Other subagents may consume
that digest and files in their own touch map only; they may not repeat Wiki searches or receive
the full retrieved corpus.

### Autonomous execution & zero mechanical stalling invariant

When an agent or swarm is commanded with `execute <GOAL_ID>` or `spawning subagents to execute active goals`:
1. **Zero Mechanical Stalling:** Agents MUST NOT block or fail closed on mechanical setup discrepancies (e.g. goal marked `draft`, branch not yet provisioned, or unrelated untracked files outside touch map). The agent autonomously prepares `feature/<GOAL_ID>`, advances status `draft` -> `ready` -> `in_progress`, and executes immediately.
2. **Mandatory Card Status Updating & Archival on Done:** When implementation and verification pass green, the executing agent MUST NOT refuse, hesitate, or stall claiming that the goal card is draft or "semantically incomplete"; the agent itself MUST explicitly update the goal card (`status: done`, check off work steps, acceptance criteria, and spec checklist items `- [x]`, set phase to `SHIP`), run atomic closure (`node ./cli.js goal close <GOAL_ID>`), and prepare the PR. Running `node ./cli.js goal close <GOAL_ID>` atomically reconciles frontmatter lifecycle and markdown body. Agents must never leave completed goals unarchived, in `draft`, or in `in_progress`.

---

## 🏛️ SECTION I: THE GLOBAL ENGINEERING INVARIANTS (NON-NEGOTIABLE)

### ⚖️ Article I: Zero Mocks, Zero Stubs, Zero Fallbacks
- Every function, struct, class, and module written MUST be 100% fully realized, production-ready, and functionally active.
- Placeholder return values (`todo!()`, `unimplemented!()`, dummy fallback objects, commented-out assertions, or mocked API returns) are strictly forbidden.

### ⚖️ Article II: Mandatory Verification & Testing Pass
- Never declare success without running build and test commands (`cargo test`, `pytest`, `npm test`).
- All compiler errors and warnings must be resolved immediately.

### ⚖️ Article III: Structured Code Explanation Standard (WHERE, WHY, FOR WHOM, HOW)
- Every proposal, analysis, and change summary MUST be structured into:
  - **WHERE:** Absolute clickable markdown links with line numbers `[file](file:///path/to/file#L1-L10)`.
  - **WHY:** Deep architectural rationale, root cause analysis, and underlying mechanics.
  - **FOR WHOM:** Target actors, system components, or consumers.
  - **HOW:** Step-by-step algorithms, data flow, error handling, and empirical verification results.

### ⚖️ Article IV: Mathematical Proven Governance & Mathematical Harness Invariant
- When operating autonomously without human-in-the-loop (Zero-HITL), system governance and safety MUST NOT rely on stochastic LLM heuristics or ungrounded assertions.
- All critical business logic, financial arithmetic, concurrency coordination, and autonomy routing MUST be mathematically proven (algebraic conservation laws, Hoare pre/post conditions, SMT QF_LIA integer verification, Wilson score binomial intervals, Brier score $\le 0.15$, Expected Calibration Error $\text{ECE} \le 0.05$).
- Every autonomous state transition and goal closure MUST execute formal mathematical harnesses (`scripts/harness/verification-orchestrator-harness.mjs`, `mathematical-proof-engine.mjs`, `property-invariant-harness.mjs`, `proof-receipt-validator.mjs`) emitting cryptographic proof receipts bound to physical source file SHA-256 digests. If any mathematical verification fails, execution halts fail-closed.

### ⚖️ Article V: Central Ecosystem Auto-Synchronization Invariant
- Whenever Soda OS core framework files (governance rules, agent skills, verification harnesses, shared libraries, schema contracts, or CLI tools) are updated or modified, the Agent MUST immediately execute central ecosystem cross-project synchronization (`node ./cli.js sync-ecosystem`).
- All 54 downstream repositories in `/Users/batrarethsudprasert/projects` MUST be maintained with zero governance drift and 100% bitwise parity against the central Soda OS framework.

### ⚖️ Article VI: Universal Multi-Currency System & Zero-Float Invariant
- All monetary amounts, account balances, ledgers, token cost accounting, pricing, and quota rates across Soda OS and all downstream projects MUST be represented strictly via the universal Money Value Object pattern `(amount_minor: i64/BigInt, currency: ISO_4217, scale: u8)` as formalized in `scripts/lib/multi-currency-money.mjs`.
- All monetary arithmetic MUST be exact integer arithmetic parameterized dynamically by the declared ISO 4217 scale exponent $e \in \{0, 1, 2, 3, 4\}$ (e.g. 0-decimal JPY/KRW $e=0$, 2-decimal USD/EUR/GBP/THB $e=2$, 3-decimal BHD/KWD/OMR $e=3$).
- Floating-point representations (`f32`, `f64`, `Float`, `Double`, `number` with decimal fractions) are strictly banned from financial, billing, balance, quota, and tax logic.
- Direct cross-currency algebraic operations without an explicit foreign exchange conversion rate (`FxRate`) are strictly forbidden and MUST fail closed (`CurrencyMismatchError`).
- Revenue splits and allocations MUST utilize remainder-preserving algorithms (Martin Fowler's allocation) to guarantee exact integer conservation ($\sum \text{splits} \equiv \text{total}$), and midpoint rounding MUST utilize unbiased Banker's Rounding Half-Even (`div_half_even`).
- Hardcoding country-specific currency subunits such as Satang or assuming a single national fiat currency is strictly prohibited across all framework components, Socratic engines, BDD scenarios, and agent prompts.

---

## 👁️ SECTION II: MULTIMODAL VISUAL GROUNDING & POINT-BY-POINT CLARIFICATION

Whenever the user provides an **Image** (UI mockup, wireframe, screenshot, architecture diagram, flow chart, error screenshot):

1. **Strict Zero-Code Lock:** The Agent is **STRICTLY FORBIDDEN** from generating or modifying implementation code immediately.
2. **Spatial & Semantic Zone Decomposition:** Deconstruct the visual artifact into numbered, distinct semantic zones (`Zone 1: Header/Navigation`, `Zone 2: Metric Cards`, `Zone 3: Center Visualizations`, `Zone 4: Data Grids`, `Zone 5: Forms & Triggers`, `Zone 6: State Matrix`).
3. **Fact vs. Assumption Audit:** Explicitly categorize visual data into:
   - `[OBSERVED_FACTS]` (100% Explicitly Visible: exact text/OCR, visible controls, colors, spatial layouts).
   - `[UNDETERMINED_DYNAMICS]` (Unobserved & Inferred: API endpoint paths, WebSocket topic names, modal behaviors, calculation formulas, error states).
4. **Point-by-Point Multiple-Choice Questioning:** Formulate targeted clarifying questions for every ambiguous zone. Provide structured multiple-choice options with quantitative bounds and trade-offs, prefixing the optimal architectural path with **`(Recommended)`**.
5. **Human Alignment Lock:** Only transition to code implementation after user confirmation and formal BDD Given-When-Then specification.

---

## 📝 SECTION III: TEXTUAL REQUIREMENT & BROAD PROMPT DECONSTRUCTION

When a text prompt or feature request is received—**especially broad, high-level requests like *"create a dashboard like this"* or *"implement a trading bot"***:

1. **Strict Zero-Code Lock on Broad Prompts:** The Agent MUST NOT guess unstated requirements, invent fictitious APIs, or generate generic boilerplate.
2. **6-Domain Candidate Blueprint Deconstruction:** Interrogate the 6 core architectural domains:
   - **Target Persona & Scope:** Operator vs Exec vs Quant vs Public.
   - **Core KPI Metrics & Visual Panels:** Summary cards, dual-axis charts, tables.
   - **Data Contracts & Freshness:** Real-time stream (SSE/WebSocket) vs polling vs on-demand.
   - **Interactive Actions & Sagas:** Filters, timeframes, exports, writeback mutations, rollbacks.
   - **Edge Boundaries & Failure States:** Empty states, skeleton loaders, network disconnects.
   - **Codebase Grounding & Latency Budgets:** Reusable tokens, schemas, hard quantitative SLAs.
3. **Standardized Point-by-Point Questioning:** Formulate structured multiple-choice questions for each domain with **`(Recommended)`** tags and write-in feedback slots.

---

## 🔄 SECTION IV: FILE-BASED STATE MACHINE (MULTI-ROUND ASYNC Q&A VIA MARKDOWN)

To support persistent, durable, and asynchronous human alignment across background sessions, multi-turn dialogues, and process restarts:

1. **Active State File (`CLARIFICATION.md`):**
   - The Agent creates `<workspace_root>/CLARIFICATION.md` containing state metadata (`[STATE: AWAITING_HUMAN_ROUND_1]`), zone deconstruction, and interactive checkboxes (`- [ ] Option A`, `- [x] Option B`).
2. **Human Review & Response:**
   - The user marks checkboxes `[x]` and writes custom feedback directly in their editor.
3. **Agent Status Transition to 'Read':**
   - Upon detecting user input, the Agent transitions status to `[STATE: READ_ANALYZING]`.
4. **Iterative Multi-Turn Questioning Loop:**
   - If the user's responses reveal cascading ambiguities or second-order architectural choices, the Agent appends **Round N Follow-up Questions** and transitions status to `[STATE: AWAITING_HUMAN_ROUND_N]`.
   - The human responds again in `CLARIFICATION.md`.
5. **Autonomous Goal Execution Handoff:**
   - The loop iterates until the Agent confirms **0 remaining questions** (all dimensions fully resolved).
   - The Agent advances state to `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`, unlocks code generation, formulates Given-When-Then BDD scenarios, and autonomously executes Red-Green-Refactor TDD until all goals pass.
6. **Permanent Audit Archival:**
   - Completed clarification sessions are archived to `<repo_root>/docs/06_raw/<YYYYMMDD>_<topic>_clarification.md`.

---

## 📚 SECTION V: LLM WIKI PERSISTENCE & DOCUMENTATION EXPORT

- Always export detailed technical documentation formatted with ISO timestamps into `<repo_root>/docs/06_raw/<date_timestamp>_<topic>.md`.
- Update catalog index (`docs/06_raw/index.md`) and chronological operations log (`docs/06_raw/log.md`) with clickable `file:///` links.
