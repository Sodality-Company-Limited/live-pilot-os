# Proof and Evidence Governance Rule

> **Scope:** Mandatory across all Soda OS goals, tasks, algorithms, ML models, and agent architectures.  
> **Invariants:** Zero stubs, zero mocks, zero unsubstantiated claims.

---

## 1. Epistemic Evidence Levels

Every technical claim made in a goal card, PR, or architecture document MUST be explicitly tagged with its formal epistemic evidence level:

| Level | Classification | Definition | Verification Requirement |
|---|---|---|---|
| **L1** | `formal_proof` | Mathematical deduction or symbolic theorem proof (Coq, Lean, Z3, or verified deductive reduction). | Formal proof receipt or automated solver certificate with zero unstated lemmas. |
| **L2** | `executable_invariant` | Concrete algorithmic invariant verified over boundary conditions, inductive steps, or generative fuzzing. | Property-based test suite (`test-*.mjs`, `hypothesis`, `proptest`) with 100% assertion pass. |
| **L3** | `statistical_evidence` | Empirical benchmark, confidence interval, or hypothesis test over sample distributions. | Wilson score / Bootstrap 95% CI with explicit sample size $N \ge 30$, seed, and baseline. |
| **L4** | `production_evidence` | Live or canary runtime telemetry, traces, and operational error rates. | Immutable metrics export (Prometheus/OTel) over SLA window; zero synthetic stubs. |

---

## 2. Prohibitions & Hard Boundaries

1. **No Pseudo-Proofs / Anti-Pseudo-Proof Gate:** Executable unit or integration tests MUST NEVER be referred to as "formal proofs" or "theorems" (anti-pseudo-proof enforcement). They are classified as `executable_invariant` or empirical tests. Any receipt claiming pseudo-proof certification is rejected fail-closed.
2. **Mandatory Sample Bounds:** Any claim of model superiority, latency reduction, or accuracy gain without declared sample size $N$, variance, and confidence interval is invalid and blocks goal progression.
3. **Stale Evidence Invalidation:** Any proof receipt or benchmark artifact whose underlying source code SHA256 does not match the active git HEAD is marked stale and immediately blocks goal promotion.
4. **Zero-Mock Requirement:** Simulated returns, dummy constants, or fake test doubles cannot serve as evidence for external service readiness or algorithm correctness.

---

## 3. Machine-Readable Proof Receipt Contract

Any goal claiming `L1` or `L2` verification must produce a machine-readable proof receipt at:
`docs/07-backlog/evidence/<GOAL_ID>-proof-receipt.json`

Schema invariants:
```json
{
  "schema_version": 1,
  "goal_id": "G-CORE-006",
  "generated_at": "ISO-TIMESTAMP",
  "source_revision": "GIT-COMMIT-SHA",
  "classification": "executable_invariant",
  "invariants": [
    {
      "id": "INV-001",
      "statement": "Non-negativity and upper bound clamp [0.0, 1.0]",
      "verification_command": "node scripts/harness/property-tests/test-calibrated-loss.mjs",
      "exit_code": 0,
      "passed": true
    }
  ],
  "certification": "PASS"
}
```
Failure to provide a valid receipt validated by `scripts/harness/proof-receipt-validator.mjs` blocks transition to `verified` or `done`.

---

## 4. Language-Adaptive Formal Verification Frameworks & Tooling

Formal verification MUST be implemented using the appropriate mathematical, model checking, or symbolic reasoning framework native to the language and platform runtime of the target codebase:

