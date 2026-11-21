# G-AG-009: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-009 (Abort streaming provider sessions on budget limits)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
