# G-AG-006: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-006 (Record compact session telemetry and failure fingerprints)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
