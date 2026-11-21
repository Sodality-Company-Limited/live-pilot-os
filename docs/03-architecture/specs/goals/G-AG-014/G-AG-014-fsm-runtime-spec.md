# G-AG-014: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-014 (Report token budget warning and hard limit states)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
