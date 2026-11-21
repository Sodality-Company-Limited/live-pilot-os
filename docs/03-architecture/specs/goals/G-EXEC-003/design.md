# Design: G-EXEC-003: Persistence Schema and Idempotency Ledger

Complete architectural design and schema definition for execution-service persistence.
Implements PostgreSQL 16 `execution_actions`, `execution_state_transitions`, `adapter_idempotency_records`, `execution_outbox`, `execution_inbox`, optimistic lock triggers, and RLS tenant isolation.
