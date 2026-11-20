---
name: soda-multiphase-planner
description: Multi-phase DAG plan compiler and acyclicity gate. Validates topological phase sequencing, enforces zero dependency cycles, and verifies touch map disjointness across parallel phases.
---

# soda-multiphase-planner

The `soda-multiphase-planner` skill compiles multi-phase DAG plans into topologically ordered execution waves and verifies strict touch map isolation.

## When to Use
- When decomposing large epics into multi-phase topological milestones.
- When validating that parallel phases execute across mutually disjoint write touch maps ($W_i \cap W_j = \emptyset$).
- When verifying that a complex plan contains zero circular dependencies.

## Invariants
- **INV-036-001 (DAG Acyclicity):** Multi-phase dependency graphs must be strict directed acyclic graphs (DAGs) with zero circular dependencies.
- **INV-036-002 (Disjointness):** Parallel goal execution phases have strictly disjoint touch map write sets.

## Commands
```bash
# Execute multiphase planner tests
node --test tests/lib/multiphase-plan-compiler.test.mjs
```
