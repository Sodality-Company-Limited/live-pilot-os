# Architecture Specification: Statistical Evidence and Benchmark Governance

> **Status:** Active  
> **Classification:** Framework Core Architecture  
> **Referenced By:** `soda-statistical-evidence`, `scripts/harness/statistical-evidence-harness.mjs`, `scripts/lib/confidence-calibration.mjs`  
> **Goal Origin:** `G-CORE-007`  

---

## 1. Executive Summary

Empirical claims in optimization, heuristic search, algorithmic speedups, agent reasoning, and machine learning must adhere to rigorous statistical methodology. A single benchmark run, uncalibrated point estimate, or cherry-picked metric cannot justify architectural changes, performance claims, or release promotions into production environments.

Soda OS enforces automated statistical evidence validation:
1. **Sample Size & Power Constraints:** Every empirical claim requires minimum sample count $N \ge 30$ and statistical power $1 - \beta \ge 0.80$.
2. **Uncertainty Calibration:** Discrete binomial outcomes must calculate Wilson 95% confidence intervals with continuity correction bounded in $[0.0, 1.0]$. Continuous metrics must calculate non-parametric bootstrap resampling intervals ($B \ge 1,000$).
3. **Dataset Split Isolation:** Contamination between training and held-out/validation/test distributions produces immediate fail-closed pipeline rejection.
4. **Exact-HEAD Provenance:** Every evidence receipt binds directly to the active git commit SHA and SHA256 content digests of evaluated artifacts.

---

## 2. Statistical Methodology & Epistemic Invariants

### 2.1 Sample Size Design & Power Validation
- **Sample Count Threshold:** Claims must evaluate on $N \ge 30$ independent episodes or trials.
- **Hypothesis Testing & Statistical Power:** Power calculations must guarantee statistical power $1 - \beta \ge 0.80$ for minimum detectable effect $\delta$ at significance $\alpha = 0.05$.
- **Baseline vs. Treatment Cohorts:** Evaluations must explicitly declare both baseline and treatment cohorts; identical cohorts are rejected.

### 2.2 Confidence Interval Calibration
- **Binomial Proportions:** Wilson score interval with continuity correction:
  $$w = \frac{\hat{p} + \frac{z^2}{2n} \pm z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$
  Where $\hat{p} = \frac{s}{n}$, $z = 1.96$ for 95% confidence. The bounds are strictly clamped to $[0.0, 1.0]$.
- **Continuous Metrics:** Non-parametric bootstrap resampling ($B \ge 1,000$ iterations) computing empirical percentiles:
  $$\text{CI}_{1-\alpha} = [q_{\alpha/2}, q_{1-\alpha/2}]$$
  Where $q_p$ is the $p$-th quantile of the bootstrap distribution $\hat{\theta}^*_1, \dots, \hat{\theta}^*_B$.

### 2.3 Split Isolation & Contamination Guards
- **Strict Disjointness:** Training split $\mathcal{D}_{\text{train}}$ and evaluation split $\mathcal{D}_{\text{eval}}$ must satisfy:
  $$\mathcal{D}_{\text{train}} \cap \mathcal{D}_{\text{eval}} = \emptyset$$
- **Immediate Rejection:** Any non-empty intersection triggers failure code 1 and blocks checkpoint/governance promotion.
- **Fixed Deterministic Seeds:** Pseudo-random evaluation sequences must execute across fixed seeds ($S \in \{42, 1337, 2026\}$) to verify robustness against initialization variance.

---

## 3. Hexagonal Ports & Adapters Topology

```
             ┌────────────────────────────────────────────────────────┐
             │               Driving Inbound Ports                   │
             │  • StatisticalEvidencePort (CLI & In-Process)          │
             │  • InvariantRunnerPort (node CLI runner)               │
             └───────────────────────────┬────────────────────────────┘
                                         │
                                         ▼
             ┌────────────────────────────────────────────────────────┐
             │               Soda OS Governance Kernel                │
             │  • Sample Size Validator (N >= 30)                    │
             │  • Wilson Score Interval Engine                       │
             │  • Bootstrap Resampling Engine                        │
             │  • Set Intersection Split Contamination Detector       │
             │  • Machine-Readable YAML Schema Parser                 │
             └───────────────────────────┬────────────────────────────┘
                                         │
                                         ▼
             ┌────────────────────────────────────────────────────────┐
             │               Driven Outbound Ports                   │
             │  • StatisticalReportPort (Evidence JSON Artifact)      │
             │  • ProofReceiptValidatorPort (Audit Gate)              │
             └────────────────────────────────────────────────────────┘
```

- **Driving Port (`StatisticalEvidencePort`):** Accepts goal cards and statistical claims via programmatic API (`validateStatisticalClaims`) or CLI (`node statistical-evidence-harness.mjs <goal-path>`).
- **Driven Port (`StatisticalReportPort`):** Emits cryptographic evidence receipts under `docs/07-backlog/evidence/` with exact source SHA256 digests.

---

## 4. Finite State Machine (FSM) Matrix & Lifecycle Transitions

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Idle` | System bootstrap / Goal file intake | Validated inputs & YAML schema | Transition to `State::Evaluating` | Reject with 400 Bad Request |
| `State::Evaluating` | Execution dispatch | Sample size $N \ge 30$, Split isolation | Transition to `State::Verified` | Emit diagnostic error log; exit 1 |
| `State::Verified` | Batch commit | Zero float math on whole units, bounded $[0, 1]$ | Transition to `State::Committed` | Quarantine record to error ledger |
| `State::Committed` | Ledger persistence | Exact-HEAD commit SHA match | Write audit receipt | Revert uncommitted batch entries |
| `State::Quarantined` | Invariant violation | Contamination or underpowered sample | Route to human review | Flag dataset split for inspection |

---

## 5. Machine-Readable Schema Specification

```yaml
statistical_claims:
  - id: STAT-001
    metric: ece
    population: held_out_agent_decisions
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    treatment: soda_calibrated_governance
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/G-CORE-007-proof-receipt.json
```

---

## 6. Zero-Mock & Production Assurance Invariant

In accordance with Article I of the Global Engineering Constitution:
- Every mathematical formula, interval computation, and split intersection check is executed via 100% operational code.
- Placeholder return values, dummy fallback objects, or mocked statistical distributions are strictly forbidden.
