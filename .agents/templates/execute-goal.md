# Universal Autonomous Execute Goal Protocol

Trigger:
When the user says:

```text
execute <GOAL_ID>
```

execute the complete lifecycle for the requested goal.

Orchestration trigger:
When the user says:

```text
spawning subagents to execute active goals
```

the coordinator must inventory active goals, prepare safe preflight gates, isolate unrelated
worktree changes, and dispatch only eligible bounded goals. It must remediate safe setup issues
automatically instead of stopping solely because the current branch, dirty worktree, or pending
derived gate state is not yet prepared. It must stop only for genuine human clarification,
approval, protected-branch mutation, unresolved dependency, security boundary, or destructive
operation.

Lifecycle:

```text
PREFLIGHT
→ CLARIFY
→ PLAN
→ IMPLEMENT
→ VERIFY
→ COMPLETENESS AUDIT
→ INDEPENDENT REVIEW
→ REPAIR LOOP
→ RELEASE CANDIDATE
→ AUTOMATED RELEASE GATE
→ SHIP PREPARATION
```

==================================================
1. PREFLIGHT
==================================================

1. Load the repository's AGENTS.md and governance rules.
2. Resolve the requested goal file.
3. Resolve its acceptance contract.
4. Resolve the compiled context bundle.
5. Resolve allowed files and touch map.
6. Inspect git status, branch, and current revision.
7. Confirm the goal is executable.
8. Confirm dependencies are satisfied.
9. Confirm no unresolved clarification remains.
9a. For deep-context goals, confirm the presence of the canonical Antigravity authority context (e.g. `docs/07-backlog/antigravity-context.md`). When present, execution agents (Codex, Claude, etc.) MUST immediately accept and consume this canonical context and the goal card, autonomously promoting and executing without stalling for a separate regeneration prompt or receipt pass. Codex and Claude execute within the touch map and may mechanically repair formatting or typos, but do not reinterpret intent or scope.
10. Confirm touch map excludes shared tracking files (docs/00-project-snapshot.md, docs/07-backlog/goals.md, docs/07-backlog/goal-id-registry.yaml, docs/07-backlog/queues/*.md, CLARIFICATION.md, docs/06_raw/index.md, docs/06_raw/log.md). These are managed solely by atomic governance synchronization hooks.

11. Resolve execution environment mode:
    - **Mode A: Normal Single-Goal Execution (Standard / Default):** Runs in `PrimaryWorkspace` directly on `feature/<GOAL_ID>` with zero git worktree creation overhead.
    - **Mode B: Parallel Swarm Wave Execution (Advanced / Batch):** Runs in an isolated git worktree at `../worktrees/{repo}-{goal.id.toLowerCase()}-{role}` when commanded via multi-agent wave planning (`soda-os goal waves [EPIC]`) or `--mode=swarm`.

### AUTONOMOUS PREFLIGHT REMEDIATION (ZERO-STALL INVARIANT)

When commanded with `execute <GOAL_ID>` or `spawning subagents to execute active goals`, the agent MUST NOT stall or block on mechanical preflight discrepancies. The agent autonomously remediates setup issues immediately:

1. **Autonomous Status & Phase Promotion:** If the goal is in `status: draft` or `status: planned` with no unresolved `[NEEDS CLARIFICATION]` markers, the agent automatically transitions status to `ready` -> `in_progress`, sets the collaboration phase table to `EXECUTE`, and proceeds with implementation. It does NOT halt for human status promotion.
2. **Autonomous Branch Provisioning:** If the current branch is not `feature/<GOAL_ID>`, the agent automatically creates and checks out `feature/<GOAL_ID>` (via `git checkout -b feature/<GOAL_ID>` or switching if it exists). It does NOT halt or complain about branch mismatch.
3. **Dirty Tree & Untracked File Isolation:** Changes outside the goal's declared touch map must NOT block execution. The agent isolates them or uses git stash / worktrees.
4. **Context Authority Ingestion:** When `docs/07-backlog/antigravity-context.md` or a timestamped audit log in `docs/06_raw/` exists, the agent consumes it immediately as the verified authority receipt and executes. It does NOT halt requesting another Antigravity pass.
5. **Autonomous End-to-End Closure & Archival Contract:** When commanded with `execute <GOAL_ID> ... ship it to archived` (or when commanded to execute and ship upon green tests), the executing agent is responsible for performing the full closure cycle once tests pass green. The agent MUST NOT refuse, hesitate, or stall claiming that the goal card is draft or "semantically incomplete". Active goal cards naturally have pending work steps and unchecked acceptance criteria during execution; passing tests signify semantic fulfillment. The agent itself updates the goal card to `status: done`, checks off the work steps and acceptance criteria (`- [x]`), runs `node ./cli.js goal close <GOAL_ID>`, and commits/pushes to `origin/feature/<GOAL_ID>`. Running `node ./cli.js goal close <GOAL_ID>` atomically updates frontmatter lifecycle and markdown body.

The agent STOPS ONLY for:
- Genuine human product ambiguity (`[NEEDS CLARIFICATION]` in the card).
- Direct production deployment or protected-branch merges (`develop`/`main`).
- Destructive operations (dropping database tables, force-pushing, removing uncommitted user code).

### EXECUTION ENVIRONMENT (DUAL-MODE SELECTION)

The framework strictly supports two first-class operational execution modes:

- **Mode A: Normal Single-Goal Execution (Standard / Default)**
  - Target: `PrimaryWorkspace` directly in the active project working directory.
  - Git Branch: `feature/<GOAL_ID>` (switched or created directly via `git checkout -b feature/<GOAL_ID>`).
  - Worktree: **None**. Zero worktree provisioning overhead.
  - Intended Use: Standard single-developer micro-loop, interactive pairing, and focused sequential sprints.
  - Invariant: When executing a single goal in isolation, NEVER create or switch to external git worktrees unless `--mode=swarm` or multi-agent wave execution is explicitly requested.

- **Mode B: Parallel Swarm Wave Execution (Advanced / Batch)**
  - Target: Isolated git worktree provisioned at `../worktrees/{repo}-{goal.id.toLowerCase()}-{role}`.
  - Git Branch: `feature/<GOAL_ID>` isolated within the assigned worktree.
  - Worktree: Created via `git worktree add -b feature/<GOAL_ID> "${worktreePath}" origin/develop`.
  - Intended Use: Autonomous multi-agent swarm waves (`soda-os goal waves [EPIC]`) executing disjoint touch-map goals in parallel without compiler or git lock contention.


==================================================
2. CLARIFY
==================================================

Resolve all goal ambiguity using the repository workflow.

Goal-partitioned clarification rules:
- Root `CLARIFICATION.md` preserves active repository-level Socratic alignment state and MUST NEVER be clobbered, overwritten, or deleted by individual goal executions.
- If goal-specific clarification is required, write solely to `CLARIFICATION-<GOAL_ID>.md` or `docs/07-backlog/clarifications/<GOAL_ID>.md`.
- Ensure no two subagents or goal executions attempt to share or overwrite each other's clarification files.

Do not invent:
- requirements
- architecture
- files
- test commands
- acceptance criteria
- external services

If a clarification marker remains after safe remediation, the coordinator must resolve it
autonomously from the goal intent, existing repository evidence, available tests, and declared
touch map. Record the assumption and evidence in the goal's assumptions/open-questions sections.
Do not invent product scope, security boundaries, external services, or destructive operations.
Stop only when the missing decision changes product intent, security authority, destructive scope,
or an external approval boundary.

==================================================
3. PLAN
==================================================

1. Pre-Execution Design Protocol (Invariant 13):
   Before writing or modifying any implementation code, verify or generate the goal's dedicated design specification:
   `docs/03-architecture/specs/goals/G-xxx/design.md`
   The design specification MUST detail:
   - Intent & Architectural Rationale
   - Goals, Non-Goals & Anti-Goals
   - Approaches Considered & Rejected Alternatives (minimum 2 evaluated)
   - Selected Approach & Trade-off Analysis
   - Bounded Context & Touch Map Invariants
   - Acceptance Test & TDD Verification Strategy

2. Create a step-by-step plan from the goal only.

For every step define:
- objective
- allowed files
- expected output
- command
- test
- completion gate
- stop condition
- acceptance criterion covered

Every acceptance criterion must have executable evidence.

If required work is outside the goal:
- do not implement it
- identify the required prerequisite goal
- stop if it blocks execution

==================================================
4. IMPLEMENT
==================================================

1. Execute one step at a time.
2. Make the smallest permitted change.
3. After every step:
   - run the required command
   - capture output
   - inspect the result
   - verify the completion gate
4. Continue only if the gate passes.

If a step fails:
- diagnose the failure
- repair only within scope
- rerun the step
- record the failed attempt and repair
- stop after the configured retry limit
- never hide the failure

Never touch, overwrite, or clobber shared tracking files outside governance synchronization hooks:
- docs/00-project-snapshot.md
- docs/07-backlog/goals.md
- docs/07-backlog/goal-id-registry.yaml
- docs/07-backlog/queues/*.md
- Root CLARIFICATION.md
- docs/06_raw/index.md
- docs/06_raw/log.md

Never create:
- mocks
- stubs
- fake data
- synthetic outcomes
- fake passing tests
- placeholder implementations
- disabled tests
- weakened assertions

==================================================
5. VERIFICATION
==================================================

Run all required:

- unit tests
- integration tests
- acceptance tests
- static analysis
- type checks
- lint
- security checks
- performance checks
- repository harnesses
- goal-specific verification commands
- mathematical & system invariant verification (conservation ΔSupply=0, monotonicity, solvency, reachability)
- formal verification & SMT/solver checks (deductive proofs, Z3/Bitwuzla assertions, Kani bounded model checking)
- verification harness executions (symbolic allocations, assumptions, shadow reference models)
- adversarial stress testing (aliasing collisions from==to, arithmetic extremes 0/1/MAX, precision dust, replay)
- concurrency memory model verification (ABA mitigation, atomic CAS, mutual exclusion, Acquire/Release orderings)
- advanced testing paradigms (property-based generative testing >= 10,000 iterations, mutation testing >= 85%)

Do not trust a single test suite.
Do not trust self-reported completion.
Do not trust a modified evaluator without checking its provenance.

==================================================
6. COMPLETENESS AUDIT
==================================================

Before declaring the goal complete, independently audit:

A. Requirement coverage
- every In-Scope item is implemented
- every acceptance criterion has evidence
- every required artifact exists
- every required command was executed

B. Code coverage
- every allowed file change is justified
- no required file was skipped
- no out-of-scope file was changed
- no TODO, FIXME, pass, placeholder, or stub remains in the goal scope

C. Test coverage
- tests exercise real behavior
- no test merely checks file existence
- no test uses fabricated production outcomes
- failure paths are tested
- boundary cases are tested
- regression cases are tested
- every system invariant is verified by formal proof, solver, or property harness
- zero-float financial arithmetic invariant verified across all ledger/monetary paths
- concurrency memory orderings and ABA defenses verified
- mutation kill threshold >= 85% satisfied

D. Evidence coverage
- command output is recorded
- artifact paths are recorded
- revision and environment are recorded
- data/configuration/seed provenance is recorded where applicable

E. Reproducibility
- rerun the critical verification commands from the recorded revision
- confirm the same result
- fail closed on nondeterministic or unavailable evidence

If any item fails:
- the goal is NOT complete
- return to implementation or report a blocker
- do not proceed to release candidate

==================================================
7. INDEPENDENT REVIEW
==================================================

Review the implementation as if reviewing another agent's work.

Check:
- scope
- correctness
- security
- reliability
- maintainability
- performance
- regression risk
- acceptance evidence
- hidden incomplete work
- invalid assumptions
- fake or weak tests
- missing error handling
- missing observability
- missing documentation
- missing migration or rollback behavior

The review must not rely only on the implementation agent's summary.

==================================================
8. REPAIR LOOP
==================================================

If verification or review finds a defect:

1. Classify the defect.
2. Map it to the goal scope.
3. Apply the smallest in-scope repair.
4. Rerun affected tests.
5. Rerun the completeness audit.
6. Rerun the independent review.

Repeat until:
- all gates pass, or
- retry limit is reached, or
- scope expansion is required.

If scope expansion is required:
- stop
- create a blocker report
- recommend a separate goal

==================================================
9. RELEASE CANDIDATE
==================================================

A goal may become a release candidate only when:

- all steps pass
- all acceptance criteria pass
- all required tests pass
- completeness audit passes
- independent review passes
- no P0/P1 issue remains
- no mock or stub exists
- no scope violation exists
- reproducibility evidence exists
- working tree contains only approved goal changes
- changelog and audit records are prepared

Prepare:

- final diff summary
- test evidence
- acceptance matrix
- risk report
- reproducibility record
- release checklist
- PR description

Do not claim production readiness unless repository policy permits it.

==================================================
10. AUTOMATED RELEASE, CARD CLOSURE, AND SHIPPING GATES
==================================================

When all tests, verifications, and quality gates pass green:

1. **MANDATORY GOAL CARD STATUS UPDATE (ZERO-DRIFT INVARIANT):**
   The agent MUST NOT refuse, hesitate, or stall claiming that the goal card is draft or "semantically incomplete"; passing tests confirm semantic fulfillment. The agent itself is explicitly required to perform the card update upon verifying green tests. The agent immediately updates the goal card (`docs/07-backlog/goals/<GOAL_ID>.md`):
   - Set YAML frontmatter `status: done` (and lifecycle to `review: approved`, `release: released`).
   - Set Markdown header `**Status:** done`.
   - Update 5-phase collaboration table to SHIP:
     ```markdown
     | DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
     |:------:|:----:|:-------:|:------:|:----:|
     |   ✓    |  ✓   |    ✓    |   ✓    |  ●   |
     ```
   - Check all completed Plan / Work steps (`status: done`).
   - Check all satisfied acceptance criteria: `- [x]`.
   - Check all completed spec checklist items: `- [x]`.

2. **ATOMIC ARCHIVAL & QUEUE RECONCILIATION:**
   The agent executes the atomic framework closure command:
   ```bash
   node ./cli.js goal close <GOAL_ID> --note="Verification and test suite passed 100% green"
   ```
   (or `soda-os goal close <GOAL_ID>`).
   This atomically:
   - Moves the card to `docs/07-backlog/goals/_archived/<GOAL_ID>.md`.
   - Moves the goal row from `## Active` to `## Archived` in `docs/07-backlog/queues/{EPIC}.md`.
   - Synchronizes `docs/00-project-snapshot.md` and `docs/07-backlog/goals.md`.

3. **COMMIT & PR PREPARATION:**
   The agent stages all changes, commits to `origin/feature/<GOAL_ID>`, and prepares the GitHub PR:
   ```bash
   git add -A
   git commit -m "<GOAL_ID>: complete implementation and verify test suite"
   git push -u origin feature/<GOAL_ID>
   ```

==================================================
11. FINAL REPORT
==================================================

Report:

- project
- repository
- goal ID
- final phase
- goal status
- files changed
- files not changed
- steps completed
- tests run
- command outputs
- acceptance evidence
- completeness audit
- independent review
- repairs performed
- remaining risks
- release-candidate status
- exact human action required
