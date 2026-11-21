# G-PROMO-026 Worktree and Team-Agent Plan

- Epic branch: `epic/PROMO`; goal branch target: `feature/G-PROMO-026`.
- Dependency gate: G-PROMO-018,G-PROMO-023,G-PROMO-024,G-PROMO-025.
- Team Agent role: `engineer2`; one stable persona per session.
- Allowed operational files:

- `tests/integration/promotion-service-level.spec.ts`
- `tests/security/promotion-redaction.spec.ts`
- `tests/fixtures/promotion-service-fixtures.ts`

- Parallel rule: this goal may run in its Soda wave only when dependencies are complete and its touch map is disjoint from sibling goals.
- Verification: goal-template harness, architecture harness, relevant unit/contract/integration tests, API/SOT checks, error registry, and `git diff --check`.
- Stop conditions: scope expansion, contract conflict, failed safety invariant, missing evidence, failed test, protected-branch mutation, or DigitalOcean apply without explicit approval.

