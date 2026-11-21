# Acceptance Contract: G-CORE-008 Failure, Rollback, and Fail-Closed Harness

**Goal Reference:** [G-CORE-008.md](../../07-backlog/goals/G-CORE-008.md)  
**Kind:** feature  
**Epic:** CORE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the formal verification and empirical assurance criteria for Goal G-CORE-008: Failure, Rollback, and Fail-Closed Harness. Soda OS establishes automated failure policy validation, executable rollback command and compensation verification, exhaustive Cartesian truth-table completeness checking across $\{ \text{risk}, \text{evidence}, \text{confidence} \}$, and fail-closed runtime safety invariant enforcement with zero mocks and zero stubs.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: AC-CORE-CORE-008-01: Proves Exhaustiveness of Decision State Space {risk, evidence, confidence}
```gherkin
Feature: Decision State Space Exhaustiveness and Routing Completeness
  Scenario: Proves that all combinations of {risk, evidence, confidence} have defined routes
    Given a goal specification or agent runtime declaring a machine-readable routing_contract block
    When validateRoutingTruthTable is evaluated across the Cartesian product of Risk x Evidence x Confidence
    Then all 8 canonical permutations are verified as defined and deterministic
    And duplicate state mappings are rejected with descriptive diagnostic errors
    And the operation succeeds with exit code 0 and maintains zero mocks or stubs.
```

### Scenario 2: AC-CORE-CORE-008-02: Enforces High-Risk Unverified and Low-Confidence Fail-Closed Routes
```gherkin
Feature: Fail-Closed Safety Invariant Enforcement
  Scenario: Enforces that high-risk unverified and low-confidence decisions cannot proceed autonomously
    Given an agent decision proposal with high risk and unverified evidence, or low confidence
    When validateRoutingTruthTable or runtime routeDecision is evaluated
    Then any route mapping high-risk unverified to proceed fails validation immediately
    And any route mapping low confidence to proceed fails validation immediately
    And high-risk verified actions route strictly to human_review or defer
    And zero mocks, zero stubs, and zero fallback objects are present.
```

### Scenario 3: AC-CORE-CORE-008-03: Validates Failure Policy Completeness and Rollback Command Syntax
```gherkin
Feature: Failure Policy and Rollback Compensation Verification
  Scenario: Validates failure policy completeness and executable rollback command syntax
    Given a goal specification declaring failure_policy and rollback blocks
    When validateFailureAndRollbackPolicy is evaluated
    Then all mandatory failure conditions (dependency_unavailable, invalid_input, verification_failure, timeout) must be present
    And rollback command must specify an executable, non-empty compensation command
    And destructive command patterns (such as rm -rf / or format) are rejected fail-closed
    And the operation succeeds with exit code 0 and maintains zero mocks.
```

---

## 📋 Verification Checklist

- [x] Failure policy validator operational requiring all 4 mandatory failure conditions (`failure-rollback-harness.mjs`).
- [x] Rollback contract validator operational requiring trigger, command, scope, and verification.
- [x] Destructive rollback command detector operational rejecting dangerous commands.
- [x] Cartesian product truth-table exhaustiveness engine operational (`routing-truth-table-harness.mjs`).
- [x] Safety invariants 1, 2, and 3 enforced: high-risk unverified and low-confidence decisions cannot route to `proceed`.
- [x] Permitted action set strictly bounded to `['proceed', 'verify', 'defer', 'human_review']`.
- [x] Rule file `.agents/rules/agent-runtime-fail-closed.md` specifies hard fail-closed boundaries.
- [x] Architecture document `docs/03-architecture/agent-runtime-governance.md` specifies decision state machine.
- [x] 100% byte equivalence maintained between root and `template/` copies.
- [x] Zero mocks, zero stubs, zero simulated objects invariant preserved.
