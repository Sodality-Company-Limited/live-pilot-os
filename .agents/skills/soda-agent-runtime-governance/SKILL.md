---
name: soda-agent-runtime-governance
version: "1.0.0"
description: Governs autonomous agent decisions, calibrated confidence thresholds, evidence verification, risk-weighted fail-closed routing, and fallback states.
skill_contract:
  id: soda-agent-runtime-governance
  version: 1.0.0
  profiles:
    - core
    - autonomous_agents
    - runtime_security
  inputs:
    - decision_payload
    - risk_matrix
    - confidence_thresholds
    - tool_authorizations
  outputs:
    - routing_decision
    - verification_audit_trail
    - rollback_plan
  gates:
    - confidence_in_bounds
    - truth_table_complete
    - fail_closed_verified
    - rollback_command_executable
  blocks:
    - ready
    - verified
    - done
---

# Agent Runtime Governance Skill

> **Mission:** Enforce deterministic, fail-closed state routing and uncertainty-aware governance for autonomous agents.

---

## 1. When to Use

Use this skill when:
- Designing runtime coordinators, execution loopers, or autonomous tool dispatchers.
- Configuring calibrated confidence routing thresholds ($\tau_{\text{high}}$, $\tau_{\text{low}}$).
- Implementing fail-closed deferral paths and human-in-the-loop review escalations.
- Formulating rollback compensations and circuit breakers for agent operations.

---

## 2. Runtime Governance Workflow

1. **Schema Validation:** Ingest agent decision `{ answer, confidence, evidence, risk }`. Ensure $p \in [0.0, 1.0]$.
2. **Evaluate Routing Truth Table:** Map decision against `[proceed, verify, defer, human_review]`.
3. **Fail-Closed Gate:** If risk is `high` or evidence is unverified, disallow autonomous `proceed`.
4. **Harness Verification:**
   - Truth Table: `node scripts/harness/routing-truth-table-harness.mjs <GOAL_ID>`.
   - Rollback / Fail-Closed: `node scripts/harness/failure-rollback-harness.mjs <GOAL_ID>`.

---

## 3. Required Artifacts

- Specification: [docs/03-architecture/agent-runtime-governance.md](../../../docs/03-architecture/agent-runtime-governance.md)
- Truth Table Harness: [scripts/harness/routing-truth-table-harness.mjs](../../../scripts/harness/routing-truth-table-harness.mjs)
- Rollback Harness: [scripts/harness/failure-rollback-harness.mjs](../../../scripts/harness/failure-rollback-harness.mjs)
- Routing Audit: `docs/07-backlog/evidence/<GOAL_ID>-routing-audit.json`
