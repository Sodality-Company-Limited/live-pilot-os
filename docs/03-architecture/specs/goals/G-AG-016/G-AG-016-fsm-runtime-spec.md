# G-AG-016: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-016 (Enforce provider prompt deduplication gate)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
