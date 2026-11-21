# Goal Operational Governance & Lifecycle Registries Specification

**Location:** `docs/03-architecture/specs/goal-operational-governance.md`  
**Framework:** Soda OS  
**Status:** Canonical Framework Specification  

---

## 🏛️ Context & Framework Invariant

Every goal in Soda OS operates under deterministic governance constraints, risk mitigation protocols, rollback contracts, and security trust boundaries. When formulating or executing a goal card, this specification defines the mandatory schema, semantics, and invariants for operational registries.

---

## 1. Assumptions Registry

Assumptions define explicit factual preconditions required for goal execution success. If any assumption's invalidation condition triggers, execution halts fail-closed.

```yaml
assumptions:
  - id: A-001
    statement: "[Explicit factual assumption required for success]"
    confidence: high
    validation_goal: G-PAY-002
    invalidation_condition: "[Measurable event that invalidates this assumption]"
    owner: developer
```

---

## 2. Risks & Mitigation Registry

Identifies potential system failure modes, concurrency race conditions, regressions, or integration hazards, pairing each with an automated detection sentinel and response action.

```yaml
risks:
  - id: R-001
    category: operational
    description: "[Potential failure mode or regression]"
    likelihood: low
    impact: medium
    mitigation: "[Concrete preventative measure]"
    detection: "[Monitoring metric or failing test]"
    response: "[Immediate remediation or rollback]"
    owner: developer
```

---

## 3. Failure Policy & Rollback Contract

Defines exact deterministic actions when encountering dependency outages, invalid inputs, verification failures, timeouts, partial writes, or model failures.

```yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail
  partial_write: compensate
  model_failure: fallback_to_human_review

rollback:
  trigger: "Automated test regression or post-deploy SLA breach"
  command: "git revert HEAD --no-edit"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via idempotent WAL log"
  verification: "npm test"
```

---

## 4. Security & Trust Boundaries

Establishes STRIDE threat categorization, untrusted context boundaries, capability token authorizations, sandbox isolations, secret handling, and PII anonymization invariants.

```yaml
security:
  threat_model: "[Threat categories: prompt injection, model gaming, PII leakage, unauthorized tool execution]"
  trust_boundary: "[Boundary separating untrusted inputs, LLM context, and deterministic kernel]"
  tool_authorization: "[Least privilege capability tokens and parameter validation]"
  sandbox_boundary: "[Wasmtime WASM sandbox, POSIX isolation, or container ceiling (e.g. 256MB)]"
  secret_handling: "[Zero credentials in prompts or code; authenticated via local environment or vault]"
  pii_handling: "[Sensory inputs scrubbed via AEgis PII vault before processing]"
```

---

## 5. Observability & Drift Telemetry

Defines OpenTelemetry spans, metrics, calibration metrics (ECE, Brier score), and automated alert thresholds.

```yaml
observability:
  metrics: ["[Primary metric, e.g. decision_count]", "[Calibration metric, e.g. ece, brier_score]"]
  alerts: ["[Threshold breach, e.g. ece > 0.05]", "[Latency SLA breach, e.g. p95_latency > 250ms]"]
  traces: ["[OpenTelemetry span names, e.g. agent.decision.inference]"]
  dashboards: ["[Grafana dashboard link or metric definition path]"]
```

---

## 6. Resource & Cost Budget

Enforces strict physical constraints on inference latency, RAM footprint, Disk I/O, CPU threads, and monetary expenditure.

| Resource Dimension | Allocated Budget | Hard Ceiling / Enforcement |
|---|---|---|
| **P99 Inference Latency** | [150 μs, decision routing gate] | [1,000 μs, end-to-end pipeline SLA] |
| **RAM Vector Cache Footprint** | [64 MB, dyadic cache features] | [256 MB, hard memory ceiling] |
| **Disk I/O Write Overhead** | [20 μs per tick / decision] | [SQLite WAL async batching / 500ms flush] |
| **CPU Thread Allocation** | [2 dedicated worker threads] | [4 worker threads maximum] |
| **Financial Capital Risk** | [$0.00, paper trading only] | [Hard fail-closed air-gap block] |

```yaml
resource_budget:
  latency_budget: "[Hard execution SLA, e.g. p95 < 250ms per decision]"
  memory_budget: "[Memory ceiling, e.g. 256MB kernel RAM / 16GB VRAM]"
  compute_budget: "[Compute hardware specification, e.g. 4 vCPU or 1x NVIDIA A100-80GB]"
  token_budget: "[Context window budget, e.g. max 8192 tokens per prompt]"
  cost_budget: "[Financial upper bound, e.g. < $0.05 per thousand decisions]"
```

---

## 7. Post-Ship Learning Loop Contract

Defines runtime metrics, review schedules, regression thresholds, and feedback mechanisms for continuous post-release learning.

- **Observed metrics:** [Runtime metrics or calibration scores monitored post-release, e.g. Calibrated Confidence, Invariant Verification Rate, System Reliability]
- **Review schedule:** [Evaluation cadences, e.g. evaluated continuously per commit and batched after every 1,000 decisions]
- **Regression threshold:** [Hard delta or condition that triggers automated rollback or investigation, e.g. Invariant failure, latency SLA breach]
- **Feedback mechanism:** [How failure cases, user overrides, or incidents feed into new goals or diagnostic review packets]

---

## 8. Multi-Dimensional Lifecycle Completion Receipt

Validates five orthogonal engineering dimensions before marking any goal complete.

| Dimension | Verification Gate | Evidence Artifact | Status |
|---|---|---|---|
| **D1: Conformance** | `goal-template-conformance-harness.mjs` | [51/51 sections verified] | PASS |
| **D2: Zero-Mock** | Article I Static AST Analysis | [0 stubs / 0 mocks] | PASS |
| **D3: Latency SLA** | Monotonic Timer Benchmark | [P99 < 1.0ms certified] | PASS |
| **D4: Causality** | Temporal Index Validator | [$t \le T$ strictly enforced] | PASS |
| **D5: Security** | Air-Gap Credential Sentry | [Zero live keys / localhost bound] | PASS |
