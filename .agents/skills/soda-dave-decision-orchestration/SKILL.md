---
name: soda-dave-decision-orchestration
version: "1.0.0"
description: >-
  DAVE System 1 Decision Orchestrator — coordinates multi-expert decision synthesis,
  typed decision schema validation, calibrated confidence evaluation, and dynamic
  routing state machine lifecycle transitions across all 17 DAVE domains.
  Triggers: dave decision, dave route, dave orchestrate, dave create-*-decision.
---

# DAVE Decision Orchestration

This skill defines the operational procedure for synthesizing, validating, and routing DAVE decisions.

## Lifecycle Workflow

```text
Goal Spec → Intake & Extraction → Decision Schema Validation →
Confidence & Risk Scoring → Conflict Detection → Dynamic Routing
```

1. **Intake Domain Context:** Parse active goal `G-xxx` and extract domain parameters.
2. **Select Decision Type:** Determine matching schema from the 17 registered DAVE domains.
3. **Validate Decision Schema:** Execute `validateDaveDecision(payload)` via `scripts/lib/dave-engine.mjs`.
4. **Evaluate Calibrated Confidence:** Score confidence $c \in [0.0, 1.0]$ and verify calibration SLA ($ECE \le 0.0400$).
5. **Route Action:** Map tuple $(Risk, Evidence, Confidence)$ via `routeDecision()`.
