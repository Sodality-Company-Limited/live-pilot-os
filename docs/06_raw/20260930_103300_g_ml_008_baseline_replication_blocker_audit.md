# 🛡️ Baseline Replication Blocker Audit: Goal G-ML-008

> **Goal ID:** `G-ML-008`  
> **Topic:** Verification and Defer-Policy Optimization  
> **Date:** `2026-09-30T10:33:00+07:00`  
> **Status:** `RESOLVED_AND_VERIFIED`  

---

## 1. Blocker Registry

| Blocker ID | Severity | Description | Root Cause | Resolution | Status |
|---|---|---|---|---|---|
| `BLOCKER-ML-008-01` | P1 | Absence of Risk-Weighted Deferral Threshold Optimizer and Canonical Router | Continuous confidence estimates without risk-weighted thresholding lead to high-confidence execution errors under high-risk conditions without secondary verification or human review safeguards. | Implemented DeferPolicyOptimizer and DecisionRouter in code/ml/src/training/defer_policy.py with 10x asymmetric false-accept penalty, 2D Pareto grid search bounding false acceptances < 1.0% and false deferrals < 5.0%, 100% enclosure of high-risk c < 0.85 decisions to defer/verify, and YAML configuration persistence in code/ml/configs/policy_thresholds.yaml, verified via tests/ml/test_defer_policy.py. | **RESOLVED_AND_VERIFIED** |

---

## 2. Epistemic Baseline Freeze
- **Baseline Revision Commit:** Current git HEAD
- **Frozen Invariants:** 100% high-risk c < 0.85 decisions routed to defer/verify; false accept rate < 1.0%; false deferral rate < 5.0%; tau_low < tau_high.
- **Verification Suite:** `pytest tests/ml/test_defer_policy.py`