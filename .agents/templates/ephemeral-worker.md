# Mandatory Ephemeral Worker Contract

This specification governs all Soda OS subagent worker prompts and execution sessions across Antigravity, Claude Code, Codex, Gemini, Aider, Goose, and Ollama.

---

## 1. Constitutional Ephemeral Worker Invariant

> **Ephemeral Worker Invariant:**  
> Only the Coordinator / Orchestrator may persist. Every worker subagent MUST be spawned with a single task contract and explicitly terminated (`manage_subagents(kill)`) the instant its handoff payload is received. Zero idle worker processes or lingering chat contexts are permitted.

---

## 2. Standard Worker Prompt Envelope

Every spawned subagent receives this strict directive injected into its execution envelope via `compact-prompt.mjs`:

```text
--- MANDATORY EPHEMERAL WORKER CONTRACT ---
1. You are an ephemeral worker. You exist only to complete this single task.
2. Read your task assignment from DISPATCH.md and context from BRIEFING.md.
3. Record progress checkpoints in progress.md as you work.
4. Perform your assigned file edits within your declared touch map, run the verification command once.
5. Emit your terminal handoff payload into handoff.md (strictly <= 12,000 bytes) and CEASE calling tools immediately.
6. Do not await user response or ask follow-up questions.
```

---

## 3. The 4-File Single Source of Truth (SSOT) Contract

All subagent coordination is persisted under `.agents/teamwork/<agent_id>/` using these 4 canonical files:
- **`DISPATCH.md` ([`DISPATCH.md`](file:///Users/batrarethsudprasert/projects/soda-os/.agents/templates/DISPATCH.md)):** Orchestrator assignment, role lock, touch map, and verification command.
- **`BRIEFING.md` ([`BRIEFING.md`](file:///Users/batrarethsudprasert/projects/soda-os/.agents/templates/BRIEFING.md)):** Compact context digest and explicit acceptance criteria checkboxes (`- [ ]`).
- **`progress.md` ([`progress.md`](file:///Users/batrarethsudprasert/projects/soda-os/.agents/templates/progress.md)):** Runtime checkpoint trace tracking Red-Green-Refactor steps.
- **`handoff.md` ([`handoff.md`](file:///Users/batrarethsudprasert/projects/soda-os/.agents/templates/handoff.md)):** Terminal payload containing status (`COMPLETE | BLOCKED | NEEDS_REVIEW`), changed files diff stats, verification result (`PASS | FAIL`), checked criteria (`- [x]`), and next action.

---

## 4. Coordinator Auto-Reap Flow

The coordinator MUST invoke termination immediately upon handoff receipt:

```javascript
// Antigravity & Tool-based platforms
await manage_subagents({
  Action: 'kill',
  ConversationIds: [workerId]
});
```

---

## 5. Hard Turn & Token Ceilings

Under `.agents/runtime-budget.yaml`:
- `worker_max_turns: 12`: Subagent processes abort if not completed within 12 turns.
- `worker_max_tokens: 30000`: Hard cumulative context ceiling to eliminate token runaway.
- `max_handoff_bytes: 12000`: Hard payload limit on `handoff.md`.
