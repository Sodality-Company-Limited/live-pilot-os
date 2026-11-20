# UX Decision Contract Governance & Schema Invariants

This rule defines the mandatory structural, behavioral, and verification invariants for all Multimodal UX/UI Design Decisions within Soda OS.

---

## 1. Schema Authority & Invariants

All UX decisions emitted by autonomous agents, personas, or vision pipelines MUST validate against Draft 2020-12 schema `schemas/ux-decision-contract.schema.json` via `scripts/lib/ux-decision-contract.mjs` fail-closed.

### 1.1 Strict Invariants
1. **Zero Mocks & Zero Stubs:** All decisions must represent concrete, production-ready specifications bound to existing file touch maps and registered design tokens.
2. **Proper Calibrated Confidence:** Confidence scores must be strictly within $[0.0, 1.0]$ and derived from strictly proper scoring rules (`confidence_calibrated: true`). Uncalibrated heuristics are strictly rejected.
3. **Mandatory 5-State Component Coverage:** Every UI decision altering or creating components must fully specify all 5 states: `empty`, `loading`, `partial`, `full`, and `error`.
4. **Zero Layout Overflow & Zero CLS:** The viewport contract must guarantee $\text{max\_overflow\_px} \equiv 0$ and $\text{cls\_score} \le 0.0$ across declared viewports (Desktop, Tablet, Mobile).
5. **Physical Evidence & Provenance Binding:** All evidence citations must refer to existing disk files or registered design tokens; references must include verified SHA-256 content hashes.

---

## 2. 10-State Decision Lifecycle Integration

Decisions progress through the 10-state lifecycle state machine:
`OBSERVE` $\to$ `PERCEIVE` $\to$ `CRITIQUE_WCAG` $\to$ `CRITIQUE_HEURISTICS` $\to$ `DEBATE` $\to$ `RESOLVE_COLLISION` $\to$ `EVALUATE_CONFIDENCE` $\to$ `EMIT_DECISION`

- If calibrated confidence $c < 0.75$, the state machine must transition to `DEFER`.
- If deceptive patterns or ethics violations are detected, the state machine must transition to `REJECT_AS_UNSAFE`.

---

## 3. Verification Commands

```bash
# Unit test verification
node --test tests/unit/test-ux-decision-contract.mjs

# Schema harness verification
node scripts/harness/ux-decision-schema-harness.mjs
```
