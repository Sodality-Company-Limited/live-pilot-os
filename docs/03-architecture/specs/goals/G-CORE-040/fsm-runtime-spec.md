# G-CORE-040: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-040 (Implement soda-visual-parity-guard skill and perceptual diff verification engine)

## FSM State Matrix
```text
[BaselineLoaded] ---> (capture_candidate_screenshot) ---> [CandidateCaptured]
[CandidateCaptured] ---> (validate_dimensions) ---> [DimensionsValid]
[DimensionsValid] ---> (compute_pixel_delta) ---> [DeltaComputed]
[DeltaComputed] ---> (evaluate_tolerance) ---> [PassThreshold] | [ExceedsToleranceFailClosed]
```

## Rollback & Compensation Policies
- Diff maps highlighting failing pixels are dumped to `artifacts/visual/` for review before abortion.
