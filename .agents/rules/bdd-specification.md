---
trigger: always_on
---

# Behavior-Driven Development (BDD) Specification Protocol

This document defines the mandatory BDD specification protocol for translating interactive "Grill Me" interview outcomes into executable Given-When-Then feature scenarios.

---

## 1. BDD Feature Scenario Format

Every feature, adapter, engine, or tool MUST be defined using standard BDD Given-When-Then scenarios:

```gherkin
Feature: [System Capability Name]
  As a [Target Actor / Component]
  I want [System Action]
  So that [Business Value / Result]

  Scenario: [Specific Operational Scenario]
    Given [Initial System State & Context]
    When [Action or Trigger Event Occurs]
    Then [Expected Measurable Outcome & Invariants]
```

---

## 2. Mandatory Rules for BDD Scenarios

1. **Fed by "Grill Me":** Scenarios MUST be directly derived from the interactive interview responses gathered via `.agents/rules/interactive-alignment-grill-me.md`.
2. **Zero Ambiguity:** Scenarios MUST specify concrete quantitative bounds (e.g. `Given a 20ms audio frame chunk, When transcoded via PCM mu-law, Then latency MUST be under 15ms`).
3. **Edge Case Coverage:** MUST include explicit failing/negative scenarios (e.g. `Given an invalid magic byte payload, When received at AEris sensory gate, Then payload MUST be dropped and logged without crashing`).

---

## 3. Output to TDD

Every BDD Scenario MUST feed directly into `.agents/rules/tdd-execution.md` to drive Test-Driven Development unit test creation.
