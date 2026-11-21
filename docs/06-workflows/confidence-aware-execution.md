# Operator Runbook: Confidence-Aware Agent Execution

**Status:** Approved  
**Version:** 1.0.0  
**Epic:** ML  
**Scope:** Operational Procedures, Incident Response Playbooks, and Troubleshooting Trees  

---

## 1. Operational Principles & Decision Protocol

Autonomous agents operating within Soda OS adhere to three non-negotiable operational invariants:
1. **Never Assume Calibration:** Raw foundation model token probabilities cannot be trusted without calibration validation.
2. **Fail-Closed on Uncertainty:** When evidence is missing or confidence is uncalibrated, execution defaults to verification or human review rather than autonomous progress.
3. **Auditability:** Every decision must be traceable to physical files on disk and recorded in an immutable ledger.

```
       Decision Intake
             │
             ▼
    [Evidence Check]
      ├── Missing/Unverified ──► Route to `verify` or `defer`
      └── Physically Verified
             │
             ▼
    [Confidence Check]
      ├── Below 0.80 ──────────► Route to `verify` or `defer`
      └── Bounded [0.80, 1.0]
             │
             ▼
       [Risk Check]
         ├── Normal Risk ──────► Action: `proceed`
         └── High Risk ────────► Action: `human_review`
```

---

## 2. Four-Way Dynamic Routing Policy Summary

| Risk Level | Evidence Verified | Confidence ($c$) | Routing Action | Expected System Behavior |
| :---: | :---: | :---: | :---: | :--- |
| `normal` | Yes | High ($c \ge 0.80$) | **`proceed`** | Autonomous tool execution proceeds immediately. |
| `normal` | Yes | Low ($c < 0.80$) | **`verify`** | Agent pauses and runs verification checks. |
| `normal` | No | High ($c \ge 0.80$) | **`verify`** | Flagged as overconfident; secondary proof required. |
| `normal` | No | Low ($c < 0.80$) | **`defer`** | Execution halted; task deferred to supervisor. |
| `high` | Yes | High ($c \ge 0.80$) | **`human_review`** | Constitutional stop: Human must review and sign off. |
| `high` | Yes | Low ($c < 0.80$) | **`defer`** | Execution halted; high risk with low confidence. |
| `high` | No | High ($c \ge 0.80$) | **`defer`** | Severe epistemic violation; execution aborted. |
| `high` | No | Low ($c < 0.80$) | **`defer`** | Total epistemic deficit; execution aborted. |

---

## 3. Incident Response Troubleshooting Playbooks

### Playbook 1: CI Calibration Gate Failure (`ci-calibration-gate.mjs`)

**Trigger:** CI workflow step fails with non-zero exit code on `node scripts/ci/ci-calibration-gate.mjs --strict`.

#### Diagnostic Steps:
1. Generate the machine-readable calibration report:
   ```bash
   node scripts/ci/ci-calibration-gate.mjs --report artifacts/eval/ci_gate_report.json
   cat artifacts/eval/ci_gate_report.json
   ```
2. Inspect the failed metric:
   - **ECE Breach ($\text{ECE} > 0.0400$):** Model predictions are poorly calibrated across confidence bins.
   - **Brier Breach ($\text{BS} > 0.0800$):** High overall mean-squared prediction error.
   - **HCER Breach ($\text{HCER} > 0.0100$):** Model committed critical overconfident errors on test samples ($c \ge 0.80$ while incorrect).
   - **Security Invariant Breach:** A high-risk decision was routed to `proceed` instead of `human_review`.

#### Remediation Procedures:
- **Scenario A (Data Distribution Shift):** If evaluation samples include new domain prompts, run temperature scaling or Platt scaling recalibration:
  ```bash
  python code/ml/src/training/recalibrate_temperature.py --input data/processed/val_eval.jsonl
  ```
- **Scenario B (Model Head Regression):** If ECE or HCER cannot be resolved via temperature scaling, rollback to the previous certified checkpoint:
  ```bash
  cp models/checkpoints/v1.0.0-stable/* models/checkpoints/active/
  node scripts/ci/ci-calibration-gate.mjs --strict
  ```
- **Scenario C (Policy Drift):** Verify `config/calibration.json` was not modified with weakened thresholds. Restore default thresholds:
  ```bash
  git checkout config/calibration.json
  ```

---

### Playbook 2: Online Distribution Drift Alert (`calibration-monitor.mjs`)

**Trigger:** Log warning emitted: `[CALIBRATION DRIFT ALERT]` indicating Brier score $> 0.1200$ or ECE $> 0.0800$ over the sliding window.

#### Diagnostic Steps:
1. Inspect the live calibration monitor snapshot:
   ```bash
   node -e "
     import { CalibrationMonitor } from './scripts/lib/calibration-monitor.mjs';
     // inspect active monitor state
   "
   ```
