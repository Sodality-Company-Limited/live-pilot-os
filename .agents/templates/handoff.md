# HANDOFF — Terminal Subagent Delivery Payload

> **Single Source of Truth (SSOT) Terminal Handoff Protocol for Soda OS Subagents**
> **Hard Invariant:** Payload size MUST NOT exceed **12,000 bytes** (`max_handoff_bytes`).

---

## 1. Terminal State

```yaml
agent_id: "<agent_id>"
terminal_status: "COMPLETE" # COMPLETE | BLOCKED | NEEDS_REVIEW | IDLE
turns_consumed: <turn_count_int> # Must be <= 12
tokens_consumed: <token_count_int> # Must be <= 30000
completed_at: "<ISO_8601_UTC>"
```

---

## 2. Touch Map Verification & Changed Files

```yaml
changed_files:
  - path: "<file_path_1>"
    status: "MODIFIED" # CREATED | MODIFIED | DELETED
    diff_stat: "+<lines> / -<lines>"
```

*Invariant Check:* Every changed file MUST match the allowed files declared in `DISPATCH.md`.

---

## 3. Verification Command Results

```yaml
verification:
  command: "<command_executed>"
  exit_code: 0
  stdout_summary: "<Concise test summary, e.g. 5 passed; 0 failed>"
  stderr: ""
  verdict: "PASS" # PASS | FAIL
```

---

## 4. Acceptance Criteria Conformance

- [x] `<Acceptance Criterion 1>` — Verified in `<test_file>`
- [x] `<Acceptance Criterion 2>` — Verified in `<test_file>`
- [x] `<Acceptance Criterion 3>` — Verified in `<test_file>`

---

## 5. Failures & Blockers

- **Failures:** `none`
- **Blockers:** `none`

---

## 6. Next Recommended Action for Coordinator

`<Concise single recommendation or next step for coordinator synthesis>`
