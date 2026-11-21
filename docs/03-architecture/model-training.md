# Architecture Specification: Model Training and Fine-Tuning Lifecycle

> **Status:** Active  
> **Classification:** Framework Core Architecture  
> **Referenced By:** `soda-model-training`, `model-training-governance.md`

---

## 1. Executive Summary

Soda OS governs the machine learning training lifecycle with contract-first constraints. Model training cannot occur without declared dataset lineage, verified label-oracle definitions, parameter budget constraints, and dual-head loss bounds.

---

## 2. Core Architecture

### 2.1 Dataset and Lineage Contract
- Immutable SHA256 of training, validation, and test datasets.
- Schema verification for feature matrices and label formats.
- Token count verification matching declared budget.

### 2.2 Model Architecture & Fine-Tuning
- Support for LoRA / QLoRA adapters with declared rank $r$ and $\alpha$.
- Dual-head architectures: Autoregressive token head coupled with a calibrated scalar confidence/reward head.
- Asymmetric overconfidence loss formulations (RLCD) penalizing false certainty:
  $$\mathcal{L}(p, y) = - [y \log(p) + (1-y) \log(1-p)] + \lambda \cdot \mathbb{I}(y=0) \cdot p^2$$

### 2.3 Evaluation & Preservation
- Language generation perplexity degradation bound: $\Delta \text{PPL} \le 5\%$.
- Calibration error bounds on held-out evaluation split: $\text{ECE} \le 0.08$.
