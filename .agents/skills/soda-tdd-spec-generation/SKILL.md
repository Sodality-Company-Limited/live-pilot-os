---
name: soda-tdd-spec-generation
version: "1.0.0"
description: Generate and audit LivePilot TDD specifications from BRD, BDD, API contracts, domain invariants, fixtures, and test evidence requirements.
triggers: TDD, test-first, red green refactor, generate test specs, unit test specification, invariant tests
touches:
  - docs/03-architecture/testing/
  - scripts/testing/
---

# TDD specification generation

Use this skill after BDD/API SOTs are approved and before implementation.

1. Trace `REQ → BDD → flow → API/subject → TDD → test → receipt`.
2. Create one catalog record per observable behavior and consequential failure branch.
3. Bind records to invariants, approved seams, deterministic fixtures, and exact test paths.
4. Start with a meaningful failing test, implement the smallest behavior, then refactor.
5. Run `node scripts/testing/tdd-cycle-harness.mjs` before review.

Every generated TDD set must classify frontend/component, backend/service, unit/property,
smoke, integration, microservices, security, and stress/load coverage. A missing class
requires an explicit not-applicable rationale and reviewer.

Never use coverage percentage as a substitute for behavior, invariant, security,
contract, or operational evidence. Simulation may replace unavailable external effects
only; core validation, authorization, persistence, idempotency, audit, and reconciliation
must remain real.
