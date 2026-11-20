---
name: soda-statistical-evidence
version: "1.0.0"
description: Sample-size design, baseline/treatment comparison, confidence intervals, bootstrap evaluation, seed management, and statistical invalidation bounds.
skill_contract:
  id: soda-statistical-evidence
  version: 1.0.0
  profiles:
    - ml_research
    - quality_assurance
    - performance
  inputs:
    - benchmark_dataset
    - baseline_distribution
    - treatment_distribution
    - sample_size_spec
  outputs:
    - statistical_report
    - confidence_intervals
  gates:
    - minimum_sample_size_met
    - non_overlapping_ci_or_p_value
    - zero_split_contamination
  blocks:
    - ready
    - verified
    - done
---

# Statistical Evidence Skill

> **Mission:** Enforce rigorous statistical validity across benchmarks, model comparisons, and performance optimizations.

---

## 1. When to Use

Use this skill when:
- Designing benchmark comparisons between baseline and treatment implementations.
- Establishing minimum required sample sizes ($N \ge 30$ minimum; power calculations for $1-\beta = 0.80$).
- Calculating binomial Wilson score intervals or continuous bootstrap 95% confidence intervals.
- Enforcing strict separation between training, validation, and testing distributions.
- Detecting statistical regression or invalidating claims lacking uncertainty bounds.

---

## 2. Statistical Workflow

1. **Power & Sample Size Calculation:** Determine $N$ based on desired detectable effect size $\delta$ and significance level $\alpha = 0.05$.
2. **Execute Controlled Trials:** Run deterministic trials fixing pseudo-random seeds ($S \in \{42, 1337, 2026\}$).
3. **Compute Uncertainty Intervals:**
   - *Proportions (Pass/Fail):* Wilson score 95% confidence interval.
   - *Continuous Metrics (Latency/Throughput):* Student's t or 10,000-sample bootstrap empirical CI.
4. **Harness Verification:** Run `node scripts/harness/statistical-evidence-harness.mjs <GOAL_ID>`.

---

## 3. Required Artifacts

- Specification: [docs/03-architecture/statistical-evidence.md](../../../docs/03-architecture/statistical-evidence.md)
- Statistical Harness: [scripts/harness/statistical-evidence-harness.mjs](../../../scripts/harness/statistical-evidence-harness.mjs)
- Evidence Output: `docs/07-backlog/evidence/<GOAL_ID>-statistical-report.json`
