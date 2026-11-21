# G-AG-007: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-007 (Execute bounded subprocess commands with line clamping)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
