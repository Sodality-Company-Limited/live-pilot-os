# Mathematical Proof, Formal Methods & Program Verification Specification

**Location:** `docs/03-architecture/specs/formal-verification.md`  
**Framework:** Soda OS  
**Status:** Canonical Framework Specification  

---

## 🏛️ Context & Framework Invariant

When a goal asserts mathematical correctness, algorithmic safety, deadlock-freedom, or invariant preservation, it **MUST NOT** rely solely on empirical sample testing. It must specify its formal semantics, verification paradigm, and proof artifacts across the 6 operational domains and foundational disciplines of program verification.

---

### 8. Mathematical Proof, Formal Methods & Program Verification Specification (The 6 Operational Domains)

### 9. Mathematical Proof, Formal Methods & Program Verification Specification (The 6 Operational Domains)

#### 1. General Disciplines & Paradigms
- **Formal Methods:** Mathematically rigorous techniques for the specification, development, and verification of software and hardware systems. Employs formal logic to eliminate ambiguity in requirements and system architectures.
- **Formal Verification:** The act of proving or disproving the correctness of intended algorithms with respect to a formal mathematical specification ($M \models \phi$). Guarantees that all possible dynamic executions satisfy the specified behavioral contracts.
- **Correctness by Construction:** Synthesizing or developing software through sound mathematical transformations, refinement calculi, or strong constructive type systems such that runtime errors, type flaws, and invariant violations are rendered mathematically impossible by design.
- **Proof-Carrying Code (PCC):** Executable binaries or bytecode bundled with an explicit, machine-checkable mathematical proof certificate. The execution host or runtime kernel validates safety policies before permitting execution via a fast proof checker, requiring zero trust in the code producer.
- **Mechanized Proof:** A rigorous mathematical proof whose syntax, axioms, inference rules, and intermediate deduction steps are formalized and verified step-by-step by computer software (interactive theorem provers or automated verifiers), eliminating human algebraic slips.

#### 2. Theoretical Foundations & Program Semantics
- **Axiomatic Semantics & Hoare Logic:** Gives mathematical meaning to programming constructs by formulating logical assertions over system states. Governed by Hoare Triples:
  $$\{P\}\ C\ \{Q\}$$
  Where $P$ is the precondition, $C$ is the program command, and $Q$ is the postcondition.
- **Preconditions & Postconditions:**
  - **Precondition ($P$):** The required assertion that must hold on the state immediately prior to executing command $C$.
  - **Postcondition ($Q$):** The guaranteed assertion that holds on the state immediately following the termination of command $C$.
- **Predicate Transformers ($\text{wp}$ & $\text{sp}$):**
  - **Weakest Precondition ($\text{wp}(C, Q)$):** The weakest (least restrictive) state assertion required for command $C$ to terminate in a state satisfying postcondition $Q$:
    $$\forall P, \quad \{P\}\ C\ \{Q\} \iff (P \implies \text{wp}(C, Q))$$
  - **Strongest Postcondition ($\text{sp}(P, C)$):** The most specific assertion guaranteed to hold after executing command $C$ starting from a state satisfying precondition $P$:
    $$\forall Q, \quad \{P\}\ C\ \{Q\} \iff (\text{sp}(P, C) \implies Q)$$
- **Loop Invariants & Loop Variants (Ranking Functions):**
  - **Loop Invariant ($I$):** An inductive predicate that holds true prior to loop entry, persists across every iteration step, and holds upon loop termination:
    $$P \implies I, \quad \{I \land B\}\ C\ \{I\}, \quad (I \land \neg B) \implies Q$$
  - **Loop Variant ($V$):** A ranking function mapping system states to a well-founded set $(\mathcal{W}, <)$ (such as $\mathbb{N}$ with standard order) that strictly decreases across every iteration:
    $$\{I \land B \land V = z\}\ C\ \{V < z\}$$
    Guaranteeing termination within finite steps and preventing infinite recursion or live-lock loops.
- **Total vs. Partial Correctness:**
  - **Partial Correctness ($\{P\}\ C\ \{Q\}$):** Guarantees that IF command $C$ terminates, the final state satisfies postcondition $Q$ (termination itself is unproven).
  - **Total Correctness ($\langle P \rangle\ C\ \langle Q \rangle$):** Guarantees BOTH that command $C$ is guaranteed to terminate AND that its final state satisfies postcondition $Q$ ($\text{Total Correctness} = \text{Partial Correctness} + \text{Termination Proof via Variant}$).
