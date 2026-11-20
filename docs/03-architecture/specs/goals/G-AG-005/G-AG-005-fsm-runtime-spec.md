# G-AG-005: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-005 (Reject full-goal context in step packets)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
