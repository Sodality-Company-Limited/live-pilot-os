# G-AG-004: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-004 (Compile step-scoped partial context packets)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
