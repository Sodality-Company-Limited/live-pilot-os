# G-AG-003: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-003 (Reject duplicate input prompts for the same goal)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
