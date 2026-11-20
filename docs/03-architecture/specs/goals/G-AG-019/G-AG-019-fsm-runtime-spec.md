# G-AG-019: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-019 (Enforce exclusive single-owner lease for LLM Wiki retrieval)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
