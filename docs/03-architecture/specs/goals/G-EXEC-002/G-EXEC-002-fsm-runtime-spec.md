# FSM Runtime Spec: G-EXEC-002: Execution Action State Machine

## 1. States

| State | Description | Category |
|---|---|---|
| `requested` | Command received, awaiting schema, scope, and idempotency evaluation | Initial |
| `accepted` | Validated, tenant/session-scoped, and idempotently registered in ledger | Pre-execution |
| `pending` | Dispatched to platform adapter; awaiting external observation receipt | In-flight |
| `succeeded` | Definitive positive receipt observed and committed | Terminal (Success) |
| `failed` | Definitive fatal error returned or non-retryable rejection confirmed | Terminal (Failure) |
| `unknown` | Timeout or unconfirmed connectivity state; execution outcome uncertain | Deferral / Ambiguous |
| `reconciled` | Actively verified via status polling, reconciliation worker, or webhook | Resolution |

## 2. Transition Matrix, Preconditions, and Postconditions

```text
               ┌──────────┐
               │requested │
               └────┬─────┘
                    │ [Valid schema & auth]
                    ▼
               ┌──────────┐
               │ accepted │
               └────┬─────┘
                    │ [Dispatched to adapter]
                    ▼
               ┌──────────┐
               │ pending  │───────┐ [Adapter definitive failure]
               └────┬─────┘       ▼
     [Adapter receipt]  │       ┌──────────┐
          │             │       │  failed  │ (Terminal)
          │             │       └──────────┘
          ▼             ▼ [Timeout / Drop]
    ┌───────────┐  ┌──────────┐
    │ succeeded │  │ unknown  │
    └───────────┘  └────┬─────┘
     (Terminal)         │ [Reconciliation probe]
                        ▼
                   ┌──────────┐
                   │reconciled│
                   └────┬─────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   ┌───────────┐                 ┌──────────┐
   │ succeeded │                 │  failed  │
   └───────────┘                 └──────────┘
```

| Source State | Event / Trigger | Target State | Preconditions | Postconditions & Invariants |
|---|---|---|---|---|
| `*` | `CommandReceived` | `requested` | NATS message received with correlation & tenant headers | Action envelope created; payload hash computed |
| `requested` | `ValidateSuccess` | `accepted` | Schema valid, active live session, tenant authorized, idempotency key unique | Inbox ledger entry written atomically with status `accepted` |
| `requested` | `ValidateFailure` | `failed` | Invalid schema, missing headers, cross-tenant attempt | Failed receipt written; poison message to DLQ |
| `accepted` | `AdapterDispatch` | `pending` | Action queued; adapter circuit breaker closed; emergency pause inactive | Outbound adapter request emitted with timeout deadline |
| `pending` | `AdapterObservedSuccess`| `succeeded` | Definitive observed provider response received & validated | Terminal success recorded; `livepilot.v1.execution.action.updated` emitted |
| `pending` | `AdapterDefinitiveError`| `failed` | Non-retryable adapter rejection (e.g. invalid SKU, permission denied) | Terminal failure recorded; error code mapped; update event emitted |
| `pending` | `AdapterTimeoutOrDrop` | `unknown` | Request timeout exceeded without definitive response | State set to `unknown`; reconciliation task scheduled; NEVER set to success |
| `unknown` | `ReconciliationProbe` | `reconciled` | Reconciliation worker queries platform status or processes webhook | Platform observed status retrieved with verifiable timestamp |
| `reconciled` | `ConfirmedExecuted` | `succeeded` | Observed platform state matches desired execution effect | Terminal success recorded; reconciliation receipt written |
| `reconciled` | `ConfirmedNotExecuted`| `failed` | Observed platform confirms action never executed or rejected | Terminal failure recorded; reconciliation receipt written |

## 3. Strict Prohibitions and Invariants

1. **Zero Premature Success:** `unknown` or `pending` states MUST NEVER transition directly to `succeeded` without an observed cryptographic or platform receipt.
2. **Deterministic Error Mappings:** All failures map to explicit `LP*` codes from `docs/03-architecture/api/error-codes.yaml`.
3. **Fail-Closed Concurrency:** Out-of-order transitions throw `IllegalStateTransitionError` and fail closed.
