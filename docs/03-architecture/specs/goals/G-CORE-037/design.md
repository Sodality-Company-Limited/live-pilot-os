# Architectural Design Specification: Historical Design Archeology and Archival Rationale Extraction Engine (G-CORE-037)

- **Goal ID:** `G-CORE-037`
- **Location:** `docs/03-architecture/specs/goals/G-CORE-037/design.md`
- **Status:** Approved
- **Author:** Systems Architect Lead

---

## 1. Intent & Architectural Rationale
Implement design archeology engine mining git history and archived goals to explain architectural rationale before executing refactors.

---

## 2. Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Implement 100% operational logic satisfying G-CORE-037.
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
  - `scripts/lib/design-archeology-miner.mjs`
  - `scripts/agents/test/design-archeology-miner.test.mjs`
- **Invariants:**
  - Zero mocks, zero stubs (Article I).

---

## 6. Acceptance Test & TDD Verification Strategy
- **Scenario:**
  - *Given* Historical Design Archeology and Archival Rationale Extraction Engine,
  - *When* evaluated by verification harness,
  - *Then* all test invariants pass green.
- **Verification Command:**
  ```bash
  node --test scripts/agents/test/design-archeology-miner.test.mjs
  ```
