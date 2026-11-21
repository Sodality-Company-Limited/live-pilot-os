# FSM Runtime Spec: G-EXEC-004: Schema Validation FSM

Inbound and outbound messages evaluate schema compatibility prior to state emission:
1. `EnvelopeCheck`: Missing required headers fails closed.
2. `PayloadValidation`: Field types, enum values, and minLength bounds checked against JSON Schema.
3. `ModeCheck`: `X-Mode` header must match payload `mode` attribute (`SIMULATED`, `SANDBOX`, `CONFIRMED`).
4. `StatusValidity`: Status must belong to allowed enum set.
Failures trigger `LP03001 (REQUEST_INVALID)` and route poison messages to DLQ.
