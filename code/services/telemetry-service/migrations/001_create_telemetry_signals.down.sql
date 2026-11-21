-- Migration: 001_create_telemetry_signals.down.sql
-- Goal: G-TELM-003 Reversible rollback for Telemetry persistence schema

DROP POLICY IF EXISTS telemetry_outbox_tenant_isolation ON telemetry.telemetry_outbox;
DROP INDEX IF EXISTS telemetry.idx_telemetry_outbox_aggregate_idx;
DROP INDEX IF EXISTS telemetry.idx_telemetry_outbox_pending_idx;
DROP TABLE IF EXISTS telemetry.telemetry_outbox;

DROP POLICY IF EXISTS telemetry_inbox_tenant_isolation ON telemetry.telemetry_inbox;
DROP INDEX IF EXISTS telemetry.idx_telemetry_inbox_session_processed_idx;
DROP INDEX IF EXISTS telemetry.idx_telemetry_inbox_idempotency_uidx;
DROP INDEX IF EXISTS telemetry.idx_telemetry_inbox_signal_uidx;
DROP TABLE IF EXISTS telemetry.telemetry_inbox;

DROP POLICY IF EXISTS telemetry_lineage_tenant_isolation ON telemetry.telemetry_lineage;
DROP INDEX IF EXISTS telemetry.idx_telemetry_lineage_provider_event_idx;
DROP INDEX IF EXISTS telemetry.idx_telemetry_lineage_correlation_idx;
DROP TABLE IF EXISTS telemetry.telemetry_lineage;

DROP POLICY IF EXISTS telemetry_signals_tenant_isolation ON telemetry.telemetry_signals;
DROP INDEX IF EXISTS telemetry.idx_telemetry_signals_state_created_idx;
DROP INDEX IF EXISTS telemetry.idx_telemetry_signals_session_type_ms_idx;
DROP INDEX IF EXISTS telemetry.idx_telemetry_signals_session_occurred_idx;
DROP INDEX IF EXISTS telemetry.idx_telemetry_signals_dedup_uidx;
DROP TABLE IF EXISTS telemetry.telemetry_signals;

DROP SCHEMA IF EXISTS telemetry;
