# FSM Runtime Spec: G-EXEC-006: Dispatch Lifecycle FSM

```text
requested (v=1)
    │
    ▼
accepted (v=2)
    │
    ▼
pending (v=3)
    │
    ├──▶ succeeded (v=4, adapter confirmed)
    ├──▶ failed (v=4, adapter rejected with LP error code)
    └──▶ unknown (v=4, adapter timeout / dropped network)
```
Duplicate dispatches return the existing record directly as an idempotent replay without second-order mutations.
