# G-AG-011: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-011 (Prune expired and oversized telemetry files)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
