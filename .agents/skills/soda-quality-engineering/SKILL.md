---
name: soda-quality-engineering
version: "1.0.0"
description: Quality gates, P0–P4 triage, scorecard evidence, invariant checks, and post-goal learning for every Soda goal.
---

# Quality engineering

Run the scorecard after implementation and before review. A P0 or P1 finding blocks promotion. Record the JSON output with the goal, commit/source hash, command exits, and remediation owner. Never treat a simulated harness as proof of an external production dependency.

Use [quality-priorities.md](../../../docs/06-workflows/quality-priorities.md) for severity and solution rules. After ship, run `post-ship G-xxx` and turn recurring P2–P4 findings into a planned goal. Keep the loop closed: measure → record → remediate → rerun → learn.
