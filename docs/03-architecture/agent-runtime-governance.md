# Architecture Specification: Agent Runtime Governance and State Routing

> **Status:** Active  
> **Classification:** Framework Core Architecture  
> **Referenced By:** `soda-agent-runtime-governance`, `agent-runtime-fail-closed.md`

---

## 1. Executive Summary

Autonomous agent runtime execution is governed by a deterministic, fail-closed state machine. Agents cannot unilaterally dispatch side-effecting operations without passing confidence thresholds and evidence verification checks.

---

## 2. Decision State Machine

```
              ┌───────────────────────────────┐
              │    Agent Decision Proposal    │
              │  { answer, conf, ev, risk }   │
              └───────────────┬───────────────┘
                              │
               [Validate Confidence in [0, 1]]
                              │
               [Evaluate Risk Level & Evidence]
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
      [Normal Risk]                       [High Risk]
            │                                   │
    ┌───────┴───────┐                   ┌───────┴───────┐
    │ Verified Ev?  │                   │ Verified Ev?  │
    ├───────┬───────┤                   ├───────┬───────┤
  [Yes]    [No]   [Low Conf]          [Yes]    [No]   [Low Conf]
    │       │       │                   │       │       │
 [proceed] [verify] [defer]       [human_rev] [defer]  [defer]
```

---

## 3. Invariants & Fallbacks

1. **Deterministic Resolution:** Given `{ confidence, evidence_status, risk_level }`, the route is completely deterministic and verified by `scripts/harness/routing-truth-table-harness.mjs`.
2. **Fail-Closed Execution:** Unrecognized states, parse errors, or unverified evidence strictly resolve to `verify` or `defer`.
3. **Rollback Sagas:** Any state transition producing a side effect must register an inverse compensation saga verified by `scripts/harness/failure-rollback-harness.mjs`.
