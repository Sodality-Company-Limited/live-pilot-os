# Acceptance Contract: G-WEB-005 Component-First Implementation

**Goal Reference:** [G-WEB-005.md](../../07-backlog/goals/G-WEB-005.md)  
**Kind:** feature  
**Epic:** WEB  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-WEB-005: Component-First Implementation. G-WEB-005 delivers the deterministic, token-compliant implementation of core workspace components (`CommandRail`, `DecisionCanvas`, `EvidencePanel`) and Storybook/unit test fixtures (`workspaceFixtures.ts`) with zero raw hex values, zero arbitrary spacing brackets, and zero Cumulative Layout Shift ($\text{CLS} = 0.0000$).

Derived directly from visual reference `REF-0001`, UX specification `docs/02-product/design/component-inventory.md`, 5-State Behavior Matrix `docs/02-product/design/component-states.md`, and DAVE decisions `DAVE-UX-0003` and `DAVE-FE-0002`, this implementation ensures that every visual control, container, and operational trigger is fully realized with zero stubs, zero mocks, and zero fallbacks.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Token-Compliant Workspace Component Hierarchy (AC-WEB-005-01)
```gherkin
Feature: Token-Compliant Workspace Component Hierarchy
  Scenario: Core workspace components are implemented strictly with approved design tokens
    Given an operational Soda OS environment
    When code/src/components/CommandRail.tsx, DecisionCanvas.tsx, and EvidencePanel.tsx are scanned by the token guardrail harness
    Then zero raw hex colors (#hex) MUST be detected across all JSX elements and styles
    And zero arbitrary bracketed Tailwind spacing utilities (e.g. mt-[37px]) MUST be present
    And all dimensions, colors, and elevations MUST bind to tokens in code/src/tokens/index.css
    And semantic landmarks (<header role="banner">, <main role="main">, <aside role="complementary">) MUST be declared
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 2: Deterministic 5-State Fixture Coverage (AC-WEB-005-02)
```gherkin
Feature: Deterministic 5-State Behavior Matrix Coverage
  Scenario: All 5 declared component states render deterministically without exceptions
    Given an operational Soda OS environment
    When code/src/components/fixtures/workspaceFixtures.ts is loaded and evaluated across all 3 components
    Then deterministic datasets MUST exist for Empty, Loading, Partial, Full, and Error states
    And all loading skeletons MUST declare explicit height reservations matching fully hydrated components
    And deterministic error codes (ERR_SOCKET_TIMEOUT, ERR_DAVE_TOKEN_VIOLATION, ERR_REF_INTEGRITY) MUST be mapped to operational retry triggers
    And edge cases (long text strings, multiple citations, high-entropy hashes) MUST render without layout clipping
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 3: Automated Unit Test Suite & Assurance Verification (AC-WEB-005-03)
```gherkin
Feature: Automated Unit Test Suite and Zero-Mock Verification
  Scenario: Component unit test suite passes 100% green with zero mocks or stubs
    Given an operational Soda OS environment
    When node --test tests/unit/test-workspace-components.mjs is executed
    Then all 10 unit test cases MUST pass with exit code 0
    And zero mocks, stubs, todo!(), or dummy fallback objects MUST be present in implementation code
    And the 16-layer Goal Lifecycle Assurance Suite (node cli.js assure G-WEB-005) MUST certify 100% green
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

---

## 🔬 Empirical Verification Commands

1. **Token Guardrail Verification:**
   ```bash
   node scripts/harness/token-guardrail-harness.mjs
   ```
2. **Component Unit Test Pass:**
   ```bash
   node --test tests/unit/test-workspace-components.mjs
   ```
3. **UI-Spec Conformance Verification:**
   ```bash
   node scripts/harness/ui-spec-conformance-harness.mjs
   ```
4. **DAVE Decision Schema Verification:**
   ```bash
   node scripts/harness/dave-decision-schema-harness.mjs docs/05-decisions/DAVE-FE-0002.json
   ```
5. **16-Layer Goal Assurance Suite:**
   ```bash
   node cli.js assure G-WEB-005
   ```
