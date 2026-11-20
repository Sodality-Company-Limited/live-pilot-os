---
name: soda-reflection-engine
version: "1.0.0"
description: Socratic blindspot scanner and assumption reflection engine. Evaluates diffs and plan declarations against hidden assumptions, edge pathologies, security boundaries, and regression risks.
---

# soda-reflection-engine

The `soda-reflection-engine` skill provides automated Socratic blindspot self-interrogation and assumption verification for code diffs and architectural plans.

## When to Use
- Before marking goals `done` or opening PRs to inspect for hidden blindspots.
- To detect unhandled edge cases, float usage (Article VI), or silent error swallowing.
- To calculate bounded integer risk scores and format actionable remediation reports.

## Invariants
- **INV-037-001 (Determinism):** For identical diff contents and rule sets, reflection risk scores and findings are 100% deterministic.
- **INV-037-002 (Completeness):** All registered critical blindspot patterns are identified with zero false negatives.

## Commands
```bash
# Execute reflection engine tests
node --test tests/lib/reflection-engine.test.mjs
```
