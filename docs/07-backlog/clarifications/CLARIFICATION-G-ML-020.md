# Clarification & Epistemic Alignment: G-ML-020

**Goal ID:** `G-ML-020`  
**Title:** CI Calibration Gate and Quality Policy Enforcement  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Actor:** CI/CD Automation Engineer / Release Quality Gatekeeper  

---

## 1. 6-Domain Blueprint Alignment

### Domain 1: Target Persona & Scope
- **Actor:** Soda OS CI Pipeline, GitHub Actions runner, Release Gatekeeper, and Developer Agent Verification Harness.
- **Scope:** Automated CI test harness and workflow gate blocking pull requests, commits, or goal releases if calibration metrics or routing accuracy breach established SLAs.
- **Boundaries:** Zero mock scripts; real evaluation over physical calibration datasets or reports, enforcing exit code 0 on compliance and exit code 1 on SLA breaches or invalid policies.

### Domain 2: Calibration SLAs & Quantitative Metric Thresholds
- **Expected Calibration Error (ECE) Ceiling:**
  $$\text{ECE} \le 0.0400$$
  Fails build (exit code 1) if ECE $> 0.0400$.
- **Brier Score Ceiling:**
  $$\text{BS} \le 0.0800$$
  Fails build (exit code 1) if Brier score $> 0.0800$.
- **High-Confidence Error Rate (HCER) Ceiling:**
  $$\text{HCER} \le 0.0100 \quad (1.0\%)$$
  Fails build (exit code 1) if $\text{HCER} > 0.0100$ on decisions with $c \ge 0.80$.

### Domain 3: Autonomous Routing Policy & Safety SLA
- **Invariant:** An unverified high-risk decision must NEVER result in `proceed`.
- **Truth Table Verification:**
  - `(risk: high, evidence: unverified, confidence: high)` $\to$ `defer`
  - `(risk: high, evidence: unverified, confidence: low)` $\to$ `defer`
  - `(risk: high, evidence: verified, confidence: high)` $\to$ `human_review`
  - `(risk: high, evidence: verified, confidence: low)` $\to$ `defer`
- Fails build (exit code 1) if any decision record violates this security invariant.

### Domain 4: CLI Interface & Exit Code Contracts
- **Command:** `node scripts/ci/ci-calibration-gate.mjs [options]`
- **Flags:**
  - `--help` / `-h`: Displays usage, flags, and SLA limits; exits 0.
  - `--artifact <path>` / `-a <path>`: Specifies evaluation report or dataset JSON/JSONL path.
  - `--strict`: Treats warnings as errors.
  - `--report <path>` / `-r <path>`: Writes machine-readable gate result summary JSON.
- **Exit Codes:**
  - `0`: All SLA metrics satisfied, routing rules valid, zero invariant breaches.
  - `1`: One or more SLA thresholds breached, invalid routing detected, or runtime exception.

### Domain 5: Fail-Closed Input Invariants & Error Handling
- Missing artifact files trigger exit code 1 with descriptive error message.
- Malformed JSON/JSONL syntax triggers exit code 1 without uncaught stack dumps.
- Non-finite (NaN, Infinity) or missing mandatory SLA metrics trigger fail-closed exit 1.
- Incomplete datasets or zero-length observations trigger fail-closed rejection.

### Domain 6: Template Parity & Workflow Integration
- 100% operational implementation mirrored between:
  - `scripts/ci/ci-calibration-gate.mjs` $\leftrightarrow$ `template/scripts/ci/ci-calibration-gate.mjs`
  - `.github/workflows/calibration-gate.yml` $\leftrightarrow$ `template/.github/workflows/calibration-gate.yml`
- Zero drift verified via `diff -u`.

---

## 2. Fact vs. Assumption Audit
- `[OBSERVED_FACT]` `G-ML-016` (Dynamic Routing State Machine) and `G-ML-019` (Calibration Metric Ingestion) are completed and verified green.
- `[OBSERVED_FACT]` `agent-observability-harness.mjs` declares SLA ceilings, but no dedicated CI gate CLI script exists in `scripts/ci/`.
- `[UNDETERMINED_DYNAMICS]` CLI input can accept either pre-computed evaluation reports or raw decision stream files.
- `[RECOMMENDED_RESOLUTION]` Support both: allow passing pre-computed calibration reports or computing metrics directly from raw decision records/fixtures.

---

## 3. Epistemic Confirmation
- **Status:** Complete, unambiguous, fully specified. Ready for Red-Green-Refactor implementation.
