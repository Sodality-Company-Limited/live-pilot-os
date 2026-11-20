# DAVE Mathematical Invariant & Assurance Framework: Verification Operator Runbook

**Document Status:** Approved Operational Runbook  
**Version:** 3.0.0  
**Domain:** Operational Governance & CI/CD Verification Playbooks  
**Epic Reference:** PROOF (DAVE Mathematical Invariant & Assurance Epic)  
**Applicable Standard:** Soda OS Hexagonal Architecture, 28-Pillar Senior Engineering Protocol, Global Engineering Constitution  
**Cross-References:**  
- [Verification Architecture Guide](../03-architecture/verification-architecture-guide.md)
- [Proof and Evidence Specification](../03-architecture/proof-and-evidence.md)
- [Quality Priorities](quality-priorities.md)
- [DAVE Mathematical Assurance Queue](../07-backlog/queues/PROOF.md)

---

## 1. Executive Summary & Operator Workflow

This runbook defines standard operating procedures (SOPs) and failure remediation playbooks for human software engineers, release leads, and autonomous AI swarms operating the DAVE Mathematical Invariant & Assurance Framework in Soda OS.

When developing software, executing pull requests, or transitioning goals across the Soda OS lifecycle (`planned` $\to$ `ready` $\to$ `verified` $\to$ `done`), developers must execute the corresponding verification harnesses. Any harness exit code $\ne 0$ halts deployment fail-closed.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│               DAVE CONTINUOUS VERIFICATION OPERATOR PIPELINE                   │
└────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                   1. Preflight Touch Map & Concurrency Check
                   node scripts/harness/touch-map-collision-gate.mjs
                                        │
                                        ▼
                   2. Execute Profile-Specific Proof Harnesses
                   (Property Invariant, Stateful Model, Mutation, etc.)
                                        │
                                        ▼
                   3. Epistemic Demarcation & Anti-Stub Scan
                   node scripts/harness/epistemic-classification-gate.mjs --audit-stubs
                                        │
                                        ▼
                   4. Cryptographic Proof Receipt Emission & Validation
                   node scripts/harness/proof-receipt-validator.mjs <GOAL_ID>
                                        │
                                        ▼
                   5. Goal Lifecycle Promotion & Archival
                   Move to docs/07-backlog/goals/_archived/<GOAL_ID>.md
```

---

## 2. Unified CLI Reference for Proof Harnesses

The Soda OS verification framework provides dedicated verification harnesses in `scripts/harness/`. All harnesses return standard POSIX exit codes:
- **`0`**: PASS — All mathematical assertions and invariants verified cleanly.
- **`1`**: FAIL_ASSERTION — Invariant violation, state divergence, mutation shortfall, or gate rejection.
- **`2`**: TIMEOUT — Execution exceeded bounded time budget.
- **`3`**: SCHEMA_ERROR — Invalid goal contract, malformed receipt JSON, or syntax error.
- **`4`**: REPLAY_DIFF — Counterexample replay divergence or cryptographic hash desynchronization.

### Profile-to-Harness Mapping Matrix

Every goal declares one or more verification profiles from the canonical set of 7 profiles:

| # | Profile Name | Associated Harness Script | Focus Domain |
| :-: | :--- | :--- | :--- |
| 1 | `property_invariant` | `scripts/harness/property-invariant-harness.mjs` | Conservation, monotonicity, idempotency fuzzing |
| 2 | `stateful_model` | `scripts/harness/stateful-model-harness.mjs` | Lockstep shadow oracles, state FSM reachability |
| 3 | `adversarial_boundary` | `scripts/harness/adversarial-boundary-harness.mjs` | Arithmetic extremes, zero floats, dust draining |
| 4 | `mutation_testing` | `scripts/harness/mutation-testing-harness.mjs` | Synthetic AST mutations, >=85% kill score gate |
| 5 | `epistemic_classification` | `scripts/harness/epistemic-classification-gate.mjs` | L0..L4 continuum, anti-pseudo-proof scan |
| 6 | `counterexample` | `scripts/harness/counterexample-minimizer.mjs` | Delta shrinking, SplitMix64 replay, 24h freshness |
| 7 | `concurrency_schedule` | `scripts/harness/concurrency-schedule-harness.mjs` | Interleaving permutation, CAS tagged pointers |

---

### 2.1 Property Invariant Harness (`property-invariant-harness.mjs`)

Executes relational algebraic invariant batteries (conservation, monotonicity, idempotency, commutativity, associativity, invertibility) across configurable iterations ($N \ge 10,000$).

```bash
# Execute standard 10,000-case property fuzzing battery
node scripts/harness/property-invariant-harness.mjs --cases 10000

