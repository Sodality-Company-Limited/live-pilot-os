# FSM Runtime Spec: G-APPR-001

## 1. Approval Decision State Machine
```text
requested ──▶ approved ──▶ revoked
    │
    ├──▶ rejected
    │
    └──▶ expired
```

### Deterministic Transition Table
| State | Event / Trigger | Guard | Next State | Failure Behavior |
|---|---|---|---|---|
| `requested` | `DECISION_APPROVE` | `EmergencyPause == inactive && VersionMatch && now() <= expires_at` | `approved` | If pause active: `LP05004`. If expired: `LP05005`. If version conflict: `LP04001`. |
| `requested` | `DECISION_REJECT` | `EmergencyPause == inactive && now() <= expires_at` | `rejected` | Terminal state. |
| `requested` | `TTL_EXPIRED` | `now() > expires_at` | `expired` | Terminal state (`LP05005`). |
| `approved` | `DECISION_REVOKE` | `AuthorizedOperator && PreExecution` | `revoked` | Terminal state. Halts downstream dispatch. |
| `approved`/`rejected`/`expired`/`revoked` | Any Decision Mutation | `true` | Unchanged | Reject fail-closed (`LP05007: APPROVAL_DECISION_ALREADY_RECORDED`). |

## 2. Emergency Pause State Machine
```text
inactive ──▶ active (paused) ──▶ inactive (resumed)
```
- Inactive -> Active: Triggered by authorized operator command or automated risk system detection. Broadcasts immediately to all services.
- Active -> Inactive: Triggered exclusively by human operator with authorized credentials (`role: admin | live_ops`).
