# FSM Runtime Spec: G-EXEC-003: Persistence FSM

Transitions recorded in `execution_state_transitions`:
- `requested` -> `accepted` | `failed`
- `accepted` -> `pending` | `failed`
- `pending` -> `succeeded` | `failed` | `unknown`
- `unknown` -> `reconciled` | `failed`
- `reconciled` -> `succeeded` | `failed`

Terminal states `succeeded` and `failed` cannot be transitioned away from. Optimistic locking enforces that every status update increments `version` by exactly 1.
