# Soda OS quality priorities

Every goal and harness reports defects using the same severity contract:

| Priority | Definition | Required solution |
|---|---|---|
| P0 | Release blocker: security exposure, data loss, broken invariant, secret leak, or unverifiable evidence | Stop promotion; reproduce, fix, and rerun the complete gate. A P0 forces score 0. |
| P1 | Critical acceptance or architecture failure likely to break a primary user or integration path | Fix in the current goal or obtain a documented human waiver before release. |
| P2 | High impact reliability, performance, accessibility, or maintainability defect | Add a regression test and resolve within the current delivery cycle. |
| P3 | Normal defect with a contained workaround | Record as a follow-up goal with owner and acceptance criteria. |
| P4 | Polish, documentation, optimization, or experimental improvement | Backlog and schedule when it has measurable value. |

P0 and P1 are promotion gates. P2–P4 remain visible in the scorecard and learning log. The scorecard is evidence about the checked tree at a timestamp; it is not a proof that an untested external system is correct.

## Iterative improvement contract

Each completed goal records the scorecard JSON, command exit codes, source revision, and any P0–P4 findings. `post-ship G-xxx` turns observations into a learning record and, when needed, a new planned goal. Framework upgrades copy the harnesses and this contract through `soda-os upgrade`.