- **Operational Semantics:** Mathematical definition of program execution behavior through formal transition systems:
  - **Small-Step / Structural Operational Semantics (SOS):** Models individual reduction steps $\langle C, \sigma \rangle \to \langle C', \sigma' \rangle$, detailing intermediate execution states, concurrency, and interleaving.
  - **Big-Step / Natural Semantics:** Evaluates entire computations directly from initial state to final value/state $\langle C, \sigma \rangle \Downarrow \sigma'$, abstracting away intermediate reductions.
- **Denotational Semantics:** Formally maps syntactic language constructs to mathematical denotations in abstract semantic domains:
  $$\llbracket \cdot \rrbracket: \text{Syntax} \to \mathcal{D}$$
  Where $\mathcal{D}$ represents complete partial orders (CPOs), continuous lattices, and Scott domains, resolving recursion via Knaster-Tarski least fixed-point semantics.
- **Separation Logic:** An extension of Hoare logic designed for reasoning over mutable heap structures, pointer arithmetic, and disjoint memory resources:
  - **Spatial Conjunction ($P * Q$):** Asserts that the heap can be partitioned into two disjoint sub-heaps, one satisfying $P$ and the other satisfying $Q$.
  - **The Frame Rule:**
    $$\frac{\{P\}\ C\ \{Q\}}{\{P * R\}\ C\ \{Q * R\}} \quad \text{where } \text{Mod}(C) \cap \text{Free}(R) = \emptyset$$
    Enabling compositional, local reasoning where unmodified memory regions ($R$) are mathematically invariant across command execution.

#### 3. Deductive Verification & Automated Reasoning
- **Verification Condition Generator (VCG):** Software tools that consume code annotated with Hoare-style specifications (pre/postconditions, loop invariants) and apply predicate transformers ($\text{wp}$) to emit pure mathematical conjectures (Verification Conditions).
- **Satisfiability Modulo Theories (SMT):** Decision procedures determining the satisfiability of first-order logical formulas with respect to background theories (Linear Integer Arithmetic $\text{LIA}$, Bit-Vectors $\text{BV}$, Uninterpreted Functions $\text{EUF}$, and Arrays $\text{AX}$).
- **SAT Solvers:** Core algorithms (DPLL, CDCL with conflict analysis, non-chronological backjumping, and two-watched-literal indexing) that solve the Boolean satisfiability problem across millions of propositional variables.
- **Interactive Theorem Proving (Proof Assistants / ITP):** Interactive software environments where humans construct rigorous mathematical proof scripts that are independently checked and validated by a minimal logical kernel.
- **Proof Tactics:** Higher-level automated proof commands (`induction`, `rewrite`, `simp`, `omega`, `ring`, `auto`, `blast`) that automate routine algebraic steps, equational reasoning, and lemma discharges.
- **Small Trusted Computing Base (TCB):** Restricting the proof-checking engine to a minimal foundational core (the de Bruijn principle). Regardless of the complexity of proof-search heuristics or external solver tactics, only the small core kernel must be trusted for the derived conclusions to be mathematically sound.

#### 4. Type Theory & Constructive Logic
- **Curry-Howard Correspondence (Isomorphism):** The foundational equivalence establishing that logical propositions correspond to computational types, proofs correspond to programs, and proof normalization corresponds to program evaluation:
  $$\text{Propositions-as-Types} \quad \longleftrightarrow \quad \text{Proofs-as-Programs}$$
- **Calculus of Inductive Constructions (CIC):** A higher-order dependently typed $\lambda$-calculus featuring inductive definitions, dependent function types ($\Pi$-types), dependent pair types ($\Sigma$-types), and a cumulative universe hierarchy ($\text{Prop}, \text{Type}_0, \text{Type}_1, \dots$). Serves as the logical core of Coq/Rocq and Lean.
- **Intuitionistic / Constructive Logic:** A formal logical system that rejects the unconstructive Law of the Excluded Middle ($P \lor \neg P$) and Double Negation Elimination ($\neg\neg P \implies P$). Proving the existence of an object ($\exists x, P(x)$) strictly requires an explicit constructive witness algorithm to generate it.
- **Dependent Types:** Types whose definition depends on runtime values. Enables expressing exact invariants directly in signatures (e.g., `Matrix(n, m)` where multiplying `Matrix(n, k)` and `Matrix(k, m)` enforces dimension matching at compile time).
- **Refinement Types:** Base types constrained by decidable Boolean logical predicates solved automatically via SMT solvers:
  $$\{v: T \mid \phi(v)\}$$
  (e.g., $\{v: \mathbb{Z} \mid v \ge 0\}$ for non-negative integers or $\{s: \text{String} \mid \text{len}(s) > 0\}$ for non-empty strings).
