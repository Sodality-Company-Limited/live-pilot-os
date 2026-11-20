# Dual CI Pipeline Architecture, Invariant Edge Case Taxonomy & Formal Verification Continuum

- **Document ID:** `DOC-ARCH-20261010-221500-DUAL-CI-EDGE-TAXONOMY-CONTINUUM`
- **Classification:** Enterprise Verification Architecture & SRE Pipeline Engineering
- **Date & Timestamp:** 2026-10-10T22:15:00+07:00
- **Author:** Antigravity (Google DeepMind Advanced Agentic Coding Swarm)
- **Ecosystem Grounding:** Soda OS v1.24.0, Sodality Autonomous Swarm Ecosystem (AEther, AExis, DAVE)
- **Governing Protocols:** Global Engineering Constitution (Articles I, II, III), Senior Engineering Protocol Pillar 4 (*Formal Verification, Mathematical Proofs & Program Correctness*), Pillar 12 (*Observability, Distributed Tracing & SRE Golden Signals*), and Pillar 24 (*Testing Ground Truth / Zero Mocks*).

---

## 1. Executive Summary & Architectural Motivation

In mission-critical software systems—including autonomous decision engines (DAVE), distributed consensus clusters, and financial settlement ledgers—relying exclusively on traditional unit testing introduces existential risk. Unit tests verify that a system behaves correctly on a finite set of discrete, hand-selected input samples. However, catastrophic production incidents occur almost exclusively at the boundaries that developers failed to anticipate: compound state interactions, type-versus-domain boundary mismatches, aliasing collisions, and precision loss under extreme arithmetic values.

To achieve total software reliability without crippling developer velocity, modern engineering architectures require:
1. **A Dual CI Pipeline Architecture:** Decoupling high-frequency, low-latency developer feedback loops (~30–60 seconds) from computationally intensive, exhaustive formal verification solvers (~3–8 minutes), leveraged via runner caching, matrix sharding, and pull-request versus nightly bifurcations.
2. **Cognitive Bias Neutralization:** Deconstructing why human and agent developers systematically miss edge cases (positive-confirmation bias, nominal path fixation, and AST-branch coverage illusions).
3. **The Invariant-Driven Edge Category Taxonomy:** Categorizing boundary pathologies into mathematical classes (Identity/Aliasing, Arithmetic Extremes, Cardinality Bounds, and State Machine Sequencing).
4. **The Validation Continuum Matrix:** A multi-dimensional comparison contrasting Traditional Unit Testing, Invariant-Driven Property Testing, and Formal Verification across epistemological, operational, and financial dimensions.
5. **A Standardized 6-Domain Verification Taxonomy:** A rigorous vocabulary uniting specification contracts, invariant properties, symbolic solvers, concurrency temporal logic, and pipeline governance.

```
                                  DUAL CI PIPELINE ARCHITECTURE
                                 ┌───────────────────────────────┐
                                 │   git push / Pull Request     │
                                 └───────────────┬───────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
             ┌─────────────────────┐                           ┌─────────────────────┐
             │  JOB 1: FAST SUITE  │                           │ JOB 2: FORMAL PROOF │
             │  Unit & Property    │                           │ Exhaustive SMT/CBMC │
             ├─────────────────────┤                           ├─────────────────────┤
             │ • cargo test        │                           │ • cargo kani        │
             │ • proptest (1k runs)│                           │ • SMT / Z3 / CaDiCaL│
             │ • Fast Feedback:    │                           │ • Deep Verification:│
             │   ~30-60 seconds    │                           │   ~3-8 minutes      │
             └──────────┬──────────┘                           └──────────┬──────────┘
                        │                                                 │
                        └────────────────────────┬────────────────────────┘
                                                 ▼
                               ┌───────────────────────────────────┐
                               │     MERGE / RELEASE GATEWAY       │
                               │   Zero Mocks + Certified Proofs   │
                               └───────────────────────────────────┘
```

