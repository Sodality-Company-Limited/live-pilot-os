# Architectural Design Specification: Mandatory Principle-to-Decision Attribution Ledger and Substantiation Harness (G-CORE-034)

- **Goal ID:** `G-CORE-034`
- **Location:** `docs/03-architecture/specs/goals/G-CORE-034/design.md`
- **Status:** Approved
- **Author:** Systems Architect Lead

---

## 1. Intent & Architectural Rationale
Formalize mandatory principle-to-decision attribution ledger requiring agents to declare which invariant altered their concrete implementation choices.

---

## 2. Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Implement 100% operational logic satisfying G-CORE-034.
  - Maintain zero mocks, zero stubs, zero float arithmetic.
- **Non-Goals:**
  - Scope creep beyond declared touch map.
- **Anti-Goals:**
  - Loose untestable claims or superficial implementations.

---

## 3. Approaches Considered & Rejected Alternatives
- **Alternative A: Conversational Prompting Only**
  - *Rejection Reason:* Non-deterministic, breaks background swarms, loses context on restarts.
- **Alternative B: Ad-hoc Partial Scripts**
  - *Rejection Reason:* Incomplete invariants violate Constitution Article I.

---

## 4. Selected Approach & Trade-off Analysis
- **Selected Architecture:** Fully tested ESM module with deterministic verification harness.
- **Trade-offs:** Adds initial engineering harness overhead, but guarantees 100% reproducibility and bitwise parity.

---

## 5. Bounded Context & Touch Map Invariants
- **Touch Map:**
  - `.agents/rules/guidelines.md`
  - `scripts/lib/principle-attribution-validator.mjs`
  - `scripts/agents/test/principle-attribution.test.mjs`
- **Invariants:**
  - Zero mocks, zero stubs (Article I).

---

## 6. Acceptance Test & TDD Verification Strategy
- **Scenario:**
  - *Given* Mandatory Principle-to-Decision Attribution Ledger and Substantiation Harness,
  - *When* evaluated by verification harness,
  - *Then* all test invariants pass green.
- **Verification Command:**
  ```bash
  node --test scripts/agents/test/principle-attribution.test.mjs
  ```
