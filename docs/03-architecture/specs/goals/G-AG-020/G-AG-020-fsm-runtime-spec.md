# G-AG-020: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-020 (Validate end-to-end coordinator-to-subagent dispatch lifecycle)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