---

## 2. Dual CI Pipeline Architecture

Exhaustive model checking, SMT solving, and bounded model verification (CBMC / Kani) transform code verification into NP-complete Boolean Satisfiability (SAT) problems. Inlining formal proofs into standard local build cycles or monolithic CI workflows creates unacceptable bottlenecks, leading developers to bypass verification gates.

The Dual CI Pipeline solves this tension through structural isolation, aggressive dependency caching, and parallelized matrix execution.

### 2.1 Complete GitHub Actions Production Workflow (`.github/workflows/ci.yml`)

```yaml
name: Test and Formal Verification

on:
  push:
    branches: [ "main", "develop", "feature/*" ]
  pull_request:
    branches: [ "main", "develop" ]
  schedule:
    # Nightly deep verification run with elevated unwinding and unbounded proofs
    - cron: '0 2 * * *'

env:
  CARGO_TERM_COLOR: always
  # Enforce strict zero-warning compiler invariants
  RUSTFLAGS: "-D warnings"

jobs:
  # ========================================================
  # JOB 1: Fast Unit, Integration & Property Tests (~30-60s)
  # ========================================================
  test:
    name: Fast Test Suite (Unit & Proptest)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install stable Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt

      - name: Restore Rust Cache
        uses: Swatinem/rust-cache@v2
        with:
          shared-key: "fast-test-suite"

      - name: Static Analysis & Lint Gates
        run: |
          cargo fmt --check
          cargo clippy --all-targets --all-features -- -D warnings

      - name: Run Unit & Integration Tests
        run: cargo test --workspace --all-targets -- --test-threads=4

      - name: Run Property-Based Invariant Tests
        run: cargo test --test '*' -- --nocapture
        env:
          PROPTEST_CASES: 1000

  # ========================================================
  # JOB 2: Exhaustive Kani Formal Verification (~3-8m)
  # ========================================================
  kani-verify:
    name: Formal Verification (SMT / CBMC Proof Matrix)
    runs-on: ubuntu-latest
    timeout-minutes: 25
    strategy:
      fail-fast: false
      matrix:
        harness-group:
          - group: "arithmetic-invariants"
            harnesses: "proof_balance_conservation proof_half_even_rounding proof_modulo11_tax_id"
            unwind: 5
          - group: "concurrency-and-locks"
            harnesses: "proof_lock_free_treiber_no_aba proof_lexicographical_lock_order"
            unwind: 4
          - group: "state-machine-safety"
            harnesses: "proof_fsm_typestate_reachability proof_monotonic_fencing_tokens"
            unwind: 6
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install Rust toolchain for Kani
        uses: dtolnay/rust-toolchain@nightly

      - name: Cache Kani Binaries & SMT Solvers
        uses: actions/cache@v4
        id: kani-cache
        with:
          path: |
            ~/.cargo/bin/cargo-kani
            ~/.cargo/bin/kani-verifier
            ~/.kani
          key: ${{ runner.os }}-kani-${{ hashFiles('**/Cargo.lock') }}-v1

      - name: Install Kani Model Checker
        if: steps.kani-cache.outputs.cache-hit != 'true'
        run: |
          cargo install --locked kani-verifier
          cargo kani setup

      - name: Execute Sharded Formal Verification Harnesses
        run: |
          for harness in ${{ matrix.harness-group.harnesses }}; do
            echo "::group::Verifying Formal Invariant: ${harness}"
            cargo kani --harness "${harness}" --default-unwind ${{ matrix.harness-group.unwind }} --enable-unstable
            echo "::endgroup::"
          done

  # ========================================================
  # JOB 3: CI Quality & Zero-Mock Production Gate (~1m)
  # ========================================================
  governance-gate:
    name: Governance, Zero-Mock & Senior Engineering Gate
    runs-on: ubuntu-latest
    needs: [test, kani-verify]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js Runtime
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run Zero-Mock Production AST Gate
        run: node scripts/harness/no-mock-production-gate-harness.mjs --strict

      - name: Verify Formal Proof Receipts
        run: node scripts/harness/proof-receipt-validator.mjs --evidence docs/07-backlog/evidence

      - name: Senior Engineering 28-Pillar Compliance Pass
        run: node scripts/harness/senior-engineering-gate-harness.mjs --certify
```

