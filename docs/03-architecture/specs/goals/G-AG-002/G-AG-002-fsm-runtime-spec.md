# G-AG-002: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-002 (Enforce independent input and output token ceiling gates)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