# Execute with explicit deterministic PRNG seed and verbose logging
node scripts/harness/property-invariant-harness.mjs --cases 50000 --seed 133742 --verbose

# Emit cryptographic proof receipt upon successful pass
node scripts/harness/property-invariant-harness.mjs --cases 10000 --emit-receipt

# Emit structured JSON summary for CI pipeline consumption
node scripts/harness/property-invariant-harness.mjs --cases 10000 --json
```

**Supported Flags:**
- `--cases <N>`: Number of test iterations per invariant (default: `10000`).
- `--seed <N>`: Explicit 64-bit seed for SplitMix64 PRNG.
- `--shrink-timeout <ms>`: Time ceiling for delta counterexample shrinking (default: `5000`).
- `--harness <ID>`: Target goal ID (default: `G-PROOF-005`).
- `--emit-receipt`: Writes proof receipt to `docs/07-backlog/evidence/` and `artifacts/proofs/`.
- `--output-receipt <path>`: Custom destination path for proof receipt.
- `--json`: Emits parseable JSON instead of ANSI terminal output.
- `--verbose`: Prints detailed per-case progress.

---

### 2.2 Stateful Model & Shadow Oracle Harness (`stateful-model-harness.mjs`)

Executes lockstep shadow oracle validation comparing stateful runtime state machines against pure functional reference models across multi-step action sequences.

```bash
# Evaluate all registered domain models (Decision FSM, Wallet Ledger, etc.)
node scripts/harness/stateful-model-harness.mjs --model all

# Execute 500-step random command sequences with deterministic seed
node scripts/harness/stateful-model-harness.mjs --model all --steps 500 --seed 42 --verbose

# Emit cryptographic proof receipt upon pass
node scripts/harness/stateful-model-harness.mjs --model all --output-receipt docs/07-backlog/evidence/G-PROOF-006-proof-receipt.json
```

**Supported Flags:**
- `--model <name|all>`: Specific model name (`dave_decision_fsm`, `stateful_wallet`) or `all`.
- `--steps <N>`: Command sequence length per model (default: `100`).
- `--seed <N>`: PRNG seed for reproducible action sequences (default: `42`).
- `--output-receipt <path>`: Emits proof receipt to specified path.
- `--json`: Emits machine-readable verification summary.
- `--verbose`: Emits detailed state transition reachability graphs.

---

### 2.3 Adversarial Boundary Harness (`adversarial-boundary-harness.mjs`)

Evaluates system kernels against arithmetic extremes, unsigned boundary violations, identity aliasing, precision dust draining, and pathological inputs.

```bash
# Execute standard adversarial boundary suite with 10,000 dust draining steps
node scripts/harness/adversarial-boundary-harness.mjs --dust-iterations 10000

# Run with verbose diagnostic reporting
node scripts/harness/adversarial-boundary-harness.mjs --dust-iterations 10000 --verbose

# Emit proof receipt to evidence directory
node scripts/harness/adversarial-boundary-harness.mjs --output-receipt docs/07-backlog/evidence/G-PROOF-007-proof-receipt.json
```

**Supported Flags:**
- `--dust-iterations <N>`: Number of iterative micro-allocation cycles for precision dust test (default: `10000`).
- `--seed <N>`: PRNG seed for adversarial probe generation (default: `1337`).
- `--output-receipt [path]`: Emits cryptographic proof receipt.
- `--json`: Emits structured probe evaluation results.
- `--verbose`: Prints per-probe assertion traces.

---

### 2.4 Mutation Testing Gate Harness (`mutation-testing-harness.mjs`)

Injects synthetic AST mutations (arithmetic, relational, logical, boundary, return values) into domain code and executes unit tests to verify oracle kill strength.

```bash
# Run mutation testing suite with default 85% kill threshold
node scripts/harness/mutation-testing-harness.mjs --threshold 85

