# G-CORE-052: Worktree and Verification Plan

- Integration branch: epic/CORE.
- Goal branch: feature/G-CORE-052.
- Wave rule: run soda-os goal waves CORE; parallel goals require pairwise-disjoint operational touch maps.
- Allowed implementation boundary: the goal card touch map only.
- Verification: node scripts/harness/goal-template-conformance-harness.mjs G-CORE-052; node scripts/harness/architecture-design-conformance-harness.mjs G-CORE-052; applicable API/SOT and goal tests.
- Stop condition: unresolved contract authority, failed security, failed traceability, or unverified unknown outcome.
