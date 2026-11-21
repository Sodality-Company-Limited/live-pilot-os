# G-PROMO-005: Worktree and Verification Plan

- Integration branch: epic/PROMO.
- Goal branch at execution: feature/G-PROMO-005.
- Allowed implementation boundary: promotion read model and status projection.
- Dependency order: PROMO goals execute in numeric order unless contract tests prove independent work.
- Verification commands: node scripts/harness/goal-template-conformance-harness.mjs G-PROMO-005; node scripts/harness/architecture-design-conformance-harness.mjs G-PROMO-005; node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs.
- Stop condition: unresolved SOT conflict, failed contract compatibility, missing dependency, failed security check, or unverified unknown outcome.
- Deployment gate: DigitalOcean apply requires immutable image, migration/rollback evidence, smoke/health evidence, and human approval.

