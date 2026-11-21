# FSM Runtime Spec: G-EXEC-007: Reliability & Reconciliation FSM

```text
               ┌──────────┐
               │ unknown  │
               └────┬─────┘
                    │ [ReconciliationProbe]
                    ▼
               ┌──────────┐
               │reconciled│
               └────┬─────┘
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
   ┌───────────┐         ┌──────────┐
   │ succeeded │         │  failed  │
   └───────────┘         └──────────┘
         │
         ▼ (Unobserved after retries)
   ┌───────────┐
   │    DLQ    │
   └───────────┘
```
