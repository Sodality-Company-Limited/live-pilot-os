-- Rollback migration for execution persistence

DROP TRIGGER IF EXISTS execution_actions_optimistic_lock ON execution.execution_actions;
DROP TRIGGER IF EXISTS execution_transitions_append_only ON execution.execution_state_transitions;

DROP FUNCTION IF EXISTS execution.enforce_execution_action_optimistic_lock();
DROP FUNCTION IF EXISTS execution.reject_execution_transition_mutation();

DROP TABLE IF EXISTS execution.execution_inbox;
DROP TABLE IF EXISTS execution.execution_outbox;
DROP TABLE IF EXISTS execution.adapter_idempotency_records;
DROP TABLE IF EXISTS execution.execution_state_transitions;
DROP TABLE IF EXISTS execution.execution_actions;

DROP SCHEMA IF EXISTS execution;
