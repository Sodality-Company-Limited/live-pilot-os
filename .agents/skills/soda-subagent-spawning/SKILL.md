---
name: soda-subagent-spawning
version: "1.2.0"
description: Spawn bounded Soda OS subagents with one persona, one role, one touch map, step-scoped context, and enforced input-token and deduplication gates; use when dispatching or orchestrating subagents across major AI CLI providers (codex, antigravity/agy, gemini, claude, aider, ollama, goose).
---

# Soda Subagent Spawning

Use this skill whenever a coordinator dispatches a subagent for a goal step using any major market AI agent CLI.

## Supported CLI Providers Matrix

Soda OS provides automated, bounded CLI spawning engines under [`scripts/agents/`](file:///scripts/agents/):

| Provider Key | Binary Name | Spawner Script | Primary Execution Mode |
|---|---|---|---|
| `codex` | `codex` | [`codex-spawn.mjs`](file:///scripts/agents/codex-spawn.mjs) | `codex exec [prompt] --json --sandbox workspace-write` |
| `antigravity` / `agy` | `agy` | [`antigravity-spawn.mjs`](file:///scripts/agents/antigravity-spawn.mjs) | `agy --print [prompt] --dangerously-skip-permissions --sandbox` |
| `gemini` | `gemini` | [`gemini-spawn.mjs`](file:///scripts/agents/gemini-spawn.mjs) | `gemini -p [prompt] --approval-mode yolo -s` |
| `claude` | `claude` | [`claude-spawn.mjs`](file:///scripts/agents/claude-spawn.mjs) | `claude -p [prompt] --dangerously-skip-permissions --output-format json` |
| `aider` | `aider` | [`aider-spawn.mjs`](file:///scripts/agents/aider-spawn.mjs) | `aider --message [prompt] --yes-always --no-stream [touchMap...]` |
| `ollama` | `ollama` | [`ollama-spawn.mjs`](file:///scripts/agents/ollama-spawn.mjs) | `ollama run [model] [prompt] --format json` |
| `goose` | `goose` | [`goose-spawn.mjs`](file:///scripts/agents/goose-spawn.mjs) | `goose run --text [prompt]` |

## Execution Commands

1. **Unified Multi-Provider CLI:**
   ```bash
   node scripts/agents/spawn-subagent.mjs \
     --provider <codex|antigravity|gemini|claude|aider|ollama|goose> \
     --goal <G-xxx> \
     --role <role> \
     --persona <persona> \
     --task "<mandate>" \
     --touch "<file1,file2>" \
     --verify "<test_command>"
   ```

2. **Via Soda OS Root CLI:**
   ```bash
   node ./cli.js agent spawn \
     --provider <provider> \
     --goal <G-xxx> \
     --role <role> \
     --persona <persona> \
     --task "<mandate>" \
     --touch "<file1,file2>"
   ```

3. **Provider Direct Shortcut CLI Runners:**
   ```bash
   node scripts/agents/gemini-spawn.mjs --goal G-PAY-001 --role implementer --persona "gemini-dev" --task "Implement step 1" --touch "src/a.ts"
   node scripts/agents/ollama-spawn.mjs --goal G-PAY-001 --role tester --persona "ollama-tester" --task "Verify logic" --touch "test/a.test.js"
   node scripts/agents/claude-spawn.mjs --goal G-PAY-001 --role reviewer --persona "claude-reviewer" --task "Review diff" --touch "src/a.ts"
   ```

## Spawn contract

Every spawn request must contain:

- `goalId` and current `stepId`;
- exactly one `role`;
- exactly one stable `persona`;
- one finite touch map and step `allowed_files`;
- one step objective;
- only relevant acceptance criteria;
- compact cited context digest;
- verification command;
- input and output token budgets.

## Coordinator-only context

Only the coordinator may read the complete goal file or full goal context. A subagent must never
open, receive, or request the full `docs/07-backlog/goals/G-xxx.md` file.

The coordinator must compile a step packet containing only the current objective, relevant
criteria, assigned files, minimum excerpts or references, digest, blockers, and verification
command. Follow-ups contain only new deltas, changed files, and unresolved evidence.

## Mandatory gates

Reject the spawn when:

1. Persona is missing, multiple, or combined with another persona.
2. The role is missing or more than one role is assigned.
3. The touch map is empty, exceeds its limit, or contains files outside the goal touch map.
4. The packet contains full-goal fields, repository-wide context, or the full Wiki corpus.
5. The estimated input exceeds the hard input-token limit.
6. The input or output ceiling is exceeded independently.
7. The same prompt or packet hash was already used for the goal.
8. The goal is not executable or its dependencies are unresolved.
9. The requested work would require spawning child agents.

## Context packet fields

Allowed packet fields are limited to:

```text
goalId
stepId
role
persona
objective
acceptance
allowedFiles
excerpts
contextDigest
blockers
verificationCommand
packetHash
```

Unknown or full-context fields must fail closed.

## Lifecycle

1. Compile the step packet.
2. Validate scope, persona, files, context, hashes, and token budget.
3. Spawn exactly one bounded subagent via `spawn-subagent.mjs` (or provider shortcut).
4. Stop at the verification checkpoint.
5. Collect a compact handoff.
6. Record token usage, packet hash, changed files, tests, failures, blockers, and next action.
7. Release the session and do not retry an identical failure without new evidence.

## Handoff contract

The subagent must return only:

```text
Status: complete | blocked | needs-review | idle
Changed files: <absolute paths>
Tests: <commands and results>
Failures: <none or concise failure>
Blockers: <none or concise blocker>
Next action: <one action or none>
```

The coordinator owns synthesis and may provide the next step only after validating the handoff.

## Runtime Budget & Template Integration

- **Budget Enforcement ([`.agents/runtime-budget.yaml`](file:///Users/batrarethsudprasert/projects/soda-os/.agents/runtime-budget.yaml)):**
  - `subagent_limits.worker_max_turns: 12`, `worker_max_tokens: 30000`, `auto_reap_on_handoff: true`.
  - `defaults.max_handoff_bytes: 12000`, `max_parallel_agents: 3`.
  - Supported non-coordinator roles (`max_child_agents: 0`): `planner`, `implementer`, `tester`, `reviewer`, `auditor`, `challenger`.
- **Ephemeral Worker Template ([`.agents/templates/ephemeral-worker.md`](file:///Users/batrarethsudprasert/projects/soda-os/.agents/templates/ephemeral-worker.md)):**
  - Use `ephemeral-worker.md` as the base prompt contract for single-task workers.

## Teamwork Handoff Layout (`.agents/teamwork/<agent_id>/`)

For multi-step or adversarial (`/teamwork`) runs (`worker_* -> auditor_* -> challenger_* -> reviewer_*`), each agent writes to its isolated directory `.agents/teamwork/<agent_id>/` using the 4-file contract:

- `DISPATCH.md` — assignment, touch map, and role/persona lock.
- `BRIEFING.md` — compact context digest and acceptance criteria.
- `progress.md` — step-by-step checkpoint log.
- `handoff.md` — terminal handoff payload (strictly `<= 12,000` bytes per `max_handoff_bytes`).
