---
name: soda-agent-observability
version: "1.0.0"
description: Telemetry, calibration metrics (ECE, Brier, HCER), autonomous routing rates, latency SLAs, token budgets, and drift monitoring.
skill_contract:
  id: soda-agent-observability
  version: 1.0.0
  profiles:
    - site_reliability
    - ml_observability
    - agent_governance
  inputs:
    - decision_stream
    - latency_metrics
    - token_counters
    - alert_definitions
  outputs:
    - observability_dashboard_spec
    - calibration_metrics_report
    - alert_rules_manifest
  gates:
    - ece_within_sla
    - hcer_below_ceiling
    - latency_p99_compliant
    - alert_routes_configured
  blocks:
    - ready
    - verified
    - done
---

# Agent Observability Skill

> **Mission:** Monitor, measure, and alert on agent calibration, routing health, latency, and drift in real time.

---

## 1. When to Use

Use this skill when:
- Defining real-time telemetry contracts for agent coordinators and inference endpoints.
- Tracking epistemic calibration metrics: Expected Calibration Error (ECE $\le 0.08$), Brier Score ($\le 0.15$), and High-Confidence Error Rate (HCER $\le 0.01$).
- Instrumenting Prometheus counters, histograms, and OpenTelemetry spans for tool dispatch.
- Setting up automated alert thresholds for routing anomalies and calibration drift.

---

## 2. Observability Workflow

1. **Instrumentation:** Export metrics for `agent_decisions_total{route="...", risk="..."}`, `agent_decision_latency_seconds`, and `calibrated_confidence`.
2. **Compute Empirical Calibration:** Calculate windowed ECE across 10 bins:
   $$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N} |\text{acc}(B_m) - \text{conf}(B_m)|$$
3. **Configure Alerting Rules:** Alert on `HCER > 0.01` or `defer_rate > 0.25`.
4. **Harness Verification:** Run `node scripts/harness/agent-observability-harness.mjs <GOAL_ID>`.

---

## 3. Required Artifacts

- Specification: [docs/03-architecture/agent-observability.md](../../../docs/03-architecture/agent-observability.md)
- Observability Harness: [scripts/harness/agent-observability-harness.mjs](../../../scripts/harness/agent-observability-harness.mjs)
- Metrics Report: `docs/07-backlog/evidence/<GOAL_ID>-observability-report.json`
