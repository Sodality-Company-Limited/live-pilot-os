# 🔄 Socratic Clarification State Machine: Goal G-CORE-007 Statistical Evidence & Benchmark Harness

> **Goal ID:** `G-CORE-007`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-CORE-007](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-CORE-007.md)  
> **Created At:** `2026-09-29T14:16:00+07:00`  
> **Updated At:** `2026-09-29T14:16:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Statistical Evidence Harness & Benchmark Governance)** -> Confirmed Option 1.1: Automated statistical evidence harness validating sample size bounds ($N \ge 30$), baseline vs treatment cohorts, Wilson score and non-parametric bootstrap intervals, and dataset split contamination detection for autonomous agents and ML pipelines.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: Rejection of sample counts $N < 30$, mandatory baseline comparison reference with distinct cohorts, Wilson 95% confidence intervals with continuity correction, non-parametric bootstrap interval calculations, zero training split evaluation, and deterministic exit code 0.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Machine-readable `statistical_claims` YAML block schema, exact-HEAD commit SHA, proof receipt binding, interval method verification, and programmatic split isolation validator.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Atomic validation of statistical claims, fail-closed termination on split contamination or unverified uncertainty methods, and immediate exit code 1 upon invariant violation.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Boundary guards rejecting training set evaluation, empty sample populations, negative sample sizes, and invalid confidence intervals outside $[0.0, 1.0]$.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Reusability)** -> Confirmed Option 6.1: Sub-50ms execution SLA per harness evaluation, 100% byte equivalence between root and `template/` copies, zero mocks, and zero stubs.

---

## 🏛️ Context & Problem Statement

Empirical benchmark claims and ML evaluation require sound statistical methodology rather than cherry-picked single runs:
1. **Underpowered Evaluations:** Without minimum sample size enforcement ($N \ge 30$), performance claims exhibit extreme variance and lack statistical power.
2. **Missing Baseline Comparisons:** Benchmarks that do not contrast candidate models against documented baselines cannot verify genuine improvement.
3. **Data Contamination:** Evaluating agents or models on training splits corrupts generalizability and violates core governance invariants.
4. **Uncertainty Quantification:** Point estimates without Wilson score or bootstrap confidence intervals hide critical distribution spread.
5. **Distribution Parity:** Governance rules, architecture specs, and harnesses must maintain 100% byte equivalence between root and `template/` distributions.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Statistical Evidence Harness & Benchmark Governance)
- [x] **Option 1.1: Automated Statistical Evidence & Benchmark Harness**
  - Implement sample size validation ($N \ge 30$) and baseline comparison verification in `scripts/harness/statistical-evidence-harness.mjs`.
  - Implement Wilson score confidence intervals and bootstrap resampling calculations in `scripts/lib/confidence-calibration.mjs` and `scripts/harness/statistical-evidence-harness.mjs`.
  - Implement dataset split contamination detection in `scripts/harness/statistical-evidence-harness.mjs`.
  - Codify statistical evidence architecture in `docs/03-architecture/statistical-evidence.md` and training rules in `.agents/rules/model-training-governance.md`.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Verification & Epistemic Demarcation Gate**
  - Reject statistical claims declaring sample sizes $N < 30$.
  - Enforce baseline comparison specifications and reject identical baseline/treatment cohorts.
  - Calculate Wilson 95% confidence intervals bounded in $[0.0, 1.0]$.
  - Compute non-parametric bootstrap resampling intervals.
  - Detect and reject training split evaluations and dataset split overlaps.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Exported Schema & Programmatic Claim Validation**
  - Validate machine-readable `statistical_claims` block in goal specifications and receipts.
  - Export `validateStatisticalClaims(content, filename)` returning `{ valid, claimCount, claims, errors, warnings }`.
  - Export `wilsonScoreInterval(successes, total, confidence)` and `bootstrapInterval(data, options)`.
  - Export `detectSplitContamination(splits)` for programmatic set intersection checks.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Fail-Closed Pipeline Integration**
  - Statistical evidence harness and CLI terminate with exit code 1 upon any underpowered claim, training split evaluation, or contamination.
  - Accumulate all claim errors in a single evaluation pass for actionable diagnostics.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Boundary Guards & Tamper Detection**
  - Detect and fail on modified source files whose working-tree SHA256 diverges from the receipt.
  - Explicitly reject invalid confidence bounds outside $[0.0, 1.0]$ and NaN values.
  - Reject pseudo-generalization claims presenting synthetic data as external evidence.

### Dimension 6: Codebase Grounding, Latency & Provenance
- [x] **Option 6.1: Sub-50ms Kernel SLA and Exact-HEAD Provenance**
  - Evaluation latency strictly bounded under 50ms on local CPU.
  - Exact-HEAD SHA256 physical provenance hashing across all touch map files.
  - 100% byte equivalence between root and `template/` distributions.
  - Zero mocks, zero stubs; 100% concrete compilable JavaScript (Node.js ESM).

---

## 🔒 Verification & Exit Gate
- Statistical evidence harness passes: `node scripts/harness/statistical-evidence-harness.mjs docs/07-backlog/goals/G-CORE-007.md`
- Assurance suite unit test 8 passes: `node scripts/harness/test-goal-assurance-suite.mjs`
- Wilson score interval unit test passes: `node -e "import('./scripts/lib/confidence-calibration.mjs').then(({ wilsonScoreInterval }) => { const ci = wilsonScoreInterval(95, 100); if (ci.low < 0.85 || ci.high > 1.0) process.exit(1); console.log('Wilson CI Verified:', ci); })"`
- Conformance harness passes: `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-007`
- Full test pass: `npm test && npm run test:template`
