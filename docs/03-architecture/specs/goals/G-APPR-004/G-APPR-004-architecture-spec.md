# Architecture Spec: G-APPR-004
Approval actions and pause state must be committed atomically with outbox records to guarantee at-least-once reliable delivery without distributed transactions.
