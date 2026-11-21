# FSM Runtime Spec: G-APPR-005

## 1. Approval Lifecycle FSM
| Initial State | Event / Trigger | Guard Condition | Target State | Error Code on Failure |
|---|---|---|---|---|
| `[none]` | `approval.request` | Pause inactive, valid action_type | `requested` | `LP05004` (if paused), `LP03001` (if invalid) |
| `requested` | `approval.decide(approve)` | Proposer != Decider, Pause inactive, Version matches, TTL valid | `approved` | `LP05009` (SoD), `LP05004` (Paused), `LP04001` (Version), `LP05005` (Expired) |
| `requested` | `approval.decide(reject)` | Pause inactive, Version matches | `rejected` | `LP05004` (Paused), `LP04001` (Version) |
| `requested` | `now > deadline_at_ms` | Expiry sweep or read evaluation | `expired` | `LP05005` |
| `approved` | `approval.decide(revoke)` | Pause inactive, Version matches | `revoked` | `LP05004` (Paused), `LP04001` (Version) |
| `rejected` / `expired` / `revoked` | Any decision mutation | None (immutable) | Unchanged | `LP05007` (Decision already recorded) |

## 2. Emergency Pause FSM
| Initial State | Event / Trigger | Guard Condition | Target State | Failure Action |
|---|---|---|---|---|
| `inactive` | `emergency_pause.trigger(pause)` | Any valid operator or automated risk system | `active` | Broadcasts `control.emergency_pause.changed` |
| `active` | `emergency_pause.trigger(resume)` | Human operator role (`admin`, `live_ops`) | `inactive` | Rejects if automated system (`LP05008`) |
