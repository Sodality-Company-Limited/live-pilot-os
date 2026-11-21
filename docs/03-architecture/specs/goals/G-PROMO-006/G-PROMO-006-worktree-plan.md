# G-PROMO-006: Worktree and Verification Plan

- Integration branch: epic/PROMO.
- Goal branch at execution: feature/G-PROMO-006.
- Allowed implementation boundary: cross-service adapters and contract fixtures.
- Dependency order: PROMO goals execute in numeric order unless contract tests prove independent work.
- Verification commands: node scripts/harness/goal-template-conformance-harness.mjs G-PROMO-006; node scripts/harness/architecture-design-conformance-harness.mjs G-PROMO-006; node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs.
- Stop condition: unresolved SOT conflict, failed contract compatibility, missing dependency, failed security check, or unverified unknown outcome.
- Deployment gate: DigitalOcean apply requires immutable image, migration/rollback evidence, smoke/health evidence, and human approval.