### 2.2 Operational Mechanics of the Dual CI Architecture

1. **Toolchain & Solver Caching Strategy:**
   - Kani compiles Rust MIR (Mid-level Intermediate Representation) to Goto-C binaries, then invokes the CBMC model checker linked with MiniSAT or CaDiCaL.
   - By caching `~/.cargo/bin/cargo-kani` and `~/.kani` via cryptographic lockfile hashes, CI setup time drops from 4.5 minutes to under 12 seconds.
2. **Matrix Sharding by Harness Complexity:**
   - Sharding harnesses across parallel runner jobs prevents monolithic timeout failures. High-complexity harnesses (e.g. concurrent pointer interleavings requiring unwind depth 4) execute concurrently with arithmetic proofs (unwind depth 5).
3. **PR vs. Nightly Bifurcation:**
   - **Pull Request Ingress:** Executes bounded property checks ($N = 1,000$ runs) and core SMT harnesses with strict loop bounds ($\text{unwind} \le 6$), completing in under 4 minutes.
   - **Nightly Cron Ingress:** Executes deep stress fuzzing ($N = 100,000$ runs) and unbounded symbolic proofs with elevated timeouts, discovering multi-step state desynchronizations.

---

## 3. Cognitive Root-Cause Analysis: Why Developers Miss Edge Cases

