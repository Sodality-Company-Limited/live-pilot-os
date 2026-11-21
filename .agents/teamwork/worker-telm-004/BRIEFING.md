# Worker Briefing: G-TELM-004

## Objective
Implement pure domain `SignalStateMachine` in TypeScript:
- States: `received`, `validated`, `persisted`, `dispatched`, `failed`, `dead_lettered`
- Events: `VALIDATE`, `PERSIST`, `DISPATCH`, `FAIL`, `RETRY_EXHAUSTED` (DLQ)
- Deterministic pure reducer with typed transition exceptions (`IllegalStateTransitionError`)
- Property-based and unit tests verifying monotonic transition invariants and zero-float timestamps.
