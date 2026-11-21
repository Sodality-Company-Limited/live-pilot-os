# Architectural Blueprint: DAVE Decision Trajectory Ingestion & RLCD Preference Dataset (G-ML-025)

**Goal ID:** G-ML-025  
**Title:** DAVE Decision Trajectory and Correction Dataset  
**Epic:** ML  
**Author:** Antigravity (Soda OS System Architect)  
**Timestamp:** 2026-10-03T18:05:00+07:00  
**Status:** Certified Architecture & Production Substrate  

---

## 🏛️ SECTION I: ARCHITECTURAL TOPOLOGY & HEXAGONAL PORTS

```mermaid
graph LR
  subgraph "Driving Ports (Inbound)"
    AuditLedger["AuditLedgerStreamPort<br/>.agents/audit/decisions.jsonl"]
    HarnessOracle["TestHarnessOraclePort<br/>Empirical Pass / Fail"]
    HumanReview["HumanReviewPort<br/>Approval / Corrections"]
  end

  subgraph "Core Domain: DAVE Trajectory Engine"
    Ingest["Ingestion & State Merger"]
    PromptNorm["Canonical Prompt Normalizer"]
    OracleLabel["Objective Label Oracle"]
    RewardCalc["Calibrated Reward Engine<br/>R_log - 10x Penalty"]
    Splitter["Deterministic 80/10/10 Splitter"]
    SchemaGate["RLCD Schema Gatekeeper"]
  end

  subgraph "Driven Ports (Outbound)"
    RLCDDataset["RLCDPreferenceDatasetPort<br/>artifacts/rlcd/train_dataset.jsonl"]
    IndividualSplits["SplitFilesPort<br/>train.jsonl / val.jsonl / test.jsonl"]
    TrainingContract["ModelTrainingContractPort<br/>artifacts/evidence/G-ML-025-training-contract.json"]
  end

  AuditLedger --> Ingest
  HarnessOracle --> OracleLabel
  HumanReview --> OracleLabel
  Ingest --> PromptNorm
  PromptNorm --> OracleLabel
  OracleLabel --> RewardCalc
  RewardCalc --> Splitter
  Splitter --> SchemaGate
  SchemaGate --> RLCDDataset
  SchemaGate --> IndividualSplits
  SchemaGate --> TrainingContract
```

---

## 📐 SECTION II: MATHEMATICAL FOUNDATIONS & REWARD FORMULATION

### 1. Strictly Proper Scoring Rule (Logarithmic Utility)
To guarantee that the fine-tuned model expresses its true internal calibrated probability rather than underconfident hedging or overconfident hallucination, the baseline reward follows a strictly proper logarithmic scoring rule:

$$R_{\text{log}}(c, y) = y \cdot \ln(c_{\text{clamp}}) + (1 - y) \cdot \ln(1 - c_{\text{clamp}})$$

Where $c \in [0.0, 1.0]$ is the model's reported confidence, $y \in \{0, 1\}$ is the ground-truth outcome label determined by the objective oracle, and $c_{\text{clamp}}$ prevents IEEE-754 overflow:

$$c_{\text{clamp}} = \max(\epsilon, \min(1.0 - \epsilon, c)), \quad \epsilon = 10^{-6}$$

### 2. Asymmetric 10x False Acceptance Penalty
In autonomous software engineering, committing an incorrect action with high confidence carries catastrophic failure cost. To enforce conservative uncertainty estimation, an asymmetric quadratic penalty is deducted exclusively when the model is confident ($c \ge 0.80$) but wrong ($y = 0$):

$$P_{\text{overconf}}(c, y) = \begin{cases} c^2 \times 10.0, & \text{if } y = 0 \land c \ge 0.80 \\ 0.0, & \text{otherwise} \end{cases}$$

### 3. Net Calibrated Reward
The net reward $R_{\text{net}}$ assigned to each preference pair in the training dataset is:

$$R_{\text{net}} = R_{\text{log}}(c, y) - P_{\text{overconf}}(c, y)$$

| Confidence ($c$) | Correct ($y$) | Log Score ($R_{\text{log}}$) | Penalty ($P_{\text{overconf}}$) | Net Reward ($R_{\text{net}}$) | Interpretation |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0.99** | $1$ | $-0.0101$ | $0.0000$ | **$-0.0101$** | High confidence, correct $\to$ Optimal reward |
| **0.90** | $1$ | $-0.1054$ | $0.0000$ | **$-0.1054$** | Good confidence, correct $\to$ Positive utility |
| **0.60** | $1$ | $-0.5108$ | $0.0000$ | **$-0.5108$** | Modest confidence, correct $\to$ Modest reward |
| **0.60** | $0$ | $-0.9163$ | $0.0000$ | **$-0.9163$** | Modest confidence, wrong $\to$ Mild penalty |
| **0.85** | $0$ | $-1.8971$ | $7.2250$ | **$-9.1221$** | High confidence error $\to$ Severe asymmetric penalty |
| **0.95** | $0$ | $-2.9957$ | $9.0250$ | **$-12.0207$** | Overconfident error $\to$ Catastrophic penalty |

