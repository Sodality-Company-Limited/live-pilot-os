# Architecture Spec: G-EXEC-007: Reliability, Circuit Breaker & DLQ Reconciliation

Execution & Platform Adapter Safety service reliability architecture:
1. `EmergencyPauseHandler`: Immediately intercepts all pending and new executions when emergency pause is active, returning fail-closed `LP40003`.
2. `CircuitBreaker`: Three-state breaker (CLOSED, OPEN, HALF_OPEN) tracking consecutive transient adapter failures and rejecting requests fail-closed without outbound transport pressure.
3. `RetryPolicy`: Classifies retryable vs non-retryable error codes with bounded exponential backoff and randomized full jitter.
4. `DlqPublisher` & `ReconciliationWorker`: Reconciles `unknown` state actions against verified platform state, and routes exhausted retries to `livepilot.v1.execution.action.dlq`.
