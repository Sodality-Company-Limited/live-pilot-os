---
name: soda-goal-execution
version: "1.0.0"
description: Execute one approved Soda OS goal within its declared touch map, branch, context bundle, and verification plan; use when the user says "execute goal", "implement G-xxx", or "start step N".
---

# Soda Goal Execution

Use this skill only when the user explicitly requests execution of a named goal.

## Canonical execution protocol

Before any execution action, read and follow the complete repository template:

`/Users/batrarethsudprasert/projects/soda-os/.agents/templates/execute-goal.md`

This template is authoritative for PREFLIGHT, CLARIFY, PLAN, IMPLEMENT, VERIFY, COMPLETENESS
AUDIT, INDEPENDENT REVIEW, REPAIR LOOP, approval gates, and SHIP preparation. Codex, Claude,
Antigravity, and every other execution agent must use the same protocol.

## Required gates

1. Read exactly the named goal and its compiled step bundle at the coordinator level. Subagents MUST NOT open, read, or receive the full `docs/07-backlog/goals/G-xxx.md` file.
2. Confirm the goal is `ready` or `in_progress`, dependencies are satisfied, and spec analysis is complete.
3. Work on the dedicated `feature/G-xxx` branch; never integrate protected branches locally.
4. Use only the declared touch map.
5. Spawn at most one stable persona per subagent; no persona switching or mixed roles.
6. Allow only the designated context subagent to search the LLM Wiki; all others consume its compact cited digest.
7. Compile a step-scoped input packet for each subagent. Send only:
   - the current step objective and acceptance criteria;
   - the assigned role and exactly one persona;
   - the step's `allowed_files` (maximum five unless the goal explicitly proves a larger set is required);
   - the minimum relevant excerpts or file references;
   - the compact context digest and unresolved blockers;
   - the verification command for that step.
   Do not send the full goal card, full work plan, unrelated acceptance criteria, prior completed steps, full Wiki results, or repository-wide context.
8. Reject duplicate prompt/context hashes and input above the configured budget.
9. Follow the declared work steps and verification command; do not invent steps.
10. Return a compact handoff containing status, changed files, tests, failures, blockers, and next action.

## Partial-context invariant

Each subagent receives only the smallest context slice required for its current step. The
coordinator owns the complete goal context and compiles a new packet per step. Follow-up
packets contain only changed files, new deltas, and unresolved evidence. Identical context
hashes are rejected for the same goal, and a packet exceeding the input-token budget is rejected
before spawn.

## Stop conditions

Before stopping for a preflight failure, the coordinator must attempt safe remediation using
`.agents/templates/execute-goal.md`. Pending derived gates, missing bundles, a non-goal feature
branch, and unrelated dirty worktree changes are remediation cases, not automatic blockers.
Placeholder acceptance criteria, unresolved generated-goal questions, and derivable touch maps
are also autonomous remediation cases: derive them from the goal intent, existing implementation,
tests, and repository evidence, then record the assumption and validate the goal.
Stop and report `blocked` or `needs-review` only when the goal is genuinely ambiguous, a
dependency is unresolved, the touch map is exceeded, context is missing, input-token budget is
exceeded, tests fail, or a protected/destructive/safety-sensitive mutation lacks explicit scope
and passing automated gates.

Do not mark a goal `done`, merge branches, deploy, change security boundaries, or perform destructive operations unless the required automated gates pass and the goal explicitly authorizes that operation. Fail closed on protected-branch, destructive, production, infrastructure, or security-boundary mutations.
