# Acceptance Contract: G-CORE-007 Statistical Evidence and Benchmark Harness

**Goal Reference:** [G-CORE-007.md](../../07-backlog/goals/G-CORE-007.md)  
**Kind:** feature  
**Epic:** CORE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the formal verification and empirical assurance criteria for Goal G-CORE-007: Statistical Evidence and Benchmark Harness. Soda OS establishes automated statistical evidence validation across sample sizes ($N \ge 30$), baseline comparisons, Wilson 95% confidence intervals with continuity correction, non-parametric bootstrap resampling intervals, and dataset split contamination rejection across all goals.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: AC-CORE-CORE-007-01: Rejects Statistical Claims with Sample Count < 30
```gherkin
Feature: Statistical Sample Size and Power Validation
  Scenario: Rejects statistical claims with sample count < 30
    Given a goal specification declaring a machine-readable statistical_claims block
    When validateStatisticalClaims is evaluated with sample_count < 30
    Then validation fails with valid: false
    And the error message requires sample_count to be >= 30
    And the operation maintains zero mocks or stubs.
```

### Scenario 2: AC-CORE-CORE-007-02: Computes 95% Confidence Intervals for Proportion and Continuous Metrics
```gherkin
Feature: Statistical Uncertainty Calibration
  Scenario: Computes 95% confidence intervals for proportion and continuous metrics
    Given an empirical trial series with success counts and continuous loss metrics
    When wilsonScoreInterval and bootstrapInterval are evaluated
    Then Wilson score calculation produces verified mathematical bounds in [0, 1]
    And bootstrap resampling computes empirical distribution intervals with p99 < 50ms
    And the operation succeeds with exit code 0 and maintains zero mocks.
```

### Scenario 3: AC-CORE-CORE-007-03: Detects Split Contamination Between Train, Validation, and Test Datasets
```gherkin
Feature: Dataset Split Contamination Detection
  Scenario: Detects split contamination between train, validation, and test datasets
    Given an evaluation claim specifying evaluation on training data or overlapping split sample IDs
    When validateStatisticalClaims or detectSplitContamination is evaluated
    Then validation fails immediately with valid: false
    And flags the contamination error preventing data leakage into release gates
    And zero mocks or stubs are present.
```

---

## 📋 Verification Checklist

- [x] Sample size validator requiring $N \ge 30$ operational (`statistical-evidence-harness.mjs`).
- [x] Baseline comparison validator operational with distinct cohort enforcement.
- [x] Wilson 95% confidence interval engine operational (`confidence-calibration.mjs` and `statistical-evidence-harness.mjs`).
- [x] Non-parametric bootstrap resampling interval calculator operational.
- [x] Dataset split contamination detector operational (`detectSplitContamination`).
- [x] Rule file `.agents/rules/model-training-governance.md` specifies strict split isolation.
- [x] Architecture document `docs/03-architecture/statistical-evidence.md` specifies sample size and interval formulas.
- [x] 100% byte equivalence maintained between root and `template/` copies.
- [x] Zero mocks, zero stubs, zero simulated objects invariant preserved.
