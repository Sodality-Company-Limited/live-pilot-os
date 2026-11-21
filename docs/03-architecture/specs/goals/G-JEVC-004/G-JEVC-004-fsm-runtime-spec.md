# G-JEVC-004 Finite State Machine (FSM) Runtime Specification

## State Transition Matrix

The inference lifecycle governs the transition from trigger to host delivery or failure containment:

| Current State | Event / Input | Guard Condition | Next State | Action / Output |
|---|---|---|---|---|
| `IDLE` | `TRIGGER_INFERENCE` | Valid session & tenant ID | `INFERRING` | Start timeout timer, invoke provider |
| `INFERRING` | `RAW_OUTPUT_RECEIVED` | Valid JSON & Schema matches & $c \ge c_{\min}$ & Grounded | `ACCEPTED` | Emit `grounded` suggestion, store receipt |
| `INFERRING` | `RAW_OUTPUT_RECEIVED` | Valid JSON & Schema matches & $c < c_{\min}$ | `DEFERRED` | Store receipt with outcome `deferred`, no suggestion proposed |
| `INFERRING` | `RAW_OUTPUT_RECEIVED` | Malformed JSON or Missing Evidence or Invalid Type | `REFUSED` | Store receipt with outcome `refused`, emit degraded alert |
| `INFERRING` | `TIMEOUT_TRIGGERED` | Elapsed time $> T_{\text{timeout}}$ | `TIMEOUT` | Abort network fetch, emit degraded alert, store receipt |
| `INFERRING` | `NETWORK_ERROR` | Provider API 5xx or connection refused | `DEGRADED_FAIL_CLOSED` | Emit degraded alert, store receipt with outcome `unknown` |

## Terminal Outcome Taxonomy
- `accepted`: Fully grounded, verified schema, confidence above threshold. Ready for host delivery.
- `deferred`: Suggestion parsed cleanly, but confidence was below host safety threshold.
- `refused`: Schema validation failed, evidence missing or unverifiable. Blocked from display.
- `timeout`: Provider did not respond within deadline. Fail-closed.
- `unknown`: Network or provider internal error. Fail-closed.
- `conflict`: Resource version mismatch or concurrent modification.
