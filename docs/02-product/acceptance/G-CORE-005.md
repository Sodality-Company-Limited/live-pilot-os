# Acceptance Contract: G-CORE-005 Dependency Graph and Scope-Drift Harness

**Goal Reference:** [G-CORE-005.md](../../07-backlog/goals/G-CORE-005.md)  
**Kind:** feature  
**Epic:** CORE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the formal verification and empirical assurance criteria for Goal G-CORE-005: Dependency Graph and Scope-Drift Harness. Soda OS establishes automated dependency DAG cycle detection, predecessor state compatibility verification, and work-step scope drift checking enforcing strict touch map file confinement across all goals.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: AC-CORE-CORE-005-01: Detects Cyclic Dependencies and Reports Exact Cycle Path
```gherkin
Feature: Dependency DAG Cycle Detection
  Scenario: Detects circular dependencies and reports exact cycle path
    Given a goal dependency graph containing a circular dependency (G-A -> G-B -> G-C -> G-A)
    When buildAndValidateDependencyDAG is evaluated
    Then validation fails with valid: false
    And the error message contains the exact cycle path "G-A -> G-B -> G-C -> G-A"
    And zero mocks or stubs are present.
```

### Scenario 2: AC-CORE-CORE-005-02: Rejects Work Steps Modifying Files Outside Touch Map
```gherkin
Feature: Scope Drift & Touch Map Confinement
  Scenario: Rejects goals whose work steps declare files outside touch map
    Given a goal file whose work steps declare allowed_files outside the declared Touch map
    When detectScopeDrift is evaluated
    Then validation fails with valid: false
    And the error message identifies the unlisted file path and flags scope drift
    And zero mocks or stubs are present.
```

### Scenario 3: AC-CORE-CORE-005-03: Rejects Ready Goals with Blocked Predecessors
```gherkin
Feature: Upstream Predecessor State Compatibility
  Scenario: Rejects ready goals whose upstream dependencies are incomplete
    Given a goal with status "ready" or "in_progress" depending on a goal with status "blocked", "draft", or "planned"
    When buildAndValidateDependencyDAG is evaluated
    Then validation fails with valid: false
    And the error message reports that the upstream dependency must be complete before downstream can start
    And zero mocks or stubs are present.
```

---

## 📋 Verification Checklist

- [x] Dependency DAG cycle detection via DFS / topological traversal operational.
- [x] Predecessor state compatibility validation operational (ready/in_progress rejected if upstream is draft/planned/blocked).
- [x] Scope drift harness enforcing strict touch map confinement and allowed_files matching.
- [x] Explicit negative boundary checking against `## Out` scope.
- [x] Rule file `.agents/rules/scope-and-dependency-integrity.md` codified and verified.
- [x] 100% byte equivalence maintained between root and `template/` copies.
- [x] Zero mocks, zero stubs, zero simulated objects invariant preserved.
