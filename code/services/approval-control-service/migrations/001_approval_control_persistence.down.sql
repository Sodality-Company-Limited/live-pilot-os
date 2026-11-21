-- G-APPR-002: Reversible Down Migration for Approval & Control persistence

-- Drop triggers
DROP TRIGGER IF EXISTS trg_approval_requests_optimistic_lock ON approval.approval_requests;
DROP TRIGGER IF EXISTS trg_approval_decisions_immutable ON approval.approval_decisions;

-- Drop functions
DROP FUNCTION IF EXISTS approval.enforce_approval_request_optimistic_lock();
DROP FUNCTION IF EXISTS approval.reject_approval_decision_mutation();

-- Drop RLS policies
DROP POLICY IF EXISTS approval_requests_tenant_isolation ON approval.approval_requests;
DROP POLICY IF EXISTS approval_decisions_tenant_isolation ON approval.approval_decisions;
DROP POLICY IF EXISTS approval_modes_tenant_isolation ON approval.approval_modes;
DROP POLICY IF EXISTS emergency_pauses_tenant_isolation ON approval.emergency_pauses;
DROP POLICY IF EXISTS approval_outbox_tenant_isolation ON approval.approval_outbox;

-- Drop tables in dependency order
DROP TABLE IF EXISTS approval.approval_decisions;
DROP TABLE IF EXISTS approval.approval_requests;
DROP TABLE IF EXISTS approval.approval_modes;
DROP TABLE IF EXISTS approval.emergency_pauses;
DROP TABLE IF EXISTS approval.approval_outbox;

-- Drop schema
DROP SCHEMA IF EXISTS approval CASCADE;
