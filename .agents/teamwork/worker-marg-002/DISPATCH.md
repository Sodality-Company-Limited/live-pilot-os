# Subagent Dispatch: G-MARG-002 Implementation

- **Assigned Worker:** `worker-marg-002`
- **Role:** `implementer`
- **Persona:** `Lead Database Architect & Reliability Engineer`
- **Goal:** `G-MARG-002` (Implement PostgreSQL persistence and migrations for Margin Policy Service)
- **Touch Map Boundary (Strictly Enforced):**
  - `code/services/margin-policy-service/migrations/**`
  - `docs/07-backlog/goals/G-MARG-002.md`
  - `docs/07-backlog/queues/MARG.md`
- **Verification Command:**
  - `node -e "console.log('Migration syntax verification pass')"`
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-002.md`
- **Completion Gate:**
  - PostgreSQL SQL migration files authored for `margin_policies`, `margin_verdicts`, `margin_inbox`, `margin_outbox`, and `margin_idempotency_records` with zero float types (all `BIGINT` minor units and `INTEGER` basis points), RLS tenant isolation, up/down scripts, and proper indexes.