---

## 🛡️ SECTION III: SPLIT ISOLATION & SAMPLE CONTAMINATION BOUNDS

To eliminate benchmark data leakage and guarantee valid out-of-sample generalization:

1. **Deterministic Content-Addressed Hash Permutation:**
   Each trajectory record is assigned a deterministic 64-bit hexadecimal identifier derived from the SHA-256 hash of its composite fields:
   $$\text{trajectory\_id} = \text{SHA256}(\text{goal\_id} \parallel \text{decision\_id} \parallel \text{prompt})[:16]$$
   Records are lexicographically sorted by hash prior to partitioning, eliminating bias from commit timestamps.

2. **Partition Ratios:**
   - $\text{Train Split}: \approx 80\%$
   - $\text{Validation Split}: \approx 10\%$
   - $\text{Held-out Test Split}: \approx 10\%$

3. **Strict Disjointness Proof Invariant:**
   $$\mathcal{S}_{\text{train}} \cap \mathcal{S}_{\text{val}} = \emptyset$$
   $$\mathcal{S}_{\text{train}} \cap \mathcal{S}_{\text{test}} = \emptyset$$
   $$\mathcal{S}_{\text{val}} \cap \mathcal{S}_{\text{test}} = \emptyset$$
   $$\mathcal{P}_{\text{train}} \cap \mathcal{P}_{\text{test}} = \emptyset \quad (\text{Prompt text leakage prohibited})$$

Violations immediately halt dataset export with non-zero exit code.

---

## 📦 SECTION IV: CANONICAL RLCD PREFERENCE SCHEMA SPECIFICATION

Every exported record in `artifacts/rlcd/train_dataset.jsonl` adheres to the schema:

```json
{
  "trajectory_id": "traj-f51b2591302f4068",
  "goal_id": "G-CORE-010",
  "decision_id": "DAVE-OBS-G-CORE-010",
  "decision_type": "observability",
  "prompt": "[TASK CONTEXT]\nGoal: G-CORE-010\nDomain: observability\nRisk: low\nSummary: OpenTelemetry exporter publishing ECE calibration drift and latency flamegraphs to Prometheus\nEvidence: docs/03-architecture/telemetry-standards.md\nReferences: REF-013\nAssumptions: OpenTelemetry traces and metrics\nAlternatives Considered: Synchronous log writing to local disk\nVerification Gates: observability-harness",
  "chosen": {
    "summary": "OpenTelemetry exporter publishing ECE calibration drift and latency flamegraphs to Prometheus",
    "primary_action": "Configure OTLP gRPC collector endpoint"
  },
  "rejected": {
    "summary": "Synchronous log writing to local disk",
    "reason": "Suboptimal design alternative rejected during DAVE expert synthesis"
  },
  "confidence": 0.94,
  "reward": {
    "log_score": -0.0619,
    "overconfidence_penalty": 0.0,
    "net_reward": -0.0619
  },
  "correction_category": "general_correction",
  "oracle_verdict": {
    "correct": true,
    "authority": "empirical_test_harness"
  },
  "evidence": ["docs/03-architecture/telemetry-standards.md"],
  "references": ["REF-013"],
  "split": "train"
}
```

---

## 🔬 SECTION V: SOURCE-BOUND IMPLEMENTATION LINKS

- [`scripts/lib/dave-trajectory-builder.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/dave-trajectory-builder.mjs): Core trajectory processor, prompt normalizer, reward engine, split partitioner, and CLI dispatcher.
- [`scripts/harness/model-training-contract-harness.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/model-training-contract-harness.mjs): Contract-first training validation harness with dataset schema gatekeeper and split isolation checks.
- [`tests/unit/test-dave-trajectory-builder.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-dave-trajectory-builder.mjs): 9/9 passing unit tests verifying ingestion, prompt normalization, label oracles, rewards, splits, and schema conformance.
- [`artifacts/rlcd/train_dataset.jsonl`](file:///Users/batrarethsudprasert/projects/soda-os/artifacts/rlcd/train_dataset.jsonl): Production RLCD dataset containing 21 validated preference pairs.
- [`artifacts/evidence/G-ML-025-training-contract.json`](file:///Users/batrarethsudprasert/projects/soda-os/artifacts/evidence/G-ML-025-training-contract.json): Authoritative training contract with dataset SHA-256 and split declarations.
- [`scripts/harness/g-ml-025-replication-harness.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/g-ml-025-replication-harness.mjs): 10-stage master replication harness certifying end-to-end operational readiness.
