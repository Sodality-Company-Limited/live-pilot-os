Feature: Mathematical Invariant Proof Harness and Profile-Aware Goal Governance
  As a Soda OS Governance Agent and ML Systems Engineer
  I want to declare machine-readable mathematical invariants in goal specifications and verify them using an empirical 5-layer proof harness
  So that mathematical, statistical, and state-machine claims are backed by executable property tests and provenance-bound proof receipts rather than static prose claims

  Scenario: Invariant Registry Extraction and Schema Validation
    Given a goal specification file declaring a machine-readable invariant registry block
    When the mathematical proof harness parses the goal file
    Then all declared invariants MUST have valid IDs, types, claims, test commands, and bounds
    And invalid or missing invariant fields MUST fail closed with exit code 1

  Scenario: Executable Property Testing for Calibrated Reward Monotonicity (G-ML-006)
    Given the calibrated reward loss function implementation
    When the property test suite evaluates incorrect outcomes with increasing confidence values across [0.0, 1.0]
    Then loss MUST be strictly monotonically increasing with confidence
    And loss MUST remain finite with zero NaN or Infinity values
    And gradient direction MUST strictly penalize overconfidence

  Scenario: Calibration Metric Property and Statistical Verification (G-ML-009)
    Given empirical labeled outcome datasets with confidence scores
    When calibration metrics are calculated
    Then ECE and Brier scores MUST strictly lie within [0.0, 1.0]
    And all samples MUST be counted exactly once across bins
    And empty datasets MUST fail closed with an explicit RangeError
    And 95% Wilson confidence intervals MUST be computed deterministically

  Scenario: Exhaustive Routing State Machine Truth Table Proof (G-ML-016)
    Given the 4-way dynamic decision routing state machine
    When tested against all 24 permutations of Risk (normal, high), Evidence (verified, unverified), and Confidence (high, low)
    Then every valid combination MUST map to an explicit deterministic action (proceed, verify, defer, human_review)
    And no undefined state or silent fallback is permitted

  Scenario: Dual-Head Tensor Dimensions and Gradient Isolation (G-ML-004)
    Given the dual-head language model architecture
    When forward pass is executed with batch size 2 and sequence length 16
    Then language model head output tensor MUST have shape [2, 16, vocab_size]
    And confidence head output tensor MUST have shape [2, 1]
    And backpropagation through confidence loss MUST NOT mutate frozen language backbone weights

  Scenario: Autoregressive Language Preservation and KL Regularization (G-ML-005)
    Given the calibrated language model after confidence-head attachment
    When evaluated on reference token sequences
    Then generation MUST remain strictly causal and autoregressive
    And KL divergence from the frozen base model MUST satisfy KL >= 0.0 and KL <= 0.25

  Scenario: Cryptographic Provenance-Bound Proof Receipt Generation
    Given an executed proof suite for target goal G-ML-006
    When all property tests pass cleanly with exit code 0
    Then a proof receipt JSON MUST be written to artifacts/proofs/G-ML-006_proof_receipt.json
    And the receipt MUST contain exact git HEAD SHA, source file SHA-256 hashes, test exit code 0, sample count, and epistemic classification
    And the receipt MUST distinguish executable property test from formal theorem or statistical guarantee
