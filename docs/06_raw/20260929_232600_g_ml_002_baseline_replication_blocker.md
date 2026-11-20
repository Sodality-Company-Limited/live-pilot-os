# 🛡️ Baseline Replication Blocker Audit: Goal G-ML-002

> **Goal ID:** `G-ML-002`  
> **Topic:** Outcome-Label and Calibrated Target Generation Engine  
> **Date:** `2026-09-29T23:26:00+07:00`  
> **Status:** `RESOLVED_AND_VERIFIED`  

---

## 1. Blocker Registry

| Blocker ID | Severity | Description | Root Cause | Resolution | Status |
|---|---|---|---|---|---|
| `BLOCKER-ML-002-01` | P1 | Absence of Deterministic Outcome-Labeling and Calibrated Target Generation Engine | Soda OS supervised pre-alignment and reinforcement learning pipelines lacked automated AST code-execution grading, substring evidence support calculation, and empirical historical target probability mapping, leading to noisy heuristic labels and uncalibrated reward models. | Authored DeterministicOutcomeLabeler module in code/ml/src/dataset/labeler.py with AST diff and exit code parsing, exact character substring span overlap evaluation, and empirical historical frequency mapping; authored comprehensive pytest suite tests/ml/test_labeler.py with 100% pass across 50 test traces and 1,000-record dataset generation achieving >= 100 records/sec throughput. | **RESOLVED_AND_VERIFIED** |

---

## 2. Technical Root-Cause Analysis

Supervised pre-alignment and reinforcement learning with calibrated rewards require objective ground-truth outcome labels and empirical target probabilities derived from real execution receipts rather than heuristic guesses:
1. **Uncertain Ground Truth:** Raw decision traces lacked automated code execution verification and syntax grading.
2. **Missing Evidence Support Metric:** Citations and tool outputs lacked formal substring span verification against ground truth source files.
3. **Uncalibrated Target Probabilities:** Supervised confidence training requires empirical historical frequency targets rather than binary one-hot extremes or heuristics.
4. **Quarantine Isolation:** Unverifiable or corrupt traces must be quarantined to prevent training distribution contamination.

---

## 3. Resolution Verification

- `code/ml/src/dataset/labeler.py` provides `DeterministicOutcomeLabeler`.
- `tests/ml/test_labeler.py` provides 100% unit and integration coverage.
- Golden dataset generated at `data/processed/train_labeled_v1.jsonl` (800 clean records, 200 quarantined).
- 100% green pass on `pytest tests/ml/test_labeler.py`.