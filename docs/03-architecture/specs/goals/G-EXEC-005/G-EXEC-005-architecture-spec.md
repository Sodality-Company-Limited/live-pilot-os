# Architecture Spec: G-EXEC-005: Infrastructure Repositories & Transaction Boundary

Execution service implements clean architecture hexagonal infrastructure layers:
1. `ExecutionRepository`: Manages CRUD operations on `execution.execution_actions`, audit appends to `execution.execution_state_transitions`, and deduplication reservations in `execution.adapter_idempotency_records`.
2. `TransactionalBoundary`: Unit of Work coordinator ensuring that status transitions, version increments, audit history logs, and outbox staging are executed in a single ACID transaction.
3. `OutboxPublisher`: Drains pending outbox records to NATS JetStream and marks them dispatched reliably without losing message ordering.
4. `NatsExecutionClient`: High-level typed client for publishing `livepilot.v1.execution.action.updated` events.
