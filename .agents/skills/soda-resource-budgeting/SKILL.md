---
name: soda-resource-budgeting
version: "1.0.0"
description: Resource ceiling enforcement, training compute hours, inference latency budgets, token expenditure, and memory limit controls.
skill_contract:
  id: soda-resource-budgeting
  version: 1.0.0
  profiles:
    - finops
    - infrastructure
    - systems
  inputs:
    - compute_budget_spec
    - latency_sla_matrix
    - token_cost_model
    - memory_ceiling
  outputs:
    - resource_allocation_contract
    - budget_consumption_audit
  gates:
    - compute_within_budget
    - latency_p99_under_sla
    - token_consumption_capped
    - zero_oom_risk
  blocks:
    - ready
    - verified
    - done
---

# Resource Budgeting Skill

> **Mission:** Enforce strict quantitative resource ceilings across training compute, token expenditure, latency, and memory allocations.

---

## 1. When to Use

Use this skill when:
- Establishing maximum compute hour budgets for training jobs or batch evaluations.
- Imposing hard inference latency SLAs (e.g. p99 $< 25\text{ms}$ for decision routing; $< 250\text{ms}$ for inference).
- Capping token usage per agent session or goal execution.
- Defining memory ceilings (e.g. 64MB / 256MB container budgets) and retry limits.

---

## 2. Resource Budgeting Workflow

1. **Define Budget Contract:** In `goal_contract` or architecture spec, declare `compute_hours_max`, `token_budget_max`, `memory_mb_max`, and `latency_p99_ms_sla`.
2. **Execute Under Metering:** Run execution steps with runtime resource tracking hooks.
3. **Verify Ceiling Adherence:** Validate that actual consumption does not exceed $100\%$ of allocated ceilings.
4. **Harness Verification:** Run `node scripts/harness/resource-budget-harness.mjs <GOAL_ID>`.

---

## 3. Required Artifacts

- Specification: [docs/03-architecture/resource-budgeting.md](../../../docs/03-architecture/resource-budgeting.md)
- Resource Harness: [scripts/harness/resource-budget-harness.mjs](../../../scripts/harness/resource-budget-harness.mjs)
- Budget Audit: `docs/07-backlog/evidence/<GOAL_ID>-resource-budget-audit.json`
