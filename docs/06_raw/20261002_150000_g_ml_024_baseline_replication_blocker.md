# Baseline Replication Blocker: BLOCKER-ML-024-01

**Goal ID:** `G-ML-024`  
**Title:** Operational Runbook and Documentation Suite  
**Blocker ID:** `BLOCKER-ML-024-01`  
**Classification:** Missing Documentation, Architecture ADR, Operator Runbook, and Verification Suite  
**Discovered At:** 2026-10-02T15:00:00+07:00  
**Resolved At:** 2026-10-02T15:10:00+07:00  
**Impact:** High — Downstream operators, engineers, and autonomous agents lack authoritative architectural references, formal decision records, and operational incident response troubleshooting trees for cognitive calibration.

---

## 1. Blocker Description & Root Cause

### Symptoms
1. `docs/03-architecture/confidence-aware-execution.md` is completely absent from the repository. While cognitive calibration capabilities were implemented across G-ML-001 through G-ML-023, there is no single architectural reference documenting the end-to-end mathematical formulations ($\mathcal{L}_{\text{RLCD}}$, $\text{ECE}$, $\text{BS}$, $\text{HCER}$), dual-head topologies, or 4-way routing state machine truth tables.
2. `docs/05-decisions/ADR-004-calibrated-confidence-routing.md` is absent from `docs/05-decisions/`. The architectural rationale, trade-offs, and invariants behind calibrated confidence routing, asymmetric false-accept penalties, and circuit breaker fallbacks were never recorded in a formal ADR.
3. `docs/06-workflows/confidence-aware-execution.md` (and its template mirror) consists of only a 25-line high-level sketch lacking actionable operator troubleshooting trees, CLI diagnostic playbooks, and drift remediation instructions.
4. No automated verification suite exists in `tests/unit/` to validate documentation completeness, mathematical formula presence, ADR structure, and markdown link integrity.

---

## 2. Replication Command & Evidence

```bash
# Verify missing documentation files
test -f docs/03-architecture/confidence-aware-execution.md || echo "MISSING_ARCHITECTURE_DOC"
test -f docs/05-decisions/ADR-004-calibrated-confidence-routing.md || echo "MISSING_ADR_004"
test -f tests/unit/test-operational-runbook.mjs || echo "MISSING_DOC_TEST_SUITE"
```

Output:
```text
MISSING_ARCHITECTURE_DOC
MISSING_ADR_004
MISSING_DOC_TEST_SUITE
```

---

## 3. Corrective Action Plan

1. **Comprehensive Architecture Documentation:** Author `docs/03-architecture/confidence-aware-execution.md` containing complete mathematical derivations for RLCD loss, 10-bin Expected Calibration Error, quadratic Brier score, High-Confidence Error Rate, and the canonical 8-case routing truth table.
2. **Architectural Decision Record ADR-004:** Author `docs/05-decisions/ADR-004-calibrated-confidence-routing.md` with standard sections (Context, Decision, Consequences, Alternatives Considered) formalizing calibrated routing and circuit breaker policies.
3. **Operator Runbook & Troubleshooting Trees:** Author actionable playbooks in `docs/06-workflows/confidence-aware-execution.md` and `template/docs/06-workflows/confidence-aware-execution.md` covering CI calibration gate breaches, distribution drift alerts, circuit breaker trips, and ledger audits.
4. **Automated Verification Suite:** Implement `tests/unit/test-operational-runbook.mjs` (and template mirror) to verify 100% of mathematical formulas, ADR structure, runbook procedures, and link integrity with zero mocks.
