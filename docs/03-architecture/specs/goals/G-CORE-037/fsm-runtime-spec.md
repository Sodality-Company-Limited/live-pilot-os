# G-CORE-037: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-037 (Implement soda-reflection-engine skill and blindspot scanner)

## FSM State Matrix
```text
[DiffParsed] ---> (load_active_rules) ---> [RulesLoaded]
[RulesLoaded] ---> (evaluate_regex_and_ast_patterns) ---> [PatternsEvaluated]
[PatternsEvaluated] ---> (aggregate_severity_weights) ---> [BlindspotsScored]
[BlindspotsScored] ---> (format_markdown_and_json) ---> [ReportGenerated]
```

## Rollback & Compensation Policies
- The reflection engine is a read-only analytical tool. No state mutations occur during evaluation.
