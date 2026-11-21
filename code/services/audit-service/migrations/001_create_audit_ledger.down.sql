-- =============================================================================
-- Migration: 001_create_audit_ledger.down.sql
-- Service: audit-service
-- Description: Clean teardown of audit ledger tables, policies, and schema
-- Invariants: Revert in reverse dependency order without leaving orphaned objects.
-- =============================================================================

DROP POLICY IF EXISTS tenant_isolation_audit_outbox ON audit.audit_outbox;
DROP TABLE IF EXISTS audit.audit_outbox CASCADE;

DROP POLICY IF EXISTS tenant_isolation_audit_inbox ON audit.audit_inbox;
DROP TABLE IF EXISTS audit.audit_inbox CASCADE;

DROP POLICY IF EXISTS tenant_isolation_audit_records ON audit.audit_records;
DROP TABLE IF EXISTS audit.audit_records CASCADE;

DROP SCHEMA IF EXISTS audit CASCADE;
