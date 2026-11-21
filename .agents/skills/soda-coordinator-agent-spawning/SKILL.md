---
name: soda-coordinator-agent-spawning
version: "1.2.0"
description: Coordinate and spawn bounded Soda OS subagents while retaining full goal context only in the coordinator; use when an orchestrator dispatches agents across goal steps via any AI CLI provider (codex, antigravity, gemini, claude, aider, ollama, goose).
---

# Soda Coordinator Agent Spawning

Use this skill for the coordinator/orchestrator agent that dispatches subagents. This skill does
not authorize application implementation by itself.

## Generic orchestration trigger

When the user says **"spawning subagents to execute active goals"** or equivalent wording,
interpret it as an orchestration request. Do not stop merely because the current branch is not
already goal-specific, the worktree is dirty, or goal gates are pending. Run the safe preflight
remediation flow below and report only genuine blockers.

When coordinating execution, the coordinator must first read and follow
`.agents/templates/execute-goal.md`. The template is the shared execution protocol for Codex,
Claude, Antigravity, Gemini, and all other agents; this skill only adds coordinator-specific spawning
and context-boundary rules.

## Coordinator authority

The coordinator is the only agent allowed to:

- read the complete `docs/07-backlog/goals/G-xxx.md` file;
- read the complete goal context, dependency graph, and full work plan;
- search the LLM Wiki for the goal;
- compile and distribute step-scoped context packets;
- synthesize subagent handoffs and decide the next bounded step;
- dispatch provider CLI subagents (`codex`, `antigravity`, `gemini`, `claude`, `aider`, `ollama`, `goose`) using `spawn-subagent.mjs`.

Subagents must never open or receive the full goal file or full goal context.

## Subagent Dispatch Execution Matrix

The coordinator dispatches subagents through the verified multi-provider CLI spawner:

```bash
# General invocation
node scripts/agents/spawn-subagent.mjs \
  --provider <codex|antigravity|gemini|claude|aider|ollama|goose> \
  --goal G-xxx \
  --role <implementer|tester|reviewer> \
  --persona "<single-stable-persona>" \
  --task "<step-specific mandate>" \
  --touch "<file1,file2>" \
  --verify "<verification-command>"

# Or via direct provider shortcuts:
node scripts/agents/codex-spawn.mjs --goal G-xxx --role implementer --persona "codex-dev" --task "..." --touch "..."
node scripts/agents/antigravity-spawn.mjs --goal G-xxx --role tester --persona "agy-tester" --task "..." --touch "..."
node scripts/agents/gemini-spawn.mjs --goal G-xxx --role implementer --persona "gemini-dev" --task "..." --touch "..."
node scripts/agents/claude-spawn.mjs --goal G-xxx --role reviewer --persona "claude-reviewer" --task "..." --touch "..."
node scripts/agents/aider-spawn.mjs --goal G-xxx --role implementer --persona "aider-dev" --task "..." --touch "..."
node scripts/agents/ollama-spawn.mjs --goal G-xxx --role tester --persona "ollama-tester" --task "..." --touch "..."
node scripts/agents/goose-spawn.mjs --goal G-xxx --role reviewer --persona "goose-reviewer" --task "..." --touch "..."
```

## Context-provider routing

For deep-context requests, Antigravity is the context authority. The coordinator must obtain and
persist Antigravity's compact context digest and canonical goal artifacts before dispatching
implementation agents. Execution agents consume those artifacts; they do not
independently regenerate intent, scope, dependencies, touch maps, or acceptance criteria.

## Pre-spawn workflow

1. Inventory active goals and select only dependency-satisfied `ready` goals for the current
   execution wave; never execute `draft`, `planned`, `blocked`, or dependency-incomplete goals.
2. For each selected goal, automatically run or prepare `clarify`, `spec check`, and `analyze`
   when they can be completed from repository evidence without inventing requirements. Stop only
   when a genuine `[NEEDS CLARIFICATION]` requires human input.
3. If the current branch is not goal-specific, provision or switch to the required
   `feature/G-xxx` branch only when safe; never switch to protected integration branches.
4. If the worktree is dirty, preserve unrelated changes and use an isolated worktree or disjoint
   write boundary. Never reset, overwrite, or discard user changes.
5. Resolve dependency ordering and execute only the first eligible goal in a normal round; use
   parallel waves only when explicitly requested and touch maps are proven disjoint.
6. Read the goal and confirm its executable status, dependencies, analysis state, and touch map.
7. Select one current step and one subagent role.
8. Assign exactly one stable persona for that subagent.
9. Select only the step's allowed files from the goal touch map.
10. Compile the smallest packet containing the step objective, relevant acceptance criteria,
   allowed files, minimum excerpts or references, compact cited digest, blockers, and verification command.
11. Estimate input tokens and compute the packet hash.
12. Reject duplicate hashes, oversized packets, out-of-scope files, full-context fields, or
   unresolved dependency conditions.
13. Spawn one bounded subagent with no child-agent permission via `spawn-subagent.mjs`.

If no goal is executable after safe remediation, return a structured preflight report containing
the exact unresolved decision, affected goal, remediation attempted, and next command. Do not emit
a generic "cannot proceed" message without attempting and reporting the remediation steps above.

## LLM Wiki ownership

At most one context-retrieval subagent may be assigned per goal. The coordinator may perform the
retrieval itself or delegate it once, but must not permit repeated Wiki searches. Distribute only
the compact source-cited digest.

## Context packet allowlist

Packets may contain only:

```text
goalId, stepId, role, persona, objective, acceptance, allowedFiles,
excerpts, contextDigest, blockers, verificationCommand, packetHash
```

Reject `goal`, `goalFile`, `goalCard`, `fullGoal`, `fullWorkPlan`, `repositoryContext`, and
`wikiCorpus` fields.

## Lifecycle and handoff

1. Spawn.
2. Wait for the finite verification checkpoint.
3. Validate the compact handoff.
4. Record changed files, tests, failures, blockers, token usage, and packet hash.
5. Release the session.
6. Compile the next delta-only packet if another step is required.

Never retry an identical failure without new evidence. Never spawn children from a bounded
subagent. Never merge, deploy, or close a goal without the required approval gate.

## Coordinator handoff format

```text
Goal: G-xxx
Step: step-N
Subagent persona: <one persona>
Status: complete | blocked | needs-review | idle
Changed files: <absolute paths>
Tests: <commands and results>
Failures: <none or concise failure>
Blockers: <none or concise blocker>
Next action: <one bounded action or none>
```
