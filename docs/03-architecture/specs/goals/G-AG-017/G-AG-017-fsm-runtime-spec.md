# G-AG-017: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-017 (Detect duplicate step-context packet hashes per goal)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