| Language / Platform | Verification Domain | Primary Engine / Toolchain | Target Safety & Correctness Invariants |
|---|---|---|---|
| **Rust** | Bounded Model Checking (BMC) | **Kani** (`cargo-kani`) | Absence of unhandled panics, unwrap on `None`/`Err`, arithmetic underflow/overflow, division-by-zero, out-of-bounds slicing, and custom `kani::assert!` / `kani::assume!` proof harnesses. |
| **Rust** | Deductive Verification | **Prusti** / **Creusot** | Functional contract verification over Hoare triples (`pre`/`post`/`invariant`), memory ownership specifications via Why3/Viper. |
| **Rust** | Generative Property Testing | **proptest** / **quickcheck** | Combinatorial state-space search, shrinkable counterexamples, algebraic conservation laws across $\ge 10,000$ randomized runs. |
| **Rust** | Memory Safety & UB Verification | **Miri** (`cargo miri test`) | Strict verification of Stacked Borrows, aliasing invariants, pointer arithmetic validity, uninitialized memory reads, and data race freedom. |
| **Python** | Symbolic Execution & Contract Checking | **CrossHair** (Z3 SMT engine) | SMT-backed symbolic path exploration proving PEP-316 contracts, type contracts, and absence of `IndexError`, `KeyError`, or integer overflow under all possible inputs. |
| **Python** | Design by Contract | **Deal** | Runtime and static verification of function pre-conditions, post-conditions, and class invariants. |
| **Python** | Property-Based Invariant Fuzzing | **Hypothesis** | Stateful model-based testing, generative invariant exploration, and automatic minimal failing example shrinking. |
| **TypeScript / Node.js** | Property-Based Fuzzing | **fast-check** | Arbitrary value generation, metamorphic testing, and empirical verification of algebraic and idempotent properties. |
| **TypeScript / Node.js** | SMT Constraint Solving | **z3-solver** (Z3 WebAssembly/C++ bindings) | Formal automated reasoning over Quantifier-Free Linear Integer Arithmetic (QF_LIA), balance conservation, and fee distribution constraints. |
| **Go** | Property Testing & Fuzzing | **Gopter** / Built-in `go test -fuzz` | Generative mutation testing and boundary invariant exploration. |
| **Go** | Static Pointer & Nil Analysis | **nilaway** | Static analysis mathematically proving absence of nil-pointer dereference panics. |
| **C / C++** | Bounded Model Checking | **CBMC** (C Bounded Model Checker) | Bit-precise SAT/SMT bounded model checking for buffer overflows, memory leaks, and pointer safety. |
| **Smart Contracts (Solidity)** | Symbolic Verification & Formal Proving | **Certora Prover** / **Halmos** | Mathematical proof of state transitions, reentrancy freedom, solvency conservation, and automated theorem proving. |
| **Distributed Protocols (Agnostic)** | Temporal Logic Model Checking | **TLA+ / TLC** / **Alloy** | Linear Temporal Logic (LTL) safety ($\square \text{Safe}$) and liveness ($\Diamond \text{Terminal}$) verification for consensus, split-brain mitigation, and leader elections. |

---

## 5. Mathematical Proof Governance & Mathematical Harness Invariant (Autonomous Zero-HITL Execution)

When autonomous multi-agent systems operate without human-in-the-loop blocking, system safety CANNOT rely on heuristic confidence or example-based unit tests alone. Mathematical proof and executable mathematical harnesses are mandatory invariants:

1. **Epistemic Floor for Autonomy:** Autonomous goal promotion to `approved` and `done` requires at least **L2 (Executable Invariant)** or **L1 (Formal Proof)** evidence. Goals asserting core business logic or financial calculations with only L3 or unverified claims are blocked fail-closed.
2. **Mathematical Verification Harness Requirements:**
   - **Monotonicity & Bounds:** Every numerical series and rating scale must pass `verifyMonotonicity` and `evaluateOperationalEnvelope` via `scripts/lib/mathematical-proof-engine.mjs`.
   - **Wilson Score Calibration:** Statistical claims must include two-tailed Wilson score intervals with $\ge 95\%$ confidence bounds.
   - **Autonomy Calibration:** DAVE autonomy routing requires calibrated probabilities ($ECE \le 0.05$, Brier score $\le 0.15$).
   - **Exact Multi-Currency Integer Conservation:** Financial splits, commissions, tax allocations, and quota distributions must be verified using universal ISO 4217 minor-unit integer arithmetic (`Money`) with exact conservation proofs ($\sum \text{splits} \equiv \text{total}$), Fowler's remainder allocation, and per-currency double-entry ledger balancing.
   - **AST Mutation Verification:** Mathematical test oracles must achieve $\ge 85\%$ kill score under AST mutation testing (`scripts/harness/mutation-testing-harness.mjs`).
3. **Receipt Validation & Physical Hash Binding:**
   The goal's cryptographic proof receipt (`docs/07-backlog/evidence/<GOAL_ID>-proof-receipt.json`) MUST be verified by `scripts/harness/proof-receipt-validator.mjs`. The receipt must match the exact physical SHA-256 byte hashes of all touched source files and the active git commit revision. Any byte drift triggers status `STALE` and blocks deployment.


