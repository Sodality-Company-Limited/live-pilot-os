---
name: soda-scrutinize
version: "1.0.0"
description: >-
  Adversarial, outsider-perspective architectural audit and code review.
  Challenges intent, searches for simpler/zero-code solutions, traces full runtime call paths, and exposes hidden risks.
  Triggers: scrutinize, audit plan, second opinion, sanity check, review PR, challenge design, /scrutinize.
  Collaboration phase: PLAN -> REVIEW.
---

# Soda OS Scrutinize

An uncompromising, adversarial outsider audit for engineering designs, pull requests, and proposed architectural changes.

---

## 🏛️ The 4 Review Gates

```mermaid
graph TD
    S1["1. Question Intent & Scope<br>(Can this be solved with zero code?)"] --> S2["2. Full Call Graph Trace<br>(Trace beyond diff to real system seams)"]
    S2 --> S3["3. Verification & Failure Inversion<br>(What edge cases/inputs break this?)"]
    S3 --> S4["4. Actionable Severity Verdict<br>(Blocker / Major / Nit with concrete rationale)"]
```

### 1. Intent & Simpler Alternatives
Before reading the diff line-by-line, challenge the necessity of the entire change:
- Can this problem be avoided entirely (doing nothing)?
- Does an existing primitive in the codebase already satisfy 90% of the intent?
- Can this be solved at a simpler layer (declarative schema, configuration flag, build-time linter) instead of runtime application code?
- If a simpler path exists, state it immediately with architectural rationale.

### 2. Full Call-Path Trace (Beyond the Diff)
Bugs hide at the seams of unchanged code:
- Trace from incoming HTTP/gRPC transport boundary $\to$ middleware $\to$ domain entities $\to$ persistence $\to$ side effects.
- Audit assumptions about upstream state (nullability, concurrency, transaction isolation, clock skew).

### 3. Empirical Verification & Inversion
- Test claims with disproof: what inputs, network delays, or concurrent mutations cause silent data corruption or race conditions?
- Audit test coverage: do tests exercise real operational paths (Article I Zero-Mock) or do they mock the failure away?

### 4. Structured Finding Report
Report findings sorted strictly by severity:
- **Finding:** Specific statement citing `file:line`.
- **Consequence:** Concrete system impact (data leak, deadlock, memory blowup), not generic theory.
- **Evidence:** Reproducible input or trace step.
- **Recommendation:** Minimal, targeted correction.
- **Verdict:** `SHIP`, `FIX-THEN-SHIP`, `REWORK`, or `REJECT`.
