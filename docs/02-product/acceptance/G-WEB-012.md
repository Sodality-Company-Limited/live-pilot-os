# Acceptance Contract: G-WEB-012 Production Readiness and Learning

**Goal Reference:** [`G-WEB-012.md`](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-WEB-012.md)  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Kind:** `qa`  
**Status:** `accepted`  
**Timestamp:** `2026-10-03T21:20:00+07:00`  
**Owner:** `system-architect`  
**Approver:** `tech-lead`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Mandatory Verification Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. Executive Summary

Goal `G-WEB-012` closes the loop on DAVE governance for web applications in Soda OS by conducting full-suite production readiness verification across all 9 specialized verification harnesses, scoring decision outcomes using strictly proper logarithmic scoring rules, applying asymmetric 10x penalties for overconfident errors, and exporting an immutable, partitioned RLCD training dataset (`artifacts/rlcd/train_dataset.jsonl`) for downstream model calibration and continuous learning.

---

## 2. Formal BDD Given-When-Then Scenarios

### Feature: Full Suite Verification Across All 9 Specialized DAVE Harnesses

```gherkin
Feature: End-to-End Production Readiness Verification
  As a System Architect and Release Governor
  I want all 9 specialized DAVE verification harnesses to execute against active codebase artifacts
  So that production release is certified with mathematical and visual proof guarantees.

  Scenario: AC-WEB-012-01 - Executing full suite of all 9 DAVE verification harnesses
    Given an operational Soda OS environment
    When the following 9 verification harnesses are executed:
      | Harness Name                     | File Path                                          |
      | Decision Schema Harness          | scripts/harness/dave-decision-schema-harness.mjs   |
      | Reference Citations Harness      | scripts/harness/dave-reference-harness.mjs         |
      | Decision Trace Harness           | scripts/harness/dave-decision-trace-harness.mjs    |
      | UI-Spec Conformance Harness      | scripts/harness/ui-spec-conformance-harness.mjs    |
      | Token Guardrail Harness          | scripts/harness/token-guardrail-harness.mjs        |
      | Visual Regression Harness        | scripts/harness/visual-regression-harness.mjs      |
      | Motion Fidelity Harness          | scripts/harness/motion-harness.mjs                 |
      | Visual Asset Harness             | scripts/harness/asset-harness.mjs                  |
      | Audio Earcon Harness             | scripts/harness/audio-harness.mjs                  |
    Then all 9 harnesses MUST exit with code 0
    And zero mock objects or placeholder stubs may be used in any verification gate
    And all visual fidelity thresholds (diff <= 0.0050, CLS = 0, zero overflow) MUST be certified PASS.
```

### Feature: Strictly Proper Scoring Rule and Asymmetric Penalty Calculation

```gherkin
Feature: Strictly Proper Logarithmic Scoring and Overconfidence Penalties
  As a Machine Learning Engineer and Calibration Auditor
  I want decision trajectories to be scored using strictly proper logarithmic rules with asymmetric penalties
  So that confident false acceptances are penalized heavily and downstream models become well-calibrated.

  Scenario: AC-WEB-012-02 - Computing strictly proper logarithmic scores and 10x penalties
    Given recorded decision trajectories with confidence c in [0, 1] and empirical correctness y in {0, 1}
    When exportDaveRlcdData parses trajectories in ".agents/audit/decisions.jsonl"
    Then the logarithmic scoring rule MUST compute R = y * ln(c) + (1 - y) * ln(1 - c)
    And when empirical_correct is true, the overconfidence penalty MUST be 0.0000
    And when empirical_correct is false and confidence >= 0.80, the penalty MUST be c^2 * 10.0
    And net_reward MUST strictly equal log_score - overconfidence_penalty
    And the computation MUST be verified via executable property tests.
```

### Feature: Calibrated RLCD Dataset Export & Splitting

```gherkin
Feature: Calibrated RLCD Training Dataset Export
  As an Autonomous Agent Training Pipeline
  I want scored decision trajectories exported to JSONL with deterministic splits
  So that model training can ingest preference pairs without data leakage.

  Scenario: AC-WEB-012-03 - Exporting partitioned RLCD training dataset
    Given an operational audit ledger with recorded trajectories
    When the CLI executes "node scripts/lib/dave-cli.mjs export-rlcd-data --output artifacts/rlcd/train_dataset.jsonl"
    Then the command MUST exit with code 0
    And the output file "artifacts/rlcd/train_dataset.jsonl" MUST exist on disk
    And every record in the dataset MUST validate against the RLCD trajectory schema:
      | Field Name          | Validation Constraint                               |
      | trajectory_id       | Non-empty string prefixed with "traj-"              |
      | decision_id         | Valid decision identifier                           |
      | prompt              | String containing goal ID, domain, and summary      |
      | chosen              | Object representing chosen action                   |
      | rejected            | Object representing alternative action              |
      | reward              | Object with log_score, overconfidence_penalty, net  |
      | split               | Exactly one of "train", "validation", "test"        |
    And splits MUST be partitioned deterministically into 80% train, 10% validation, 10% test.
```