- **Linear & Affine Types (Substructural Type Systems):** Type systems governed by structural rules that control resource usage:
  - **Linear Types:** Values must be consumed **exactly once** (no duplication, no discarding).
  - **Affine Types:** Values can be consumed **at most once** (no duplication, discarding allowed).
  Guarantees zero use-after-free, zero resource leaks (file descriptors, sockets), and data-race-free memory concurrency at compile time.

#### 5. Model Checking & State Exploration
- **Temporal Logic:** Formalisms to assert and verify truth conditions over execution traces unfolding across time:
  - **Linear Temporal Logic (LTL):** Evaluates properties over linear, continuous execution sequences. Core temporal operators:
    - $\square \phi$ (**Always / Globally**): $\phi$ holds at every state along the trace.
    - $\Diamond \phi$ (**Eventually / Finally**): $\phi$ holds at some future state along the trace.
    - $\bigcirc \phi$ (**Next**): $\phi$ holds in the immediate next state.
    - $\phi\ \mathcal{U}\ \psi$ (**Until**): $\phi$ holds continuously until a state where $\psi$ holds.
  - **Computation Tree Logic (CTL):** Evaluates properties over branching computation trees representing all possible nondeterministic execution futures. Quantifies paths via:
    - $A$ (**All paths**): Property holds on every path branching from current state.
    - $E$ (**Exists path**): Property holds on at least one path branching from current state.
- **Safety vs. Liveness Properties:**
  - **Safety Property ("Nothing bad happens"):** Asserts that an invalid state is never reached ($\square \neg \text{Bad}$). Any violation has a finite counterexample prefix.
  - **Liveness Property ("Something good eventually occurs"):** Asserts that the system makes progress toward a desirable state ($\Diamond \text{Good}$ or $\square(\text{Request} \implies \Diamond \text{Grant})$). Violations require an infinite counterexample trace (lasso/cycle).
- **State Space Explosion:** The exponential growth in the number of system states ($\mathcal{O}(k^n)$) as variables, threads, message buffers, and concurrent actors increase.
- **Mitigation & Search Strategies:**
  - **Explicit-State Model Checking:** Directly traverses the concrete state transition graph state-by-state using DFS/BFS, optimized via partial-order reduction, state hashing, and symmetry reduction.
  - **Symbolic Model Checking:** Encodes entire sets of states and transitions as Boolean logic formulas using Binary Decision Diagrams (BDDs) or SAT/SMT formulas (Bounded Model Checking $\text{BMC}$).
- **Counterexample Trace:** When an invariant or temporal property is violated, the model checker generates an exact, machine-replayable execution trace showing the step-by-step sequence of inputs and state transitions that broke the specification.

#### 6. Abstract Interpretation & Sound Static Analysis
- **Abstract Interpretation:** A formal theory of semantic approximation that evaluates program execution over structured, ordered algebraic domains rather than concrete states.
- **Galois Connections $(\alpha, \gamma)$:** A pair of monotone functions connecting concrete semantic domains $(\wp(\Sigma), \subseteq)$ to abstract analysis domains $(\mathcal{A}, \sqsubseteq)$:
  $$\wp(\Sigma) \underset{\alpha}{\overset{\gamma}{\rightleftarrows}} \mathcal{A} \quad \text{satisfying} \quad \alpha(S) \sqsubseteq a \iff S \subseteq \gamma(a)$$
  Where $\alpha$ is the abstraction function (mapping concrete states to their abstract representation) and $\gamma$ is the concretization function.