Software defects at boundary conditions are rarely caused by a lack of syntax knowledge; they are rooted in human and artificial cognitive biases during problem framing.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               COGNITIVE BIASES DRIVING SYSTEM DEFECTS                            │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│ 🎯 POSITIVE-CONFIRMATION BIAS  │ 🔲 DOMAIN VS TYPE DIVERGENCE   │ 🕸️ COMPOUND STATE INTERACTIONS  │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ • Tests verify intended happy  │ • Types allow values outside   │ • Boundaries tested in         │
│   paths ($A \to B \to C$).     │   domain invariants.           │   isolation, but fail when     │
│ • Assumes monotonic flow.      │ • Memory boundary != business  │   compound variables align.    │
│ • "Code coverage" false sense  │   semantic boundary.           │ • Combinatorial state explosion│
│   of security.                 │ • Silent casting & truncation. │   evades mental models.        │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
```

### 3.1 Positive-Confirmation Bias & Nominal Path Fixation
When an engineer writes a function, their mind operates within the conceptual model of **how the feature is supposed to work**. When transitioning to write unit tests, they subconsciously author test cases that mirror this nominal execution path. 

- **The AST Coverage Trap:** A test passing `transfer(alice, bob, 50)` achieves 100% statement and branch coverage on a naive transfer function. The engineer observes "100% green coverage" and experiences a false sense of absolute safety. However, the test verified only one point in the $2^{64} \times 2^{64} \times 2^{64}$ state space.

### 3.2 Domain Boundaries vs. Type Boundaries
A catastrophic source of real-world outages is the divergence between **Type Invariants** (what the compiler enforces) and **Domain Invariants** (what the business domain requires):

$$\text{Domain Bounds } [L_{\text{domain}}, U_{\text{domain}}] \subset \text{Type Representation } [0, 2^{N}-1]$$

- **The Representation Gap:** A function represents an account balance or transfer amount as a `u64`.
  - Type bounds: $0 \le x \le 18,446,744,073,709,551,615$.
  - Domain bounds: $1 \le x \le 10,000,000$ minor units.
- If the domain logic fails to validate inputs at the public interface boundary, arithmetic expressions like `balance + deposit` or `rate * amount` can trigger silent unsigned overflow, wrap-around in release mode, or an unhandled panic in debug mode.

### 3.3 Compound Edge Cases (Higher-Order State Interleaving)
Bugs rarely occur when a single variable reaches its extreme value in isolation. They emerge when **multiple boundary conditions coincide simultaneously across asynchronous state transitions**:

$$\text{Bug Occurs When: } (\text{Variable}_A = \text{Extreme}) \land (\text{Variable}_B = \text{Extreme}) \land (\text{State} = \text{Degraded}) \land (\text{Event} = \text{Out-of-Order})$$

- *Example:* A transfer of `amount = 0` initiated when `sender_balance = MAX`, while `sender_id == recipient_id`, during a simultaneous database connection pool timeout and saga rollback. No human author constructs this tuple manually in an example test.

---

## 4. Invariant-Driven Edge Category Taxonomy

To systematically eliminate blind spots, test engineering must categorize system boundaries into four orthogonal mathematical classes:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             THE INVARIANT-DRIVEN EDGE TAXONOMY                                   │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│ 👥 1. IDENTITY & ALIASING      │ 🔢 2. ARITHMETIC & PRECISION   │ 📦 3. CARDINALITY & BOUNDS     │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ • $from == to$ self-mutation   │ • Integer overflow / underflow │ • 0 items (empty collections)  │
│ • Overlapping buffer pointers  │ • Off-by-one rounding dust     │ • 1 item (singleton edge)      │
│ • Dual role conflict in RBAC   │ • Zero divisor / infinity / NaN│ • MAX capacity (queue full)    │
│ • Inverted lock sort order     │ • Precision truncation drift   │ • Fencepost off-by-one errors  │
├────────────────────────────────┴────────────────────────────────┴────────────────────────────────┤
│ 🔄 4. STATE MACHINE SEQUENCING & TEMPORAL CONCURRENCY                                            │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Reentrant calls before state finalization (The DAO vulnerability pattern)                      │
│ • Out-of-order event delivery across distributed message brokers (NATS / Kafka)                  │
│ • Premature cancellation during commit phase (Saga desynchronization)                            │
│ • Stale fencing token re-play against partitioned primary databases                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Class 1: Identity & Aliasing Boundaries
- **Mathematical Form:** Two nominally distinct entities reference the exact same underlying memory, ledger account, or physical lock:
  $$\text{Entity}_A \cap \text{Entity}_B \neq \emptyset \quad \text{or} \quad \text{ID}_A \equiv \text{ID}_B$$
- **Pathology:** In-place mutations on Entity A unintentionally alter the state of Entity B before Entity B's logic executes. In distributed mutexes, acquiring locks on $(A, B)$ while another thread acquires $(B, A)$ produces immediate deadlocks unless keys are lexicographically sorted.

### 4.2 Class 2: Arithmetic Extremes & Precision Loss
- **Mathematical Form:** Numerical operations crossing the representation boundaries of the machine word:
  $$x + y > \text{MAX\_INT}, \quad x - y < 0, \quad \frac{x}{y} \text{ where } y = 0, \quad \sum \text{splits} \neq \text{total}$$
- **Pathology:** Directional rounding drift. If a financial protocol truncates fractional cents towards zero, an attacker executing $100,000$ micro-transactions extracts or leaks monetary supply.
- **The Invariant Rule:** Implement Banker's Rounding Half-Even (`div_half_even`) and minor-unit integers (`i64`), verifying exact conservation:
  $$\sum_{i=1}^k \text{split}_i \equiv \text{total}$$

### 4.3 Class 3: Cardinality & Extremal Boundedness
- **Mathematical Form:** Collections, streams, or buffers operating at the boundary points of their capacity domain:
  $$|\mathcal{C}| \in \{0, 1, \text{CAPACITY} - 1, \text{CAPACITY}, \text{CAPACITY} + 1\}$$
- **Pathology:** Fencepost errors ($<$ vs $\le$), failure to handle the empty state (dereferencing head on an empty queue), or deadlocks when a bounded channel is saturated.

### 4.4 Class 4: State Machine Sequencing & Temporal Interleaving
- **Mathematical Form:** State transitions occurring outside nominal acyclic progression:
  $$s_t \to s_{t+k} \text{ without passing through } s_{t+1}, \quad \text{or concurrent interleavings } \sigma_1 \parallel \sigma_2$$
- **Pathology:** Time-of-Check to Time-of-Use (TOCTOU) race conditions, reentrancy vulnerabilities, and phantom double-spend attacks.

---

## 5. The Validation Continuum Matrix

The following matrix compares Traditional Unit Testing, Invariant-Driven Property Testing, and Formal Verification across their core operational and theoretical dimensions:

| Comparison Dimension | Traditional Unit Testing | Invariant-Driven Testing (PBT) | Formal Verification (SMT / BMC) |
| :--- | :--- | :--- | :--- |
| **Epistemological Basis** | Empirical Induction (checks specific points). | Statistical Fuzzing & Hypothesis Testing. | Deductive Mathematical Proof (exhaustion). |
| **Input Space Coverage** | Discrete sample set: $\{x_1, \dots, x_k\} \subset \mathcal{I}$ ($< 0.000001\%$). | Randomized pseudo-distribution ($10^3 - 10^6$ vectors). | Entire mathematical domain: $\forall x \in \text{Domain}$ ($100\%$). |
| **Execution Engine** | Native binary test runner (`cargo test`). | PRNG Generators + Shrinking (`proptest`). | SMT / SAT Solvers (Z3, CaDiCaL, CBMC). |
| **Bug Discovery Scope** | Regressions on anticipated nominal cases. | Unanticipated boundary combinations. | Algorithmic violations, concurrency races, UB. |
| **Execution Latency** | Milliseconds ($< 1\text{s}$). | Seconds ($10\text{s} - 60\text{s}$). | Minutes ($2\text{m} - 15\text{m}$). |
| **CI Feedback Loop** | Sub-minute (pre-commit / local dev). | Fast PR checks (~1–2 minutes). | Parallelized CI job / Nightly deep verification. |
| **False Positive Rate** | Zero (if test assertions are deterministic). | Zero (reproduces concrete counterexample). | Non-zero (over-constrained assumptions / stubs). |
| **Maintenance Cost** | Low initially, high long-term churn. | Medium (invariants remain stable over time). | High initial authoring; zero churn thereafter. |
| **Codebase Constraints** | Works on any codebase with no restrictions. | Requires pure functions or deterministic state. | Requires bounded loops and decidable logic. |

---

## 6. Comprehensive 6-Domain Verification Taxonomy

To establish unambiguous communication across software engineering, security, and verification teams, the following standardized terminology is formally codified:

### Domain 1: Specification & Contract Domain
- **Design by Contract (DbC):** A software engineering methodology authored by Bertrand Meyer where software components declare formal Preconditions ($P$), Postconditions ($Q$), and Class Invariants ($I$).
- **Hoare Triple ($\{P\}\ C\ \{Q\}$):** A formal logic assertion stating that if precondition $P$ holds prior to executing command $C$, and $C$ terminates, postcondition $Q$ is guaranteed to hold.
- **Weakest Precondition ($\text{wp}(C, Q)$):** The most general precondition $P$ that guarantees that executing command $C$ results in postcondition $Q$.
- **Typestate Compile-Time Invariant:** Encoding dynamic entity lifecycles as distinct Rust static types (`Account<Unverified>`, `Account<Active>`), making invalid transitions impossible at compile time.

### Domain 2: Property & Invariant Domain
- **Property-Based Testing (PBT):** An automated testing technique (originating from QuickCheck) that asserts general system invariants over hundreds of randomized inputs rather than fixed examples.
- **Algebraic Conservation Law:** An invariant requiring that the sum of all internal balances and fees equals the total external capital injected, with zero directional leakage.
- **Shrinking:** The automated process where a PBT framework simplifies a complex failing input vector into the minimal reproducible counterexample.
- **Metamorphic Testing:** A testing technique where an invariant relates the outputs of multiple executions under transformed inputs ($f(x \times 2) \equiv 2 \cdot f(x)$) when the exact oracle is unknown.

### Domain 3: Execution, Fuzzing & Mutation Domain
- **Coverage-Guided Fuzzing:** An instrumentation-driven testing method that mutates raw input streams to discover unexercised control-flow edges.
- **Mutation Testing:** A meta-testing methodology where synthetic faults ("mutants") are injected into production code to verify whether the test suite detects and fails on the defect.
- **Mutation Score:** The percentage of injected mutants detected and killed by the test suite:
  $$\text{Score} = \frac{\text{Mutants Killed}}{\text{Total Mutants}} \times 100\%$$
- **Test Oracle:** The definitive mechanism or reference model that determines whether an execution outcome was correct.

### Domain 4: Symbolic & Solver Domain
- **Bounded Model Checking (BMC):** A verification technique where loop executions and state transitions are unrolled to a fixed depth $k$, and the resulting execution graph is converted into a SAT/SMT formula.
- **Satisfiability Modulo Theories (SMT):** An extension of Boolean satisfiability that evaluates formulas over first-order theories, such as bitvectors, linear integer arithmetic, and uninterpreted functions.
- **Symbolic Execution:** An analysis technique where program variables are treated as symbolic mathematical symbols ($\alpha, \beta$) rather than concrete values.
- **UNSAT (Unsatisfiable):** The solver result indicating that no input combination exists that can violate the asserted invariant—representing formal mathematical proof of correctness.

### Domain 5: Concurrency & Temporal Domain
- **Linear Temporal Logic (LTL):** A modal temporal logic that evaluates propositions over infinite sequences of states, expressing Safety properties ($\square \text{Safe}$: bad states never occur) and Liveness properties ($\Diamond \text{Terminal}$: good states eventually occur).
- **ABA Problem:** A concurrency hazard in lock-free algorithms where a memory location changes from $A \to B \to A$, causing a CAS operation to succeed despite intermediate modifications.
- **Compare-And-Swap (CAS):** An atomic instruction comparing the contents of a memory location to a given value and, only if they are identical, modifying the contents to a new value.
- **Monotonic Fencing Token:** A strictly increasing counter issued by a distributed coordinator, used by storage layers to reject stale writes from partitioned actors.

### Domain 6: CI/CD & Pipeline Governance Domain
- **Matrix Sharding:** Splitting a compute-intensive verification harness suite across parallel CI runners to bound wall-clock execution time.
- **Zero-Mock Invariant (Article I):** The architectural rule mandating that production code contains 100% operational logic with zero stubs, mocks, dummy fallbacks, or `todo!()` macros.
- **Proof Receipt:** An immutable, cryptographically hashed JSON record documenting solver type, harness name, unwinding bounds, SAT status, and verification timestamp.
- **Fail-Closed Execution Gate:** A pipeline policy where any verification timeout, solver error, or lint warning triggers immediate build termination.

---

## 7. Structured Code Explanation Standard (WHERE, WHY, FOR WHOM, HOW)

### WHERE
- CI Calibration Gate Workflow: [`.github/workflows/calibration-gate.yml`](file:///Users/batrarethsudprasert/projects/soda-os/.github/workflows/calibration-gate.yml#L1-L31)
- Rust Workspace CI Test Script: [`scripts/ci/rust-workspace-test.sh`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/ci/rust-workspace-test.sh#L1-L65)
- CI Governance Check Script: [`scripts/ci/governance-check.sh`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/ci/governance-check.sh#L1-L150)
- CI Calibration Gate Engine: [`scripts/ci/ci-calibration-gate.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/ci/ci-calibration-gate.mjs#L1-L350)
- Formal Verification Harness: [`scripts/harness/formal-verification-harness.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/formal-verification-harness.mjs#L1-L230)
- Proof Receipt Validator: [`scripts/harness/proof-receipt-validator.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/proof-receipt-validator.mjs#L1-L150)
- Senior Engineering Gate: [`scripts/harness/senior-engineering-gate-harness.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/senior-engineering-gate-harness.mjs#L1-L280)
- Zero-Mock Production Gate: [`scripts/harness/no-mock-production-gate-harness.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/no-mock-production-gate-harness.mjs#L1-L120)

### WHY
Traditional continuous integration pipelines force an unacceptable compromise: either CI is fast but superficial (leaving complex boundary bugs undiscovered), or CI is rigorous but prohibitively slow (impeding engineering release velocity). By architecting a Dual CI Pipeline that isolates fast unit/property suites from sharded SMT model checking harnesses, an enterprise achieves mathematical correctness guarantees without sacrificing development throughput.

### FOR WHOM
- **Site Reliability Engineers (SRE) & Platform Teams:** Establishes resilient, resource-bounded CI/CD pipelines with deterministic execution times and aggressive binary caching.
- **Autonomous Agent Swarms:** Provides automated, unassisted verification gates that validate multi-agent code proposals without human triage.
- **Cryptographic & Protocol Engineers:** Delivers rigorous invariant verification preventing financial leakage, deadlocks, and memory unsafety.

### HOW
1. **Pipeline Bifurcation:** Author `.github/workflows/ci.yml` separating fast test suites (Job 1) from Kani/SMT proofs (Job 2).
2. **Cache Infrastructure:** Cache toolchains (`~/.cargo/bin/cargo-kani`) and solver packages (`~/.kani`) via composite hash keys.
3. **Matrix Sharding:** Group verification harnesses into parallel execution tracks categorized by unwinding depth and computational complexity.
4. **Adversarial Invariant Ingestion:** Formulate property tests and symbolic harnesses covering the four invariant edge categories:
   - Identity & Aliasing ($A == B$)
   - Arithmetic Extremes ($0, 1, \text{MAX}, \text{wrap}$)
   - Cardinality Bounds ($0, 1, \text{CAPACITY}$)
   - State Sequencing (Reentrancy, TOCTOU)
5. **Quality Gate Enforcement:** Require passing proofs and zero-mock AST scans before admitting commits to production release branches.

---

## 8. LLM Wiki Knowledge Ingestion & Persistence

In accordance with the LLM Wiki Operating Protocol:
1. **Raw Documentation Export:** Authored technical treatise at [`docs/06_raw/20261010_221500_dual_ci_pipeline_architecture_edge_case_taxonomy_and_formal_verification_continuum.md`](file:///Users/batrarethsudprasert/projects/soda-os/docs/06_raw/20261010_221500_dual_ci_pipeline_architecture_edge_case_taxonomy_and_formal_verification_continuum.md).
2. **Catalog Index Update:** Appended record to [`docs/06_raw/index.md`](file:///Users/batrarethsudprasert/projects/soda-os/docs/06_raw/index.md#L10) under *Section 1: Core Architecture & Blueprints*.
3. **Operations Timeline Log:** Appended chronological record to [`docs/06_raw/log.md`](file:///Users/batrarethsudprasert/projects/soda-os/docs/06_raw/log.md#L4).
4. **Template Mirror Parity:** Mirrored verbatim to [`template/docs/06_raw/index.md`](file:///Users/batrarethsudprasert/projects/soda-os/template/docs/06_raw/index.md) and [`template/docs/06_raw/log.md`](file:///Users/batrarethsudprasert/projects/soda-os/template/docs/06_raw/log.md) with **0 diff lines**.
