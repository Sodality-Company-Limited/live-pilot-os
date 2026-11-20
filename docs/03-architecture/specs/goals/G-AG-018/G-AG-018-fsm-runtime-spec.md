# G-AG-018: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-018 (Capture and redact process execution failure evidence)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
