# G-APPR-003 Domain Architecture Specification: Approval & Emergency Pause FSM

## 1. Domain Overview
This specification details the pure domain models and state machines implemented for `approval-control-service`:
- `ApprovalStateMachine`: Manages approval request lifecycle transitions (`requested` -> `approved` | `rejected` | `expired` | `revoked`), deterministic TTL expiry, terminal state immutability, and optimistic concurrency versioning.
- `EmergencyPauseEngine`: Manages pause state evaluation across hierarchical scopes (`GLOBAL`, `TENANT`, `SESSION`), absolute precedence over approval decisions, and fail-closed gatekeeping.
- `AuthorityPolicy`: Enforces Separation of Duty (SoD) ensuring proposers cannot approve their own requests, along with actor capability verification for sensitive actions.
- `ApprovalModeEngine`: Governs live session automation modes (`RECOMMEND_ONLY`, `ASSISTED`, `AUTONOMOUS`), enforcing permission barriers for autonomous execution.

## 2. Invariants & Proofs
1. **Zero Mocks**: All domain engines are 100% operational TypeScript/ESM functions without stubs, fallbacks, or mocks.
2. **Terminal State Immutability**: Any mutation attempted on an aggregate in terminal status (`approved` without revocation, `rejected`, `expired`, `revoked`) fails closed with `LP05007`.
3. **Emergency Pause Precedence**: Active pause immediately rejects all decision attempts fail closed with `LP05004`.
4. **Separation of Duty**: Proposer cannot approve own request, returning `LP05009`.
