# G-APPR-002 FSM Runtime Specification

## 1. Approval Request Lifecycle FSM
- `requested` -> `approved` (Operator decision recorded)
- `requested` -> `rejected` (Operator decision rejected)
- `requested` -> `expired` (TTL elapsed: `now_ms > deadline_at_ms`)
- `approved` -> `revoked` (Revocation prior to execution dispatch)
- Any terminal state (`approved`, `rejected`, `expired`, `revoked`) is immutable.

## 2. Emergency Pause FSM
- State is tracked in `approval.emergency_pauses`.
- When `is_paused = true`, all approval decisions and automated actions fail closed immediately.