- **Complete Lattices:** Partially ordered sets $(\mathcal{L}, \sqsubseteq, \sqcap, \sqcup, \bot, \top)$ where every subset has both a greatest lower bound (meet, $\sqcap$) and a least upper bound (join, $\sqcup$), guaranteeing that abstract operations (e.g. interval arithmetic $[l, u]$) form well-defined fixed points.
- **Widening ($\nabla$) and Narrowing ($\Delta$):** Acceleration operators on infinite-height lattices:
  - **Widening ($\nabla$):** Over-approximates loop behaviors to force rapid convergence of fixed-point iterations on infinite domains within finite steps.
  - **Narrowing ($\Delta$):** Refines the over-approximated post-fixed-point to recover precision without sacrificing safety.
- **Soundness vs. Completeness:**
  - **Soundness (Zero False Negatives):** If the analyzer asserts that an error is absent, it is mathematically impossible for that runtime error to occur in any valid execution.
  - **Completeness (Zero False Positives):** Every reported warning corresponds to a genuine, reachable runtime violation trace.

#### 7. Core Tools, Languages & Ecosystems
- **Interactive Proof Assistants:**
  - **Lean 4:** Dependent type theory with meta-programming, formal math libraries, and software verification.
  - **Coq / Rocq:** Calculus of Inductive Constructions with extraction to OCaml/Haskell and CompCert verified C compiler.
  - **Isabelle / HOL:** Higher-Order Logic proof assistant with powerful SMT-backed sledgehammer automation.
  - **Agda:** Dependently typed functional programming language and proof assistant based on Martin-Löf type theory.
- **Deductive / Auto-Active Verifiers:**
  - **Dafny:** Verification-aware language with built-in specification constructs (requires, ensures, invariant, decreases) compiling to C#, Java, Go, and Rust.
  - **F\*:** Dependently typed language for program verification with effect systems, targeting verified cryptography (HACL*).
  - **Why3:** Platform for deductive program verification with multi-solver backend support.
  - **Viper:** Intermediate verification language for permission-based reasoning (Separation Logic).
  - **Frama-C (ACSL):** Industrial verification framework for C programs using ANSI/ISO C Specification Language.
  - **SPARK Ada:** High-integrity subset of Ada with contract-based deductive verification for safety-critical avionics/rail.
- **SMT / SAT Solvers:**
  - **Z3 / CVC5:** Leading SMT solvers implementing DPLL($T$), solving complex linear/non-linear arithmetic, arrays, and bit-vectors.
  - **MiniSat / Bitwuzla:** High-efficiency SAT and SMT solvers for bit-precise reasoning.
- **Model Checkers:**
  - **TLA+ (TLC / Apalache):** Specification language for distributed protocols and concurrent systems with explicit and symbolic model checkers.
  - **SPIN (Promela):** Explicit-state model checker for multi-threaded systems and network protocols asserting LTL properties.
  - **UPPAAL:** Tool environment for modeling, simulation, and verification of real-time timed automata.
  - **PRISM:** Probabilistic model checker for systems exhibiting random or stochastic behavior.
  - **NuSMV:** Symbolic model checker utilizing BDDs and SAT-based bounded model checking.
- **Industrial Sound Static Analyzers:**
  - **Astrée:** Sound abstract-interpretation-based analyzer proving the absence of runtime errors (RTE) in safety-critical embedded C/C++.
  - **Polyspace Bug Finder / Code Prover:** MathWorks static analyzer proving code safety via abstract interpretation.
  - **Facebook Infer:** Separation-logic-based static analyzer detecting null pointer exceptions, memory leaks, and concurrency race conditions.

---

## 🔬 The 6 Operational Domains of Mathematical Proven Governance & Formal Verification

### Domain 1: Invariants & System Laws
- **System Invariant:** A universal property or rule that must hold true across all reachable system states and transitions:
  $$\forall s \in \mathcal{S}_{\text{reachable}}, \quad \Phi(s) = \text{true}$$
  No valid action sequence $\langle a_0, a_1, \dots, a_k \rangle$ from initial state $s_0$ may produce a state where $\Phi(s)$ evaluates to false.
- **Conservation Law (Zero-Sum Invariant):** Rules dictating that total assets or values are neither created nor destroyed:
  $$\Delta \text{Supply} = 0 \iff \sum_{a \in \mathcal{A}} \text{balance}_{\text{post}}(a) \equiv \sum_{a \in \mathcal{A}} \text{balance}_{\text{pre}}(a) + \Delta \text{External}$$
  Enforced via Martin Fowler's remainder-preserving integer allocation splits ($\sum \text{splits} \equiv \text{total}$) and exact integer arithmetic.
