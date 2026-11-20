# G-CORE-032: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-032 (Implement soda-architectural-arena skill and multi-solution bake-off engine)

## FSM State Matrix
```text
[CandidatesIngested] ---> (normalize_weights) ---> [WeightsNormalized]
[WeightsNormalized] ---> (calculate_scores) ---> [CandidatesScored]
[CandidatesScored] ---> (filter_dominance) ---> [ParetoFrontierExtracted]
[ParetoFrontierExtracted] ---> (generate_receipt) ---> [ReceiptEmitted]
```

## Rollback & Compensation Policies
- Evaluation is pure and in-memory; failure on invalid candidate schemas fails closed before any decision receipt is emitted.
