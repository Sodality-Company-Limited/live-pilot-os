# G-PROMO-028 Worktree and Team-Agent Plan

- Epic branch: `epic/PROMO`; goal branch target: `feature/G-PROMO-028`.
- Dependency gate: G-PROMO-027.
- Team Agent role: `engineer2`; one stable persona per session.
- Allowed operational files:

- `code/apps/services/promotion-service/Dockerfile`
- `infra/promotion-service/docker-compose.yml`
- `docs/03-architecture/deployment/promotion-service-release-runbook.md`

- Parallel rule: this goal may run in its Soda wave only when dependencies are complete and its touch map is disjoint from sibling goals.
- Verification: goal-template harness, architecture harness, relevant unit/contract/integration tests, API/SOT checks, error registry, and `git diff --check`.
- Stop conditions: scope expansion, contract conflict, failed safety invariant, missing evidence, failed test, protected-branch mutation, or DigitalOcean apply without explicit approval.

