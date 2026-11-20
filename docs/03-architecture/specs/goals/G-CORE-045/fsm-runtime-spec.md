# G-CORE-045: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-045 (Implement soda-empirical-eval-runner skill and multi-trial benchmark evaluator)

## FSM State Matrix
```text
[FixturesLoaded] ---> (validate_trial_parameters) ---> [ParametersValidated]
[ParametersValidated] ---> (execute_trials_loop) ---> [TrialsCompleted]
[TrialsCompleted] ---> (compute_integer_metrics) ---> [MetricsCalculated]
[MetricsCalculated] ---> (generate_eval_receipt) ---> [ReceiptCertified]
```

## Rollback & Compensation Policies
- Incomplete or aborted evaluations fail-closed and do not emit certified proof receipts.
