# Deep Architectural Specification: G-WEB-012 Production Readiness and Learning Engine

**Goal ID:** `G-WEB-012`  
**Timestamp:** `2026-10-03T21:30:00+07:00`  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Kind:** `qa`  
**Topic:** Multi-Harness Production Verification, Strictly Proper Scoring & RLCD Dataset Partitioning  
**Author:** `Antigravity (AI System Architect & Lead Engineer)`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Empirical Testing Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. Architectural Overview & System Topology

The Production Readiness and Learning Engine operates at the terminus of the DAVE Exact Web Application Pipeline. It integrates two foundational sub-systems:
1. **The 9-Harness Production Verification Battery:** An exhaustive suite of deterministic quality gates auditing schemas, references, traces, UI states, design tokens, pixel regressions, motion curves, media formats, and audio loudness.
2. **The RLCD Calibration & Export Pipeline:** An operational data ingestion engine that parses the cryptographic audit ledger (`.agents/audit/decisions.jsonl`), calculates strictly proper logarithmic rewards with asymmetric 10x false acceptance penalties, and exports clean, partitioned training pairs to `artifacts/rlcd/train_dataset.jsonl`.

```
+----------------------------------------------------------------------------------------------------+
|                                    ACTIVE SYSTEM ARTIFACTS & LEDGER                                |
|  - code/src/components/*                   - .agents/audit/decisions.jsonl                         |
|  - code/src/tokens/index.css               - data/references/manifest.json                         |
|  - public/assets/*, public/audio/*         - docs/02-product/design/ui-spec.json                   |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                             BATTERY OF 9 DAVE VERIFICATION HARNESSES                               |
|  1. dave-decision-schema-harness.mjs  4. ui-spec-conformance-harness.mjs  7. motion-harness.mjs     |
|  2. dave-reference-harness.mjs        5. token-guardrail-harness.mjs      8. asset-harness.mjs      |
|  3. dave-decision-trace-harness.mjs   6. visual-regression-harness.mjs    9. audio-harness.mjs      |
|                                                                                                    |
|  Invariant: ALL 9 MUST PASS 100% GREEN (Exit Code 0)                                               |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                       STRICTLY PROPER LOGARITHMIC SCORING ENGINE (dave-engine.mjs)                 |
|  exportDaveRlcdData(ledgerPath, outputPath):                                                       |
|    - Clamps confidence: c \in [\epsilon, 1 - \epsilon]                                             |
|    - Computes proper logarithmic rule: R(c, y) = y * ln(c) + (1 - y) * ln(1 - c)                  |
|    - Asymmetric penalty: If y = 0 AND c >= 0.80 -> Penalty = c^2 * 10.0                            |
|    - Net reward: R_net = R(c, y) - Penalty                                                         |
|    - Derives trajectory_id via SHA-256 over goal and decision metadata                             |
|    - Deterministic split: 80% train, 10% validation, 10% test                                      |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  EXPORTED RLCD TRAINING DATASET                                    |
|  - artifacts/rlcd/train_dataset.jsonl (Content-addressed JSONL records ready for LoRA fine-tuning) |
|  - docs/07-backlog/evidence/G-WEB-012-proof-receipt.json (Certified PASS, 1 invariant proven)      |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Mathematical Formulations & Scoring Rules

### 1. Strictly Proper Scoring Rule
Under Bayesian decision theory, a scoring rule $S(c, y)$ is strictly proper if the expected score is uniquely maximized when the agent reports its true subjective probability $p$:
$$\mathbb{E}_{y \sim p}[S(c, y)] \le \mathbb{E}_{y \sim p}[S(p, y)] \quad \forall c \neq p$$

For binary verification outcomes $y \in \{0, 1\}$ (where $y = 1$ denotes empirical verification success and $y = 0$ denotes verification failure or rejection), the logarithmic rule is:
$$R_{\text{proper}}(c, y) = y \ln(c) + (1 - y) \ln(1 - c)$$

To prevent numerical singularities at $c \in \{0, 1\}$, confidence is clamped with epsilon $\epsilon = 10^{-6}$:
$$c_{\text{clamped}} = \max(\epsilon, \min(1 - \epsilon, c))$$

### 2. Asymmetric 10x False Acceptance Penalty
In enterprise agent governance, a confident error (deploying insecure, non-accessible, or visually broken code with high confidence) carries severe operational costs compared to an uncertain deferral. We define an asymmetric penalty function:
$$P_{\text{overconf}}(c, y) = \begin{cases} c^2 \times 10.0 & \text{if } y = 0 \text{ and } c \ge 0.80 \\ 0.0 & \text{otherwise} \end{cases}$$

The net reward assigned to the trajectory is:
$$R_{\text{net}} = R_{\text{proper}}(c, y) - P_{\text{overconf}}(c, y)$$

#### Empirical Reward Comparison Table

| Reported Confidence $c$ | Empirical Outcome $y$ | Logarithmic Score $R_{\text{proper}}$ | Overconfidence Penalty $P$ | Net Reward $R_{\text{net}}$ |
|:---:|:---:|:---:|:---:|:---:|
| **0.99** | $1$ (Pass) | $-0.0101$ | $0.0000$ | **$-0.0101$** |
| **0.90** | $1$ (Pass) | $-0.1054$ | $0.0000$ | **$-0.1054$** |
| **0.30** | $0$ (Fail) | $-0.3567$ | $0.0000$ | **$-0.3567$** |
| **0.80** | $0$ (Fail) | $-1.6094$ | $6.4000$ | **$-8.0094$** |
| **0.90** | $0$ (Fail) | $-2.3026$ | $8.1000$ | **$-10.4026$** |
| **0.95** | $0$ (Fail) | $-2.9957$ | $9.0250$ | **$-12.0207$** |

Notice that an overconfident error at $c = 0.95$ incurs a penalty $> 33\times$ larger than an uncertain failure at $c = 0.30$.

---

## 3. The 9 Specialized Verification Harnesses

| # | Harness Name | Script Path | Scope & Invariants Checked |
|:---:|:---|:---|:---|
| 1 | **Decision Schema** | `scripts/harness/dave-decision-schema-harness.mjs` | Validates all 17 canonical decision domain contracts, required evidence categories, and allowed/forbidden actions. |
| 2 | **Reference Citations** | `scripts/harness/dave-reference-harness.mjs` | Asserts physical SHA-256 digests of all referenced assets in `data/references/manifest.json`. |
| 3 | **Decision Trace** | `scripts/harness/dave-decision-trace-harness.mjs` | Verifies complete Merkle DAG lineage across all 7 lifecycle stages (Goal $\to$ Decision $\to$ Evidence $\to$ Commit $\to$ Proof $\to$ Approval $\to$ Outcome). |
| 4 | **UI-Spec Conformance** | `scripts/harness/ui-spec-conformance-harness.mjs` | Asserts 5 mandatory states per component (Empty, Loading, Partial, Full, Error), zero CLS layout reservation, and WCAG 2.2 AA contrast. |
| 5 | **Token Guardrail** | `scripts/harness/token-guardrail-harness.mjs` | Scans all code for 0 unapproved tokens, 0 raw hex values, and 0 arbitrary Tailwind spacing brackets. |
| 6 | **Visual Regression** | `scripts/harness/visual-regression-harness.mjs` | Bounded pixel diff ratio ($\le 0.0050$), zero horizontal overflow, and zero Cumulative Layout Shift across desktop, tablet, and mobile viewports. |
| 7 | **Motion Fidelity** | `scripts/harness/motion-harness.mjs` | Max duration $\le 300\text{ms}$, 100% GPU-accelerated keyframes, and `prefers-reduced-motion` collapse to 0.01ms. |
| 8 | **Visual Assets** | `scripts/harness/asset-harness.mjs` | Modern formats (SVG, WebP), size $< 250\text{KB}$, and SVG `viewBox` responsive aspect ratio scaling. |
| 9 | **Audio Earcons** | `scripts/harness/audio-harness.mjs` | Duration $\le 500\text{ms}$, loudness $-16\text{ to } -18\text{ LUFS}$ / dBFS, peak amplitude $< 0.99$ (zero clipping), and accessible mute controls. |

---

## 4. Dataset Partitioning & Leakage Prevention

- Total records $N$ in the audit ledger are partitioned deterministically:
  - $\text{Train Count} = \text{round}(N \times 0.80)$
  - $\text{Validation Count} = \text{round}(N \times 0.10)$
  - $\text{Test Count} = N - \text{Train Count} - \text{Validation Count}$
- Splitting assigns records based on sequential ledger order rather than random sampling, ensuring that test sets represent strictly held-out historical horizons with zero leakage.