2. Query recent decisions from the audit ledger:
   ```bash
   tail -n 50 .agents/audit/decisions.jsonl | jq '{timestamp, decision: .decision.action, confidence: .decision.confidence, outcome}'
   ```
3. Identify cluster of incorrect outcomes with elevated confidence.

#### Remediation Procedures:
1. **Trip Circuit Breaker to Fallback Mode:**
   Prevent further autonomous drift by manually tripping the model circuit breaker:
   ```bash
   node -e "
     import { ModelCircuitBreaker } from './scripts/lib/model-circuit-breaker.mjs';
     // set breaker to FALLBACK
   "
   ```
2. **Quarantine Miscalibrated Inputs:**
   Capture the recent 50 trajectory samples and append them to `data/quarantine/drift_samples.jsonl`.
3. **Trigger Human Review:**
   Notify tech lead and switch agent autonomy mode to `semi-autonomous` until recalibration is complete.

---

### Playbook 3: Model Circuit Breaker Trip & Recovery (`model-circuit-breaker.mjs`)

**Trigger:** Inference requests fail consecutively $\ge 3$ times; circuit breaker state transitions to `FALLBACK`.

#### Diagnostic Steps:
1. Check inference endpoint availability:
   ```bash
   node -e "
     import { checkHealth } from './scripts/lib/model-config.mjs';
     checkHealth({ endpoint: process.env.MODEL_ENDPOINT || 'http://localhost:11434' })
       .then(res => console.log('Endpoint health:', res))
       .catch(err => console.error('Endpoint unreachable:', err));
   "
   ```
2. Inspect server error logs (out-of-memory, GPU failure, connection timeout).

#### Remediation Procedures:
1. **Restart Model Serving Daemon:**
   Restart the local inference container or remote endpoint service:
   ```bash
   docker restart soda-model-server || ollama serve &
   ```
2. **Execute Health Probing:**
   The circuit breaker automatically transitions to `HalfOpen` when probing begins. Feed 5 consecutive test queries through the probe interface:
   ```bash
   node scripts/harness/confidence-calibration-harness.mjs
   ```
3. **Verify State Restoration:**
   Ensure circuit breaker state returns to `Active` after 5 successful probes.

---

### Playbook 4: Decision Ledger Audit & Citation Verification (`decision-ledger.mjs`)

**Trigger:** Scheduled security audit or forensic post-incident review.

#### Diagnostic Steps:
1. Verify all evidence citations in the decision ledger point to valid disk files:
   ```bash
   node -e "
     import { DecisionLedger } from './scripts/lib/decision-ledger.mjs';
     import fs from 'node:fs';
     const records = fs.readFileSync('.agents/audit/decisions.jsonl', 'utf8')
       .trim().split('\n').map(l => JSON.parse(l));
     console.log('Total audited decisions:', records.length);
   "
   ```
2. Verify SHA256 content hashes of recorded evidence:
   ```bash
   sha256sum <cited-file>
   ```

#### Maintenance Procedures:
- **Ledger Rotation:** When `.agents/audit/decisions.jsonl` exceeds 50MB, archive to `.agents/audit/archive/decisions-<date>.jsonl.gz`.

---

## 4. Operational CLI Command Reference

| Operational Task | CLI Command |
| :--- | :--- |
| **Run CI Calibration Gate** | `node scripts/ci/ci-calibration-gate.mjs --strict` |
| **Generate Calibration Report** | `node scripts/ci/ci-calibration-gate.mjs --report artifacts/eval/report.json` |
| **Verify Calibration Harness** | `node scripts/harness/confidence-calibration-harness.mjs` |
| **Test Circuit Breaker FSM** | `node tests/unit/test-circuit-breaker.mjs` |
| **Test Calibration Monitor** | `node tests/unit/test-calibration-monitor.mjs` |
| **Test Decision Ledger** | `node tests/unit/test-decision-ledger.mjs` |
| **Run Documentation Tests** | `node tests/unit/test-operational-runbook.mjs` |
| **Run Goal Conformance** | `node scripts/harness/goal-template-conformance-harness.mjs G-ML-024` |

---

## 5. Related Architecture & Governance Documents

- [Architecture Guide: Confidence-Aware Agent Execution](../03-architecture/confidence-aware-execution.md)
- [ADR-004: Calibrated Confidence Routing](../05-decisions/ADR-004-calibrated-confidence-routing.md)
- [Model Circuit Breaker Library](../../scripts/lib/model-circuit-breaker.mjs)
- [Confidence Calibration Library](../../scripts/lib/confidence-calibration.mjs)
- [Decision Ledger Library](../../scripts/lib/decision-ledger.mjs)
