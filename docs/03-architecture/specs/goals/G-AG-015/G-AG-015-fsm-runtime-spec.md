# G-AG-015: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-015 (Enforce provider input ceiling pre-spawn gate)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