- **Monotonicity:** Properties where values strictly increase or decrease without regression:
  $$t_2 > t_1 \implies \text{nonce}(t_2) > \text{nonce}(t_1), \quad \text{epoch}(t_2) \ge \text{epoch}(t_1), \quad \text{fee\_accrual}(t_2) \ge \text{fee\_accrual}(t_1)$$
- **State Machine Invariant:** Formal constraints governing legal state reachability in transition systems $(\mathcal{S}, \Sigma, \delta, s_0)$, disallowing forbidden or out-of-order transitions:
  $$\delta: \mathcal{S} \times \Sigma \to \mathcal{S} \cup \{\bot\}, \quad \delta(s, \sigma) = \bot \implies \text{fail-closed abort}$$
  (e.g., states cannot transition from `Cancelled` to `Settled`, or from `Terminal` to `Active`).
- **Idempotency & Reversibility:** Pure mathematical idempotence and exact saga rollback compensation:
  $$f(f(x)) = f(x) \quad \text{and} \quad g(f(x)) = x$$
  Ensuring duplicate API requests, replayed event messages, or network retries cause zero state drift.
- **Solvency & Non-Negativity:** Guarding that account balances, liquidity pool capacities, and reserve ratios never dip below critical safety thresholds or underflow:
  $$\forall a \in \mathcal{A}, \quad \text{balance}(a) \ge 0 \quad \land \quad \text{reserves} \ge \kappa \cdot \text{liabilities}$$
- **Mathematical & Data Invariants (Monetary & Ledger Math):** Universal Multi-Currency System & Zero-Float Invariant. Multi-currency ISO 4217 minor-unit integer arithmetic (`i64`/`u64`/`i128` parameterized by currency exponent $10^{-e}$, e.g. JPY $e=0$, USD/EUR/THB $e=2$, BHD $e=3$). **ZERO float math**. Composite Money tuple `(amount_minor: i64, currency: ISO_4217, scale: u8)`. Strict cross-currency FX isolation with deterministic Banker's Rounding (Half-Even).

### Domain 2: Formal Verification & Solvers
- **Deductive Proof:** Proving mathematically that no valid execution trace can violate a specification, rather than empirically sampling traces:
  $$\vdash_{\text{logic}} \forall \sigma, \quad \text{Pre}(\sigma) \land \text{Exec}(C, \sigma, \sigma') \implies \text{Post}(\sigma')$$
- **SMT / SAT Solvers:** Satisfiability Modulo Theories engines (e.g., Z3, CaDiCaL, Bitwuzla, CVC5) evaluating first-order logic formulas over bitvectors ($\text{BV}$), linear integer arithmetic ($\text{LIA}$), arrays, and uninterpreted functions ($\text{EUF}$).
- **Bounded Model Checking (BMC):** Translating code up to a fixed loop/recursion depth $k$ into a propositional formula $\phi_k = I(s_0) \land \bigwedge_{i=0}^{k-1} T(s_i, s_{i+1}) \land \bigvee_{i=0}^k \neg P(s_i)$ solved via SAT/SMT to check for invariant violations.
- **Symbolic Execution:** Executing code using algebraic/symbolic variables $\alpha, \beta, \dots$ instead of concrete literals to evaluate all execution path constraints ($\text{PC}$) simultaneously:
  $$\text{PathCondition} \land \neg \text{Assertion} \quad \xrightarrow{\text{SMT}} \quad \text{SAT} \implies \text{Bug found with concrete inputs}$$
- **Kani Verifier:** A bounded model checking tool for Rust based on CBMC that compiles Rust MIR to goto-programs and bitcode, verifying memory safety and assertion satisfaction using SMT solvers.
- **Counterexample Trace:** When an invariant assertion fails ($\neg P$ is SAT), the solver synthesizes a minimal, concrete sequence of inputs and state changes:
  $$\tau = \langle s_0, i_0, s_1, i_1, \dots, s_k \rangle \quad \text{where } \neg P(s_k)$$
