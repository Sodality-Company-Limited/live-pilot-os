# G-JEVC-006 Finite State Machine (FSM) Runtime Specification

## Suggestion Delivery and Withdrawal Lifecycle FSM

The `SuggestionAggregate` domain model enforces strict lifecycle transitions, deterministic guard conditions, and optimistic concurrency version locking:

```text
 ┌───────────┐
 │ proposed  │
 └─────┬─────┘
       │ (ground)
       ▼
 ┌───────────┐
 │ grounded  │ ──(deliver)──► ┌───────────┐
 └─────┬─────┘                │ delivered │
       │                      └─────┬─────┘
       │                            ├──(recordDecision: used)──────► [ used ]
       │                            ├──(recordDecision: edited)────► [ edited ]
       │                            ├──(recordDecision: dismissed)─► [ dismissed ]
       │                            ├──(expire)────────────────────► [ expired ]
       │                            └──(withdraw)──────────────────► [ withdrawn ]
       │
       ├──(withdraw)──► [ withdrawn ]
       └──(expire)────► [ expired ]
```

### State Transition Matrix

| Current State | Transition Trigger | Guard Condition | Next State | Version Bump | Emitted Wire Event |
|---|---|---|---|---|---|
| `proposed` | `ground()` | Evidence refs $\ge 1$ verified, confidence $\ge 7000$ bps | `grounded` | $+1$ | `copilot.suggestion.proposed` |
| `grounded` | `deliver()` | Freshness not expired ($t < t_{\text{exp}}$) | `delivered` | $+1$ | `copilot.suggestion.delivered` |
| `grounded` | `withdraw()` | Emergency pause, catalog fact update, or stock drop | `withdrawn` | $+1$ | `livepilot.v1.copilot.suggestion.withdrawn` |
| `grounded` | `expire()` | Elapsed time $\ge t_{\text{exp}}$ without delivery | `expired` | $+1$ | `copilot.suggestion.expired` |
| `delivered` | `recordDecision(used)` | Host applied suggestion directly without change | `used` | $+1$ | `copilot.suggestion.used` |
| `delivered` | `recordDecision(edited)` | Host modified script or parameters | `edited` | $+1$ | `copilot.suggestion.edited` |
| `delivered` | `recordDecision(dismissed)` | Host rejected/dismissed suggestion card | `dismissed` | $+1$ | `copilot.suggestion.dismissed` |
| `delivered` | `expire()` | Elapsed time $\ge t_{\text{exp}}$ without host action | `expired` | $+1$ | `copilot.suggestion.expired` |
| `delivered` | `withdraw()` | Emergency pause, inventory drop, or operator recall | `withdrawn` | $+1$ | `livepilot.v1.copilot.suggestion.withdrawn` |
| Any terminal (`used`, `edited`, `dismissed`, `expired`, `withdrawn`) | Any trigger | Terminal states immutable | Error (`LP04001`) | None | None |

### Invariant Rules
1. **Terminal State Immutability:** Once an aggregate enters `used`, `edited`, `dismissed`, `expired`, or `withdrawn`, it is strictly immutable. Any transition attempt throws `SuggestionStateTransitionError` with RFC 7807 code `LP04001` (`RESOURCE_VERSION_CONFLICT`).
2. **Freshness Delivery Guard:** An aggregate cannot transition to `delivered` if the observed timestamp $t_{\text{observed}} \ge t_{\text{freshness\_expires\_at}}$.
3. **Atomic Version Increment:** Every valid state mutation increments `aggregate_version` by exactly 1 and updates `updated_at`.
4. **Optimistic Locking Guard:** Database updates execute conditional updates requiring `WHERE aggregate_version = $expectedVersion`, failing closed if another actor altered the resource concurrently.
