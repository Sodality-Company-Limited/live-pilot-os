# Subagent Dispatch: G-MARG-004 Implementation

- **Assigned Worker:** `worker-marg-004`
- **Role:** `implementer`
- **Persona:** `Lead Backend Engineer & Distributed Systems Developer`
- **Goal:** `G-MARG-004` (Implement Core Margin Calculation and First Vertical Slice)
- **Touch Map Boundary (Strictly Enforced):**
  - `code/services/margin-policy-service/**`
  - `tests/unit/margin-policy-service/**`
  - `docs/07-backlog/goals/G-MARG-004.md`
  - `docs/07-backlog/queues/MARG.md`
- **Verification Command:**
  - `npm test --prefix code/services/margin-policy-service`
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-004.md`
- **Completion Gate:**
  - Operational vertical slice implemented under code/services/margin-policy-service with package.json, TypeScript configs, MarginCalculator, Repository, Outbox Writer, and NATS message dispatcher.
  - Zero mocks: unit & integration tests run and pass 100% green.
