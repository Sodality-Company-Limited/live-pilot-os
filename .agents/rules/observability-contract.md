# Observability and Telemetry Contract Governance Rule

> **Scope:** Governs all runtime services, agent coordinators, background daemons, ML inference APIs, and data pipelines.  
> **Invariants:** 100% telemetry coverage, zero unmonitored production endpoints, explicit calibration metrics.

---

## 1. Five-Pillar Telemetry Requirement

Every runtime or backend goal MUST define explicit configurations for:
1. **Metrics:** Real-time counters, gauges, and histograms (p50, p95, p99 latency; error rates; throughput).
2. **Structured Logs:** JSON logs carrying `trace_id`, `span_id`, `client_id`, `goal_id`, and log level (`INFO`, `WARN`, `ERROR`).
3. **Distributed Traces:** OpenTelemetry (OTel) context propagation across microservice and agent tool invocation boundaries.
4. **Alert Rules:** Quantitative threshold definitions (e.g. error rate $> 0.5\%$, p99 latency $> 100\text{ms}$) with defined notification channels.
5. **Retention & Archival:** Data retention windows and PII masking rules conforming to security and privacy standards.

---

## 2. Model & Agent Governance Telemetry

For goals involving agent autonomy, confidence routing, or ML inference, the following telemetry metrics are mandatory:
- **Confidence Distribution:** Real-time histogram of calibrated decision confidence scores.
- **Expected Calibration Error (ECE):** Windowed ECE tracked across sliding 1000-decision evaluation windows.
- **Brier Score:** Mean squared error between confidence probabilities and verified binary outcomes.
- **High-Confidence Error Rate (HCER):** Frequency of incorrect decisions where $p \ge 0.85$ (hard SLA: HCER $\le 0.01$).
- **Routing Rates:** Real-time rates for `proceed`, `verify`, `defer`, and `human_review`.
- **Model Fallback Rate:** Frequency of fallback routing to secondary models or deterministic algorithms.

---

## 3. Production Readiness Gate

If a goal targets staging or production (`lifecycle.release: production`) and fails to declare or verify its metrics, alert rules, and calibration monitors, `scripts/harness/observability-contract-harness.mjs` immediately fails with exit code 1, blocking production certification.
