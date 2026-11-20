#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS PROOF HARNESS ROADMAP GOAL GENERATOR (G-PROOF-003 TO G-PROOF-013)
 * ════════════════════════════════════════════════════════════════════════════════
 * Generates 100% compliant, 51-section canonical Soda OS Template v2 goal cards
 * for the PROOF verification harness enhancement epic.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

export const PROOF_GOALS = [
  {
    id: 'G-PROOF-003',
    title: 'Goal Verification Contract Foundation & Profile Schema Specification',
    kind: 'architecture',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Machine-readable Goal Contract v3 schema and verification profile extension framework uniting invariants, proof levels, and rollback contracts.',
    dependsOn: 'G-PROOF-001, G-PROOF-002',
    blocks: 'G-PROOF-004, G-PROOF-005, G-PROOF-006, G-PROOF-007, G-PROOF-008, G-PROOF-009, G-PROOF-010, G-PROOF-011, G-PROOF-012, G-PROOF-013',
    context: 'Soda OS goal cards currently define informal frontmatter metadata and markdown narrative sections. Without a machine-readable JSON schema defining the Goal Contract v3 and modular verification profiles (formal, property, stateful, adversarial, mutation, concurrency, statistical), automated harnesses cannot reliably validate whether a goal satisfies its required verification obligations before promotion.',
    why: 'Establishes the foundational contract layer for all Soda OS goals, enabling machine-verifiable assurance profiles and decoupled harness execution.',
    doneWhen: 'The Goal Contract v3 JSON Schema is formally authored and validated, defining universal fields and 7 profile-based extensions with backward compatibility for v2 cards.',
    unblocks: 'Goal-template conformance harness enhancement (G-PROOF-004) and all specialized verification harnesses (G-PROOF-005 to G-PROOF-011).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-003.md',
      'docs/03-architecture/verification-contract-schema.md',
      'schemas/goal-contract-v3.schema.json'
    ],
    inScope: [
      'Goal Contract v3 JSON Schema specification (universal fields: atomicity, dependencies, touch map, rollback contract).',
      '7 Verification Profile schemas: proof_formal, property_invariant, stateful_model, adversarial_boundary, mutation_testing, concurrency_memory, statistical_calibration.',
      'Backward compatibility mapping rules translating Template v2 goal cards to v3 contracts.'
    ],
    outScope: [
      'Modifying production application logic or runtime kernels.',
      'Implementing solver integrations (Z3/Kani) or property test runners directly in this goal.',
      'Modifying downstream project files outside declared touch map.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Define Goal Contract v3 Universal Schema & Invariant Types',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-003.md, docs/03-architecture/verification-contract-schema.md, schemas/goal-contract-v3.schema.json',
        actions: [
          'Specify JSON Schema Draft 2020-12 defining universal goal contract properties.',
          'Define machine-readable enums for invariant classes: conservation, monotonicity, idempotency, reachability, termination.'
        ],
        completionGate: 'schemas/goal-contract-v3.schema.json parses cleanly with zero schema validation errors.',
        stopCondition: 'Invalid schema syntax or unrepresented universal contract property.'
      },
      {
        title: 'Step 2 — Codify Modular Verification Profile Schemas',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-003.md, docs/03-architecture/verification-contract-schema.md, schemas/goal-contract-v3.schema.json',
        actions: [
          'Specify profile schemas for formal_proof, property_invariant, stateful_model, adversarial_boundary, mutation_testing, concurrency_memory, and statistical_calibration.',
          'Document Hoare Triple precondition/postcondition structures and solver assumption boundaries.'
        ],
        completionGate: 'All 7 profile schemas compile and validate against schema test fixtures.',
        stopCondition: 'Ambiguous profile inheritance or schema collision across profiles.'
      },
      {
        title: 'Step 3 — Author Architecture Specification & Backward Compatibility Guide',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-003.md, docs/03-architecture/verification-contract-schema.md',
        actions: [
          'Document verification contract architecture in docs/03-architecture/verification-contract-schema.md.',
          'Specify deterministic translation rules converting legacy v2 cards to v3 schema without data loss.'
        ],
        completionGate: 'Architecture guide is fully linked with zero broken markdown references.',
        stopCondition: 'Unresolved translation ambiguity or missing rollback specification.'
      }
    ],
    acceptanceCriteria: [
      'Goal Contract v3 JSON Schema validates against JSON Schema Draft 2020-12 with zero schema errors.',
      'All 7 verification profiles (formal, property, stateful, adversarial, mutation, concurrency, statistical) define concrete, machine-readable validation constraints.',
      'Backward compatibility mapping rules preserve 100% of legacy v2 fields while enabling incremental adoption.',
      'Goal-template conformance harness passes 100% on G-PROOF-003 with zero violations.'
    ]
  },
  {
    id: 'G-PROOF-004',
    title: 'Goal-Template Conformance Harness Enhancement & Touch-Map Collision Gate',
    kind: 'governance',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Enhanced goal-template conformance harness validating Goal Contract v3 schemas, single-outcome atomicity, and cross-goal touch-map collision detection.',
    dependsOn: 'G-PROOF-003',
    blocks: 'G-PROOF-012',
    context: 'The existing goal-template conformance harness performs regular-expression scans on markdown headings. It does not validate machine-readable Goal Contract v3 schemas, does not cross-check active goals for parallel touch-map write collisions, and cannot detect multi-outcome scope creep embedded within complex work steps.',
    why: 'Prevents parallel subagents from corrupting shared repositories via concurrent file writes and guarantees that every admitted goal represents exactly one atomic outcome.',
    doneWhen: 'The enhanced harness strictly validates Goal Contract v3 schemas, enforces single-outcome atomicity, and flags any pairwise touch-map overlap across active goals fail-closed.',
    unblocks: 'Unified verification orchestrator (G-PROOF-012).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-004.md',
      'scripts/harness/goal-template-conformance-harness.mjs',
      'tests/unit/test-goal-template-conformance-v3.mjs'
    ],
    inScope: [
      'Enhancing goal-template-conformance-harness.mjs with Goal Contract v3 schema validation.',
      'Implementing cross-goal touch-map collision detector verifying TouchMap(A) ∩ TouchMap(B) = ∅.',
      'Unit test suite in tests/unit/test-goal-template-conformance-v3.mjs verifying positive and negative validation passes.'
    ],
    outScope: [
      'Modifying production application logic or runtime daemons.',
      'Modifying other harness scripts outside declared touch map.',
      'Changing archived goal cards in docs/07-backlog/goals/_archived/.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Integrate Goal Contract v3 Schema Validator into Harness',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-004.md, scripts/harness/goal-template-conformance-harness.mjs',
        actions: [
          'Import schemas/goal-contract-v3.schema.json and validate goal frontmatter blocks.',
          'Enforce strict single-outcome atomicity rejecting compound conjunctions in primary outcomes.'
        ],
        completionGate: 'Harness correctly validates conforming v3 goals and rejects malformed frontmatter.',
        stopCondition: 'Regression on existing conforming goal cards.'
      },
      {
        title: 'Step 2 — Implement Cross-Goal Touch-Map Collision Detection',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-004.md, scripts/harness/goal-template-conformance-harness.mjs',
        actions: [
          'Scan active goals in docs/07-backlog/goals/ and compute pairwise touch-map intersections.',
          'Fail closed with exit code 1 if any non-disjoint write paths are detected between concurrent goals.'
        ],
        completionGate: 'Collision detector identifies synthetic overlapping touch maps in test fixtures.',
        stopCondition: 'False-positive collision detection on legitimate read-only reference files.'
      },
      {
        title: 'Step 3 — Automated Unit Test Suite & Regression Verification',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-004.md, tests/unit/test-goal-template-conformance-v3.mjs',
        actions: [
          'Implement test suite verifying schema validation, atomicity checks, and collision detection.',
          'Execute regression battery across all active and template goal cards.'
        ],
        completionGate: 'tests/unit/test-goal-template-conformance-v3.mjs passes 100% green with zero failures.',
        stopCondition: 'Failing test assertion or unhandled exception during goal scan.'
      }
    ],
    acceptanceCriteria: [
      'Goal template conformance harness validates Goal Contract v3 schema and reports structured diagnostics.',
      'Touch-map collision detection flags overlapping write boundaries across active goals with exit code 1.',
      'Unit test suite achieves 100% pass rate across positive, negative, and edge-case goal fixtures.',
      'Zero-mock invariant verified with 100% operational logic across all touched files.'
    ]
  },
  {
    id: 'G-PROOF-005',
    title: 'Property-Based Invariant Execution Harness & Shrinking Engine',
    kind: 'feature',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Standardized property-based invariant execution harness with deterministic PRNG seed replay, case generators, and automated counterexample shrinking.',
    dependsOn: 'G-PROOF-003',
    blocks: 'G-PROOF-006, G-PROOF-007, G-PROOF-012',
    context: 'While Soda OS possesses ad-hoc property assertions in specialized test scripts, it lacks a standardized, reusable property-based testing harness. Engineers cannot declare relational invariants (conservation, monotonicity, idempotency) in a uniform configuration, run deterministic seed-based fuzzing batteries, or receive automated counterexample shrinking upon invariant failure.',
    why: 'Bridges example-based unit testing with statistical state-space exploration, discovering unhandled boundary bugs and delivering minimal reproducible failure traces.',
    doneWhen: 'The property-invariant harness is implemented in scripts/harness/property-invariant-harness.mjs, supporting seed replay, generators for primitive types, and shrinking algorithms.',
    unblocks: 'Stateful model-based testing harness (G-PROOF-006) and adversarial boundary harness (G-PROOF-007).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-005.md',
      'scripts/harness/property-invariant-harness.mjs',
      'tests/unit/test-property-invariant-harness.mjs'
    ],
    inScope: [
      'Property invariant harness runner in scripts/harness/property-invariant-harness.mjs.',
      'Deterministic pseudorandom generators with configurable seeds and iteration counts (N >= 1,000).',
      'Counterexample shrinking algorithm delivering minimal failing input vectors.',
      'Unit tests in tests/unit/test-property-invariant-harness.mjs.'
    ],
    outScope: [
      'Modifying production financial or consensus code.',
      'Stateful multi-step transition chains (deferred to G-PROOF-006).',
      'External SMT solver installations.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement Invariant Property Runner & Deterministic PRNG',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-005.md, scripts/harness/property-invariant-harness.mjs',
        actions: [
          'Implement PCG or SplitMix64 deterministic PRNG supporting seed initialization and replay.',
          'Implement generator combinators for integers, floats, strings, arrays, and objects.'
        ],
        completionGate: 'Generators produce identical pseudo-random distributions given identical seeds.',
        stopCondition: 'Non-deterministic PRNG behavior or seed leakage across trials.'
      },
      {
        title: 'Step 2 — Implement Automated Counterexample Shrinking Algorithm',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-005.md, scripts/harness/property-invariant-harness.mjs',
        actions: [
          'Implement binary search and integer decrement shrinking towards zero and boundary values.',
          'Implement array element removal and string truncation shrinkers preserving invariant failure.'
        ],
        completionGate: 'Shrinking engine reduces complex failing vectors to minimal 1-step counterexamples.',
        stopCondition: 'Shrinker loop divergence or failure to preserve the invariant violation.'
      },
      {
        title: 'Step 3 — Author CLI Interface, Receipt Emitter & Verification Battery',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-005.md, scripts/harness/property-invariant-harness.mjs, tests/unit/test-property-invariant-harness.mjs',
        actions: [
          'Implement CLI flags: --seed, --cases, --harness, --shrink-timeout, --output-receipt.',
          'Author unit tests verifying conservation laws, monotonicity, and idempotency property checks.'
        ],
        completionGate: 'tests/unit/test-property-invariant-harness.mjs passes 100% green with exit code 0.',
        stopCondition: 'Failing test assertion or receipt emission failure.'
      }
    ],
    acceptanceCriteria: [
      'Property-based harness executes N >= 1,000 trials deterministically from a declared integer seed.',
      'Shrinking algorithm reduces multi-variable failing inputs to minimal reproducible boundary values.',
      'Harness emits structured JSON execution receipts including seed, trial count, and shrunk counterexamples.',
      'Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.'
    ]
  },
  {
    id: 'G-PROOF-006',
    title: 'Stateful Model-Based Testing Harness & Shadow Oracle Validator',
    kind: 'feature',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Stateful model-based testing harness comparing runtime state-machine transitions against a deterministic shadow reference model across generated command sequences.',
    dependsOn: 'G-PROOF-005',
    blocks: 'G-PROOF-012',
    context: 'Systems with complex lifecycles (such as DAVE state machines, WAL recovery, and consensus lease managers) cannot be verified solely by stateless function property checks. Subtle bugs emerge only across sequences of interleaved state transitions. Soda OS requires a stateful model-based harness that generates valid and invalid command sequences and compares System Under Test (SUT) states against a pure shadow reference model.',
    why: 'Detects illegal state reachability, out-of-order execution, reentrancy vulnerabilities, and saga rollback inconsistencies across multi-step execution traces.',
    doneWhen: 'scripts/harness/stateful-model-harness.mjs is operational, executing stateful command sequences against shadow models and emitting minimized failing action traces.',
    unblocks: 'Unified verification orchestrator (G-PROOF-012).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-006.md',
      'scripts/harness/stateful-model-harness.mjs',
      'tests/unit/test-stateful-model-harness.mjs'
    ],
    inScope: [
      'Stateful command generator producing valid and adversarial action sequences.',
      'Shadow model execution engine comparing state invariants after every transition.',
      'Action-trace shrinker that removes non-essential intermediate commands upon failure.',
      'Unit test suite in tests/unit/test-stateful-model-harness.mjs.'
    ],
    outScope: [
      'Modifying production state machine implementations.',
      'Hardware-level memory model checking (deferred to G-PROOF-011).',
      'Third-party distributed database cluster orchestration.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement Stateful Command Sequence Generator',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-006.md, scripts/harness/stateful-model-harness.mjs',
        actions: [
          'Define Command interface: precondition(state), run(sut, state), postcondition(sut, state).',
          'Generate randomized command sequences with state-dependent feasibility filtering.'
        ],
        completionGate: 'Generator produces valid, reproducible multi-step execution sequences.',
        stopCondition: 'Infinite loop during sequence generation or invalid precondition evaluation.'
      },
      {
        title: 'Step 2 — Implement Shadow Reference Model State Comparison Engine',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-006.md, scripts/harness/stateful-model-harness.mjs',
        actions: [
          'Execute parallel state transitions on SUT and pure reference shadow model.',
          'Assert state equivalence and system law preservation after every individual command step.'
        ],
        completionGate: 'State comparison engine detects state divergence and throws structured discrepancy errors.',
        stopCondition: 'False-positive divergence caused by non-deterministic shadow model evaluation.'
      },
      {
        title: 'Step 3 — Implement Trace Shrinker & Automated Unit Test Suite',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-006.md, scripts/harness/stateful-model-harness.mjs, tests/unit/test-stateful-model-harness.mjs',
        actions: [
          'Implement trace shrinker removing redundant commands while preserving the state failure.',
          'Author unit tests verifying stateful transition detection on simulated FSM models.'
        ],
        completionGate: 'tests/unit/test-stateful-model-harness.mjs passes 100% green with exit code 0.',
        stopCondition: 'Failing test assertion or unhandled state transition error.'
      }
    ],
    acceptanceCriteria: [
      'Stateful harness generates multi-step command traces and evaluates shadow model equivalence after each step.',
      'Trace shrinker minimizes failing command sequences to the exact minimal sequence reproducing the bug.',
      'Harness detects state desynchronizations, reentrancy bugs, and illegal state reachability fail-closed.',
      'Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.'
    ]
  },
  {
    id: 'G-PROOF-007',
    title: 'Adversarial Boundary & Extremal Arithmetic Mutation Harness',
    kind: 'feature',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Adversarial boundary harness probing identity aliasing collisions, arithmetic extremes, unsigned underflow, and precision dust leakage with fail-closed rejection.',
    dependsOn: 'G-PROOF-005',
    blocks: 'G-PROOF-008, G-PROOF-012',
    context: 'Catastrophic failures in software kernels occur predominantly at pathological boundary conditions: self-transfer aliasing ($from == to$), arithmetic extremes (0, 1, MAX - 1, MAX), integer wraps, zero divisors, and fractional precision dust. Soda OS currently tests these through goal-specific ad-hoc scripts rather than a unified, reusable adversarial boundary harness.',
    why: 'Systematically immunizes domain kernels against boundary exploits, economic balance draining, and arithmetic runtime panics.',
    doneWhen: 'scripts/harness/adversarial-boundary-harness.mjs is implemented, providing reusable test generators across the 4 invariant edge categories and verifying fail-closed handling.',
    unblocks: 'Framework mutation testing gate (G-PROOF-008) and unified orchestrator (G-PROOF-012).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-007.md',
      'scripts/harness/adversarial-boundary-harness.mjs',
      'tests/unit/test-adversarial-boundary-harness.mjs'
    ],
    inScope: [
      'Adversarial boundary test engine in scripts/harness/adversarial-boundary-harness.mjs.',
      'Boundary generators for identity aliasing ($A == B$), arithmetic extremes ($0, 1, 2^{63}-1, 2^{64}-1$), and zero divisors.',
      'Precision dust draining simulator testing Banker\'s rounding and conservation across 10,000 micro-operations.',
      'Unit test suite in tests/unit/test-adversarial-boundary-harness.mjs.'
    ],
    outScope: [
      'Modifying production arithmetic or ledger files.',
      'Operating system hardware fault injection (handled by SRE chaos harnesses).',
      'Network physical packet mutation.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement Boundary Value & Identity Aliasing Generators',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-007.md, scripts/harness/adversarial-boundary-harness.mjs',
        actions: [
          'Implement generators targeting extremal integer points: 0, 1, MAX - 1, MAX, negative bounds.',
          'Implement entity aliasing generators injecting from == to, identical source/destination pointers, and overlapping buffers.'
        ],
        completionGate: 'Generators systematically produce adversarial test matrices for target interfaces.',
        stopCondition: 'Missing boundary values or incorrect integer representation limits.'
      },
      {
        title: 'Step 2 — Implement Precision Dust & Zero-Divisor Probing Engine',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-007.md, scripts/harness/adversarial-boundary-harness.mjs',
        actions: [
          'Simulate repeated dust transfers ($1 minor unit across 10,000 iterations) verifying conservation.',
          'Inject zero denominators and non-canonical floating point values (NaN, Inf) verifying fail-closed rejection.'
        ],
        completionGate: 'Probing engine accurately identifies rounding leakage and unhandled division by zero.',
        stopCondition: 'Tolerance of arithmetic drift or unhandled runtime panic.'
      },
      {
        title: 'Step 3 — Author Test Suite & Adversarial Proof Receipt Emitter',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-007.md, scripts/harness/adversarial-boundary-harness.mjs, tests/unit/test-adversarial-boundary-harness.mjs',
        actions: [
          'Author unit tests validating adversarial boundary detection against sample vulnerable kernels.',
          'Emit structured adversarial proof receipts with exact test probe counts and exit codes.'
        ],
        completionGate: 'tests/unit/test-adversarial-boundary-harness.mjs passes 100% green with exit code 0.',
        stopCondition: 'Failing test assertion or invalid receipt format.'
      }
    ],
    acceptanceCriteria: [
      'Adversarial harness probes 100% of defined boundary categories: identity aliasing, arithmetic extremes, and zero divisors.',
      'Precision dust simulation verifies zero-loss conservation across 10,000 consecutive micro-transactions.',
      'All boundary violations trigger deterministic, fail-closed exceptions without process panics.',
      'Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.'
    ]
  },
  {
    id: 'G-PROOF-008',
    title: 'Framework Mutation Testing Gate & Test Oracle Strength Verifier',
    kind: 'governance',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Automated mutation testing gate injecting synthetic AST mutation operators into target domain logic and enforcing minimum mutation kill score thresholds.',
    dependsOn: 'G-PROOF-007',
    blocks: 'G-PROOF-012',
    context: 'High test coverage metrics (100% statement, branch, or line coverage) frequently create a dangerous illusion of security. Tests that achieve 100% branch coverage can completely miss critical bugs if their assertions are weak or tautological. Soda OS requires an automated mutation testing gate that mutates AST nodes (operators, relational comparisons, boundary values) to empirically prove that test suites kill invalid mutations.',
    why: 'Verifies the quality and strength of test oracles, guaranteeing that test suites actively detect and fail on regressions.',
    doneWhen: 'scripts/harness/mutation-testing-gate-harness.mjs is operational, injecting mutation operators, computing mutation scores, and failing CI when kill rates drop below 85%.',
    unblocks: 'Unified verification orchestrator (G-PROOF-012).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-008.md',
      'scripts/harness/mutation-testing-gate-harness.mjs',
      'tests/unit/test-mutation-testing-gate.mjs'
    ],
    inScope: [
      'Mutation testing gate harness in scripts/harness/mutation-testing-gate-harness.mjs.',
      'AST mutation operators: relational mutations (< to <=, > to >=, == to !=), arithmetic mutations (+ to -, * to /), and statement deletion.',
      'Configurable mutation kill score thresholds (default: >= 85%).',
      'Unit test suite in tests/unit/test-mutation-testing-gate.mjs.'
    ],
    outScope: [
      'Modifying production domain logic.',
      'Running unbounded full-codebase mutation runs on every commit (scoped to goal touch maps).',
      'Replacing formal proofs with mutation testing (epistemic distinction maintained).'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement AST Mutation Operators & In-Memory Patch Engine',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-008.md, scripts/harness/mutation-testing-gate-harness.mjs',
        actions: [
          'Implement parser for JS/TS/Rust AST structures to locate mutable operator sites.',
          'Define mutation operators: ComparisonInversion, ArithmeticReplacement, BoundaryShift, ReturnNullification.'
        ],
        completionGate: 'Mutator generates syntactically valid mutant variants without corrupting disk state.',
        stopCondition: 'Generation of uncompilable mutants that cause trivial syntax failures.'
      },
      {
        title: 'Step 2 — Implement Test Runner Fork & Mutation Score Calculator',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-008.md, scripts/harness/mutation-testing-gate-harness.mjs',
        actions: [
          'Execute target test suite against each generated mutant with execution timeouts.',
          'Calculate MutationScore = (MutantsKilled / TotalMutants) * 100% and generate surviving mutant report.'
        ],
        completionGate: 'Score calculator accurately classifies killed vs surviving mutants.',
        stopCondition: 'Runner deadlock or infinite loop caused by mutated termination conditions.'
      },
      {
        title: 'Step 3 — Implement CI Gate Policy & Automated Unit Test Suite',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-008.md, scripts/harness/mutation-testing-gate-harness.mjs, tests/unit/test-mutation-testing-gate.mjs',
        actions: [
          'Enforce fail-closed gate policy: exit code 1 if MutationScore < threshold (default 85%).',
          'Author unit tests verifying mutant detection, surviving mutant logging, and timeout handling.'
        ],
        completionGate: 'tests/unit/test-mutation-testing-gate.mjs passes 100% green with exit code 0.',
        stopCondition: 'Failing test assertion or threshold miscalculation.'
      }
    ],
    acceptanceCriteria: [
      'Mutation gate injects synthetic faults across comparison, arithmetic, and boundary operators.',
      'Calculates mutation score and enforces configured threshold (>= 85% kill rate) fail-closed.',
      'Reports exact source line and operator diff for all surviving mutants.',
      'Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.'
    ]
  },
  {
    id: 'G-PROOF-009',
    title: 'Epistemic Proof Classification & Abstraction Boundary Disclosure Gate',
    kind: 'governance',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Epistemic verification gate enforcing strict L1-L4 evidence classification, rejecting pseudo-proof claims, and mandating explicit disclosure of stubs and abstraction assumptions.',
    dependsOn: 'G-PROOF-003',
    blocks: 'G-PROOF-010, G-PROOF-012',
    context: 'A critical vulnerability in automated software assurance is the inflation of test claims: treating property tests as formal proofs, or claiming unbounded correctness when an SMT solver operated over heavily stubbed abstractions or bounded loop unwinding. Soda OS requires an epistemic classification gate that verifies evidence tier validity (L1 formal proof, L2 executable invariant, L3 statistical evidence, L4 operational telemetry) and enforces full disclosure of abstraction boundaries.',
    why: 'Prevents deceptive or ungrounded proof claims, maintaining rigorous epistemic integrity across all goals and certificates.',
    doneWhen: 'scripts/harness/epistemic-classification-gate.mjs is operational, validating proof receipts against epistemic criteria and rejecting undisclosed stubs or pseudo-proof claims.',
    unblocks: 'Standardized counterexample and receipt engine (G-PROOF-010) and unified orchestrator (G-PROOF-012).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-009.md',
      'scripts/harness/epistemic-classification-gate.mjs',
      'tests/unit/test-epistemic-classification-gate.mjs'
    ],
    inScope: [
      'Epistemic classification gate in scripts/harness/epistemic-classification-gate.mjs.',
      'Anti-pseudo-proof scanner rejecting unit tests labeled as formal theorems.',
      'Abstraction boundary disclosure auditor verifying that all stubs, loop unwinds, and solver assumptions are declared.',
      'Unit test suite in tests/unit/test-epistemic-classification-gate.mjs.'
    ],
    outScope: [
      'Modifying existing proof receipts in docs/07-backlog/evidence/.',
      'Automated interactive theorem proving (Lean/Coq).',
      'Changing production runtime code.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement Epistemic Evidence Tier Validator',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-009.md, scripts/harness/epistemic-classification-gate.mjs',
        actions: [
          'Codify strict validation rules for L1 (formal_proof), L2 (executable_invariant), L3 (statistical_evidence), L4 (production_telemetry).',
          'Enforce that L1 claims mandate solver output artifacts (SMT-LIB, Kani proofs, UNSAT tokens).'
        ],
        completionGate: 'Validator correctly accepts genuine proofs and rejects invalid tier mappings.',
        stopCondition: 'Ambiguity in classification rules or false-positive rejection of valid L2 tests.'
      },
      {
        title: 'Step 2 — Implement Abstraction Boundary & Stub Disclosure Auditor',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-009.md, scripts/harness/epistemic-classification-gate.mjs',
        actions: [
          'Scan verification harnesses for stubs (kani::stub, mock objects, environment replacements).',
          'Verify that every detected stub is explicitly disclosed in the goal\'s abstraction boundary manifest.'
        ],
        completionGate: 'Auditor flags undisclosed stubs with exit code 1 and diagnostic line locations.',
        stopCondition: 'Undetected stubs bypassing the audit scan.'
      },
      {
        title: 'Step 3 — Author Automated Test Suite & CI Gate Integration',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-009.md, scripts/harness/epistemic-classification-gate.mjs, tests/unit/test-epistemic-classification-gate.mjs',
        actions: [
          'Implement comprehensive unit test suite covering genuine proofs, pseudo-proofs, and undisclosed stubs.',
          'Integrate epistemic classification gate into pre-commit and CI verification workflows.'
        ],
        completionGate: 'tests/unit/test-epistemic-classification-gate.mjs passes 100% green with exit code 0.',
        stopCondition: 'Failing test assertion or schema validation error.'
      }
    ],
    acceptanceCriteria: [
      'Epistemic gate strictly rejects any unit or property test classified as a formal proof (L1) without solver artifacts.',
      'Mandates explicit disclosure of all harness stubs, loop unwinds, and environment assumptions.',
      'Enforces fail-closed exit code 1 upon detection of pseudo-proof claims or undisclosed abstractions.',
      'Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.'
    ]
  },
  {
    id: 'G-PROOF-010',
    title: 'Standardized Counterexample Minimizer & Cryptographic Receipt Freshness Engine',
    kind: 'feature',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Standardized counterexample trace serialization engine and cryptographic receipt freshness validator invalidating stale receipts upon source drift.',
    dependsOn: 'G-PROOF-009',
    blocks: 'G-PROOF-012',
    context: 'Proof receipts certify that invariants held under a specific Git commit hash and file state. If source code is modified after verification, the receipt becomes stale and invalid. Furthermore, when harnesses fail, counterexamples are often logged as unparseable console text rather than standardized, replayable JSON artifacts.',
    why: 'Guarantees that shipped code is cryptographically bound to fresh verification receipts and makes every failure instantly replayable.',
    doneWhen: 'scripts/harness/counterexample-receipt-harness.mjs is implemented, standardizing counterexample schemas, deterministic replay commands, and receipt freshness validation.',
    unblocks: 'Unified verification orchestrator (G-PROOF-012).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-010.md',
      'scripts/harness/counterexample-receipt-harness.mjs',
      'tests/unit/test-counterexample-receipt-harness.mjs'
    ],
    inScope: [
      'Counterexample serialization engine standardizing failing inputs, seeds, and execution traces.',
      'Deterministic replay command generator (e.g. node harness.mjs --replay <counterexample.json>).',
      'Cryptographic receipt freshness validator checking working tree SHA-256 digests against receipt manifests.',
      'Unit test suite in tests/unit/test-counterexample-receipt-harness.mjs.'
    ],
    outScope: [
      'Modifying existing evidence receipts in docs/07-backlog/evidence/.',
      'Modifying Git commit history.',
      'Changing production application code.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Standardize Counterexample Artifact Schema & Serialization',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-010.md, scripts/harness/counterexample-receipt-harness.mjs',
        actions: [
          'Define JSON schema for counterexample artifacts: seed, input_tuple, failing_step, trace, replay_command.',
          'Implement serializer writing artifacts/counterexamples/<GOAL-ID>-<INVARIANT-ID>.json upon failure.'
        ],
        completionGate: 'Serializer writes valid, conforming counterexample JSON files upon simulated failures.',
        stopCondition: 'Unserializable input objects or malformed JSON output.'
      },
      {
        title: 'Step 2 — Implement Deterministic Replay Engine',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-004.md, scripts/harness/counterexample-receipt-harness.mjs',
        actions: [
          'Implement CLI replay handler reproducing the exact failure trace from a saved counterexample file.',
          'Verify that replaying a counterexample reproduces the identical assertion failure with 100% determinism.'
        ],
        completionGate: 'Replay engine reproduces failing assertion trace identically across 20 trials.',
        stopCondition: 'Non-deterministic divergence during counterexample replay.'
      },
      {
        title: 'Step 3 — Implement Working-Tree Receipt Freshness Validator & Test Suite',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-010.md, scripts/harness/counterexample-receipt-harness.mjs, tests/unit/test-counterexample-receipt-harness.mjs',
        actions: [
          'Implement validator calculating active SHA-256 hashes of all source files listed in proof receipts.',
          'Reject and flag receipts as STALE with exit code 1 if any working-tree byte differs from receipt hash.',
          'Author unit tests verifying counterexample generation, replay, and freshness validation.'
        ],
        completionGate: 'tests/unit/test-counterexample-receipt-harness.mjs passes 100% green with exit code 0.',
        stopCondition: 'Failing test assertion or hash calculation error.'
      }
    ],
    acceptanceCriteria: [
      'Failed verification runs emit standardized, replayable counterexample JSON artifacts.',
      'Replay engine reproduces exact failure traces deterministically from saved counterexamples.',
      'Receipt freshness validator detects working-tree source drift and invalidates stale receipts fail-closed.',
      'Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.'
    ]
  },
  {
    id: 'G-PROOF-011',
    title: 'Concurrency Verification Profile & Schedule Sequentialization Harness',
    kind: 'architecture',
    status: 'planned',
    priority: 'P2',
    atomicOutcome: 'Concurrency verification harness validating atomic compare-and-swap operations, tagged pointer ABA immunity, and deterministic thread interleavings for concurrency targets.',
    dependsOn: 'G-PROOF-003',
    blocks: 'G-PROOF-012',
    context: 'Concurrent components (such as lock-free queues, atomic reference counters, and distributed HA lease locks) are susceptible to non-deterministic race conditions and ABA pointer reuse. Standard unit tests fail to expose these bugs due to thread scheduler randomness. Soda OS requires a dedicated concurrency verification profile and schedule sequentialization harness for concurrency-critical modules.',
    why: 'Mathematically proves data race freedom, lock-free safety, and ABA immunity under declared memory consistency models.',
    doneWhen: 'scripts/harness/concurrency-schedule-harness.mjs is implemented, providing schedule interleaving exploration and atomic CAS verification.',
    unblocks: 'Unified verification orchestrator (G-PROOF-012).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-011.md',
      'scripts/harness/concurrency-schedule-harness.mjs',
      'tests/unit/test-concurrency-schedule-harness.mjs'
    ],
    inScope: [
      'Concurrency verification harness in scripts/harness/concurrency-schedule-harness.mjs.',
      'Deterministic schedule sequentializer testing all valid thread interleavings for bounded concurrency.',
      'Atomic Compare-And-Swap (CAS) and tagged pointer versioning validator proving ABA immunity.',
      'Unit test suite in tests/unit/test-concurrency-schedule-harness.mjs.'
    ],
    outScope: [
      'Modifying production concurrency or thread management code.',
      'Rust Kani verification for non-Rust modules (strictly target-scoped).',
      'Multi-node distributed network consensus (covered by chaos harnesses).'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement Deterministic Schedule Sequentializer',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-011.md, scripts/harness/concurrency-schedule-harness.mjs',
        actions: [
          'Implement scheduler intercepting yield points and executing deterministic permutations of task interleavings.',
          'Verify absence of deadlocks, livelocks, and unhandled race conditions across all permuted schedules.'
        ],
        completionGate: 'Sequentializer executes all combinatorial schedules up to bounded step depth K.',
        stopCondition: 'Combinatorial explosion causing unhandled timeout (unwind bound required).'
      },
      {
        title: 'Step 2 — Implement Atomic CAS & Tagged Pointer ABA Verification',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-011.md, scripts/harness/concurrency-schedule-harness.mjs',
        actions: [
          'Model concurrent CAS operations with versioned tags (AtomicU64 packing version + pointer).',
          'Simulate ABA scenario (A -> B -> A) and verify that CAS fails when version tags mismatch.'
        ],
        completionGate: 'Verification harness proves 100% ABA detection and pointer safety under concurrent trials.',
        stopCondition: 'False-positive CAS success during simulated ABA mutation.'
      },
      {
        title: 'Step 3 — Author Unit Test Suite & Concurrency Profile Manifest',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-011.md, scripts/harness/concurrency-schedule-harness.mjs, tests/unit/test-concurrency-schedule-harness.mjs',
        actions: [
          'Author unit tests verifying schedule permutation, deadlock detection, and ABA immunity.',
          'Define concurrency profile contract in concurrency-schedule-harness.mjs.'
        ],
        completionGate: 'tests/unit/test-concurrency-schedule-harness.mjs passes 100% green with exit code 0.',
        stopCondition: 'Failing test assertion or thread scheduling deadlock.'
      }
    ],
    acceptanceCriteria: [
      'Concurrency harness deterministically permutes thread execution schedules up to bounded depth K.',
      'Proves ABA immunity on versioned atomic pointers with 100% rejection of stale tag updates.',
      'Detects deadlocks and lock inversion cycles fail-closed with diagnostic thread dumps.',
      'Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.'
    ]
  },
  {
    id: 'G-PROOF-012',
    title: 'Unified Verification Orchestrator & Lifecycle State Machine Gatekeeper',
    kind: 'governance',
    status: 'planned',
    priority: 'P1',
    atomicOutcome: 'Unified verification orchestrator coordinating profile-selected test harnesses and enforcing fail-closed lifecycle transition gates across ready, verified, and done.',
    dependsOn: 'G-PROOF-004, G-PROOF-006, G-PROOF-008, G-PROOF-010, G-PROOF-011',
    blocks: 'G-PROOF-013',
    context: 'With individual verification harnesses created across property testing, stateful models, adversarial boundaries, mutation testing, and proof receipts, Soda OS requires a centralized orchestrator. The orchestrator reads a goal\'s declared verification profile, invokes the exact required harness pipeline, aggregates evidence receipts, and blocks invalid lifecycle transitions (ready, verified, done) upon missing or failing evidence.',
    why: 'Enforces automated, unbypassable quality gates across the Soda OS development lifecycle, preventing human or agent errors from promoting unproven code.',
    doneWhen: 'scripts/harness/verification-orchestrator-harness.mjs is operational, coordinating verification pipelines by profile and enforcing fail-closed promotion gates.',
    unblocks: 'Verification architecture guide and operator runbook (G-PROOF-013).',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-012.md',
      'scripts/harness/verification-orchestrator-harness.mjs',
      'tests/unit/test-verification-orchestrator.mjs'
    ],
    inScope: [
      'Unified verification orchestrator in scripts/harness/verification-orchestrator-harness.mjs.',
      'Profile-driven harness dispatch engine mapping goal profiles to required harness execution sequences.',
      'Lifecycle transition gatekeeper blocking status updates when evidence is missing, failed, or stale.',
      'Unit test suite in tests/unit/test-verification-orchestrator.mjs.'
    ],
    outScope: [
      'Modifying individual harness internal algorithms.',
      'Modifying production application logic.',
      'Bypassing human review approval requirements.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement Profile-Driven Harness Dispatch Engine',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-012.md, scripts/harness/verification-orchestrator-harness.mjs',
        actions: [
          'Parse goal contract profiles and resolve dependency execution DAG of required harnesses.',
          'Execute required harnesses in deterministic sequence with parallel execution where safe.'
        ],
        completionGate: 'Orchestrator dispatches correct harness matrix based on declared goal profile.',
        stopCondition: 'Unknown profile or missing required harness dependency.'
      },
      {
        title: 'Step 2 — Implement Lifecycle State Machine Promotion Gatekeeper',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-012.md, scripts/harness/verification-orchestrator-harness.mjs',
        actions: [
          'Enforce pre-ready gate: goal contract conforming, touch map disjoint, dependencies satisfied.',
          'Enforce pre-done gate: all profile harnesses passed, mutation score met, proof receipt fresh and valid.',
          'Block transition and exit with code 1 if any condition is violated.'
        ],
        completionGate: 'Gatekeeper strictly prevents premature status promotion in test scenarios.',
        stopCondition: 'Permissive bypass allowing unproven goal to transition to done.'
      },
      {
        title: 'Step 3 — Author Automated Unit Test Suite & CLI Verification',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-012.md, scripts/harness/verification-orchestrator-harness.mjs, tests/unit/test-verification-orchestrator.mjs',
        actions: [
          'Implement unit test suite verifying profile resolution, pipeline execution, and lifecycle gatekeeping.',
          'Verify clean CLI output reporting comprehensive pass/fail scorecard.'
        ],
        completionGate: 'tests/unit/test-verification-orchestrator.mjs passes 100% green with exit code 0.',
        stopCondition: 'Failing test assertion or unhandled orchestrator error.'
      }
    ],
    acceptanceCriteria: [
      'Orchestrator reads goal verification profiles and automatically executes the exact required harness suite.',
      'Enforces fail-closed gatekeeping blocking transition to ready or done upon any harness failure.',
      'Aggregates multi-harness evidence into a unified, cryptographically bound verification receipt.',
      'Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.'
    ]
  },
  {
    id: 'G-PROOF-013',
    title: 'Verification Architecture Guide, Operator Runbook & Adoption Playbooks',
    kind: 'architecture',
    status: 'planned',
    priority: 'P2',
    atomicOutcome: 'Comprehensive verification architecture specification, developer invariant declaration runbook, and failure counterexample replay playbooks.',
    dependsOn: 'G-PROOF-012',
    blocks: '—',
    context: 'A sophisticated verification harness architecture cannot be effectively utilized without comprehensive, authoritative documentation. Developers and autonomous agents need clear operational guides detailing how to declare invariants, configure verification profiles, inspect and interpret proof receipts, and replay shrunk failure counterexamples.',
    why: 'Empowers human developers and autonomous AI swarms to seamlessly adopt and operate the unified verification ecosystem.',
    doneWhen: 'The verification architecture guide and operator runbook are authored in docs/03-architecture/ and docs/06-workflows/, with zero broken links.',
    unblocks: 'Continuous framework-wide verification adoption across all epics.',
    touchMap: [
      'docs/07-backlog/goals/G-PROOF-013.md',
      'docs/03-architecture/verification-architecture-guide.md',
      'docs/06-workflows/verification-operator-runbook.md'
    ],
    inScope: [
      'Comprehensive verification architecture guide in docs/03-architecture/verification-architecture-guide.md.',
      'Operator runbook and failure remediation playbooks in docs/06-workflows/verification-operator-runbook.md.',
      'Concrete code examples for declaring invariants, running property tests, and replaying counterexamples.'
    ],
    outScope: [
      'Modifying harness implementation code.',
      'Modifying production application logic.',
      'Editing completed historical goal cards.'
    ],
    workSteps: [
      {
        title: 'Step 1 — Author Verification Architecture Guide',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-013.md, docs/03-architecture/verification-architecture-guide.md',
        actions: [
          'Document the 4-tier assurance continuum and 7 verification profiles.',
          'Document epistemic boundaries, Hoare logic foundations, and proof receipt cryptographic binding.'
        ],
        completionGate: 'docs/03-architecture/verification-architecture-guide.md is complete and formatted.',
        stopCondition: 'Missing architecture domain or inaccurate solver description.'
      },
      {
        title: 'Step 2 — Author Operator Runbook & Failure Remediation Playbooks',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-013.md, docs/06-workflows/verification-operator-runbook.md',
        actions: [
          'Document CLI usage for all harnesses, orchestrator flags, and gate enforcement.',
          'Provide step-by-step playbooks for debugging mutation test failures, counterexample replay, and stale receipts.'
        ],
        completionGate: 'docs/06-workflows/verification-operator-runbook.md is complete with runnable commands.',
        stopCondition: 'Incomplete playbook steps or broken CLI syntax.'
      },
      {
        title: 'Step 3 — Markdown Link Integrity & Conformance Verification',
        allowedFiles: 'docs/07-backlog/goals/G-PROOF-013.md, docs/03-architecture/verification-architecture-guide.md, docs/06-workflows/verification-operator-runbook.md',
        actions: [
          'Validate all internal markdown file links and anchors across authored guides.',
          'Verify 100% goal-template conformance on G-PROOF-013.'
        ],
        completionGate: 'All links resolve cleanly and goal card passes conformance harness.',
        stopCondition: 'Broken link or missing required goal section.'
      }
    ],
    acceptanceCriteria: [
      'Verification architecture guide documents all 7 profiles, epistemic boundaries, and solver assumptions.',
      'Operator runbook provides step-by-step failure replay and remediation playbooks with runnable CLI examples.',
      'Zero broken markdown links across all authored documentation files.',
      'Goal card G-PROOF-013 passes 100% template conformance with zero errors.'
    ]
  }
];

