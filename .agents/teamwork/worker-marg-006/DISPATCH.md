# Subagent Dispatch: G-MARG-006 Implementation

- **Assigned Worker:** `worker-marg-006`
- **Role:** `tester`
- **Persona:** `Lead Quality Engineer & Formal Verification Specialist`
- **Goal:** `G-MARG-006` (Execute Service-Level Tests and Architectural Verification Gates)
- **Touch Map Boundary (Strictly Enforced):**
  - `tests/margin-policy-service/**`
  - `artifacts/proofs/G-MARG-006-audit-receipt.json`
  - `docs/07-backlog/goals/G-MARG-006.md`
  - `docs/07-backlog/queues/MARG.md`
- **Verification Command:**
  - `node tests/margin-policy-service/margin-property-invariants.test.mjs`
  - `node scripts/contract-check/error-code-registry.mjs`
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-006.md`
- **Completion Gate:**
  - Property-based testing script verifies algebraic conservation and monotonicity across 10,000 trials.
  - SOT checks and error code registry pass 100%.
  - Audit proof receipt generated at `artifacts/proofs/G-MARG-006-audit-receipt.json`.
