# Model Training Governance Rule

> **Scope:** Applies to all Machine Learning, Fine-Tuning, Dual-Head, Calibration, and LLM Model Training tasks.  
> **Invariants:** Zero data leakage, strict split isolation, baseline comparison, language generation quality preservation.

---

## 1. Prerequisites to Training Execution

Before initiating any training loop or parameter updates:
1. **Dataset Contract:** The training dataset must declare immutable source hashes (SHA256), exact token counts, and split boundaries (Train, Validation, Test).
2. **Strict Split Isolation:** The validation and test datasets MUST NEVER overlap with the training dataset. Evaluation on training data is strictly prohibited and invalidated by `scripts/harness/statistical-evidence-harness.mjs`.
3. **Label-Oracle Specification:** Label or reward generation must define an unambiguous ground-truth oracle or verified teacher rubric with documented agreement score ($\kappa \ge 0.85$).
4. **Reproducibility Guarantee:** Random seeds, optimizer hyperparameters, LoRA rank/alpha, batch size, and hardware architecture must be recorded in an immutable training manifest.

---

## 2. Checkpoint Promotion Gates

No model checkpoint or adapter weights can be promoted to staging, registry, or production unless:
1. **Statistically Significant Improvement:** Evaluation on the held-out test split (minimum sample count $N \ge 30$) outperforms the baseline model with $p < 0.05$ (or non-overlapping 95% Wilson/Bootstrap confidence intervals).
2. **Generative Quality Preservation:** For dual-head or RLCD-tuned models, base language generation perplexity must not degrade by more than 5% relative to the pre-trained base model.
3. **Calibration Bounds:** Calibrated confidence output must achieve Expected Calibration Error (ECE) $\le 0.08$ and Brier Score $\le 0.15$ on held-out test sets.
4. **Zero Unverified Artifacts:** Checkpoint tensors, adapter config JSON, and tokenizer files must carry verifiable SHA256 hashes matching the training manifest.

