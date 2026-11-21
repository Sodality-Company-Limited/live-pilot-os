---
name: soda-bug-triage
version: "1.0.0"
description: Diagnose and fix bounded software bugs using minimal error context, scoped file inspection, and limited verification. Use for bug reports, failing tests, runtime errors, and noisy logs.
---

# Soda Bug Triage

Use this skill to reduce diagnostic complexity and avoid wasting context on irrelevant
logs, files, or repeated attempts.

## Operating limits

- Work on one reported failure and one goal/touch map at a time.
- Do not scan the whole repository or load unrelated history.
- Do not start a refactor, cleanup, dependency upgrade, or architecture redesign while fixing a bug.
- Reproduce once when practical. If reproduction is unavailable, state that explicitly.
- Use bounded commands and stop hanging processes.
- Make a small number of repair attempts. After repeated failure, stop and report evidence.

## Workflow

1. Classify the failure: compile, test, runtime, configuration, dependency, data, or environment.
2. Produce compact evidence: command, first relevant error, actionable frames, identifiers, and exit status.
3. Inspect only referenced files and immediate callers or configuration.
4. State a falsifiable root-cause hypothesis before editing.
5. Apply the smallest safe patch within the touch map.
6. Run only goal-named or failure-specific verification.
7. Return status, evidence, changed files, verification, remaining risk, and next action.

Never persist secrets, full logs, prompts, or transcripts. If diagnosis exceeds the touch map,
stop and recommend a new goal or session.
