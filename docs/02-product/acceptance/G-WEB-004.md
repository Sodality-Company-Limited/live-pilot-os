# Acceptance Contract: G-WEB-004 Frontend Implementation Decision

**Goal Reference:** [G-WEB-004.md](../../07-backlog/goals/G-WEB-004.md)  
**Kind:** feature  
**Epic:** WEB  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-WEB-004: Frontend Implementation Decision. G-WEB-004 establishes the formal DAVE-FE decision contract defining DOM structure, CSS layout strategy, token bindings, and allowed files touch map.

Derived directly from visual reference `REF-0001` and DAVE decision `DAVE-FE-0001`, this specification guarantees zero layout shifts (Cumulative Layout Shift = 0) via explicit CSS Grid template reservations, enforces semantic HTML5 landmarks across all viewports, and unlocks downstream component implementation fail-closed via the DAVE implementation gatekeeper.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Complete React Component Tree & DOM Hierarchy (AC-WEB-004-01)
```gherkin
Feature: DOM Landmark Hierarchy and React Component Tree Architecture
  Scenario: DAVE-FE-0001 decision document defines complete React component tree and DOM hierarchy
    Given an operational Soda OS environment
    When docs/03-architecture/frontend-decision-G-WEB-004.md is parsed and validated
    Then all semantic landmarks (<header role="banner">, <main role="main">, <aside role="complementary">, <div role="dialog">) MUST be specified
    And the React component tree (WorkspaceLayout > CommandRail, DecisionCanvas, EvidencePanel, ReviewModal) MUST be defined
    And code/src/components/layout/WorkspaceLayout.tsx MUST implement the concrete landmark structure
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 2: CSS Grid Layout Strategy & Zero CLS (AC-WEB-004-02)
```gherkin
Feature: CSS Grid Layout Strategy and Zero CLS Invariants
  Scenario: CSS Grid layout strategy eliminates cumulative layout shifts across all breakpoints
    Given an operational Soda OS environment
    When the CSS layout strategy is evaluated across desktop (1440px), tablet (1024px), and mobile (390px) viewports
    Then the header MUST reserve a fixed height of 64px (var(--layout-header-height))
    And the main workspace MUST use CSS Grid with explicit template columns (minmax(720px, 1fr) 360px)
    And Cumulative Layout Shift (CLS) MUST be mathematically guaranteed to equal 0.0000
    And all styles MUST bind exclusively to codified design tokens in code/src/tokens/index.css
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 3: Implementation Gatekeeper & Decision Contract Verification (AC-WEB-004-03)
```gherkin
Feature: DAVE Implementation Gatekeeper and Decision Contract
  Scenario: CLI implementation gatekeeper successfully verifies DAVE-UX and DAVE-FE contracts
    Given an operational Soda OS environment
    When node cli.js implement G-WEB-001 --dave-ux DAVE-UX-0001 --dave-frontend DAVE-FE-0001 --approved-reference REF-0001 is executed
    Then all governance gates MUST be verified and exit code MUST be 0
    And DAVE-FE-0001 MUST be recorded in .agents/audit/decisions.jsonl with calibrated confidence 0.9400
    And missing or invalid arguments MUST cause the gatekeeper to fail closed with exit code 1
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

---

## 🔬 Empirical Verification Commands

```bash
# 1. DAVE decision schema verification
node scripts/harness/dave-decision-schema-harness.mjs docs/05-decisions/DAVE-FE-0001.json

# 2. Implementation gatekeeper execution
node cli.js implement G-WEB-001 --dave-ux DAVE-UX-0001 --dave-frontend DAVE-FE-0001 --approved-reference REF-0001

# 3. Frontend implementation decision unit test suite
node --test tests/unit/test-frontend-decision.mjs

# 4. Token guardrail verification
node scripts/harness/token-guardrail-harness.mjs

# 5. Cryptographic proof receipt verification
node scripts/harness/proof-receipt-validator.mjs docs/07-backlog/evidence/G-WEB-004-proof-receipt.json

# 6. 16-Layer Goal Lifecycle Assurance Suite
node cli.js assure G-WEB-004
```
