# G-CORE-035: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-035 (Implement soda-autopilot-runner skill and autonomous fleet supervisor)

## FSM State Matrix
```text
[QueueInspected] ---> (select_next_ready_goal) ---> [GoalSelected]
[GoalSelected] ---> (dispatch_execution) ---> [ExecutionDispatched]
[ExecutionDispatched] ---> (evaluate_exit_code) ---> [ResultEvaluated]
[ResultEvaluated] ---> (on_success) ---> [QueueUpdated]
[ResultEvaluated] ---> (on_failure) ---> [FailClosedAborted]
[QueueUpdated] ---> (check_remaining_and_budget) ---> [QueueInspected] | [AutopilotCompleted]
```

## Rollback & Compensation Policies
- Failed goals preserve git worktrees in diagnostic state; the runner terminates with exit code 1 to alert operators.
