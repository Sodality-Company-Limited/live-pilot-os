---
name: soda-debug-mantra
version: "1.0.0"
description: >-
  Strict 4-step engineering debugging discipline: reproduce reliably, trace the fail path,
  falsify hypotheses, and maintain a breadcrumb ledger. Enforces deterministic verification before fixing.
  Triggers: debug, bug, broken, failing, exception, error log, stack trace, diagnose, investigate, /debug-mantra.
  Collaboration phase: EXECUTE -> REVIEW.
---

# Soda OS Debug Mantra

Disciplined 4-stage protocol for isolating, diagnosing, and resolving software defects. Refuses to guess or propose code edits without a reproducible test harness.

---

## 🏛️ The 4 Core Disciplines

```mermaid
graph TD
    M1["1. Reproduce Reliably<br>(Deterministic test/curl harness)"] --> M2["2. Trace the Fail Path<br>(Debugger → source trace → probe points)"]
    M2 --> M3["3. Falsify Hypotheses<br>(Run disproof first; test 3-5 candidates)"]
    M3 --> M4["4. Breadcrumb Ledger<br>(Log state changes across all runs)"]
```

### 1. Reproduce Reliably
Build a runnable, deterministic reproduction before any code modification:
- **Fast signal:** Aim for $\le 5\text{s}$ execution via unit test, curl script, or isolated CLI command.
- **Flaky defects:** Pin timestamps, seed PRNGs, isolate file system, freeze mocks/fixtures until reproducibility exceeds $95\%$.
- **No repro:** Stop immediately. Refuse to guess root cause without empirical reproduction.

### 2. Trace the Fail Path
Isolate the exact boundary where software state diverges from expected invariants:
1. **Debugger first:** Step directly to the failure site; verify stack frames.
2. **Knob enumeration:** Enumerate and test environment variables, feature flags, and input bounds one at a time.
3. **In-code instrumentation:** Add prefixed diagnostic probes (`[DBG-<hash>]`); remove via single grep upon resolution.

### 3. Falsify the Hypothesis
Generate 3 to 5 ranked hypotheses rather than anchoring on the first plausible assumption:
- For each hypothesis, identify the simplest **disproof test**.
- Execute the disproof first: if an assumption collapses, discard it immediately.

### 4. Breadcrumb Ledger
Record every trial in a running tabular ledger:
- `Attempt #` | `Mutation / Parameter` | `Observed Outcome` | `Hypothesis Invalidation`
- Never repeat a failed action expecting different results. Cap failed repair attempts at 3 before stepping back to re-evaluate the model.