- **Loop Unwinding (`#[kani::unwind(N)]`):** The explicit bound $N$ specifying the maximum number of loop iterations and recursive calls unrolled during symbolic bounded model checking. If loop bound is exceeded, unwinding assertions guarantee soundness.

### Domain 3: Harness Engineering & Modeling
- **Verification Harness:** An isolated, deterministic test wrapper that sets up symbolic inputs, enforces domain assumptions, executes target logic, and asserts formal invariants:
  ```rust
  #[kani::proof]
  #[kani::unwind(5)]
  pub fn harness_verify_balance_transfer() {
      let mut from: Account = kani::any();
      let mut to: Account = kani::any();
      let amount: i64 = kani::any();
      kani::assume(from.id != to.id); // Precondition: no aliasing
      kani::assume(from.balance >= 0 && to.balance >= 0);
      kani::assume(amount > 0 && from.balance >= amount);
      let initial_sum = from.balance + to.balance;
      assert!(transfer(&mut from, &mut to, amount).is_ok());
      assert_eq!(from.balance + to.balance, initial_sum); // Conservation
  }
  ```
- **Symbolic Allocation (`kani::any()`):** Initializing unconstrained, non-deterministic variables containing all possible bit patterns for that type, covering the entire valid type domain without manual sampling.
- **Preconditions (`kani::assume()`):** Mathematical assumptions that restrict the symbolic solver's search space to valid domain boundaries and operational invariants.
- **Stubbing (`#[kani::stub]`):** Replacing expensive, non-verifiable, or non-deterministic dependencies (dynamic collections, I/O, hash functions, cryptographic primitives, network sockets) with lightweight, sound mathematical reference models.
- **Shadow / Reference Model:** A simplified, high-level mathematical specification (e.g., pure functional map) against which the optimized implementation's state transitions are continuously verified for bisimulation equivalence:
  $$\forall a \in \text{Actions}, \quad \text{Abstract}(\text{Impl}.\text{step}(a, s)) \equiv \text{Spec}.\text{step}(a, \text{Abstract}(s))$$
- **Input Shrinking:** The automated process in property testing (QuickCheck/proptest) where, upon detecting a failing randomized trace, the engine minimizes inputs through binary search or delta debugging to the smallest reproducible edge-case vector.

### Domain 4: Adversarial Modeling & Edge Pathologies
- **Adversarial Testing:** Deliberately crafting inputs, interleavings, and payload sequences to exploit corner cases, force runtime panics, overflow bounds, or desynchronize distributed state.
- **Aliasing Collisions (`from == to`):** Pathologies occurring when two distinct operational parameters or references point to the exact same memory slot, account, or record (e.g., self-transfers causing double-spend or self-credit).
- **Arithmetic Extremes:** Explicit boundary condition vectors:
  $$\{0, 1, \text{MAX} - 1, \text{MAX}, \text{MIN}, \text{MIN} + 1, -1, \text{DIV\_BY\_ZERO}\}$$
  Testing integer wrap, signed overflow, and precision bounds.
- **Precision Dust Exploitation:** Attacking truncation, floor division, and integer division rounding directions to drain protocols or bypass transaction fees through micro-fraction accumulation.
- **Out-of-Order Execution & Replay:** Interleaving valid payloads in non-chronological sequences, dropping messages, or replaying past state messages to test nonce verification and sequence fencing.
- **Atomicity & Rollback Guarantees:** Proving that multi-stage operations failing midway leave zero residual mutations or corrupted memory through transactional outbox and saga compensation rollbacks.

### Domain 5: Concurrency, Race Conditions & Memory Models
- **ABA Problem:** A concurrency bug in lock-free algorithms where an atomic pointer changes from $A \to B \to A$, misleading a Compare-And-Swap (CAS) operation into assuming no state mutation occurred.
- **Compare-And-Swap (CAS):** An atomic instruction (`compare_exchange_weak` / `compare_exchange_strong`) used in lock-free concurrency to conditionally update state only if current value matches expected value:
  $$\text{CAS}(p, \text{old}, \text{new}) \iff \text{if } *p == \text{old} \text{ then } \{ *p = \text{new}; \text{true} \} \text{ else } \text{false}$$
