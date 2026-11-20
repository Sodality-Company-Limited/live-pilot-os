# Acceptance Contract: G-CORE-004 Machine-Readable Goal Contract and Profile Registry

**Goal Reference:** [G-CORE-004.md](../../07-backlog/goals/G-CORE-004.md)  
**Kind:** feature  
**Epic:** CORE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the formal verification and empirical assurance criteria for Goal G-CORE-004: Machine-Readable Goal Contract and Profile Registry. Soda OS establishes machine-readable `goal_contract` frontmatter schema validation and modular domain profile registries supporting `core`, `ml_research`, and `security` personas across all standard goals and validation harnesses.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Machine-Readable Goal Contract Schema Parser
```gherkin
Feature: Goal Contract Schema Parsing and Validation
  Scenario: Parses and validates schema_version 2 goal contracts
    Given a goal file containing a valid goal_contract frontmatter block
    When extractAndValidateGoalContract is evaluated
    Then validation succeeds with valid: true and errors: []
    And all required fields (id, version, kind, status, profiles, atomicity, risk, lifecycle) are validated
    And zero mocks or stubs are present.
```

### Scenario 2: Modular Domain Profile Registry
```gherkin
Feature: Domain Profile Registry
  Scenario: Enforces domain profile requirements and schema loading
    Given a goal contract declaring profiles [core, ml_research, security]
    When profile specifications are resolved from docs/03-architecture/profiles/
    Then the corresponding profile definitions exist and are valid YAML schemas
    And invariant checks and epistemic tiers are enforced
    And the operation succeeds with exit code 0.
```

### Scenario 3: Single Verifiable Outcome Atomicity
```gherkin
Feature: Strict Atomicity Enforcement
  Scenario: Rejects goals declaring multiple deliverables or compound conjunctions
    Given a goal with atomicity.outcome_count > 1 or compound conjunctions in primary_outcome
    When goal-atomicity-harness or conformance validation is executed
    Then the validator rejects the goal with descriptive error messages
    And exits with non-zero exit code.
```

---

## 📋 Verification Checklist

- [x] Top-level `goal_contract` YAML schema extracted and validated programmatically.
- [x] All 8 mandatory contract fields enforced (`id`, `version`, `kind`, `status`, `profiles`, `atomicity`, `risk`, `lifecycle`).
- [x] Modular profile registry in `docs/03-architecture/profiles/` populated and verified.
- [x] Strict atomicity invariant (`outcome_count === 1`) and grammar rejection enforced.
- [x] 100% synchronization maintained between root and `template/` copies.
- [x] Zero mocks, zero stubs, zero simulated objects invariant preserved.
