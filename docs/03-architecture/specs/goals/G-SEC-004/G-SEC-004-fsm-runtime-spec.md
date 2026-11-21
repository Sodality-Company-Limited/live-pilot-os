# G-SEC-004 Runtime FSM

| State | Allowed transition | Failure behavior |
|---|---|---|
| unavailable | ready | fail closed |
| ready | processing | accept only valid authorized input |
| processing | succeeded | emit one verified result |
| processing | rejected | stable error; no unsafe mutation |
| processing | unknown | retain unknown and require reconciliation |

