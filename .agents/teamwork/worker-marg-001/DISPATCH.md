# Subagent Dispatch: G-MARG-001 Implementation

- **Assigned Worker:** `worker-marg-001`
- **Role:** `implementer`
- **Persona:** `Principal Systems & Protocol Architect`
- **Goal:** `G-MARG-001` (Freeze Margin Policy Service contract and state machine)
- **Touch Map Boundary (Strictly Enforced):**
  - `docs/03-architecture/api/services/margin-policy-service.md`
  - `docs/07-backlog/goals/G-MARG-001.md`
  - `docs/07-backlog/queues/MARG.md`
- **Verification Command:**
  - `node scripts/contract-check/error-code-registry.mjs`
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-001.md`
- **Completion Gate:**
  - `margin-policy-service.md` created with complete ownership, resource aggregates, commands, events, state machine, errors, and zero-float invariants.