# Target specific domain source file and test runner
node scripts/harness/mutation-testing-harness.mjs --target scripts/lib/ast-mutator.mjs --test "node --test tests/unit/test-mutation-testing-harness.mjs"

# Enforce strict 90% kill threshold with JSON output
node scripts/harness/mutation-testing-harness.mjs --threshold 90 --json
```

**Supported Flags:**
- `--target <path>`: Relative path to target source file to mutate.
- `--test <command>`: Shell test runner command to execute against each mutant.
- `--threshold <N>`: Minimum acceptable mutation kill score percentage (default: `85`).
- `--timeout <ms>`: Per-mutant execution timeout before flagging infinite loop (default: `5000`).
- `--output-receipt [path]`: Emits mutation proof receipt upon gate pass.
- `--json`: Emits structured mutant survival report.
- `--verbose`: Prints unified diffs of killed and surviving mutants.

---

### 2.5 Epistemic Classification Gate (`epistemic-classification-gate.mjs`)

Validates declared epistemic proof tiers ($L_0$ to $L_4$), rejects pseudo-proof claims, and audits source files for undisclosed stubs, mocks, or dummy fallbacks under Article I.

```bash
# Audit proof receipt epistemic validity
node scripts/harness/epistemic-classification-gate.mjs --target docs/07-backlog/evidence/G-PROOF-001-proof-receipt.json

# Audit entire codebase for prohibited mocks, stubs, and dummy fallbacks
node scripts/harness/epistemic-classification-gate.mjs --audit-stubs --verbose

# Validate goal contract epistemic disclosures
node scripts/harness/epistemic-classification-gate.mjs --target docs/07-backlog/goals/G-PROOF-005.md
```

**Supported Flags:**
- `--target <path>`: Goal markdown contract or proof receipt JSON file.
- `--tier <L0..L4>`: Assert target meets specified epistemic tier.
- `--audit-stubs`: Activates AST zero-mock scanner searching for `todo!()`, `unimplemented!()`, and mocks.
- `--output-receipt <path>`: Emits epistemic classification proof receipt.
- `--json`: Emits structured epistemic audit results.
- `--verbose`: Prints detailed diagnostic evidence.

---

### 2.6 Counterexample Minimizer & Freshness Engine (`counterexample-minimizer.mjs`)

Performs delta shrinking on failing counterexamples, manages deterministic failure artifacts, and verifies proof receipt freshness ($< 24\text{h}$) against active Git HEAD.

```bash
# Verify 24-hour cryptographic freshness and Git HEAD alignment for a goal receipt
node scripts/harness/counterexample-minimizer.mjs --freshness --receipt G-PROOF-010

# Minimize failing counterexample and serialize to artifacts/counterexamples/
node scripts/harness/counterexample-minimizer.mjs --minimize --input "[10,20,30,40,50,60,70,80,90,100]"

# Deterministically replay saved counterexample artifact
node scripts/harness/counterexample-minimizer.mjs --replay artifacts/counterexamples/G-PROOF-010-DEMO-INV-001-failure.json
```

**Supported Flags:**
- `--freshness`: Evaluates receipt age, Git commit match, and source file byte hashes.
- `--receipt <ID|path>`: Target goal ID or relative path to receipt JSON.
- `--max-age <hours>`: Maximum permissible receipt age (default: `24`).
- `--minimize`: Runs automated delta shrinking algorithm on failing vector.
- `--replay <path>`: Replays serialized counterexample artifact bit-for-bit.
- `--json`: Emits machine-readable freshness or replay report.

---

### 2.7 Concurrency Schedule Sequentializer Harness (`concurrency-schedule-harness.mjs`)

Verifies concurrent memory safety, atomic CAS operations, 64-bit tagged pointer ABA hazard immunity, and distributed monotonic fencing protocols.

```bash
# Execute concurrency interleaving permutation battery
node scripts/harness/concurrency-schedule-harness.mjs --tasks 3 --depth 6

