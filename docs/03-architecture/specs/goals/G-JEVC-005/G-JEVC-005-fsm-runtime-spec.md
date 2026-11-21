# G-JEVC-005 Finite State Machine (FSM) Runtime Specification

## Suggestion Lifecycle FSM

The `SuggestionAggregate` domain model enforces strict lifecycle transitions and optimistic concurrency version locking:

```text
 ┌───────────┐
 │ proposed  │
 └─────┬─────┘
       │
       ▼
 ┌───────────┐
 │ grounded  │ ──(deliver)──► ┌───────────┐
 └─────┬─────┘                │ delivered │
       │                      └─────┬─────┘
       │                            ├──(use)──────► [ used ]
       │                            ├──(edit)─────► [ edited ]
       │                            ├──(dismiss)──► [ dismissed ]
       │                            ├──(expire)───► [ expired ]
       │                            └──(withdraw)─► [ withdrawn ]
       │
       ├──(withdraw)──► [ withdrawn ]
       └──(expire)────► [ expired ]
```

### State Transition Matrix

| Current State | Transition Trigger | Guard Condition | Next State | Aggregate Version | Emitted Wire Event |
|---|---|---|---|---|---|
| `proposed` | `ground()` | Evidence refs $\ge 1$ verified, confidence $\ge 7000$ bps | `grounded` | $+1$ | `copilot.suggestion.proposed` |
| `grounded` | `deliver()` | Freshness not expired ($t < t_{\text{exp}}$) | `delivered` | $+1$ | `copilot.suggestion.delivered` |
| `delivered` | `recordUsed()` | Host invoked action without modification | `used` | $+1$ | `copilot.suggestion.used` |
| `delivered` | `recordEdited()` | Host edited script or parameters | `edited` | $+1$ | `copilot.suggestion.edited` |
| `delivered` | `recordDismissed()`| Host dismissed suggestion card | `dismissed` | $+1$ | `copilot.suggestion.dismissed` |
| `delivered` | `expire()` | Elapsed time $\ge t_{\text{exp}}$ | `expired` | $+1$ | `copilot.suggestion.expired` |
| Any non-terminal | `withdraw()` | Emergency control pause or fact update | `withdrawn` | $+1$ | `livepilot.v1.copilot.suggestion.withdrawn` |

### Invariant Rules
1. Terminal states (`used`, `edited`, `dismissed`, `expired`, `withdrawn`) are strictly immutable. Any transition attempt throws `INVALID_STATE_TRANSITION`.
2. Every status mutation bumps `aggregate_version` by exactly 1 and updates `updated_at`.
3. Database updates enforce `WHERE aggregate_version = $expectedVersion`, failing closed with `RESOURCE_VERSION_CONFLICT` upon optimistic lock violations.
