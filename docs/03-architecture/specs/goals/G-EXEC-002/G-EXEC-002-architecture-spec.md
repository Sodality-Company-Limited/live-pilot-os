# Architecture Spec: G-EXEC-002
Execution & Platform Adapter Safety service models the lifecycle of `ExecutionAction`.
All execution commands are received, authorized, deduplicated, and dispatched to platform adapters under strict isolation boundaries.
Error codes follow the canonical LivePilot error taxonomy (`LP40xxx` / `LP50xxx` and core `LP01xxx`-`LP10xxx`).