# Execute with verbose diagnostic output
node scripts/harness/concurrency-schedule-harness.mjs --tasks 3 --depth 6 --verbose

# Emit concurrency proof receipt
node scripts/harness/concurrency-schedule-harness.mjs --output-receipt docs/07-backlog/evidence/G-PROOF-011-proof-receipt.json
```

**Supported Flags:**
- `--tasks <N>`: Number of concurrent asynchronous tasks to interleave (default: `3`).
- `--depth <N>`: Scheduling permutation depth (default: `6`).
- `--output-receipt <path>`: Destination path for concurrency proof receipt.
- `--json`: Emits structured concurrency verification results.
- `--verbose`: Emits step-by-step interleaving trace logs.

---

### 2.8 Proof Receipt Validator (`proof-receipt-validator.mjs`)

Validates cryptographic proof receipts by computing live SHA-256 digests of all referenced source files against the active filesystem and verifying certification status.

```bash
# Validate proof receipt by goal ID
node scripts/harness/proof-receipt-validator.mjs G-PROOF-013

# Validate specific proof receipt file path
node scripts/harness/proof-receipt-validator.mjs docs/07-backlog/evidence/G-PROOF-013-proof-receipt.json
```

---

### 2.9 Touch Map Collision Gate (`touch-map-collision-gate.mjs`)

Preflight gate ensuring that concurrently executed goals maintain strictly disjoint file touch maps ($\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$).

```bash
# Verify zero touch map collisions across all active goals
node scripts/harness/touch-map-collision-gate.mjs

# Strict mode: fail if any active goal has an undeclared touch map
node scripts/harness/touch-map-collision-gate.mjs --strict
```

---

### 2.10 Unified Verification Orchestrator Protocol

The Verification Orchestrator coordinates multi-profile verification across goal lifecycles. When invoked, it inspects goal contract frontmatter, dynamically resolves declared profiles, and sequences execution fail-closed:

```bash
# Execute verification orchestrator across a single goal
node scripts/harness/mathematical-invariant-proof-harness.mjs G-PROOF-001

# Execute comprehensive verification suite across all goals
node scripts/harness/mathematical-invariant-proof-harness.mjs --all
```

**Orchestrator Lifecycle Gates:**
- **Pre-Ready Gate:** Asserts that goal contract syntax is valid, dependencies are satisfied, and touch maps are strictly disjoint.
- **Pre-Done Gate:** Asserts that all declared profile harnesses pass with exit code 0, mutation score $\ge 85\%$, proof receipt is fresh ($< 24\text{h}$), and physical SHA-256 disk byte hashes match.

---

## 3. The 8 Concrete Troubleshooting Playbooks

When a verification harness fails, operators must follow the corresponding structured remediation playbook. Never bypass a failed gate with test skipping or dummy fallbacks.

---

### Playbook 1: Invariant Violation & Delta Shrinking Analysis

**Symptom:** `property-invariant-harness.mjs` exits with code 1:
```
❌ [FAIL] conservation_law
   Failed at case #4821
   Error: Conservation invariant violated: sum(splits)=99 != total=100
   Original counterexample: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
   Shrunk minimal counterexample: [99, 1]
```

**Root Cause:** The domain logic fails to distribute the remainder when integer amounts are not cleanly divisible by the number of parts (e.g., $100 \div 3 = 33$ with remainder $1$).

**Remediation Steps:**
1. Inspect the minimal shrunk counterexample emitted in the error message (e.g., `total=100, parts=3`).
2. Run property harness in single-case debug mode with the reported PRNG seed:
   ```bash
   node scripts/harness/property-invariant-harness.mjs --cases 100 --seed 133742 --verbose
   ```
3. Locate the integer division logic in the domain module (e.g., `scripts/lib/invariant-runner.mjs`):
   ```javascript
   // INCORRECT (Loses remainder):
   const base = Math.floor(total / parts);
   return Array(parts).fill(base);

   // CORRECT (Distributes remainder deterministically):
   const base = Math.floor(total / parts);
   const rem = total % parts;
   const result = [];
   for (let i = 0; i < parts; i++) {
     result.push(base + (i < rem ? 1 : 0));
   }
   return result;
   ```
4. Re-run property invariant harness to verify clean 10,000-case pass:
   ```bash
   node scripts/harness/property-invariant-harness.mjs --cases 10000
   ```

---

### Playbook 2: Shadow Oracle State Divergence Remediation

**Symptom:** `stateful-model-harness.mjs` exits with code 1:
```
❌ Stateful Model Verification Failed: State divergence at step #14 (command: SUBMIT_REVIEW)
   Key 'confidence_score' mismatched: SUT=0.820, Model=0.850
