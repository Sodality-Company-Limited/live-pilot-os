# Clarification & Epistemic Alignment: G-ML-019

**Goal ID:** `G-ML-019`  
**Title:** Calibration Metric Ingestion and Brier Score Monitor  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Actor:** Machine Learning Engineer / Online Inference Quality Kernel  

---

## 1. 6-Domain Blueprint Alignment

### Domain 1: Target Persona & Scope
- **Actor:** Soda OS Agent Runtime, Inference Quality Evaluator, and Model Audit Telemetry Kernel.
- **Scope:** Online streaming calibration metric aggregator, rolling-window Brier score monitor, 10-bin Expected Calibration Error (ECE) tracker, and automated distribution drift detector.
- **Boundaries:** Zero mock telemetry; real mathematical calculation of Brier scores and ECE over streaming decision outcomes, sliding FIFO window buffer management, and automated fail-closed drift alert emission.

### Domain 2: Mathematical Formulations & Calibration Metrics
- **Brier Score:**
  $$\text{BS} = \frac{1}{N} \sum_{i=1}^N (c_i - o_i)^2$$
  where $c_i \in [0.0, 1.0]$ represents model confidence, and $o_i \in \{0, 1\}$ represents empirical ground-truth correctness outcome.
- **10-Bin Expected Calibration Error (ECE):**
  $$\text{ECE} = \sum_{b=1}^{10} \frac{|B_b|}{N} |\text{acc}(B_b) - \text{conf}(B_b)|$$
  where decisions are partitioned into 10 confidence bins $[0.0, 0.1), [0.1, 0.2), \dots, [0.9, 1.0]$.
- **High-Confidence Error Rate (HCER):**
  $$\text{HCER} = \frac{\sum_{i: c_i \ge 0.8} \mathbb{I}(o_i = 0)}{|\{i: c_i \ge 0.8\}|}$$
  quantifying overconfidence failure on decisions asserted with $\ge 80\%$ confidence.

### Domain 3: Rolling Window & Drift Alerting
- **Sliding FIFO Window:** Window size $W$ (default: 50 observations, configurable). Once the buffer exceeds $W$, the oldest observations are evicted, preserving exact rolling sample size.
- **Drift Warning Thresholds:**
  - Rolling Brier Score $> 0.1200$ (default threshold: 0.12)
  - Rolling ECE $> 0.0800$ (default threshold: 0.08)
- **Drift Alert Dispatch:**
  - Observable alert emission via pluggable `onDriftAlert` callback and event listener.
  - Active alert flag `driftAlert: true` and diagnostic alert payload recorded in metric snapshot.

### Domain 4: Observation Schema & Snapshot Persistence
- **Observation Input Schema:**
  - `confidence`: Finite number in $[0.0, 1.0]$.
  - `groundTruthOutcome` / `correct`: Boolean or binary integer $\{0, 1\}$.
  - `decisionId`: Optional string identifier.
  - `timestamp`: UTC RFC 3339 timestamp.
- **Snapshot Report Schema:**
  - `sampleCount`: Active window observation count.
  - `windowSize`: Configured sliding window capacity.
  - `brierScore`: Rolling Brier score with 4-decimal precision.
  - `ece`: Rolling Expected Calibration Error.
  - `highConfidenceErrorRate`: Proportion of $c_i \ge 0.8$ that failed.
  - `driftAlert`: Boolean indicating active calibration drift threshold breach.
  - `alerts`: Array of recorded drift alert events.
  - `bins`: Detailed statistics per populated confidence bucket.

### Domain 5: Fail-Closed Input Invariants
- Null or non-object observation payloads throw `TypeError`.
- Undefined or non-numeric confidence throws `TypeError`.
- Out-of-bounds confidence ($< 0.0$ or $> 1.0$, NaN, Infinity) throws `RangeError` or `TypeError`.
- Non-positive or non-integer window sizes throw `TypeError` or `RangeError`.

### Domain 6: Template Parity & Cross-Repository Upgradability
- 100% operational implementation mirrored between:
  - `scripts/lib/calibration-monitor.mjs`
  - `template/scripts/lib/calibration-monitor.mjs`
- Unit tests mirrored between:
  - `tests/unit/test-calibration-monitor.mjs`
  - `template/tests/unit/test-calibration-monitor.mjs`
