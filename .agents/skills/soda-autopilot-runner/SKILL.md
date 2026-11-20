---
name: soda-autopilot-runner
version: "1.0.0"
description: Autonomous fleet supervisor and bounded execution loop controller. Coordinates continuous backlog queue draining, sequential goal execution, bounded retry budgets, and fail-closed halt triggers.
---

# soda-autopilot-runner

The `soda-autopilot-runner` skill governs autonomous fleet supervision and continuous backlog queue draining for multi-goal swarms.

## When to Use
- When executing continuous multi-wave backlogs without human intervention.
- When supervising unattended overnight runs across epics.
- When enforcing bounded iteration ceilings ($i \le N_{\text{max}}$) and fail-closed safety halts.

## Invariants
- **INV-035-001 (Boundedness):** Autopilot loops are strictly bounded by integer iteration ceilings and never execute unbounded while(true) loops.
- **INV-035-002 (Monotonicity):** Backlog active goal queue length is non-increasing across successful iterations.
- **Fail-Closed Safety:** Any step returning a non-zero exit code or failing assertions aborts execution immediately.

## Commands
```bash
# Execute autopilot loop tests
node --test tests/lib/autopilot-runner.test.mjs
```
