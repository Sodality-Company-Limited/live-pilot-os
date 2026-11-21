-- 001_create_margin_tables.down.sql
-- Down Migration: Clean reversible teardown of Margin Policy Service schema and RLS policies

DROP POLICY IF EXISTS margin_idempotency_records_tenant_isolation ON margin_idempotency_records;
DROP POLICY IF EXISTS margin_inbox_tenant_isolation ON margin_inbox;
DROP POLICY IF EXISTS margin_outbox_tenant_isolation ON margin_outbox;
DROP POLICY IF EXISTS margin_verdicts_tenant_isolation ON margin_verdicts;
DROP POLICY IF EXISTS margin_policies_tenant_isolation ON margin_policies;

DROP TABLE IF EXISTS margin_idempotency_records;
DROP TABLE IF EXISTS margin_inbox;
DROP TABLE IF EXISTS margin_outbox;
DROP TABLE IF EXISTS margin_verdicts;
DROP TABLE IF EXISTS margin_policies;
