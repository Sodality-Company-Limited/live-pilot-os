# Socratic Clarification & Architectural Alignment: G-ML-009

**Goal:** G-ML-009: Calibration Evaluation Suite and Reliability Diagrams  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Date:** 2026-09-30  
**Author:** Soda OS Agentic Architecture & ML Research

---

## 🏛️ Socratic 6-Domain Candidate Blueprint Deconstruction

### Domain 1: Target Persona & Scope
- **Target Persona:** ML Engineer, Autonomous Agent Runtime Kernel, Tech Lead Approver.
- **Scope:** Automated calibration evaluation harness computing Expected Calibration Error (ECE), Maximum Calibration Error (MCE), and Brier Score across exact 10-bin partitions, generating ASCII and graphical reliability diagrams, validating SLAs (ECE $\le 0.040$, Brier $\le 0.080$, High-Confidence Error Rate $\le 0.010$), and serializing evaluation scorecards to `artifacts/eval/calibration_scorecard.json`.
- **Out-of-Scope:** Model weight backpropagation, hyperparameter grid search, or external telemetry ingestion.

### Domain 2: Core KPI Metrics & Visual Panels
- **Expected Calibration Error (ECE):** Sample-weighted absolute deviation between bin confidence and bin empirical accuracy:
  $$ECE = \sum_{m=1}^{M} \frac{|B_m|}{N} |\text{acc}(B_m) - \text{conf}(B_m)| \le 0.040$$
- **Maximum Calibration Error (MCE):** Worst-case bin calibration deviation:
  $$MCE = \max_{m \in \{1,\dots,M\}} |\text{acc}(B_m) - \text{conf}(B_m)|$$
- **Brier Score:** Mean squared error between predicted confidence and binary outcome:
  $$\text{Brier} = \frac{1}{N} \sum_{i=1}^{N} (c_i - y_i)^2 \le 0.080$$
- **High-Confidence Error Rate (HCER):** Fraction of incorrect decisions among predictions with confidence $c_i \ge 0.80$:
  $$\text{HCER} = \frac{\sum_{i: c_i \ge 0.8} \mathbb{I}(y_i = 0)}{\sum_{i: c_i \ge 0.8} 1} \le 0.010$$
- **Visual Panels:**
  1. ANSI/ASCII console-rendered reliability histogram diagram for headless terminal CI pipelines.
  2. Matplotlib PNG curve diagram saved to `artifacts/eval/reliability_diagram.png`.
  3. Structured JSON scorecard saved to `artifacts/eval/calibration_scorecard.json`.

### Domain 3: Data Contracts & Freshness
- **Input Record Contract (`PredictionRecord` / `EvaluationInstance`):**
  ```python
  @dataclass(frozen=True)
  class PredictionRecord:
      confidence: float  # Bounded strictly in [0.0, 1.0]
      correct: bool      # Ground-truth binary correctness
      metadata: Optional[Dict[str, Any]] = None
  ```
- **Bin Statistics Contract (`CalibrationBin`):**
  - `bin_index`: $0 \le m \le 9$
  - `confidence_range`: $[m/10, (m+1)/10)$ with upper bound inclusive on final bin $[0.9, 1.0]$.
  - `count`: Integer sample count in bin ($|B_m|$).
  - `avg_confidence`: $\frac{1}{|B_m|} \sum_{i \in B_m} c_i$.
  - `empirical_accuracy`: $\frac{1}{|B_m|} \sum_{i \in B_m} y_i$.
  - `calibration_gap`: $|\text{empirical\_accuracy} - \text{avg\_confidence}|$.
- **Output Scorecard Schema (`CalibrationScorecard`):**
  - `sample_count`: Integer $N$.
  - `ece`: Float in $[0.0, 1.0]$.
  - `mce`: Float in $[0.0, 1.0]$.
  - `brier_score`: Float in $[0.0, 1.0]$.
  - `high_confidence_error_rate`: Float in $[0.0, 1.0]$.
  - `bins`: List of 10 bin summaries.
  - `sla_passed`: Boolean indicator verifying ECE $\le 0.040$, Brier $\le 0.080$, HCER $\le 0.010$.
  - `generated_at`: ISO 8601 UTC timestamp.

### Domain 4: Interactive Actions & Sagas
- **Evaluation Pipeline:**
  1. Ingest test prediction records.
  2. Validate boundary conditions (fail closed if empty, non-finite, or out-of-bounds).
  3. Partition samples into 10 disjoint bins with strict sample conservation ($\sum |B_m| = N$).
  4. Compute ECE, MCE, Brier, and HCER.
  5. Generate ASCII and image reliability diagrams.
  6. Emit atomic scorecard artifact to `artifacts/eval/calibration_scorecard.json`.
  7. Enforce SLA gates (raise `CalibrationSLAError` if thresholds breached in strict mode).

### Domain 5: Edge Boundaries & Failure States
- **Empty Dataset:** Fails closed immediately with `ValueError("records must be non-empty")`.
- **Degenerate Confidence:** Confidence $< 0.0$, $> 1.0$, `NaN`, or `Inf` strictly rejected with `ValueError`.
- **Zero High-Confidence Samples:** HCER evaluates cleanly to `0.0` (zero division safe).
- **Empty Bins:** Unpopulated bins contribute $0$ to ECE sum and are excluded from MCE without division by zero.
- **Extreme Boundary Scores:** Exact confidence $0.0$ placed in bin 0; exact confidence $1.0$ placed in bin 9.

### Domain 6: Codebase Grounding & Latency Budgets
- **Implementation Path:** `code/ml/eval/calibration_eval.py`
- **Test Path:** `tests/ml/test_calibration_metrics.py`
- **Output Artifacts:** `artifacts/eval/calibration_scorecard.json`
- **Latency Budget:** $< 250$ms for 10,000 predictions on standard CPU.
- **Memory Ceiling:** $< 256$MB process heap.

---

## 📋 Architectural Decisions & Consensus

- [x] **Decision 1:** 10-bin sample-weighted ECE is the primary calibration invariant metric.
- [x] **Decision 2:** High-confidence error rate (HCER) defined for $c \ge 0.80$ with hard SLA $\le 0.010$.
- [x] **Decision 3:** Both text-based ASCII histogram and matplotlib visual artifact generation supported.
- [x] **Decision 4:** Fail-closed on all non-finite values (NaN/Inf) and out-of-bounds probabilities.
- [x] **Decision 5:** Zero mocks or stubs across test suites and replication harnesses.
