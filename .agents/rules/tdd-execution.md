---
trigger: always_on
---

# Test-Driven Development (TDD) Execution Protocol

This document defines the mandatory Red-Green-Refactor TDD protocol requiring failing unit tests to be written BEFORE implementation code.

---

## 1. The Red-Green-Refactor Lifecycle

Antigravity and spawned subagents MUST strictly adhere to the 3-step TDD cycle:

```
  ┌───────────────────────────────────────────────────────────┐
  │ 1. RED PHASE: Write Failing Unit / Integration Test       │
  │    (Directly implementing BDD Given-When-Then Scenarios)  │
  └─────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 2. GREEN PHASE: Implement Minimal Operational Code        │
  │    (Must contain 100% operational logic; ZERO STUBS)     │
  └─────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 3. REFACTOR PHASE: Optimize & Harden                      │
  │    (Maintain zero warnings, zero errors, zero mocks)      │
  └───────────────────────────────────────────────────────────┘
```

---

## 2. Mandatory TDD Invariants

1. **Test-First Requirement:** Implementation code (`src/`) MUST NOT be created or modified until a corresponding failing test (`tests/` or `#[cfg(test)]`) exists.
2. **Zero Mocks Invariant:** Mocks, stubs, `todo!()`, or dummy fallback objects are strictly forbidden. Tests MUST verify real operational logic.
3. **Empirical Verification:** Every test MUST compile and pass cleanly via automated test checkers (`cargo test`, `pytest`, `npm test`).

---

## 3. Output to Goal Orchestration

Once all TDD tests pass cleanly (Green Phase), execution advances to `.agents/rules/goal-orchestration.md` for full goal fulfillment and LLM Wiki logging.
