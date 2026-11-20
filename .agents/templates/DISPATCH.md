# DISPATCH — Subagent Task Assignment Contract

> **Single Source of Truth (SSOT) Dispatch Protocol for Soda OS Subagents**

---

## 1. Metadata & Lifecycle Gate

```yaml
dispatch_id: "disp-<timestamp>-<random>"
agent_id: "<persona_or_role>-<timestamp>"
parent_agent_id: "coordinator"
role: "<planner | implementer | tester | reviewer | auditor | challenger>"
persona: "<single_stable_persona_string>"
lifecycle_state: "DISPATCHED" # DISPATCHED -> EXECUTING -> COMPLETE | BLOCKED | FAILED
created_at: "<ISO_8601_UTC>"
```

---

## 2. Hard Execution Constraints & Ceilings

Under [`.agents/runtime-budget.yaml`](file:///Users/batrarethsudprasert/projects/soda-os/.agents/runtime-budget.yaml):
- **Max Turns:** `12` (Hard kill if not delivered within 12 turns)
- **Max Cumulative Context Tokens:** `30,000`
- **Max Handoff Payload Bytes:** `12,000`
- **Auto-Reap Invariant:** `true` (Coordinator terminates subagent immediately upon `handoff.md` delivery)

---

## 3. Scoped Touch Map (Strict Disjoint Isolation)

```yaml
touch_map:
  allowed_files:
    - "<file_path_1>"
    - "<file_path_2>"
  forbidden_files:
    - "docs/07-backlog/goals/G-*.md" # Subagents MUST NOT open/edit canonical goal cards
    - ".agents/audit/"
```

---

## 4. Verification Command

```bash
# Deterministic, non-interactive verification command to execute before handoff
<verification_command_e.g._cargo_test_or_npm_test>
```
