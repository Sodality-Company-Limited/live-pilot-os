---
trigger: always_on
---

# Bounded Goal Orchestration Protocol

This document defines bounded goal orchestration. It must not create an unattended, continuous execution loop or force unrelated documentation and verification work.

---

## 1. Bounded Goal Execution & Ephemeral Worker Protocol

1. Complex goals MAY be decomposed into a DAG when parallelism is justified by disjoint touch maps.
2. Every node has a finite scope, timeout, retry limit, and terminal state: `complete`, `blocked`, `needs-review`, or `idle`.
3. Agents MUST stop at checkpoints. They must not continuously poll, silently advance, or retry indefinitely.
4. Resume only after an external trigger: user input, subagent completion, approval, failure notification, or an explicit scheduled event.
5. **Ephemeral Worker & 4-File Contract Invariant:** Only the Coordinator / Orchestrator may persist. Every worker subagent MUST be spawned with a single task contract and explicitly terminated (`manage_subagents(kill)`) the instant its handoff payload is received. Zero idle worker processes or lingering chat contexts are permitted. Worker subagents must never linger, await user feedback, or ask follow-up questions; their context must be completely released immediately post-delivery.
6. **Mandatory 4-File Subagent SSOT Contract:**
   All communication, tasking, progress, and terminal deliverables between the orchestrator and ephemeral subagents MUST be grounded strictly in the standardized 4-file contract located under `.agents/teamwork/<agent_id>/` (or `.agents/templates/`):
   - **`DISPATCH.md`:** Authoritative assignment, role lock (`planner | implementer | tester | reviewer | auditor | challenger`), persona, touch map allow-list, and deterministic verification command.
   - **`BRIEFING.md`:** Compact objective, architectural context digest, and explicit acceptance criteria checkboxes (`- [ ]`). Full Wiki corpus and full goal cards are strictly forbidden from being passed directly.
   - **`progress.md`:** Runtime checkpoint ledger tracking Red-Green-Refactor steps, touched files, and diagnostic notes.
   - **`handoff.md`:** Terminal payload strictly `<= 12,000` bytes (`max_handoff_bytes`) containing terminal status (`COMPLETE | BLOCKED | NEEDS_REVIEW | IDLE`), changed file diff stats, verification command results (`PASS | FAIL`), checked acceptance criteria (`- [x]`), and next action for orchestrator synthesis.


---

## 2. Conditional Evidence and Documentation

Create raw technical documentation only when required by the goal, or for architecture, security, incident, deployment, compliance, or explicit audit work. Ordinary bug fixes, small documentation edits, and scoped test repairs need only the concise handoff.

---

## 3. Coding Verification Gate

Before an agent can advance a coding goal to `approved` or close it, applicable verification gates based on the goal's declared profiles must pass:

1. Operational test suite passing 100% green with zero errors (Article I & II).
2. For goals declaring formal mathematical or property verification profiles:
   - `scripts/harness/verification-orchestrator-harness.mjs --goal <G-xxx> --lifecycle-check done`.
   - `scripts/harness/property-invariant-harness.mjs`.
   - `scripts/harness/mutation-testing-harness.mjs` with the goal's declared threshold.
   - `scripts/lib/mathematical-proof-engine.mjs` when proof calculations are required.
   - `scripts/harness/proof-receipt-validator.mjs` against touched source files and the goal.
3. Goal closure and archival are executed via `node ./cli.js goal close <GOAL_ID>`, which atomically updates frontmatter lifecycle, marks criteria and checklist items done, and archives the card. Agents MUST NOT refuse closure by claiming active cards are "semantically incomplete" when tests pass green.

---

## 4. Conditional Ecosystem Synchronization

Run ecosystem synchronization only for an approved Soda OS framework release or explicit cross-project upgrade task. Local project changes must not automatically synchronize all downstream repositories. When synchronization is explicitly in scope:
- Governance rules in `.agents/rules/`
- Autonomous agent skills in `.agents/skills/`
- Verification harnesses in `scripts/harness/`
- Core libraries in `scripts/lib/`
- Schema contracts in `schemas/`
- CLI and goal scripts in `scripts/goals/` or `cli.js`

The Agent executes central ecosystem synchronization:
```bash
node ./cli.js sync-ecosystem
```
Synchronize only the declared target repositories and report the result.

---

## 5. Batch Goal Generation & Conformance Pre-Commit Invariant

1. **Zero-Truncation Batch Invariant:**
   - When generating multiple or atomic goals (e.g., "generate atomic goals and execute them"), the agent is **STRICTLY FORBIDDEN** from omitting, condensing, or summarizing any canonical section of `docs/07-backlog/goals/_template.md`.
   - Every goal generated—whether 1 or 20—MUST contain all 51 required sections, frontmatter metadata (v2 `goal_contract`), markdown tables, and comprehensive appendices.

2. **Mandatory Conformance Harness Gate Before Commit:**
   - The agent MUST execute:
     ```bash
     node scripts/harness/goal-template-conformance-harness.mjs --file <goal_file>
     ```
   - If any deviation occurs (`0 Passed, 1 Failed`), the agent MUST resolve all deviations immediately.
   - **`git commit` and `git push` are strictly blocked until 100% of generated goals pass with 0 deviations.**

3. **Atomic Closure Synchronization:**
   - An agent must never commit implementation code and leave corresponding goal cards in `in_progress` or `draft`.
   - Completed goals must have frontmatter `lifecycle: { spec: approved, implementation: completed, verification: verified, evidence: captured, review: approved, release: released, learning: complete }`, status `done`, all checklist items marked `- [x]`, and be archived to `docs/07-backlog/goals/_archived/`.


