# G-AG-008: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-008 (Prepare provider-neutral bounded session contracts)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
