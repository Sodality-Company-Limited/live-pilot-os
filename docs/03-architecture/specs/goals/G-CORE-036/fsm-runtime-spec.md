# G-CORE-036: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-036 (Implement soda-multiphase-planner skill and DAG plan compiler)

## FSM State Matrix
```text
[PlanParsed] ---> (build_adjacency_list) ---> [GraphConstructed]
[GraphConstructed] ---> (run_cycle_detection) ---> [CyclesChecked]
[CyclesChecked] ---> (cycles_detected) ---> [CompilationRejected]
[CyclesChecked] ---> (is_dag) ---> [TouchMapsValidated]
[TouchMapsValidated] ---> (touchmaps_overlap) ---> [ParallelExecutionRejected]
[TouchMapsValidated] ---> (touchmaps_disjoint) ---> [PlanCompiled]
```

## Rollback & Compensation Policies
- Compilation is a pure, side-effect-free analytical transformation. Rejections emit structured diagnostic errors without mutating repository state.