- **Tagged / Versioned Pointers:** Packing a memory address or index with a monotonic epoch counter (`(ptr, tag)`) into a single atomic double-word (e.g., 128-bit `AtomicU128` or tagged pointer) to guarantee that $A \to B \to A$ produces distinct tags, eliminating ABA collisions.
- **Use-After-Free (UAF):** Memory corruption occurring when memory slots reclaimed or deallocated by one thread are concurrently dereferenced by another; prevented via Rust's linear/affine ownership system, hazard pointers, or epoch-based memory reclamation (EBR).
- **Mutual Exclusion:** The invariant ensuring that two concurrent execution contexts never simultaneously enter a shared critical section:
  $$\forall t, \quad |\text{ThreadsInCriticalSection}(t)| \le 1$$
- **Memory Orderings (`Acquire` / `Release` / `Relaxed`):** Explicit hardware and compiler synchronization barriers dictating the visibility and sequential ordering of atomic read and write operations:
  - `Relaxed`: Guarantees atomicity of the operation with zero synchronization or memory ordering constraints across threads.
  - `Release`: Stores establish a barrier ensuring all prior memory operations (reads and writes) in the current thread are committed and visible before this store.
  - `Acquire`: Loads establish a barrier ensuring all subsequent memory operations in the current thread observe the effects of prior Release stores.
  - `AcqRel`: Combined Acquire and Release semantics for atomic Read-Modify-Write operations.
  - `SeqCst`: Globally consistent total order across all sequentially consistent atomic operations.
- **Schedule Sequentialization:** Modeling multi-threaded interleavings deterministically within a verification harness, serializing non-deterministic thread schedules into bounded permutations to avoid state space explosion during model checking.

### Domain 6: Testing Paradigms & Tooling
- **Property-Based Testing (PBT):** Invariant-driven testing using automated input generators (`proptest`, `QuickCheck`, `Hypothesis`) executing $\ge 10,000$ randomized iterations per property law.
- **Design by Contract (DbC):** Formally expressing invariants, preconditions, and postconditions as intrinsic code boundaries via executable assertions (`requires`, `ensures`, `invariant`) validated in debug and CI builds.
- **Stateful Model-Based Testing:** Fuzzing sequential state machines by dispatching randomized sequences of typed action vectors against both the system-under-test and an invariant-checked reference oracle.
- **Mutation Testing:** Automatically injecting synthetic faults (arithmetic operator flips, relational mutations, conditional inversions, boundary replacements) via `cargo-mutants` to verify that the test suite detects the regression with a kill threshold $\ge 85\%$:
  $$\text{MutationScore} = \frac{\text{KilledMutants}}{\text{TotalMutants} - \text{EquivalentMutants}} \ge 0.85$$
- **Code Coverage (Branch/Statement/MC/DC):** Structural metrics measuring which AST branches were traversed, contrasting with full state-space coverage:
  - **Statement Coverage:** Percentage of executable statements executed.
  - **Branch Coverage:** Percentage of decision branches (true/false) evaluated.
  - **Modified Condition / Decision Coverage (MC/DC):** Proves that each condition within a decision has been shown to independently affect that decision's outcome.

---

## 📋 Machine-Readable Formal Verification Contract Specification