export function generateGoalMarkdown(g) {
  const stepsTableRows = g.workSteps.map((ws, i) => `| ${i + 1} | ${ws.title.replace(/^Step\s+\d+\s+—\s+/, '')} | pending |`).join('\n');

  const workStepsFormatted = g.workSteps.map((ws, i) => `
${i + 1}. **${ws.title}**
   - **Allowed files:** ${ws.allowedFiles}
   - **Actions:**
${ws.actions.map(a => `     - ${a}`).join('\n')}
   - **Completion gate:** ${ws.completionGate}
   - **Stop condition:** ${ws.stopCondition}
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.
`).join('\n');

  const touchMapList = g.touchMap.map(t => `- \`${t}\``).join('\n');
  const inScopeList = g.inScope.map(s => `- ${s}`).join('\n');
  const outScopeList = g.outScope.map(s => `- ${s}`).join('\n');
  const acceptanceCriteriaList = g.acceptanceCriteria.map(ac => `- [ ] ${ac}`).join('\n');

  return `---
goal_contract:
  id: ${g.id}
  version: 2
  kind: ${g.kind}
  status: ${g.status}
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "${g.atomicOutcome}"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: low
    reasons:
      - proof-assurance-governance
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: multi_worktree
    subagents:
      - role: proof_implementer
        worktree: "../worktrees/soda-os-${g.id.toLowerCase()}-implementer"
        branch: "feature/${g.id}"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-${g.id.toLowerCase()}-verifier"
        branch: "feature/${g.id}-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-${g.id.toLowerCase()}-reviewer"
        branch: "feature/${g.id}-review"
    isolation_barriers:
      git_index: true
      ephemeral_ports: true
      build_cache: true
    disjoint_touch_map: true
  lifecycle:
    spec: draft
    implementation: pending
    verification: pending
    evidence: pending
    review: pending
    release: unreleased
    learning: pending
---

# ${g.id}: ${g.title}

**Status:** ${g.status}  
**Kind:** ${g.kind}  
**Atomic outcome:** ${g.atomicOutcome}  
**Epic:** PROOF  
**Priority:** ${g.priority}  
**Depends on:** ${g.dependsOn}  
**Blocks:** ${g.blocks}  
**Spec stability:** clarify pending · spec check pending · analyze pending  

#### Plan

**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
${stepsTableRows}

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents \`.git/index.lock\` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| \`proof_implementer\` | \`feature/${g.id}\` | \`../worktrees/soda-os-${g.id.toLowerCase()}-implementer\` | ${g.touchMap.join(', ')} | \`target/worktrees/${g.id}\` |
| \`proof_verifier\` | \`feature/${g.id}-verify\` | \`../worktrees/soda-os-${g.id.toLowerCase()}-verifier\` | tests/**, scripts/harness/** | \`target/worktrees/${g.id}-verify\` |
| \`socratic_reviewer\` | \`feature/${g.id}-review\` | \`../worktrees/soda-os-${g.id.toLowerCase()}-reviewer\` | docs/06_raw/** | \`target/worktrees/${g.id}-review\` |

## Context

${g.context}

## Intent

**Why:** ${g.why}  
**Done when:** ${g.doneWhen}  
**Unblocks:** ${g.unblocks}  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

- [NEEDS CLARIFICATION: Concrete performance SLAs and resource bounds for harness execution latency in local vs CI runners.]

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | \`docs/07-backlog/goals/${g.id}.md\` |
| Queue Reference | \`docs/07-backlog/queues/PROOF.md\` |
| Goal Registry | \`docs/07-backlog/goal-id-registry.yaml\` |

## Atomicity & Zero-Mock Contract

- **One outcome:** ${g.atomicOutcome}
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps
${workStepsFormatted}

## In
${inScopeList}

## Out
${outScopeList}

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | \`docs/07-backlog/goals/${g.id}.md\` |
| Implementation | Add | \`${g.touchMap[1] || g.touchMap[0]}\` |
| Verification | Add | \`${g.touchMap[2] || g.touchMap[1] || g.touchMap[0]}\` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | \`feature/PROOF\` |
| **System Archetype** | \`kernel-service\` |
| **Bounded Context & Domain** | Core Domain: DAVE Platform & Decision Governance |
| **Ports & Adapters Topology** | Driving Port: InvariantRegistryIntakePort; Driven Outbound: VerificationReceiptLedgerPort |
| **State Machine & Invariants** | Declared transitions are validated; failed runs cannot publish receipts or mutate promoted state |
| **Zero-Mock & Conformance Gate** | Concrete verification logic only; conformance and negative tests are mandatory |
| **Socratic 5-Why Blueprint** | \`docs/06_raw/20261010_221500_dual_ci_pipeline_architecture_edge_case_taxonomy_and_formal_verification_continuum.md\` |

## Spec checklist

### Checklist: Software & Architecture Design

- [ ] Software & Architecture Design specified by AI Agent
- [x] Intent is WHAT/WHY only
- [x] Touch map paths are concrete and disjoint from parallel goals
- [x] Zero mocks and zero stubs in execution path
- [x] Software & Architecture Design specified
- [ ] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [ ] Architecture & Goal Conformance Harness passing
- [ ] No \`[NEEDS CLARIFICATION]\` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable

### Checklist: Socratic 5-Why Dialectic Report

- [ ] Evidence record and approved blueprint linked

### Checklist: Architecture & Goal Conformance

- [ ] Goal-template and architecture conformance harnesses pass

## Acceptance criteria

${acceptanceCriteriaList}

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

${touchMapList}

## Notes for AI

Operate within declared touch map only. Never touch files allocated to concurrent subagents.

## 🏛️ Comprehensive Spec Design Appendix

### Finite State Machine (FSM) Matrix

| Current State | Event / Trigger | Guard Condition | Next State | Action / Side Effect |
|---|---|---|---|---|
| \`INIT\` | \`START_EXECUTION\` | Valid isolated worktree | \`RUNNING\` | Allocate resources |
| \`RUNNING\` | \`VERIFICATION_PASS\` | All assertions green | \`COMPLETED\` | Stage changes |
| \`RUNNING\` | \`ERROR_DETECTED\` | Any assertion fails | \`FAILED\` | Fail closed and log |

### Mathematical & Data Invariants Spec
- **Classification integrity:** A test result cannot be labeled as a formal proof without the required proof evidence.
- **Source binding:** A receipt for a changed source revision is stale and cannot pass verification.
- **Atomicity:** A failed verification run leaves no partially committed receipt or promoted state.
- **Zero-float arithmetic:** All numerical calculations enforce minor-unit integers with zero floating point drift.

### Hexagonal Ports & Adapters Spec
- **Inbound Port:** InvariantIntakePort (CLI and programmatic Node.js API)
- **Outbound Port:** VerificationReceiptLedgerPort (filesystem JSON persistence)
`;
}

export function main() {
  const root = resolve(process.cwd());
  const goalsDir = join(root, 'docs/07-backlog/goals');
  if (!existsSync(goalsDir)) {
    mkdirSync(goalsDir, { recursive: true });
  }

  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🎯 SODA OS PROOF HARNESS GOAL GENERATOR (G-PROOF-003 TO G-PROOF-013)');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  for (const g of PROOF_GOALS) {
    const md = generateGoalMarkdown(g);
    const dest = join(goalsDir, `${g.id}.md`);
    writeFileSync(dest, md, 'utf8');
    console.log(`  ✔ [GENERATED] ${g.id} -> ${dest}`);
  }

  console.log('\n🏆 ALL 11 GOAL CARDS GENERATED CLEANLY!');
}

if (process.argv[1].endsWith('generate-proof-goals.mjs')) {
  main();
}