```

**Root Cause:** The System Under Test (SUT) applies a state mutation or penalty that diverges from the pure functional reference model.

**Remediation Steps:**
1. Re-run stateful model harness with `--verbose` to view reachability graph and command sequence:
   ```bash
   node scripts/harness/stateful-model-harness.mjs --model dave_decision_fsm --steps 50 --verbose
   ```
2. Locate the command definition triggering divergence (e.g., `SUBMIT_REVIEW`).
3. Compare the SUT implementation against the reference model in `scripts/lib/shadow-oracle-validator.mjs`.
4. Check whether floating-point rounding caused the 0.030 score divergence. Convert all calculations to integer minor units (e.g., score in basis points $0..10000$).
5. Verify that both SUT and Shadow Oracle apply identical state transition formulas.
6. Re-run stateful model harness clean:
   ```bash
   node scripts/harness/stateful-model-harness.mjs --model all
   ```

---

### Playbook 3: Adversarial Arithmetic Extremes & Precision Dust Remediation

**Symptom:** `adversarial-boundary-harness.mjs` exits with code 1:
```
✖ [extremal_arithmetic] 18/20 probes passed
  - Failure: INT64_MAX addition did not fail closed (overflowed to negative integer)
💎 Precision Dust Conservation: DRIFT
   Drift Observed: 12 minor units across 10,000 iterations
```

**Root Cause:**
- Arithmetic addition exceeds $2^{63}-1$ without checked overflow guards.
- Micro-allocation rounding repeatedly truncates remainders downwards rather than using Banker's Rounding Half-Even (`div_half_even`), causing statistical balance drift.

**Remediation Steps:**
1. Check integer operations in target kernel for checked arithmetic guards:
   ```javascript
   // Checked 64-bit integer addition
   export function checkedAdd(a, b) {
     const sum = BigInt(a) + BigInt(b);
     if (sum > 0x7fffffffffffffffn || sum < -0x8000000000000000n) {
       throw new RangeError('Integer arithmetic overflow');
     }
     return sum;
   }
   ```
2. Replace truncated integer division with Banker's Rounding Half-Even in precision distribution routines:
   ```javascript
   export function divHalfEven(numerator, denominator) {
     const num = BigInt(numerator);
     const den = BigInt(denominator);
     const quotient = num / den;
     const rem = num % den;
     if (rem * 2n > den || (rem * 2n === den && (quotient & 1n) === 1n)) {
       return quotient + 1n;
     }
     return quotient;
   }
   ```
3. Re-run adversarial boundary harness:
   ```bash
   node scripts/harness/adversarial-boundary-harness.mjs --dust-iterations 10000 --verbose
   ```

---

### Playbook 4: Mutation Kill Score Shortfall Remediation (< 85%)

**Symptom:** `mutation-testing-harness.mjs` exits with code 1:
```
📊 Mutation Score: 78.4% (Target: >= 85.0%)
   Total Mutants: 51 | Killed: 40 | Survived: 11
   Surviving Mutant #14: Relational operator '<=' mutated to '<' at line 42
