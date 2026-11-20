# G-AG-012: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-012 (Track mid-session token accumulation and limit halting)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
