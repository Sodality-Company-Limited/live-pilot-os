---
name: soda-dave-frontend-implementation
version: "1.0.0"
description: >-
  DAVE Frontend Implementation Engine — translates approved DAVE-UX decisions into
  strict React/DOM component trees, token-constrained styles, and deterministic
  component state coverage within the goal touch map.
  Triggers: dave implement, dave frontend, dave component-first.
---

# DAVE Frontend Implementation

This skill defines the operational procedure for implementing components governed by DAVE decisions.

## Operational Steps

1. **Verify Prerequisites:** Confirm approved `DAVE-UX-xxxx` and `DAVE-FE-xxxx` records exist in `.agents/audit/decisions.jsonl`.
2. **Lock Touch Map:** Confirm allowed files and forbid touching global stylesheets or unrelated components.
3. **Token Conformance:** Use CSS custom properties or design token classes exclusively. Forbid raw hex or arbitrary magic numbers.
4. **State Completeness:** Implement `loading`, `empty`, `partial`, `error`, and `success` variants.
5. **Interactive Accessibility:** Enforce focus-visible rings, keyboard tab ordering, and ARIA roles.
6. **Execute Verification:** Run `token-guardrail-harness.mjs` and `ui-spec-conformance-harness.mjs`.
