# Teamwork Project Prompt — Verification & Assurance Pipeline Execution (G-PROOF-001 to G-PROOF-013)

> **Export Date:** 2026-10-10T22:50:00+07:00  
> **Source Artifact:** [prompt_draft.md](file:///Users/batrarethsudprasert/.gemini/antigravity-cli/brain/25259d1e-ef42-48cf-bb3c-8204ae651b6f/prompt_draft.md)  
> **Topic:** Multi-agent teamwork execution prompt for DAVE Verification & Assurance Epic goals G-PROOF-001 through G-PROOF-013  
> **Status:** Launched  
> **Requested team:** dynamically deploy more subagents as you needs to complete goals as soon as possible  

---

## 1. Project Overview & Root Intent

Use a very large team of agents. The user requested: "dynamically deploy more subagents as you needs to complete goals as soon as possible". Execute, verify, and formally transition all active goals of the DAVE Mathematical Invariant & Assurance Epic (G-PROOF-001 through G-PROOF-013, noting G-PROOF-002 is already completed and archived) across Soda OS, deploying parallel subagent worktrees across isolated Git branches to implement the Goal Contract v3 foundation, cross-goal touch-map collision gating, property-based invariant shrinking harnesses, stateful model shadow oracles, adversarial boundary mutation harnesses, AST mutation testing gates, epistemic proof classification gates, deterministic counterexample minimizers, concurrency schedule sequentializers, unified verification orchestrators, and operator runbooks.

**Working directory:** `/Users/batrarethsudprasert/projects/soda-os`  
**Integrity mode:** `development` (Strict Zero Mocks, Zero Stubs Invariant per Global Engineering Constitution Article I; Full Production-Ready Operational Logic Only)

---

## 2. Multi-Agent Batch Decomposition & DAG Waves

Execution is partitioned across 5 sequential waves respecting the goal dependency graph and strict touch-map disjointness ($\text{TouchMap}(G_i) \cap \text{TouchMap}(G_j) = \emptyset$):

```
  ┌─────────────────────────────────────────────────────────────┐
  │ WAVE 1: G-PROOF-001                                         │
  │ • DAVE Mathematical Invariant and Proof Receipt System      │
  │ • Dynamic Working-Tree Hash Binding & Receipt Certification │
  │ • Zero-Mock Mathematical Invariant Engine & Tests           │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ WAVE 2: G-PROOF-003 to G-PROOF-004                          │
  │ • Goal Contract v3 Schema Foundation & Profile Extensions   │
  │ • Conformance Harness & Pairwise Touch-Map Collision Gate   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ WAVE 3: G-PROOF-005 to G-PROOF-007, G-PROOF-011             │
  │ • Property-Based Invariant Fuzzing & Delta Shrinking Engine │
  │ • Stateful Model-Based Testing & Shadow Oracle Validator    │
  │ • Adversarial Boundary & Extremal Arithmetic Mutation Engine│
  │ • Concurrency Schedule Sequentializer & Interleaving Harness│
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ WAVE 4: G-PROOF-008 to G-PROOF-010                          │
  │ • AST Mutation Testing Gate (>= 85% Mutation Kill Score)    │
  │ • Epistemic Proof Classification (L0..L4) & Assumption Gate │
  │ • Counterexample Minimizer & 24h Receipt Freshness Engine   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ WAVE 5: G-PROOF-012 to G-PROOF-013                          │
  │ • Unified Verification Orchestrator (scripts/harness/verify)│
  │ • Fail-Closed Goal Lifecycle State Machine Gatekeeper       │
  │ • Architecture Guide, Operator Runbook & Conformance Tests  │
  └─────────────────────────────────────────────────────────────┘
```

---

## 3. Requirements Specification

### R1. Mathematical Invariant & Proof Receipt Binding (Wave 1: G-PROOF-001)
Execute, verify, and formally transition G-PROOF-001:
- Re-bind cryptographic proof receipt `docs/07-backlog/evidence/G-PROOF-001-proof-receipt.json` to the current commit and active disk byte hashes.
- Validate proof receipt via `node scripts/harness/proof-receipt-validator.mjs G-PROOF-001` with exit code 0.
- Implement zero-mock unit test suite `tests/unit/test-mathematical-proof-engine.mjs` verifying invariant evaluation, hash binding, and tamper detection.
- Archive G-PROOF-001 to `docs/07-backlog/goals/_archived/G-PROOF-001.md`, update status to `done`, and synchronize `PROOF` queue.

### R2. Contract Foundation & Touch-Map Collision Gate (Wave 2: G-PROOF-003, G-PROOF-004)
Implement foundational schema validation and worktree isolation gating:
- **G-PROOF-003:** Implement `scripts/lib/goal-contract-schema.mjs` and JSON Schema Draft 2020-12 `schemas/goal-contract.schema.json`. Validate universal verification fields (`invariants`, `proof_level`, `profiles`, `fail_closed`) and all 7 profile extensions. Implement zero-mock test suite `tests/unit/test-goal-contract-schema.mjs`.
- **G-PROOF-004:** Implement `scripts/harness/touch-map-collision-gate.mjs` and `scripts/lib/touch-map-analyzer.mjs`. Parse Section 2 touch maps across active goals, compute pairwise set intersections, detect path overlaps fail-closed, and verify zero collisions across concurrent goals. Implement unit tests in `tests/unit/test-touch-map-collision-gate.mjs`.

### R3. Parallel Dynamic Execution Engines (Wave 3: G-PROOF-005, G-PROOF-006, G-PROOF-007, G-PROOF-011)
Deploy concurrent subagent worktrees across 4 independent verification engines:
- **G-PROOF-005:** Implement `scripts/harness/property-invariant-harness.mjs` and `scripts/lib/invariant-runner.mjs`. Generate deterministic seeded pseudo-random inputs, execute >= 10,000 iterations over conservation, monotonicity, and idempotency laws, and implement delta shrinking for failing cases. Unit tests in `tests/unit/test-property-invariant-harness.mjs`.
- **G-PROOF-006:** Implement `scripts/harness/stateful-model-harness.mjs` and `scripts/lib/shadow-oracle-validator.mjs`. Dissect stateful transitions, run parallel lockstep execution against pure reference models, assert state equivalence, and trace reachability graphs. Unit tests in `tests/unit/test-stateful-model-harness.mjs`.
- **G-PROOF-007:** Implement `scripts/harness/adversarial-boundary-harness.mjs` and `scripts/lib/adversarial-probe-generator.mjs`. Synthesize extreme input boundaries (integers 0, 1, -1, MAX, MIN; aliased identities `from == to`; Unicode homoglyphs; ReDoS payloads) and assert fail-closed rejection. Unit tests in `tests/unit/test-adversarial-boundary-harness.mjs`.
- **G-PROOF-011:** Implement `scripts/harness/concurrency-schedule-harness.mjs` and `scripts/lib/schedule-sequentializer.mjs`. Interleave asynchronous event-loop and worker dispatch points, permute execution schedules, detect TOCTOU and reentrancy races, and verify monotonic fencing tokens. Unit tests in `tests/unit/test-concurrency-schedule-harness.mjs`.

### R4. Test Quality & Epistemic Boundaries (Wave 4: G-PROOF-008, G-PROOF-009, G-PROOF-010)
Deploy concurrent subagent worktrees across quality and epistemic assurance gates:
- **G-PROOF-008:** Implement `scripts/harness/mutation-testing-harness.mjs` and `scripts/lib/ast-mutator.mjs`. Parse JavaScript ASTs, inject mutation operators (arithmetic, relational, conditional negation), execute tests against mutants, and fail closed if mutation score < 85%. Unit tests in `tests/unit/test-mutation-testing-harness.mjs`.
- **G-PROOF-009:** Implement `scripts/harness/epistemic-classification-gate.mjs` and `scripts/lib/epistemic-classifier.mjs`. Classify verification claims into 5 tiers (L0 to L4), validate mathematical abstraction disclosures, prevent superficial unit tests from claiming formal verification, and reconcile Article I zero-mock invariants. Unit tests in `tests/unit/test-epistemic-classification-gate.mjs`.
- **G-PROOF-010:** Implement `scripts/harness/counterexample-minimizer.mjs` and `scripts/lib/receipt-freshness-engine.mjs`. Minimize failure traces into standardized JSON schemas with replay seeds, and enforce 24-hour cryptographic freshness and git HEAD alignment on proof receipts. Unit tests in `tests/unit/test-counterexample-minimizer.mjs`.

### R5. Unified Orchestrator & Operator Runbooks (Wave 5: G-PROOF-012, G-PROOF-013)
Integrate all capabilities and codify operational procedures:
- **G-PROOF-012:** Implement `scripts/harness/verify.mjs` and `scripts/lib/verification-orchestrator.mjs`. Parse goal contracts, dynamically invoke required profile harnesses, enforce standardized exit codes (0: PASS, 1: FAIL_ASSERTION, 2: TIMEOUT, 3: SCHEMA_ERROR, 4: REPLAY_DIFF), and gate goal lifecycle transitions to `done`. Unit tests in `tests/unit/test-verification-orchestrator.mjs`.
- **G-PROOF-013:** Author `docs/04-architecture/verification-harness-architecture.md` and `docs/05-operations/verification-runbook.md`. Codify architecture diagrams, profile configurations, CLI usage, and failure triage runbooks. Implement `tests/unit/test-verification-documentation-conformance.mjs` validating that all code samples and file links resolve cleanly.

---

## 4. Acceptance Criteria & Guardrails

### 1. Functional Integrity & Zero Mocks (Article I)
- [ ] 100% operational logic across all 11 implementation modules and 11 test suites.
- [ ] Zero `todo!()`, `unimplemented!()`, dummy fallback objects, or mocked returns verified via `scripts/harness/no-mock-production-gate-harness.mjs`.

### 2. Verification & Testing Pass (Article II)
- [ ] 100% green test execution across all new test suites via `node --test tests/unit/test-*.mjs`.
- [ ] Zero regressions across existing test suites (`npm test` passes cleanly).
- [ ] 28-pillar Senior Engineering Gate passes with 0 violations across all files via `scripts/harness/senior-engineering-gate-harness.mjs`.

### 3. Goal Lifecycle & Queue Governance
- [ ] All 12 active goals (G-PROOF-001, G-PROOF-003 through G-PROOF-013) certified 100% conformant (51/51 sections) via `goal-template-conformance-harness.mjs`.
- [ ] Cryptographic proof receipts emitted and validated via `proof-receipt-validator.mjs` for all completed goals.
- [ ] All completed goals moved to `docs/07-backlog/goals/_archived/` with status `done`, phase `SHIP`, and `lifecycle.learning: done`.
- [ ] Goal queue `docs/07-backlog/queues/PROOF.md` fully reconciled via `./cli.js goal sync PROOF` (0 active, 13 archived).

### 4. Template Mirror Parity & LLM Wiki Persistence
- [ ] 100% bitwise parity maintained between root files and `template/` mirrors via `diff -u` (0 diff lines).
- [ ] Detailed technical completion report exported to `docs/06_raw/` with catalog index update in `docs/06_raw/index.md` and chronological log in `docs/06_raw/log.md`.
