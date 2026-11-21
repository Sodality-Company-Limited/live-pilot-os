# G-PROMO-027 Worktree and Team-Agent Plan

- Epic branch: `epic/PROMO`; goal branch target: `feature/G-PROMO-027`.
- Dependency gate: G-PROMO-026.
- Team Agent role: `engineer2`; one stable persona per session.
- Allowed operational files:

- `scripts/harness/promotion-service-gate.mjs`
- `docs/03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-evidence.md`
- `docs/07-backlog/goals/G-PROMO-027.md`

- Parallel rule: this goal may run in its Soda wave only when dependencies are complete and its touch map is disjoint from sibling goals.
- Verification: goal-template harness, architecture harness, relevant unit/contract/integration tests, API/SOT checks, error registry, and `git diff --check`.
- Stop conditions: scope expansion, contract conflict, failed safety invariant, missing evidence, failed test, protected-branch mutation, or DigitalOcean apply without explicit approval.

