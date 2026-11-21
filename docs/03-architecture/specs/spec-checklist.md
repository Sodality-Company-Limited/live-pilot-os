# Spec Design Checklist & Cognitive Quality Invariants

**Location:** `docs/03-architecture/specs/spec-checklist.md`  
**Framework:** Soda OS  
**Status:** Canonical Framework Specification  

---

## 🏛️ Context & Framework Invariant

Before promoting any goal card to `ready`, the specification MUST satisfy all architectural, epistemic, and cognitive quality invariants.

---

### Spec Design Checklist

- [ ] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [ ] How is empty while `draft`; filled in PLAN after clarify
- [ ] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [ ] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [ ] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [ ] Worktree & Multi-Subagent Orchestration Plan declared (worktree paths, disjoint touch maps, isolation guarantees, and merge/teardown lifecycle)
- [ ] No `[NEEDS CLARIFICATION]` left in Open questions
- [ ] In / Out unambiguous; Out matches Scope Out
- [ ] Acceptance criteria each testable or reviewable
- [ ] Touch map is real repo paths
- [ ] Knowledge links: Why traces to `P-xxx` or accepted PDR
- [ ] Change delta filled if modifying existing behaviour
- [ ] Critical-path assumptions are not `open` + `low`
- [ ] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [ ] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [ ] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [ ] Codex Superintelligence Empirical Invariants verified when applicable
- [ ] Proof-and-Evidence Contract specified (Formal Proof, Statistical Guarantee, Empirical Evidence defined)
- [ ] 7-Stage Mathematical & Empirical Verification Pipeline defined without ungrounded absolute claims
- [ ] Exact-HEAD Provenance Contract declared (zero stale commit references, artifact.commit == git rev-parse HEAD)
- [ ] Epistemic Demarcation & Adversarial Stress Testing defined (synthetic vs external environment, partial observability)
- [ ] Unified Scorecard Derivation verified (Scorecard_HEAD = f(all current evidence artifacts))
- [ ] 5-Gate Epistemic Hierarchy preserved (Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness)
- [ ] Explicit Failure & Skipped Suite Reporting enforced in certification receipts (no empty arrays on failure)
- [ ] Strict Clean-Tree and Fresh Source Digest verification enforced (artifact.source_hashes match exact working tree)
- [ ] Immutable Final-HEAD Pipeline Invariant verified (certification never commits, SHA captured once, terminal command is strict provenance)
- [ ] Scorecard-Receipt Score Identity Invariant verified ($S_{scorecard} = S_{receipt} = f(evidence)$)
- [ ] Synchronized Scorecard State Invariant verified (zero contradictory provisional markers in non-provisional scorecard)
- [ ] Contract impact declared (schema versioning, dynamic action capabilities, cross-runtime parity)
- [ ] 5-Tier Deep Test Suite Specification defined (Positive, Negative, Chaos, Causality, Security)
- [ ] Epistemic Proof & Evidence Classification verified
- [ ] Mathematical Proof, Formal Methods & Program Verification Specification defined when applicable (Semantics, Hoare Logic, Deductive/SMT, Model Checking, Abstract Interpretation)
- [ ] Formal Verification Contract declared (TCB minimal, loop invariants/variants bounded, soundness verified, proof receipt bound)
- [ ] Domain 1: Invariants & System Laws formalized (Conservation ΔSupply=0, Monotonicity, State Machine reachability, Idempotency f(f(x))=f(x), Solvency)
- [ ] Domain 2: Formal Verification & Solvers specified (Deductive Proof, SMT/Z3, BMC, Symbolic Execution, Kani Verifier, Loop Unwinding)
- [ ] Domain 3: Harness Engineering & Modeling defined (Verification Harness, Symbolic Allocation kani::any(), Preconditions kani::assume(), Stubbing #[kani::stub], Shadow Reference Model, Input Shrinking)
- [ ] Domain 4: Adversarial Modeling & Edge Pathologies defended (Adversarial Testing, Aliasing collisions from==to, Arithmetic extremes 0/1/MAX, Precision dust exploitation, Replay & out-of-order, Atomicity rollback)
- [ ] Domain 5: Concurrency, Race Conditions & Memory Models proven (ABA mitigation, CAS, Tagged/versioned pointers (ptr, tag), UAF prevention, Mutex, Acquire/Release/Relaxed memory orderings, Schedule Sequentialization)
- [ ] Domain 6: Advanced Testing Paradigms & Tooling configured (Property-Based Testing proptest, Design by Contract DbC, Stateful Model-Based Testing, Mutation Testing >= 85%, MC/DC Coverage)
