# Architecture Specification: Resource Budgeting and Execution Ceilings

> **Status:** Active  
> **Classification:** Framework Core Architecture  
> **Referenced By:** `soda-resource-budgeting`, `scripts/harness/resource-budget-harness.mjs`

---

## 1. Executive Summary

Soda OS establishes hard quantitative boundaries on compute resources, memory consumption, latency budgets, token expenditures, and retry limits. Unbounded execution is strictly forbidden.

---

## 2. Resource Boundaries

### 2.1 Latency Budgets
- Fast routing decision state-machine: $\text{p99} \le 5\text{ms}$
- Tool call execution: $\text{p99} \le 250\text{ms}$
- End-to-end agentic step turnaround: $\text{p95} \le 5000\text{ms}$

### 2.2 Memory Ceilings
- Local agent coordinators: $\le 64\text{MB}$ heap footprint
- Heavy ML worker daemons: $\le 512\text{MB}$ container memory limits

### 2.3 Compute & Token Budgets
- Supervised fine-tuning / calibration epochs: capped compute hours $H \le 4.0\text{h}$
- Token usage per goal step: capped at $32,000$ tokens max
- Maximum retry attempts on transient network faults: $R \le 3$ with exponential backoff and jitter
