# G-CORE-041: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-041 (Implement soda-autonomous-diagnostician skill and failure isolation engine)

## FSM State Matrix
```text
[FailureIngested] ---> (parse_stack_frames) ---> [FramesParsed]
[FramesParsed] ---> (locate_source_lines) ---> [LocationsIdentified]
[LocationsIdentified] ---> (generate_hypotheses) ---> [HypothesesGenerated]
[HypothesesGenerated] ---> (evaluate_probes) ---> [ProbesEvaluated]
[ProbesEvaluated] ---> (on_isolated) ---> [RootCauseIsolated]
[ProbesEvaluated] ---> (on_ambiguous) ---> [EscalateToArchitect]
```

## Rollback & Compensation Policies
- Diagnostic isolation operations are strictly read-only and emit structured JSON reports without mutating git working tree state.
