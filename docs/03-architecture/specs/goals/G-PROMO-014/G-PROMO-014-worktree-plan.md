# G-PROMO-014 Worktree and Team-Agent Plan

- Epic branch: `epic/PROMO`; goal branch target: `feature/G-PROMO-014`.
- Dependency gate: G-PROMO-002,G-PROMO-006,G-PROMO-007.
- Team Agent role: `engineer2`; one stable persona per session.
- Allowed operational files:

- `tests/contract/promotion-schema-compatibility.spec.ts`
- `tests/contract/promotion-message-envelope.spec.ts`
- `tests/fixtures/promotion-contract-fixtures.ts`

- Parallel rule: this goal may run in its Soda wave only when dependencies are complete and its touch map is disjoint from sibling goals.
- Verification: goal-template harness, architecture harness, relevant unit/contract/integration tests, API/SOT checks, error registry, and `git diff --check`.
- Stop conditions: scope expansion, contract conflict, failed safety invariant, missing evidence, failed test, protected-branch mutation, or DigitalOcean apply without explicit approval.

