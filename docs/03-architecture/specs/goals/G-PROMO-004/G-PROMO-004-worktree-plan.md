# G-PROMO-004: Worktree and Verification Plan

- Integration branch: epic/PROMO.
- Goal branch at execution: feature/G-PROMO-004.
- Allowed implementation boundary: promotion proposal command handler and public contract.
- Dependency order: PROMO goals execute in numeric order unless contract tests prove independent work.
- Verification commands: node scripts/harness/goal-template-conformance-harness.mjs G-PROMO-004; node scripts/harness/architecture-design-conformance-harness.mjs G-PROMO-004; node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs.
- Stop condition: unresolved SOT conflict, failed contract compatibility, missing dependency, failed security check, or unverified unknown outcome.
- Deployment gate: DigitalOcean apply requires immutable image, migration/rollback evidence, smoke/health evidence, and human approval.