```

**Root Cause:** The unit test suite contains weak assertions or missing boundary tests. The test suite exercises code lines without asserting exact boundary behaviors (e.g., testing balance $= 100$ and balance $= 0$, but never testing exact boundary balance $= \text{threshold}$).

**Remediation Steps:**
1. Run mutation harness with `--verbose` to view unified diffs of surviving mutants:
   ```bash
   node scripts/harness/mutation-testing-harness.mjs --threshold 85 --verbose
   ```
2. Inspect the surviving mutant AST locations in the report.
3. Author targeted unit tests specifically asserting the mutated boundary:
   - If `<=` was mutated to `<` without failure: Add a test case evaluating input exactly equal to the boundary.
   - If `*` was mutated to `/` without failure: Add a test verifying non-zero, non-one scalar multiplication.
   - If return value was mutated to `false` without failure: Add assertions checking return payload validity.
4. Execute unit test suite to confirm all tests pass:
   ```bash
   node --test tests/unit/test-*.mjs
   ```
5. Re-run mutation harness to confirm kill score $\ge 85\%$:
   ```bash
   node scripts/harness/mutation-testing-harness.mjs --threshold 85
   ```

---

### Playbook 5: Epistemic Pseudo-Proof & Undisclosed Stub Remediation

**Symptom:** `epistemic-classification-gate.mjs` exits with code 1:
```
❌ EPISTEMIC_DEMARCATION_ERROR: Goal G-PROOF-009 claims L1 Formal Proof
   Reason: Only unit tests provided; missing formal SMT-LIB2 / Coq proof certificate.
❌ ARTICLE_I_ZERO_MOCK_VIOLATION: Prohibited stub found in src/kernel.mjs:84
   Pattern: return Promise.resolve({ status: "dummy_mock" })
```

**Root Cause:**
- An engineer or AI agent marked a goal card with `proof_level: L1` without generating formal theorem proofs.
- A placeholder mock or stub was left in production code.

**Remediation Steps:**
1. Run full epistemic audit scan:
   ```bash
   node scripts/harness/epistemic-classification-gate.mjs --audit-stubs --verbose
   ```
2. **For Stub Violations:** Immediately replace the stub with genuine, production-ready operational logic. Remove all placeholder returns, dummy mocks, and `todo!()` blocks.
3. **For Pseudo-Proof Claims:** Demote the claimed `proof_level` in the goal card YAML frontmatter:
   - If verified via generative property fuzzing ($\ge 10,000$ cases): Demote to `proof_level: L2`.
   - If verified via statistical trials: Demote to `proof_level: L3`.
   - If relying upon unverified prose: Demote to `proof_level: L0`.
4. Re-run epistemic gate to confirm zero violations:
   ```bash
   node scripts/harness/epistemic-classification-gate.mjs --audit-stubs
   ```

---

### Playbook 6: Counterexample Replay & Deterministic Minimization

**Symptom:** `counterexample-minimizer.mjs` exits with code 1:
```
❌ REPLAY_DIVERGENCE: Counterexample artifacts/counterexamples/failure.json could not be reproduced.
   Expected Failure Step: 42 | Actual Outcome: PASS
```

**Root Cause:** The counterexample execution relied upon non-deterministic state (unseeded PRNG, system clock access, unpinned database ordering, or unmocked external environment).

**Remediation Steps:**
1. Inspect the counterexample JSON file for recorded seed and environment parameters:
   ```bash
   cat artifacts/counterexamples/failure.json
   ```
2. Ensure the domain logic uses the deterministic `SplitMix64` PRNG with the recorded seed rather than `Math.random()`.
3. Eliminate direct `Date.now()` or `new Date()` calls from the domain logic; inject timestamps as parameters via driving ports.
4. Run deterministic replay command:
   ```bash
   node scripts/harness/counterexample-minimizer.mjs --replay artifacts/counterexamples/failure.json
   ```
5. Once deterministic failure is reproduced, apply domain logic fix and re-run replay: verify that replay now passes cleanly.

---

### Playbook 7: Stale Receipt & Hash Desync Re-binding

**Symptom:** `proof-receipt-validator.mjs` exits with code 1:
```
❌ Proof Receipt Validation Failed for: docs/07-backlog/evidence/G-PROOF-013-proof-receipt.json
  - SHA256 mismatch for docs/03-architecture/verification-architecture-guide.md:
    Receipt recorded: 8a3f91b72e0d..., current working tree is 1c4e92a83f1b...
