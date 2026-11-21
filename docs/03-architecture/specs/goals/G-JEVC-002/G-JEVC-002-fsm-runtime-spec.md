# G-JEVC-002 — Finite State Machine (FSM) Runtime Specification

Goal ID: `G-JEVC-002`  
Scope: JEV Suggestion Lifecycle Wire States, Outbox Dispatch, Retraction Triggers, and Degraded Outage Transitions  
Status: `APPROVED`

---

## 1. Wire Event Lifecycle and State Mapping

The NATS schemas define the wire serialization format across the suggestion lifecycle:

```text
 ┌──────────────────────┐
 │ Suggestion Generated │ ──► [ Grounding Verification ]
 └──────────────────────┘                 │
                                          ├─(Confidence < 7000 bps OR Stale Fact)─► [ DROP / AUDIT ]
                                          ▼
                               ┌──────────────────────┐
                               │   PROPOSED / COMMITTED│ (Persisted in PostgreSQL jev_suggestions)
                               └──────────┬───────────┘
                                          │
                             (Atomic Outbox Transaction)
                                          │
                                          ▼
                         ┌───────────────────────────────────┐
                         │ livepilot.v1.copilot.             │
                         │ suggestion.proposed               │ (NATS JetStream event dispatched)
                         └────────────────┬──────────────────┘
                                          │
            ┌─────────────────────────────┼────────────────────────────┐
            ▼                             ▼                            ▼
  [ Host Accepts / Uses ]        [ Freshness Timer Expires ]    [ Emergency Pause / Invalidation ]
            │                             │                            │
   (Emit Audit Receipt)          (Drop from HUD Projection)            ▼
                                                              ┌─────────────────────────────────┐
                                                              │ livepilot.v1.copilot.           │
                                                              │ suggestion.withdrawn            │ (NATS JetStream event dispatched)
                                                              └─────────────────────────────────┘
```

### 1.1. Event Triggers and Transition Guards

| Current State | Target Wire Event | Trigger Condition | Guard Invariant | Emitted Schema |
|---|---|---|---|---|
| `GROUNDED` | `livepilot.v1.copilot.suggestion.proposed` | Outbox worker publishes committed suggestion record | `confidence_basis_points >= 7000`, `freshness_expires_at > now()`, `evidence_refs.status == 'APPROVED'` | `jev-suggestion-proposed.schema.json` |
| `DELIVERED` | `livepilot.v1.copilot.suggestion.withdrawn` | Inbound `control.pause.request` OR session terminated OR catalog fact updated | Aggregate status transitions to `withdrawn`; `causation_ref` captured | `jev-suggestion-withdrawn.schema.json` |
| `ACTIVE` | `livepilot.v1.copilot.delivery.degraded` | Provider latency exceeds 2500ms OR 3 consecutive provider errors (LP05001-LP05005) | Circuit trips to `OPEN` or `DEGRADED`; HUD switches to safe fallback | `jev-copilot-delivery-degraded.schema.json` |

---

## 2. Degraded Mode & Outage Recovery FSM

```text
 ┌───────────────┐
 │    NORMAL     │ ──(Consecutive Provider Errors >= 3 OR Latency > 2500ms)──► ┌───────────────┐
 │  (HUD Active) │                                                             │   DEGRADED    │
 └───────▲───────┘                                                             │ (Fallback HUD)│
         │                                                                     └───────┬───────┘
         │                                                                             │
         │                                                              (Circuit Breaker Half-Open Probe)
         │                                                                             │
         │                                                                             ▼
         └─────────────────(Probe Success & Fact Fresh)─────────────────────── ┌───────────────┐
                                                                               │   HALF-OPEN   │
                                                                               └───────────────┘
```

### 2.1. Degraded Mode Classifications
- `PROVIDER_OUTAGE`: External model provider returns 5xx or connection refused.
- `PROVIDER_LATENCY_EXCEEDED`: P99 response time > 2500ms.
- `GROUNDING_FACT_UNAVAILABLE`: Catalog fact freshness cache unavailable or partitioned.
- `CIRCUIT_OPEN`: Safety circuit open; suggestions temporarily halted.
- `RATE_LIMITED`: Session token rate limit reached.
