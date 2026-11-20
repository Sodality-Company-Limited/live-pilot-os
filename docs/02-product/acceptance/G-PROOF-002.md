# Acceptance Contract: G-PROOF-002 DAVE Statistical Evidence and Calibration Claims

**Goal Reference:** [G-PROOF-002.md](../../07-backlog/goals/G-PROOF-002.md)  
**Kind:** feature  
**Epic:** PROOF  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-PROOF-002: DAVE Statistical Evidence and Calibration Claims. The statistical evidence engine provides vectorized Expected Calibration Error (ECE), Maximum Calibration Error (MCE), and strictly proper multi-class Brier score calculators, 1000-sample non-parametric bootstrap resampling confidence intervals, machine-readable 10-bin reliability diagrams, an empirical distribution audit ledger, and cryptographic proof receipts certifying calibration bounds below safety tolerance $\text{ECE}_{95} \le 0.08$.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Vectorized ECE, MCE, and Multi-Class Brier Score Computation
```gherkin
Feature: Vectorized Statistical Calibration Metrics
  Scenario: Engine computes exact ECE, MCE, and multi-class Brier matching analytical test vectors
    Given a decision dataset with 4 predictions and known ground truth outcomes
    When computeVectorizedCalibrationMetrics is evaluated across 10 uniform bins
    Then the resulting ECE MUST equal exactly 0.30
    And the resulting MCE MUST equal exactly 0.40
    And the binary Brier score MUST equal exactly 0.225
    And the high-confidence error rate MUST equal exactly 1/3.

  Scenario: Multi-class Brier score calculates exact quadratic loss across probability simplices
    Given a multi-class prediction array [[0.7, 0.2, 0.1], [0.1, 0.8, 0.1]] and true class indices [0, 1]
    When computeMultiClassBrierScore is evaluated
    Then the multi-class Brier score MUST equal exactly 0.10.
```

### Scenario 2: Probability Simplex and NaN Stop Condition Rejection
```gherkin
Feature: Probability Distribution Invariant Guards
  Scenario: Probability distributions summing outside [0.9999, 1.0001] are rejected fail-closed
    Given a probability distribution vector [0.5, 0.2, 0.1] summing to 0.80
    When computeMultiClassBrierScore is evaluated
    Then the engine MUST throw a RangeError with message matching "sums outside [0.9999, 1.0001]".

  Scenario: Predictions containing NaN or non-finite values are rejected fail-closed
    Given a probability vector containing NaN
    When computeMultiClassBrierScore is evaluated
    Then the engine MUST throw a TypeError with message matching "NaN or non-finite".
```

### Scenario 3: 1000-Sample Non-Parametric Bootstrap Resampling Confidence Intervals
```gherkin
Feature: Non-Parametric Bootstrap Resampling
  Scenario: Bootstrap resampling constructs empirical 95% confidence intervals with reproducible seed
    Given an evaluation dataset with at least 100 decision records
    When computeBootstrapConfidenceIntervals is evaluated with 1000 iterations and confidence 0.95
    Then the resulting empirical confidence intervals MUST satisfy 0 <= ciLower <= observed <= ciUpper <= 1
    And multiple executions with seed 42 MUST produce identical percentile bounds.

  Scenario: Sample size below minimum statistical power threshold halts fail-closed
    Given a dataset with N < 100 samples
    When computeBootstrapConfidenceIntervals is evaluated
    Then the engine MUST throw a RangeError matching "below minimum statistical power threshold (N < 100)".
```

### Scenario 4: Machine-Readable Reliability Diagram Generation
```gherkin
Feature: Reliability Diagram Coordinate Generator
  Scenario: Engine emits 10 uniform bins with normalized bin sample weights
    Given a decision dataset evaluated across 10 uniform confidence bins
    When generateReliabilityDiagram is evaluated
    Then the returned coordinates array MUST contain exactly 10 bins
    And the binWeights array MUST sum to 1.0
    And the perfect calibration diagonal reference MUST contain [(0.0, 0.0), (1.0, 1.0)].
```

### Scenario 5: Statistical Claim Cryptographic Proof Receipt Issuance
```gherkin
Feature: Statistical Claim Proof Receipt Verification Gate
  Scenario: Engine certifies ECE upper bound within safety tolerance
    Given an evaluation dataset with empirical ECE upper bound ECE_95 <= 0.08
    When generateStatisticalProofReceipt is evaluated for goal G-PROOF-002
    Then the emitted receipt MUST have classification "statistical_claim"
    And certification MUST be "PASS"
    And verification via proof-receipt-validator.mjs MUST exit with code 0.

  Scenario: Uncalibrated model exceeding safety tolerance fails closed
    Given a dataset with ECE_95 > 0.08
    When generateStatisticalProofReceipt is evaluated
    Then the engine MUST fail closed and reject proof issuance.
```

---

## 📋 Verification Checklist

- [x] ECE is computed across 10 uniform bins with empirical accuracy and confidence deviations.
- [x] Bootstrap resampling generates 95% two-sided confidence intervals with reproducible random seed.
- [x] Statistical proof receipt is emitted conforming to proof_receipt schema with result: passed.
- [x] Unit test suite `tests/unit/test-statistical-evidence-engine.mjs` passes 13/13 tests green.
- [x] Calibration harness `node scripts/harness/confidence-calibration-harness.mjs` passes with exit code 0.
- [x] Statistical evidence harness `node scripts/harness/statistical-evidence-harness.mjs` passes with exit code 0.
- [x] Proof receipt validator `node scripts/harness/proof-receipt-validator.mjs artifacts/proofs/G-PROOF-002-calibration-report.json` passes with exit code 0.