```

**Root Cause:** A source file referenced by the proof receipt was modified after the receipt was generated, causing a cryptographic hash desynchronization.

**Remediation Steps:**
1. Review the git diff for the touched files:
   ```bash
   git diff docs/03-architecture/verification-architecture-guide.md
   ```
2. Re-run the test suite and documentation conformance harness to verify that all modifications are valid:
   ```bash
   node --test tests/unit/test-verification-documentation-conformance.mjs
   ```
3. Re-bind and regenerate the proof receipt using active disk byte hashes and current Git commit:
   ```bash
   # Re-generate receipt with live disk hashes
   node scripts/harness/proof-receipt-validator.mjs G-PROOF-013
   ```
4. Verify that both `docs/07-backlog/evidence/G-PROOF-013-proof-receipt.json` and `artifacts/proofs/G-PROOF-013-proof-receipt.json` are bit-for-bit identical and pass validation cleanly:
   ```bash
   node scripts/harness/proof-receipt-validator.mjs G-PROOF-013
   ```

---

### Playbook 8: Concurrency Race & Deadlock Resolution

**Symptom:** `concurrency-schedule-harness.mjs` exits with code 1:
```
❌ CONCURRENCY_RACE_DETECTED: Lost update observed under schedule interleaving #248
   Task 1 and Task 2 read balance=100 concurrently; final balance=150 (expected: 200)
```

**Root Cause:** A read-modify-write sequence lacks atomic serialization or proper lock ordering, causing race conditions under concurrent execution.

**Remediation Steps:**
1. Run concurrency harness with `--verbose` to inspect the failing interleaving schedule:
   ```bash
   node scripts/harness/concurrency-schedule-harness.mjs --tasks 3 --depth 6 --verbose
   ```
2. **For Lost Updates:** Replace non-atomic operations with atomic Compare-And-Swap (CAS) or atomic database transactions (`SELECT ... FOR UPDATE`).
3. **For ABA Hazards:** Implement 64-bit tagged pointer packing with monotonic version counters (`AtomicTaggedPointer`).
4. **For Deadlocks:** Sort all acquired resource IDs in strictly ascending lexicographical order prior to lock acquisition.
5. Re-run concurrency schedule harness to verify all interleavings pass:
   ```bash
   node scripts/harness/concurrency-schedule-harness.mjs --tasks 3 --depth 6
   ```

---

## 4. End-to-End Operator Checklist

Before submitting a pull request, tagging a release, or archiving a goal card, operators must complete this verification checklist:

- [ ] **Preflight Touch Maps:** `node scripts/harness/touch-map-collision-gate.mjs` passes with zero overlaps.
- [ ] **Unit Tests:** `node --test tests/unit/test-*.mjs` passes $100\%$ green with zero failures.
- [ ] **Property Invariants:** `node scripts/harness/property-invariant-harness.mjs --cases 10000` passes cleanly.
- [ ] **Stateful Models:** `node scripts/harness/stateful-model-harness.mjs --model all` passes cleanly.
- [ ] **Adversarial Boundaries:** `node scripts/harness/adversarial-boundary-harness.mjs --dust-iterations 10000` passes cleanly.
- [ ] **Mutation Testing:** `node scripts/harness/mutation-testing-harness.mjs --threshold 85` achieves $\ge 85\%$ kill score.
- [ ] **Epistemic Gate & Zero Mocks:** `node scripts/harness/epistemic-classification-gate.mjs --audit-stubs` reports zero pseudo-proofs and zero stubs.
- [ ] **Receipt Freshness & Validation:** `node scripts/harness/proof-receipt-validator.mjs <GOAL_ID>` exits with code 0.
- [ ] **Senior Engineering Gate:** `node scripts/harness/senior-engineering-gate-harness.mjs` reports 0 violations across all 28 pillars.
- [ ] **Goal Conformance:** `node scripts/harness/goal-template-conformance-harness.mjs <GOAL_FILE>` passes 51/51 sections.
- [ ] **Template Parity:** `diff -u <FILE> template/<FILE>` returns zero diff lines across all touched files.
