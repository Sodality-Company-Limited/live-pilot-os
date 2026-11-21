# G-CORE-097: Architecture Specification

- Outcome: Wire local production-shaped Compose runtime.
- Capability class: operations.
- Authority: deployment/runtime topology, technical specifications, software quality, testing, security, and linked Core BFF contracts.
- Boundary: the goal is one deployable continuation capability; domain ownership and public behavior remain unchanged.
- Invariants: non-root runtime, private dependency access, bounded lifecycle, explicit degraded/unknown state, and revision-bound evidence.
- Verification: node scripts/architecture/check-sot.mjs; applicable goal, contract, security, or release command.
