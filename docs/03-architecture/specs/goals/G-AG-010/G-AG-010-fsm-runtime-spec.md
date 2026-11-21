# G-AG-010: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-010 (Load runtime budget parameters from YAML configuration)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