```yaml
formal_verification:
  paradigm: "deductive_verification" # interactive_proof | deductive_verification | correctness_by_construction | proof_carrying_code | model_checking | abstract_interpretation
  target_module: "code/src/core/..."
  spec_language: "dafny" # lean4 | coq_rocq | isabelle_hol | dafny | fstar | why3 | viper | frama_c_acsl | spark_ada | tla_plus | spin_promela | smt_lib2
  trusted_computing_base:
    kernel: "Lean 4.12.0 / Z3 4.13.0"
    axioms: [] # Explicit list of trusted non-logical axioms; must be minimal (de Bruijn criterion)
  verification_conditions:
    - id: "VC-001"
      name: "balance_conservation"
      kind: "total_correctness" # total_correctness | partial_correctness | safety_invariant | liveness_property
      precondition: "amount > 0 && balance >= amount" # {P}
      postcondition: "new_balance == balance - amount" # {Q}
      weakest_precondition: "wp(Withdraw(amount), new_balance == balance - amount)"
      loop_invariants:
        - "sum(transferred) + sum(remaining) == total_capital"
      loop_variants:
        - "remaining_iterations" # strictly decreasing metric in well-founded set
      separation_logic_frame: "emp * PointsTo(acc_ptr, balance)"
  type_theory_invariants:
    dependent_types: "Vect n Transaction"
    refinement_types: "{v: Int | v >= 0}"
    linear_affine_handling: "linear" # linear (consumed exactly once) | affine (consumed at most once)
  model_checking:
    temporal_logic: "LTL" # LTL | CTL
    properties:
      - id: "PROP-001"
        type: "safety" # safety ([] !bad) | liveness (<> good)
        formula: "[](requested -> <>(granted || rejected))"
        state_space_mitigation: "partial_order_reduction"
        engine: "TLA+ (TLC)"
  abstract_interpretation:
    abstract_domain: "polyhedra" # sign | interval | octagons | polyhedra
    galois_connection: "(alpha, gamma)"
    widening_operator: "standard_widening_k4"
    soundness_guarantee: "zero_false_negatives"
  solvers_and_checkers:
    smt_solvers:
      - name: "Z3"
        version: "4.13.0"
        theories: ["QF_LIA", "QF_BV", "Arrays"]
    model_checkers:
      - name: "TLC"
    proof_assistants:
      - name: "Lean 4"
  operational_domains:
    invariants_and_system_laws:
      system_invariants:
        - "forall s in ReachableStates, Invariant(s)"
      conservation_laws:
        - "sum(balances_post) == sum(balances_pre) + delta_external"
      monotonicity:
        - "nonce_t2 > nonce_t1 for t2 > t1"
      state_machine_invariants:
        - "forbidden_transition(Cancelled, Settled) == reject"
      idempotency_and_reversibility:
        - "f(f(x)) == f(x)"
        - "rollback(execute(state)) == state"
      solvency_and_non_negativity:
        - "forall a in Accounts, balance(a) >= 0"
    formal_verification_and_solvers:
      deductive_proof: "proved_via_hoare_triples"
      smt_sat_solvers:
        - engine: "Z3"
          logic: "QF_LIA"
        - engine: "Bitwuzla"
          logic: "QF_BV"
      bounded_model_checking:
        engine: "Kani"
        loop_unwind_depth: 10
        assertion_checks: ["overflow", "bounds", "aliasing", "invariants"]
      symbolic_execution: "path_condition_smt_check"
      counterexample_trace: "artifacts/proofs/counterexample.trace"
    harness_engineering:
      verification_harness_path: "tests/harness/verify_invariants.rs"
      symbolic_allocation: ["kani::any()"]
      preconditions: ["kani::assume()"]
      stubbing_models: ["#[kani::stub]"]
      shadow_reference_model: "models/reference_spec.rs"
      input_shrinking: true
    adversarial_modeling:
      adversarial_suites: ["tests/adversarial/"]
      aliasing_collisions: "kani::assume(from.id != to.id)"
      arithmetic_extremes: [0, 1, "MAX - 1", "MAX", "MIN", "DIV_BY_ZERO"]
      precision_dust_defense: "bankers_rounding_half_even"
      out_of_order_replay_defense: "monotonic_nonce_fencing"
      atomicity_rollback: "saga_transactional_outbox"
    concurrency_and_memory_models:
      aba_mitigation: "tagged_versioned_pointers_atomic_u128"
      compare_and_swap_cas: "compare_exchange_strong"
      use_after_free_prevention: "linear_affine_ownership"
      mutual_exclusion: "parking_lot_mutex"
      memory_orderings: ["Acquire", "Release", "Relaxed"]
      schedule_sequentialization: "deterministic_loom_scheduler"
    testing_paradigms_and_tooling:
      property_based_testing:
        engine: "proptest"
        iterations: 10000
        laws: ["conservation", "monotonicity", "idempotency", "solvency"]
      design_by_contract:
        preconditions: true
        postconditions: true
        invariants: true
      stateful_model_based_testing:
        engine: "proptest_state_machine"
        max_transitions: 50
      mutation_testing:
        tool: "cargo-mutants"
        min_kill_threshold: 85
      code_coverage:
        engine: "llvm-cov"
        branch_threshold: 95
        mc_dc_required: true
  evidence_artifacts:
    proof_script: "proofs/balance_conservation.lean"
    vcg_output: "artifacts/proofs/VC-001.smt2"
    solver_receipt: "artifacts/proofs/VC-001-z3-receipt.json"
```
