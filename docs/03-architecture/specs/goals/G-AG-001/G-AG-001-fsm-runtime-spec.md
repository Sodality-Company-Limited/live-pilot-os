# G-AG-001: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-001 (Enforce single-persona and touch-map contracts)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
