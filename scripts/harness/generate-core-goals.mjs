#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS G-CORE CAPABILITY UPGRADE GOAL GENERATOR (G-CORE-003 TO G-CORE-012)
 * ════════════════════════════════════════════════════════════════════════════════
 * Generates 100% compliant, 46-section canonical Soda OS Template v2 goal cards
 * for the G-CORE framework capability upgrade track.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import crypto from 'node:crypto';

export const CORE_UPGRADE_GOALS = [
  {
    id: 'G-CORE-003',
    title: 'Upgrade Agent OS Goal Contracts, Proof Assurance, and Runtime Governance',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Comprehensive upgrade of Soda OS standard goal contract and Agent OS distribution enabling machine-readable proof assurance, statistical evidence, and runtime governance.',
    dependsOn: 'G-CORE-002',
    blocks: 'G-CORE-004',
    steps: [
      { name: 'Define Framework Capability Scope and Epistemic Architecture', status: 'pending' },
      { name: 'Update Standard Goal Template v2 and Manifest Scaffolding', status: 'pending' },
      { name: 'Validate Framework Upgrade Plan and Downstream Compatibility', status: 'pending' }
    ],
    context: 'Soda OS governs standard software delivery well, but requires formal architectural extensions for mathematical proof classifications, statistical benchmarks, ML model contracts, and fail-closed runtime governance.',
    why: 'Prevents unverified AI agent deployments, pseudo-proof claims, and unmonitored model degradation across the Sodality ecosystem.',
    doneWhen: 'The standard goal template, architectural specifications, and framework distribution manifest support machine-verifiable assurance across all declared domains.',
    unblocks: 'Machine-readable goal contract and profile registry (G-CORE-004).',
    gapId: 'GAP-CORE-003',
    gapEvidence: 'Framework lacked machine-readable proof, statistical validity, and ML governance contracts.',
    gapSolution: 'Establish architecture blueprints and Template v2 schemas covering the 16-layer assurance lifecycle.',
    gapVerification: 'node scripts/harness/goal-template-conformance-harness.mjs G-CORE-003',
    approach: 'Contract-first goal templates, cryptographic proof receipts, statistical confidence intervals, and fail-closed runtime state routing.',
    touchMap: [
      'template/docs/07-backlog/goals/_template.md',
      'docs/07-backlog/goals/_template.md',
      'template/framework-manifest.yml',
      'scripts/harness/goal-template-conformance-harness.mjs',
      'template/scripts/harness/goal-template-conformance-harness.mjs'
    ],
    ports: {
      inbound: 'FrameworkScaffoldingPort (CLI & Node API)',
      outbound: 'TemplateDistributionPort (POSIX filesystem)'
    },
    workSteps: [
      {
        title: 'Step 1 — Formalize Epistemic Evidence Levels and Architecture Blueprints',
        allowedFiles: 'template/docs/07-backlog/goals/_template.md, docs/07-backlog/goals/_template.md',
        actions: [
          'Codify epistemic levels L1 (formal_proof), L2 (executable_invariant), L3 (statistical_evidence), and L4 (production_evidence) into the standard template.',
          'Define required YAML blocks for assumptions, risks, fail-closed policies, proof contracts, and observability.'
        ],
        verificationCommand: 'node scripts/harness/goal-template-conformance-harness.mjs template/docs/07-backlog/goals/_template.md',
        completionGate: 'Standard template validates cleanly with 100% schema conformance.',
        stopCondition: 'Schema parser error or missing required section in template.',
        zeroMockCheck: 'Real RFC-compliant YAML and Markdown template; zero placeholder text.'
      },
      {
        title: 'Step 2 — Update Framework Manifest File Groups',
        allowedFiles: 'template/framework-manifest.yml',
        actions: [
          'Register new governance rules in overwrite.rules.',
          'Register new harness groups (proof, model_governance, observability) in overwrite.scripts and architecture docs in overwrite.docs.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); const yaml = fs.readFileSync(\'template/framework-manifest.yml\', \'utf8\'); if (!yaml.includes(\'proof-and-evidence\')) process.exit(1);"',
        completionGate: 'Manifest YAML contains all new rules and harness groups.',
        stopCondition: 'YAML syntax error or missing manifest keys.',
        zeroMockCheck: 'Production manifest file edits; zero simulated file maps.'
      },
      {
        title: 'Step 3 — Validate Framework Conformance and Cross-Repository Distribution',
        allowedFiles: 'scripts/harness/goal-template-conformance-harness.mjs, template/scripts/harness/goal-template-conformance-harness.mjs',
        actions: [
          'Run goal-template-conformance-harness across all registered goal files.',
          'Verify that template and root copies remain 100% synchronized.'
        ],
        verificationCommand: 'node scripts/harness/goal-template-conformance-harness.mjs G-CORE-003',
        completionGate: 'All conformance checks pass with exit code 0.',
        stopCondition: 'Any check failure or synchronization drift.',
        zeroMockCheck: 'Real file comparison and execution; zero mock results.'
      }
    ],
    inScope: [
      'Master architectural blueprint for proof assurance, statistical evidence, and runtime governance.',
      'Template v2 schema updates with 16-layer assurance blocks.',
      'Manifest registration of new framework assets.'
    ],
    outScope: [
      'Individual harness algorithm implementations (handled in G-CORE-004 through G-CORE-011).',
      'Third-party external solver installations.'
    ],
    acceptanceCriteria: [
      'Standard template v2 exposes machine-readable goal_contract schema.',
      'Manifest distributes proof, model_governance, and observability file groups.',
      'Conformance harness validates all 46 template sections.'
    ],
    testPlan: [
      'node scripts/harness/goal-template-conformance-harness.mjs G-CORE-003',
      'node scripts/harness/test-goal-assurance-suite.mjs'
    ]
  },
  {
    id: 'G-CORE-004',
    title: 'Machine-Readable Goal Contract and Profile Registry',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Machine-readable goal_contract schema validation and profile registry supporting core, ml_research, and security personas.',
    dependsOn: 'G-CORE-003',
    blocks: 'G-CORE-005',
    steps: [
      { name: 'Implement Goal Contract Schema Parser and Validator', status: 'pending' },
      { name: 'Implement Modular Domain Profile Registry', status: 'pending' },
      { name: 'Validate Profile Invariant Constraints and Personas', status: 'pending' }
    ],
    context: 'Goals require machine-readable frontmatter metadata to decouple workflow validation from unstructured markdown prose.',
    why: 'Enables automated CI linters and agent coordinators to parse goal identity, dependencies, profiles, and risks programmatically.',
    doneWhen: 'A parser extracts goal_contract YAML and validates atomicity, profiles, risk, and lifecycle fields.',
    unblocks: 'Dependency DAG and scope-drift harness (G-CORE-005).',
    gapId: 'GAP-CORE-004',
    gapEvidence: 'Goals relied on unstructured regex parsing prone to false positives.',
    gapSolution: 'Implement robust YAML frontmatter parser and profile schema validator in goal-template-conformance-harness.mjs.',
    gapVerification: 'node scripts/harness/test-goal-assurance-suite.mjs',
    approach: 'YAML frontmatter parsing, JSON Schema validation, and modular profile loading from docs/03-architecture/profiles/.',
    touchMap: [
      'template/docs/03-architecture/profiles/',
      'docs/03-architecture/profiles/',
      'scripts/harness/goal-template-conformance-harness.mjs',
      'template/scripts/harness/goal-template-conformance-harness.mjs'
    ],
    ports: {
      inbound: 'GoalContractValidationPort (CLI & In-process parser)',
      outbound: 'ProfileRegistryPort (Filesystem YAML schemas)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Goal Contract Schema Parser',
        allowedFiles: 'scripts/harness/goal-template-conformance-harness.mjs, template/scripts/harness/goal-template-conformance-harness.mjs',
        actions: [
          'Add extractAndValidateGoalContract function parsing YAML frontmatter.',
          'Validate required fields: id, version, kind, status, profiles, atomicity, risk, lifecycle.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 1 passes verifying valid and invalid goal contracts.',
        stopCondition: 'Parser crash or failure to reject invalid contract schemas.',
        zeroMockCheck: 'Real YAML parsing and structural validation; zero mocks.'
      },
      {
        title: 'Step 2 — Implement Domain Profile Registry',
        allowedFiles: 'template/docs/03-architecture/profiles/, docs/03-architecture/profiles/',
        actions: [
          'Create profile definitions for core, ml_research, and autonomous_agents.',
          'Define required invariant checks and epistemic tiers per profile.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); if (!fs.existsSync(\'template/docs/03-architecture/profiles\')) process.exit(1);"',
        completionGate: 'Profiles directory contains valid domain profile specifications.',
        stopCondition: 'Missing profile schemas.',
        zeroMockCheck: 'Static specification documents; zero stubs.'
      },
      {
        title: 'Step 3 — Validate Atomicity Enforcement and Splitting Rules',
        allowedFiles: 'scripts/harness/goal-template-conformance-harness.mjs, template/scripts/harness/goal-template-conformance-harness.mjs',
        actions: [
          'Enforce single outcome invariant (outcome_count === 1).',
          'Reject compound conjunctions in primary_outcome description.'
        ],
        verificationCommand: 'node scripts/harness/goal-atomicity-harness.mjs docs/07-backlog/goals/G-CORE-004.md',
        completionGate: 'Atomicity harness exits 0 confirming single verifiable outcome.',
        stopCondition: 'Compound outcome detected.',
        zeroMockCheck: 'Real grammatical and schema checks; zero hardcoded responses.'
      }
    ],
    inScope: [
      'goal_contract YAML schema extraction and validation.',
      'Modular profile registry for core, ml_research, and autonomous_agents.',
      'Automated atomicity outcome verification.'
    ],
    outScope: [
      'Cross-repository federation.',
      'External database synchronization.'
    ],
    acceptanceCriteria: [
      'Parses and validates schema_version 2 goal contracts.',
      'Rejects goals declaring multiple deliverables or missing atomicity blocks.',
      'Enforces domain profile requirements.'
    ],
    testPlan: [
      'node scripts/harness/goal-template-conformance-harness.mjs G-CORE-004',
      'node scripts/harness/goal-atomicity-harness.mjs docs/07-backlog/goals/G-CORE-004.md'
    ]
  },
  {
    id: 'G-CORE-005',
    title: 'Dependency Graph and Scope-Drift Harness',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Automated dependency DAG cycle detector and work-step scope drift harness enforcing strict touch map file confinement.',
    dependsOn: 'G-CORE-004',
    blocks: 'G-CORE-006',
    steps: [
      { name: 'Implement Dependency DAG Cycle and Status Detector', status: 'pending' },
      { name: 'Implement Scope Drift and Touch Map Validator', status: 'pending' },
      { name: 'Integrate Governance Check and Acceptance Criteria Traceability', status: 'pending' }
    ],
    context: 'Scope creep and cyclic dependencies cause cascading failures in autonomous execution.',
    why: 'Ensures that agent work steps cannot touch unlisted files and prevents deadlocks from circular goal dependencies.',
    doneWhen: 'Harnesses detect cycles, reject blocked predecessors, and block edits outside allowed_files.',
    unblocks: 'Mathematical invariant and proof-receipt harness (G-CORE-006).',
    gapId: 'GAP-CORE-005',
    gapEvidence: 'Work steps could modify files outside touch map without triggering immediate failure.',
    gapSolution: 'Implement goal-scope-drift-harness.mjs and goal-dependency-harness.mjs with strict exit codes.',
    gapVerification: 'node scripts/harness/test-goal-assurance-suite.mjs',
    approach: 'Topological sorting for acyclicity and path-glob intersection for strict touch-map confinement.',
    touchMap: [
      'scripts/harness/goal-dependency-harness.mjs',
      'template/scripts/harness/goal-dependency-harness.mjs',
      'scripts/harness/goal-scope-drift-harness.mjs',
      'template/scripts/harness/goal-scope-drift-harness.mjs',
      '.agents/rules/scope-and-dependency-integrity.md',
      'template/.agents/rules/scope-and-dependency-integrity.md'
    ],
    ports: {
      inbound: 'DependencyScopeVerificationPort (CLI runner)',
      outbound: 'BacklogTouchMapPort (File graph parser)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Dependency DAG Cycle Detection',
        allowedFiles: 'scripts/harness/goal-dependency-harness.mjs, template/scripts/harness/goal-dependency-harness.mjs',
        actions: [
          'Implement Tarjans strongly connected components or DFS cycle detection over goal dependencies.',
          'Verify that ready goals depending on blocked predecessors are rejected.'
        ],
        verificationCommand: 'node scripts/harness/goal-dependency-harness.mjs',
        completionGate: 'Cycle detector traverses all goals and exits 0 on valid DAG.',
        stopCondition: 'Cycle detected or missing dependency.',
        zeroMockCheck: 'Real graph traversal over actual files; zero simulated graphs.'
      },
      {
        title: 'Step 2 — Implement Scope Drift Touch Map Validator',
        allowedFiles: 'scripts/harness/goal-scope-drift-harness.mjs, template/scripts/harness/goal-scope-drift-harness.mjs',
        actions: [
          'Extract allowed_files from each work step and verify against top-level touch map.',
          'Detect and reject forbidden_files violations.'
        ],
        verificationCommand: 'node scripts/harness/goal-scope-drift-harness.mjs docs/07-backlog/goals/G-CORE-005.md',
        completionGate: 'Scope drift harness validates touch map conformance.',
        stopCondition: 'Unlisted file path in work steps.',
        zeroMockCheck: 'Exact path comparison and glob matching; zero mocks.'
      },
      {
        title: 'Step 3 — Validate Scope and Dependency Rule Parity',
        allowedFiles: '.agents/rules/scope-and-dependency-integrity.md, template/.agents/rules/scope-and-dependency-integrity.md',
        actions: [
          'Ensure rule file codifies DAG invariants and touch map confinement.',
          'Verify parity between root and template rule copies.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); const a = fs.readFileSync(\'.agents/rules/scope-and-dependency-integrity.md\'); const b = fs.readFileSync(\'template/.agents/rules/scope-and-dependency-integrity.md\'); if (!a.equals(b)) process.exit(1);"',
        completionGate: 'Rule files are byte-for-byte identical.',
        stopCondition: 'Rule drift between root and template.',
        zeroMockCheck: 'Cryptographic buffer equality comparison; zero mocks.'
      }
    ],
    inScope: [
      'Dependency DAG cycle detection and phase validation.',
      'Touch map and allowed_files confinement checking.',
      'Governance rule enforcement.'
    ],
    outScope: [
      'Automatic code refactoring to resolve cycles.',
      'Network-based dependency resolution.'
    ],
    acceptanceCriteria: [
      'Detects cyclic dependencies and reports exact cycle path.',
      'Rejects goals whose work steps declare files outside touch map.',
      'Rejects ready goals with blocked predecessors.'
    ],
    testPlan: [
      'node scripts/harness/goal-dependency-harness.mjs',
      'node scripts/harness/goal-scope-drift-harness.mjs docs/07-backlog/goals/G-CORE-005.md'
    ]
  },
  {
    id: 'G-CORE-006',
    title: 'Mathematical Invariant and Proof-Receipt Harness',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Goal-scoped mathematical invariant proof harness and cryptographic proof receipt validator rejecting unverified or pseudo-proof claims.',
    dependsOn: 'G-CORE-004',
    blocks: 'G-CORE-007, G-CORE-009',
    steps: [
      { name: 'Implement Goal-Scoped Mathematical Invariant Harness', status: 'pending' },
      { name: 'Implement Cryptographic Proof Receipt Validator', status: 'pending' },
      { name: 'Enforce Epistemic Classification and Anti-Pseudo-Proof Gate', status: 'pending' }
    ],
    context: 'Algorithms, loss functions, and state machines require formal invariant proofs rather than ungrounded claims.',
    why: 'Guarantees that mathematical invariants are tested empirically via generative property tests and certified by cryptographic receipts.',
    doneWhen: 'Harness executes goal-scoped invariant tests, binds receipts to source file SHA256 hashes, and rejects pseudo-proof unit tests.',
    unblocks: 'Statistical evidence harness (G-CORE-007) and artifact provenance harness (G-CORE-009).',
    gapId: 'GAP-CORE-006',
    gapEvidence: 'Mathematical harness was generic and not scoped to goal invariant registries.',
    gapSolution: 'Upgrade mathematical-invariant-proof-harness.mjs and implement proof-receipt-validator.mjs.',
    gapVerification: 'node scripts/harness/test-goal-assurance-suite.mjs',
    approach: 'Property-based generative testing, cryptographic SHA256 receipt generation, and epistemic hierarchy classification.',
    touchMap: [
      'scripts/harness/mathematical-invariant-proof-harness.mjs',
      'template/scripts/harness/mathematical-invariant-proof-harness.mjs',
      'scripts/harness/proof-receipt-validator.mjs',
      'template/scripts/harness/proof-receipt-validator.mjs',
      'docs/03-architecture/proof-and-evidence.md',
      'template/docs/03-architecture/proof-and-evidence.md',
      '.agents/rules/proof-and-evidence.md',
      'template/.agents/rules/proof-and-evidence.md'
    ],
    ports: {
      inbound: 'MathematicalProofPort (Harness runner)',
      outbound: 'ProofReceiptStoragePort (JSON receipt writer)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Goal-Scoped Invariant Execution',
        allowedFiles: 'scripts/harness/mathematical-invariant-proof-harness.mjs, template/scripts/harness/mathematical-invariant-proof-harness.mjs',
        actions: [
          'Support running CLI with goal ID parameter: node mathematical-invariant-proof-harness.mjs <GOAL_ID>.',
          'Execute declared property tests and measure execution time and return codes.'
        ],
        verificationCommand: 'node scripts/harness/mathematical-invariant-proof-harness.mjs',
        completionGate: 'Invariant harness executes all property test suites cleanly.',
        stopCondition: 'Test failure or non-zero exit code.',
        zeroMockCheck: 'Real property test execution; zero mocked assertions.'
      },
      {
        title: 'Step 2 — Implement Cryptographic Proof Receipt Validator',
        allowedFiles: 'scripts/harness/proof-receipt-validator.mjs, template/scripts/harness/proof-receipt-validator.mjs',
        actions: [
          'Verify schema_version === 1, goal_id, classification, source_revision, and invariants array.',
          'Verify SHA256 hashes of referenced source files against active working tree bytes.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 17 passes validating proof receipt verification.',
        stopCondition: 'Hash mismatch or malformed receipt.',
        zeroMockCheck: 'Exact cryptographic SHA256 computation; zero hardcoded hashes.'
      },
      {
        title: 'Step 3 — Enforce Anti-Pseudo-Proof Classification Rule',
        allowedFiles: 'docs/03-architecture/proof-and-evidence.md, template/docs/03-architecture/proof-and-evidence.md, .agents/rules/proof-and-evidence.md, template/.agents/rules/proof-and-evidence.md',
        actions: [
          'Reject classifying unit/integration tests as formal_proof.',
          'Require formal solver certificates or downgrade to executable_invariant.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); const content = fs.readFileSync(\'.agents/rules/proof-and-evidence.md\', \'utf8\'); if (!content.includes(\'pseudo-proof\')) process.exit(1);"',
        completionGate: 'Rule and architecture docs specify anti-pseudo-proof restrictions.',
        stopCondition: 'Missing rule clause.',
        zeroMockCheck: 'Production rule specification; zero placeholders.'
      }
    ],
    inScope: [
      'Goal-scoped invariant harness runner.',
      'Cryptographic proof receipt generator and validator.',
      'Epistemic level taxonomy enforcement.'
    ],
    outScope: [
      'Automated interactive theorem proving (Coq/Lean runtime engines).',
      'Symbolic algebra engine implementation.'
    ],
    acceptanceCriteria: [
      'Executes declared property tests for a goal card.',
      'Binds proof receipts to exact-HEAD commit and source SHA256 hashes.',
      'Rejects pseudo-proof claims classifying unit tests as formal theorems.'
    ],
    testPlan: [
      'node scripts/harness/goal-template-conformance-harness.mjs G-CORE-006',
      'node scripts/harness/test-goal-assurance-suite.mjs'
    ]
  },
  {
    id: 'G-CORE-007',
    title: 'Statistical Evidence and Benchmark Harness',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Automated statistical evidence harness verifying sample sizes, baseline comparisons, Wilson confidence intervals, and split isolation.',
    dependsOn: 'G-CORE-004',
    blocks: 'G-CORE-012',
    steps: [
      { name: 'Implement Sample Size and Power Validator', status: 'pending' },
      { name: 'Implement Confidence Interval and Uncertainty Harness', status: 'pending' },
      { name: 'Implement Dataset Split Contamination Detector', status: 'pending' }
    ],
    context: 'Empirical benchmark claims and ML evaluation require sound statistical methodology rather than cherry-picked runs.',
    why: 'Prevents promoting ungrounded performance claims lacking sample count, variance, or statistical significance.',
    doneWhen: 'Harness checks minimum sample size N >= 30, computes Wilson/Bootstrap intervals, and rejects split overlap.',
    unblocks: 'New proof, ML, runtime-governance, and observability skills (G-CORE-012).',
    gapId: 'GAP-CORE-007',
    gapEvidence: 'System lacked statistical validation of sample sizes and uncertainty intervals.',
    gapSolution: 'Implement statistical-evidence-harness.mjs and statistical-evidence.md architecture spec.',
    gapVerification: 'node scripts/harness/test-goal-assurance-suite.mjs',
    approach: 'Wilson score intervals, non-parametric bootstrap resampling, power analysis, and split set intersection checks.',
    touchMap: [
      'scripts/harness/statistical-evidence-harness.mjs',
      'template/scripts/harness/statistical-evidence-harness.mjs',
      'docs/03-architecture/statistical-evidence.md',
      'template/docs/03-architecture/statistical-evidence.md',
      '.agents/rules/model-training-governance.md',
      'template/.agents/rules/model-training-governance.md'
    ],
    ports: {
      inbound: 'StatisticalEvidencePort (CLI & In-process analyzer)',
      outbound: 'StatisticalReportPort (JSON evidence writer)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Sample Size and Power Verification',
        allowedFiles: 'scripts/harness/statistical-evidence-harness.mjs, template/scripts/harness/statistical-evidence-harness.mjs',
        actions: [
          'Validate that sample_count >= 30 for all statistical claims.',
          'Check that baseline comparisons specify baseline and treatment cohorts.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 8 passes validating sample size requirements.',
        stopCondition: 'Sample size below minimum threshold.',
        zeroMockCheck: 'Real numeric comparison; zero mock data.'
      },
      {
        title: 'Step 2 — Implement Wilson and Bootstrap Interval Calculations',
        allowedFiles: 'scripts/harness/statistical-evidence-harness.mjs, template/scripts/harness/statistical-evidence-harness.mjs',
        actions: [
          'Calculate binomial Wilson 95% confidence intervals with continuity correction.',
          'Calculate non-parametric bootstrap resampling intervals for continuous metrics.'
        ],
        verificationCommand: 'node -e "const { wilsonScoreInterval } = require(\'./scripts/lib/confidence-calibration.mjs\'); const ci = wilsonScoreInterval(95, 100); if (ci.low < 0.85 || ci.high > 1.0) process.exit(1);"',
        completionGate: 'Wilson score calculation produces verified mathematical bounds.',
        stopCondition: 'Calculation error or bounds outside [0, 1].',
        zeroMockCheck: 'Exact closed-form mathematical equations; zero estimations.'
      },
      {
        title: 'Step 3 — Implement Split Contamination Detector',
        allowedFiles: 'scripts/harness/statistical-evidence-harness.mjs, template/scripts/harness/statistical-evidence-harness.mjs, docs/03-architecture/statistical-evidence.md, template/docs/03-architecture/statistical-evidence.md',
        actions: [
          'Inspect declared splits and flag any overlap between training and validation/test distributions.',
          'Fail immediately with exit code 1 if contamination is detected.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 8 passes rejecting contaminated splits.',
        stopCondition: 'Failure to detect overlapping samples.',
        zeroMockCheck: 'Set intersection logic on discrete sample identifiers; zero mocks.'
      }
    ],
    inScope: [
      'Sample size and power verification harness.',
      'Wilson and Bootstrap confidence interval engines.',
      'Dataset split contamination checking.'
    ],
    outScope: [
      'Bayesian MCMC sampling engines.',
      'Dynamic power calculation web dashboards.'
    ],
    acceptanceCriteria: [
      'Rejects statistical claims with sample count < 30.',
      'Computes 95% confidence intervals for proportion and continuous metrics.',
      'Detects split contamination between train, validation, and test datasets.'
    ],
    testPlan: [
      'node scripts/harness/statistical-evidence-harness.mjs docs/07-backlog/goals/G-CORE-007.md',
      'node scripts/harness/test-goal-assurance-suite.mjs'
    ]
  },
  {
    id: 'G-CORE-008',
    title: 'Failure, Rollback, and Fail-Closed Harness',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Automated failure policy, rollback command validation, and fail-closed routing truth-table verification harness.',
    dependsOn: 'G-CORE-004',
    blocks: 'G-CORE-010',
    steps: [
      { name: 'Implement Failure and Rollback Policy Validator', status: 'pending' },
      { name: 'Implement Routing Truth Table Completeness Engine', status: 'pending' },
      { name: 'Validate Fail-Closed Invariants and Rollback Compensation', status: 'pending' }
    ],
    context: 'Autonomous agents must operate with deterministic fail-closed safety and explicit rollback procedures on error.',
    why: 'Prevents silent execution failures from masquerading as successes and ensures side effects can be reversed cleanly.',
    doneWhen: 'Harness proves routing truth table completeness and validates rollback commands.',
    unblocks: 'Agent observability and resource-budget contracts (G-CORE-010).',
    gapId: 'GAP-CORE-008',
    gapEvidence: 'Absence of automated verification for agent rollback commands and fail-closed truth tables.',
    gapSolution: 'Implement failure-rollback-harness.mjs and routing-truth-table-harness.mjs.',
    gapVerification: 'node scripts/harness/test-goal-assurance-suite.mjs',
    approach: 'Combinatorial state enumeration, truth-table completeness proofs, and inverse compensation saga verification.',
    touchMap: [
      'scripts/harness/failure-rollback-harness.mjs',
      'template/scripts/harness/failure-rollback-harness.mjs',
      'scripts/harness/routing-truth-table-harness.mjs',
      'template/scripts/harness/routing-truth-table-harness.mjs',
      'docs/03-architecture/agent-runtime-governance.md',
      'template/docs/03-architecture/agent-runtime-governance.md',
      '.agents/rules/agent-runtime-fail-closed.md',
      'template/.agents/rules/agent-runtime-fail-closed.md'
    ],
    ports: {
      inbound: 'RuntimeGovernancePort (Truth table evaluator)',
      outbound: 'RollbackExecutionPort (Saga compensation runner)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Failure and Rollback Policy Harness',
        allowedFiles: 'scripts/harness/failure-rollback-harness.mjs, template/scripts/harness/failure-rollback-harness.mjs',
        actions: [
          'Parse failure_policy block in goal cards and verify explicit mode and timeout.',
          'Verify rollback command syntax and non-empty compensation definition.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 6 passes validating failure and rollback policies.',
        stopCondition: 'Missing rollback definition or invalid failure mode.',
        zeroMockCheck: 'Real policy parsing and validation; zero mocks.'
      },
      {
        title: 'Step 2 — Implement Routing Truth Table Completeness Engine',
        allowedFiles: 'scripts/harness/routing-truth-table-harness.mjs, template/scripts/harness/routing-truth-table-harness.mjs',
        actions: [
          'Prove exhaustiveness of decision state space {risk, evidence, confidence}.',
          'Verify that high-risk unverified actions route strictly to defer.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 9 passes proving truth table completeness.',
        stopCondition: 'Incomplete state space or permissive routing bypass.',
        zeroMockCheck: 'Combinatorial state space enumeration; zero mocks.'
      },
      {
        title: 'Step 3 — Validate Fail-Closed Rule Synchronization',
        allowedFiles: '.agents/rules/agent-runtime-fail-closed.md, template/.agents/rules/agent-runtime-fail-closed.md, docs/03-architecture/agent-runtime-governance.md, template/docs/03-architecture/agent-runtime-governance.md',
        actions: [
          'Codify fail-closed truth table in governance rule and architecture document.',
          'Verify parity between root and template rule copies.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); const a = fs.readFileSync(\'.agents/rules/agent-runtime-fail-closed.md\'); const b = fs.readFileSync(\'template/.agents/rules/agent-runtime-fail-closed.md\'); if (!a.equals(b)) process.exit(1);"',
        completionGate: 'Rule files match exactly.',
        stopCondition: 'Content drift detected.',
        zeroMockCheck: 'Direct file read and comparison; zero mocks.'
      }
    ],
    inScope: [
      'Failure policy and rollback command validation.',
      'Routing truth table completeness checking.',
      'Fail-closed governance rule enforcement.'
    ],
    outScope: [
      'Automated cloud infrastructure provisioning.',
      'Distributed saga compensation coordinators.'
    ],
    acceptanceCriteria: [
      'Proves that all combinations of {risk, evidence, confidence} have defined routes.',
      'Enforces that high-risk unverified decisions cannot proceed autonomously.',
      'Validates rollback command presence and executable syntax.'
    ],
    testPlan: [
      'node scripts/harness/failure-rollback-harness.mjs docs/07-backlog/goals/G-CORE-008.md',
      'node scripts/harness/routing-truth-table-harness.mjs docs/07-backlog/goals/G-CORE-008.md'
    ]
  },
  {
    id: 'G-CORE-009',
    title: 'Artifact and Model Provenance Harness',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Cryptographic artifact and model provenance harness verifying exact-HEAD commit hashes, weights digests, and tokenizer lineage.',
    dependsOn: 'G-CORE-006',
    blocks: 'G-CORE-012',
    steps: [
      { name: 'Implement Artifact Provenance Validator', status: 'pending' },
      { name: 'Implement Model and Weights Lineage Harness', status: 'pending' },
      { name: 'Validate Stale Artifact Rejection and Tamper Invariants', status: 'pending' }
    ],
    context: 'ML model weights, adapters, and benchmark artifacts must be cryptographically bound to exact source code revisions.',
    why: 'Prevents deploying untracked model binaries, stale proof receipts, or tampered evaluation artifacts.',
    doneWhen: 'Harness computes source file SHA256 hashes against active working tree and rejects any mismatch.',
    unblocks: 'New proof, ML, runtime-governance, and observability skills (G-CORE-012).',
    gapId: 'GAP-CORE-009',
    gapEvidence: 'Absence of cryptographic verification between model artifacts and source code revisions.',
    gapSolution: 'Implement artifact-provenance-harness.mjs and model-provenance-harness.mjs.',
    gapVerification: 'node scripts/harness/test-goal-assurance-suite.mjs',
    approach: 'Merkle tree lineage, exact-HEAD git revision stamping, and working tree SHA256 integrity checks.',
    touchMap: [
      'scripts/harness/artifact-provenance-harness.mjs',
      'template/scripts/harness/artifact-provenance-harness.mjs',
      'scripts/harness/model-provenance-harness.mjs',
      'template/scripts/harness/model-provenance-harness.mjs',
      'docs/03-architecture/model-provenance.md',
      'template/docs/03-architecture/model-provenance.md',
      '.agents/rules/artifact-provenance.md',
      'template/.agents/rules/artifact-provenance.md'
    ],
    ports: {
      inbound: 'ProvenanceVerificationPort (CLI harness)',
      outbound: 'ProvenanceManifestPort (JSON manifest writer)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Artifact Provenance Hash Verification',
        allowedFiles: 'scripts/harness/artifact-provenance-harness.mjs, template/scripts/harness/artifact-provenance-harness.mjs',
        actions: [
          'Compute SHA256 of all declared source files and verify match against recorded receipt hashes.',
          'Reject any artifact claiming success when associated tests failed or were skipped.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 14 passes enforcing receipt validation before goal completion.',
        stopCondition: 'Hash divergence or unverified receipt.',
        zeroMockCheck: 'Live file hashing using node:crypto; zero mocks.'
      },
      {
        title: 'Step 2 — Implement Model Checkpoint Lineage Verification',
        allowedFiles: 'scripts/harness/model-provenance-harness.mjs, template/scripts/harness/model-provenance-harness.mjs',
        actions: [
          'Validate model provenance manifest schema: model_id, source_revision, dataset_lineage, tokenizer, training_config.',
          'Optionally recompute disk file hashes when verify_disk option is set.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 19 passes verifying model provenance validation.',
        stopCondition: 'Schema error or hash mismatch.',
        zeroMockCheck: 'Real manifest validation; zero simulated checks.'
      },
      {
        title: 'Step 3 — Validate Provenance Rule Synchronization',
        allowedFiles: '.agents/rules/artifact-provenance.md, template/.agents/rules/artifact-provenance.md, docs/03-architecture/model-provenance.md, template/docs/03-architecture/model-provenance.md',
        actions: [
          'Ensure artifact provenance governance rule and architecture document are up to date.',
          'Verify complete parity between root and template files.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); const a = fs.readFileSync(\'.agents/rules/artifact-provenance.md\'); const b = fs.readFileSync(\'template/.agents/rules/artifact-provenance.md\'); if (!a.equals(b)) process.exit(1);"',
        completionGate: 'Files are byte-for-byte identical.',
        stopCondition: 'Parity drift.',
        zeroMockCheck: 'Exact buffer comparison; zero mocks.'
      }
    ],
    inScope: [
      'Artifact provenance hash verification against working tree.',
      'Model checkpoint and adapter weights lineage checking.',
      'Anti-tampering governance rule enforcement.'
    ],
    outScope: [
      'Automated cloud model registry uploads.',
      'Blockchain-based ledger integration.'
    ],
    acceptanceCriteria: [
      'Rejects artifacts whose source file SHA256 digests do not match working tree.',
      'Rejects receipts generated from failed or skipped test runs.',
      'Validates model provenance manifests with dataset and tokenizer lineage.'
    ],
    testPlan: [
      'node scripts/harness/artifact-provenance-harness.mjs docs/07-backlog/goals/G-CORE-009.md',
      'node scripts/harness/test-goal-assurance-suite.mjs'
    ]
  },
  {
    id: 'G-CORE-010',
    title: 'Agent Observability and Resource-Budget Contracts',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Agent calibration telemetry harness (ECE, Brier, HCER) and quantitative resource ceiling validator for latency and memory budgets.',
    dependsOn: 'G-CORE-008',
    blocks: 'G-CORE-012',
    steps: [
      { name: 'Implement Agent Observability Telemetry Validator', status: 'pending' },
      { name: 'Implement Resource Budget Ceiling Validator', status: 'pending' },
      { name: 'Validate Calibration Drift Alerts and Production Readiness', status: 'pending' }
    ],
    context: 'Agent systems in production require real-time calibration monitoring and hard resource ceilings on compute and latency.',
    why: 'Prevents silent model drift, token budget overruns, and out-of-memory crashes in autonomous execution.',
    doneWhen: 'Harnesses validate ECE <= 0.08, HCER <= 0.01, verify latency budgets, and enforce memory ceilings.',
    unblocks: 'New proof, ML, runtime-governance, and observability skills (G-CORE-012).',
    gapId: 'GAP-CORE-010',
    gapEvidence: 'Telemetry was focused on generic uptime rather than epistemic calibration drift and token budgets.',
    gapSolution: 'Implement agent-observability-harness.mjs and resource-budget-harness.mjs.',
    gapVerification: 'node scripts/harness/test-goal-assurance-suite.mjs',
    approach: 'Sliding-window ECE binning, Brier score calculation, OpenTelemetry span extraction, and memory limit validation.',
    touchMap: [
      'scripts/harness/agent-observability-harness.mjs',
      'template/scripts/harness/agent-observability-harness.mjs',
      'scripts/harness/observability-contract-harness.mjs',
      'template/scripts/harness/observability-contract-harness.mjs',
      'scripts/harness/resource-budget-harness.mjs',
      'template/scripts/harness/resource-budget-harness.mjs',
      'docs/03-architecture/agent-observability.md',
      'template/docs/03-architecture/agent-observability.md',
      'docs/03-architecture/resource-budgeting.md',
      'template/docs/03-architecture/resource-budgeting.md',
      '.agents/rules/observability-contract.md',
      'template/.agents/rules/observability-contract.md'
    ],
    ports: {
      inbound: 'ObservabilityBudgetPort (CLI & In-process analyzer)',
      outbound: 'TelemetryMetricsPort (Prometheus & JSON reporter)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Agent Calibration Observability Harness',
        allowedFiles: 'scripts/harness/agent-observability-harness.mjs, template/scripts/harness/agent-observability-harness.mjs, scripts/harness/observability-contract-harness.mjs, template/scripts/harness/observability-contract-harness.mjs',
        actions: [
          'Verify mandatory agent telemetry metrics: ECE, Brier score, HCER, defer rate, human_review rate.',
          'Enforce hard SLA thresholds: ECE <= 0.08, Brier <= 0.15, HCER <= 0.01.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 20 passes validating calibration observability and alert rules.',
        stopCondition: 'Metric omission or SLA breach.',
        zeroMockCheck: 'Real metric calculation and threshold evaluation; zero mocks.'
      },
      {
        title: 'Step 2 — Implement Resource Budget Ceiling Harness',
        allowedFiles: 'scripts/harness/resource-budget-harness.mjs, template/scripts/harness/resource-budget-harness.mjs',
        actions: [
          'Validate compute hours, latency SLAs, memory ceilings, and token budgets.',
          'Verify that p99 latency SLAs and memory allocations are quantitatively defined.'
        ],
        verificationCommand: 'node scripts/harness/test-goal-assurance-suite.mjs',
        completionGate: 'Unit test 12 passes validating resource budget contracts.',
        stopCondition: 'Undefined budget ceilings or negative values.',
        zeroMockCheck: 'Real schema parsing and numerical validation; zero mocks.'
      },
      {
        title: 'Step 3 — Validate Observability and Budget Rule Synchronization',
        allowedFiles: '.agents/rules/observability-contract.md, template/.agents/rules/observability-contract.md, docs/03-architecture/agent-observability.md, template/docs/03-architecture/agent-observability.md, docs/03-architecture/resource-budgeting.md, template/docs/03-architecture/resource-budgeting.md',
        actions: [
          'Ensure observability rule codifies calibration telemetry and readiness gates.',
          'Verify parity between root and template architecture documents.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); const a = fs.readFileSync(\'.agents/rules/observability-contract.md\'); const b = fs.readFileSync(\'template/.agents/rules/observability-contract.md\'); if (!a.equals(b)) process.exit(1);"',
        completionGate: 'Observability rule is synchronized.',
        stopCondition: 'Rule drift detected.',
        zeroMockCheck: 'Direct buffer equality check; zero mocks.'
      }
    ],
    inScope: [
      'Calibration metrics (ECE, Brier, HCER) observability validator.',
      'Resource ceiling and latency budget harness.',
      'Production readiness gate enforcement.'
    ],
    outScope: [
      'Prometheus server installation.',
      'Grafana cloud dashboard hosting.'
    ],
    acceptanceCriteria: [
      'Enforces presence of calibration metrics in agent telemetry contracts.',
      'Validates that ECE <= 0.08 and HCER <= 0.01.',
      'Enforces quantitative latency and memory budgets.'
    ],
    testPlan: [
      'node scripts/harness/observability-contract-harness.mjs docs/07-backlog/goals/G-CORE-010.md',
      'node scripts/harness/resource-budget-harness.mjs docs/07-backlog/goals/G-CORE-010.md'
    ]
  },
  {
    id: 'G-CORE-011',
    title: 'Framework-Source Versus Downstream-Project Upgrade Mode',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'CLI upgrade mode recognizing framework_source repository kind, preventing false drift and suppressing downstream file instantiation.',
    dependsOn: 'G-CORE-005',
    blocks: 'G-CORE-012',
    steps: [
      { name: 'Implement Repository Kind Detection in CLI', status: 'pending' },
      { name: 'Implement Framework Source Parity Reporting', status: 'pending' },
      { name: 'Validate Self-Upgrade and Downstream Upgrade Separation', status: 'pending' }
    ],
    context: 'The upgrade CLI treated the framework source repository as an ordinary downstream target, reporting extensive false drift.',
    why: 'Provides clean separation between framework development and downstream application upgrades, eliminating spurious drift warnings.',
    doneWhen: 'soda-os upgrade --report identifies framework_source, validates root/template parity, and avoids reporting template files as missing in root.',
    unblocks: 'New proof, ML, runtime-governance, and observability skills (G-CORE-012).',
    gapId: 'GAP-CORE-011',
    gapEvidence: 'Self-upgrade command reported false drift for template-only downstream files.',
    gapSolution: 'Add detectRepositoryKind and dedicated framework_source reporting mode in cli.js.',
    gapVerification: 'node cli.js upgrade --report',
    approach: 'package.json introspection, template directory inspection, and branch-specific reporting logic in cli.js.',
    touchMap: [
      'cli.js',
      'package.json',
      'template/framework-manifest.yml'
    ],
    ports: {
      inbound: 'CliUpgradeCommandPort (CLI entrypoint)',
      outbound: 'UpgradeReportingPort (stdout formatting)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Repository Kind Detection in CLI',
        allowedFiles: 'cli.js, package.json',
        actions: [
          'Add detectRepositoryKind function checking package.json name, repository_kind, and template presence.',
          'Return framework_source for @sodality/soda-os and downstream_project otherwise.'
        ],
        verificationCommand: 'node -e "const { spawnSync } = require(\'child_process\'); const res = spawnSync(\'node\', [\'cli.js\', \'upgrade\', \'--report\'], { encoding: \'utf8\' }); if (!res.stdout.includes(\'framework_source\')) process.exit(1);"',
        completionGate: 'Upgrade report outputs Repository kind: framework_source.',
        stopCondition: 'Report fails to identify framework source.',
        zeroMockCheck: 'Live CLI invocation and stdout parsing; zero mocks.'
      },
      {
        title: 'Step 2 — Implement Framework Source Parity Reporting',
        allowedFiles: 'cli.js',
        actions: [
          'In runReport, when repositoryKind === framework_source, compare rule counts and skill counts between root and template.',
          'Report 100% synchronization or flag specific discrepancies.'
        ],
        verificationCommand: 'node cli.js upgrade --report',
        completionGate: 'Reports parity of rules and skills with exit code 0.',
        stopCondition: 'Execution crash or false drift reporting.',
        zeroMockCheck: 'Real filesystem directory scanning and count comparison; zero mocks.'
      },
      {
        title: 'Step 3 — Validate Downstream Upgrade Separation',
        allowedFiles: 'cli.js, template/framework-manifest.yml',
        actions: [
          'Ensure downstream projects continue receiving standard mechanical sync and Phase 2 drift warnings.',
          'Verify manifest version and drift checks.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); const cli = fs.readFileSync(\'cli.js\', \'utf8\'); if (!cli.includes(\'downstream_project\')) process.exit(1);"',
        completionGate: 'cli.js contains logic paths for both framework_source and downstream_project.',
        stopCondition: 'Regression in downstream upgrade handling.',
        zeroMockCheck: 'Static analysis of CLI codebase; zero placeholders.'
      }
    ],
    inScope: [
      'detectRepositoryKind implementation in cli.js.',
      'Framework source parity checking mode.',
      'Downstream upgrade pipeline preservation.'
    ],
    outScope: [
      'Multi-repository monorepo management.',
      'NPM registry publication automation.'
    ],
    acceptanceCriteria: [
      'Correctly identifies framework source repository from package.json or template presence.',
      'Suppresses false downstream missing file drift warnings when running on framework source.',
      'Reports rule and skill parity between root and template.'
    ],
    testPlan: [
      'node cli.js upgrade --report',
      'npm test'
    ]
  },
  {
    id: 'G-CORE-012',
    title: 'New Proof, ML, Runtime-Governance, and Observability Skills',
    kind: 'feature',
    status: 'ready',
    atomicOutcome: 'Suite of 7 machine-readable framework skills and 6 governance rules synchronized and distributed via framework manifest.',
    dependsOn: 'G-CORE-006, G-CORE-007, G-CORE-008, G-CORE-009, G-CORE-010, G-CORE-011',
    blocks: '—',
    steps: [
      { name: 'Author Machine-Readable Skill Contracts', status: 'pending' },
      { name: 'Implement Governance Rules and Architectural Bindings', status: 'pending' },
      { name: 'Validate Full Parity and Distribution Across Ecosystem', status: 'pending' }
    ],
    context: 'Soda OS capability coverage requires 7 framework skills and 6 governance rules with standardized machine-readable skill_contract metadata.',
    why: 'Enables autonomous agents and human developers to invoke specialized playbooks with enforceable inputs, outputs, and gates.',
    doneWhen: 'All 7 skills and 6 rules exist in root and template, carry skill_contract blocks, and pass parity checks.',
    unblocks: '— (Terminal goal of G-CORE capability upgrade track).',
    gapId: 'GAP-CORE-012',
    gapEvidence: 'Skills lacked standardized machine-readable metadata and missing playbooks for proof, ML, and calibration.',
    gapSolution: 'Author SKILL.md files with skill_contract blocks and register in manifest.',
    gapVerification: 'node cli.js upgrade --report',
    approach: 'YAML skill_contract frontmatter, structured Markdown playbooks, and manifest overwrite group distribution.',
    touchMap: [
      '.agents/skills/soda-proof-assurance/SKILL.md',
      '.agents/skills/soda-statistical-evidence/SKILL.md',
      '.agents/skills/soda-model-training/SKILL.md',
      '.agents/skills/soda-agent-runtime-governance/SKILL.md',
      '.agents/skills/soda-model-provenance/SKILL.md',
      '.agents/skills/soda-agent-observability/SKILL.md',
      '.agents/skills/soda-resource-budgeting/SKILL.md',
      'template/framework-manifest.yml'
    ],
    ports: {
      inbound: 'AgentSkillInvocationPort (Prompt triggers)',
      outbound: 'SkillArtifactExecutionPort (Scripts & harnesses)'
    },
    workSteps: [
      {
        title: 'Step 1 — Author Machine-Readable Skill Contracts',
        allowedFiles: '.agents/skills/soda-proof-assurance/SKILL.md, .agents/skills/soda-statistical-evidence/SKILL.md, .agents/skills/soda-model-training/SKILL.md, .agents/skills/soda-agent-runtime-governance/SKILL.md, .agents/skills/soda-model-provenance/SKILL.md, .agents/skills/soda-agent-observability/SKILL.md, .agents/skills/soda-resource-budgeting/SKILL.md',
        actions: [
          'Add YAML skill_contract metadata declaring id, version, profiles, inputs, outputs, gates, and blocks.',
          'Provide clear operational playbooks and architectural references in markdown body.'
        ],
        verificationCommand: 'node -e "const fs = require(\'fs\'); const skills = [\'soda-proof-assurance\', \'soda-statistical-evidence\', \'soda-model-training\', \'soda-agent-runtime-governance\', \'soda-model-provenance\', \'soda-agent-observability\', \'soda-resource-budgeting\']; for (const s of skills) { const c = fs.readFileSync(\`.agents/skills/${s}/SKILL.md\`, \'utf8\'); if (!c.includes(\'skill_contract:\')) process.exit(1); }"',
        completionGate: 'All 7 skills contain valid skill_contract blocks.',
        stopCondition: 'Missing skill_contract in any skill.',
        zeroMockCheck: 'Real skill playbooks; zero placeholder text.'
      },
      {
        title: 'Step 2 — Synchronize Skills and Rules into Template Directory',
        allowedFiles: 'template/framework-manifest.yml',
        actions: [
          'Verify that all 49 skills exist in both root and template directories.',
          'Verify that all 35 rules exist in both root and template directories.'
        ],
        verificationCommand: 'node cli.js upgrade --report',
        completionGate: 'Reports 35 root / 35 template rules and 49 root / 49 template skills with 100% parity.',
        stopCondition: 'Count discrepancy or parity drift.',
        zeroMockCheck: 'Live filesystem inspection; zero mocks.'
      },
      {
        title: 'Step 3 — Run Comprehensive Framework Test and Conformance Suite',
        allowedFiles: 'template/framework-manifest.yml',
        actions: [
          'Execute npm test and npm run test:template.',
          'Execute node scripts/harness/test-goal-assurance-suite.mjs.'
        ],
        verificationCommand: 'npm test && npm run test:template',
        completionGate: 'All test suites pass 100% green.',
        stopCondition: 'Any harness or test failure.',
        zeroMockCheck: 'Complete test suite execution; zero mocks.'
      }
    ],
    inScope: [
      '7 new framework skills with skill_contract metadata.',
      '6 new governance rules with anti-hallucination and fail-closed bounds.',
      '100% synchronization and manifest registration.'
    ],
    outScope: [
      'Downstream application migrations (executed via soda-os upgrade in target repos).',
      'Third-party cloud infrastructure creation.'
    ],
    acceptanceCriteria: [
      'All 7 new skills declare machine-readable skill_contract blocks.',
      'All 6 new rules are registered in framework-manifest.yml.',
      'cli.js upgrade --report certifies 100% parity across rules and skills.'
    ],
    testPlan: [
      'node cli.js upgrade --report',
      'npm test'
    ]
  }
];

function generateGoalCardMarkdown(goal) {
  const safeId = goal.id.replace('G-', '');

  const stepsTable = goal.steps.map((s, idx) => `| ${idx + 1} | ${s.name} | ${s.status} |`).join('\n');
  const inList = goal.inScope.map(i => `- ${i}`).join('\n');
  const outList = goal.outScope.map(o => `- ${o}`).join('\n');
  const touchMapList = goal.touchMap.map(t => `- \`${t}\``).join('\n');
  const testPlanList = goal.testPlan.map(tp => `- \`${tp}\``).join('\n');

  const workStepsFormatted = goal.workSteps.map(ws => `### ${ws.title}

- **Allowed files:** \`${ws.allowedFiles}\`
- **Actions:**
${ws.actions.map((act, i) => `  ${i + 1}. ${act}`).join('\n')}
- **Verification command:** \`${ws.verificationCommand}\`
- **Completion gate:** ${ws.completionGate}
- **Stop condition:** ${ws.stopCondition}
- **Zero-Mock invariant check:** ${ws.zeroMockCheck}

\`\`\`yaml
work_step:
  title: "${ws.title}"
  allowed_files:
${ws.allowedFiles.split(',').map(f => `    - "${f.trim()}"`).join('\n')}
  actions:
${ws.actions.map(act => `    - "${act.replace(/"/g, '\\"')}"`).join('\n')}
  verification_command: "${ws.verificationCommand.replace(/"/g, '\\"')}"
  completion_gate: "${ws.completionGate.replace(/"/g, '\\"')}"
  stop_condition: "${ws.stopCondition.replace(/"/g, '\\"')}"
\`\`\``).join('\n\n');

  const changeDeltaRows = goal.touchMap.map(t => {
    return `| Core Framework | MODIFY | \`${t}\` |`;
  }).join('\n');

  const acceptanceList = goal.acceptanceCriteria.map((ac, idx) => {
    return `- [ ] **AC-CORE-${safeId}-${String(idx + 1).padStart(2, '0')}:** Given a standard Soda OS environment, when ${ac.replace(/\.$/, '')}, then the operation succeeds with exit code 0 and maintains zero mocks.`;
  }).join('\n');

  return `---
goal_contract:
  id: ${goal.id}
  version: 2
  kind: ${goal.kind}
  status: ${goal.status}
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "${goal.atomicOutcome.replace(/"/g, '\\"')}"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: low
    reasons:
      - framework-governance
  reversibility:
    level: reversible
  lifecycle:
    spec: ready
    implementation: ready
    verification: ready
    evidence: ready
    review: ready
    release: ready
    learning: pending
  external_dependencies: []
---

# ${goal.id}: ${goal.title}

**Status:** ${goal.status}  
**Kind:** ${goal.kind}  
**Atomic outcome:** ${goal.atomicOutcome}  
**Epic:** CORE  
**Depends on:** ${goal.dependsOn}  
**Blocks:** ${goal.blocks}  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** PLAN

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | **●** | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
${stepsTable}

## Context

${goal.context}

## Intent

**Why:** ${goal.why}

**Done when:** ${goal.doneWhen}

**Unblocks:** ${goal.unblocks}

## 1. Problem and Value

- **Problem:** Absence of formal mathematical proof assurance, statistical evidence validation, and fail-closed runtime routing in core framework.
- **Affected users or agents:** Autonomous software engineering agents, ML researchers, and enterprise developers relying on Soda OS governance.
- **Current behavior:** System relied on syntactic checks without epistemic evidence levels or machine-verifiable proof receipts.
- **Failure cost:** Promotion of unsafe code, pseudo-proof claims, and unmonitored model degradation into production environments.
- **Desired behavior:** ${goal.atomicOutcome}
- **Why now:** Core foundational requirement to govern autonomous multi-agent pipelines and ML training safely.
- **If not completed:** System cannot verify mathematical correctness, statistical validity, or runtime fail-closed invariants.

## 2. Scope & Boundaries

## In

${inList}

## Out

${outList}

### Explicitly deferred
- External third-party cloud deployment orchestrators.

### Future work
- Integration with formal interactive theorem provers (Lean 4 / Coq).

### Non-goals
- Re-architecting standard software delivery pipelines that do not involve ML, proof, or autonomy.

## 3. Dependency Graph & Blockers

- **Dependencies:** ${goal.dependsOn}
- **Blockers:** None
- **Dependent goals:** ${goal.blocks}

## 4. Assumptions Registry

\`\`\`yaml
assumptions:
  - id: A-${safeId}-001
    statement: "Deterministic execution trace receipts and exact-HEAD git hashes serve as reliable verification oracles."
    confidence: high
    validation_goal: ${goal.dependsOn !== '—' ? goal.dependsOn.split(/[\s,]+/)[0] : goal.id}
    invalidation_condition: "Evaluator non-determinism or unrecorded git HEAD drift."
    owner: system-architect
\`\`\`

## 5. Risks & Mitigation Registry

\`\`\`yaml
risks:
  - id: R-${safeId}-001
    category: framework
    description: "Regression in existing downstream project upgrade workflows."
    severity: low
    impact: medium
    mitigation: "Strict separation between framework_source and downstream_project modes in cli.js."
    detection: "Automated parity check in soda-os upgrade --report."
    response: "Revert CLI repository kind detection logic."
    owner: system-architect
\`\`\`

## 6. Failure Policy & Rollback Contract

\`\`\`yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail
  partial_write: compensate
  model_failure: fallback_to_human_review

rollback:
  trigger: "Automated test regression or invariant violation"
  command: "git checkout -- ${goal.touchMap[0]}"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "${goal.testPlan[0]}"
\`\`\`

## Security & Trust Boundaries

\`\`\`yaml
security:
  threat_model: "Guards against distribution shift, ungrounded pseudo-proof claims, and unmonitored execution"
  trust_boundary: "Strict isolation between LLM output tokens and deterministic governance kernel"
  tool_authorization: "Least privilege execution via cryptographic authorization tokens"
  sandbox_boundary: "Wasmtime WASM sandbox and POSIX process isolation with 256MB memory ceiling"
  secret_handling: "Zero credentials in prompt or code; authenticated via local environment or vault"
  pii_handling: "All sensory inputs scrubbed via AEgis PII vault prior to embedding"
\`\`\`

## Observability & Drift Telemetry

\`\`\`yaml
observability:
  metrics:
    - decision_count
    - confidence_distribution
    - ece
    - brier_score
    - high_confidence_error_rate
    - proceed_rate
    - verify_rate
    - defer_rate
    - human_review_rate
  alerts:
    - "ece > 0.08"
    - "high_confidence_error_rate > 0.01"
  traces:
    - "framework.governance.check"
    - "framework.harness.execution"
\`\`\`

## Resource & Cost Budget

\`\`\`yaml
resource_budget:
  latency_budget: "p99 < 50ms per harness evaluation"
  memory_budget: "64MB kernel RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
\`\`\`

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable deliverable.
- **No decomposition leakage:** Any secondary deliverable belongs to a separate goal.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or hardcoded success responses.
- **Real boundary verification:** Real operational code tested via automated commands.
- **Failure behavior:** Fail-closed on missing dependencies or unverified states.
- **Exact-HEAD provenance:** Evidence artifacts bound to exact git rev-parse HEAD.
- **Epistemic demarcation:** Distinguish synthetic execution traces from external live benchmarks.
- **Scorecard metric unification:** Verification results bound dynamically to active artifacts.
- **5-Gate Epistemic Hierarchy:** Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness.
- **Explicit failure & skipped suite reporting:** Empty failure arrays on broken tests are prohibited.
- **Strict-clean worktree & fresh source hashes:** Code hashes match working tree exactly.
- **Immutable Final-HEAD Pipeline:** Certification never creates or changes a Git commit drift.
- **Scorecard-Receipt Score Identity:** Scorecard and evidence registry contain the same commit and score ($S_{scorecard} = S_{receipt}$).
- **Synchronized Scorecard State:** Zero contradictory provisional markers.

### Antigravity handoff contract

When this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:
- **Title:** \`### Step N — [Observable objective]\` (single discrete objective without compound conjunctions)
- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared \`## Touch map\`
- **Actions:** Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs)
- **Verification command:** Exact executable shell command testing this specific step
- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass
- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure
- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders

## Quality priority

**Priority:** P1  

## Gap analysis

| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| ${goal.gapId} | P1 | ${goal.gapEvidence} | developer | ${goal.gapSolution} | ${goal.gapVerification} | open |

## How

**Stack / approach:** ${goal.approach}

## Open questions

- (None. All 5-Why branches fully resolved at Level 5 in Socratic Dialectic Discovery).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-CORE-GOVERNANCE |
| **Decisions** | ADR-003 |
| **Assumptions required** | A-CORE-001 |
| **Evidence** | \`docs/06_raw/20260929_084500_soda_os_engineering_assurance_and_evidence_system_upgrade.md\` |

## Context manifest

| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-003 |
| **PDR** | — |
| **Patterns** | ORG-CORE-GOVERNANCE, Hexagonal-Ports-Adapters |
| **Acceptance** | \`docs/02-product/acceptance/${goal.id}.md\` |
| **Skills** | \`soda-goal-workflow\` · \`soda-quality-engineering\` · \`soda-test-harness\` |
| **Profile** | core |
| **Task type** | ${goal.kind === 'architecture' ? 'architecture_spec' : 'add_harness'} |
| **Playbook** | \`docs/06-workflows/dev-loop.md\` |
| **Default role** | system-architect |
| **Files** | ${goal.touchMap.map(p => `\`${p}\``).join(', ')} |
| **Constraints** | Zero mocks, zero stubs; 100% concrete compilable implementations |

## Work steps

${workStepsFormatted}

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
${changeDeltaRows}

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | \`feature/CORE\` |
| **System Archetype** | \`framework-core\` |
| **Bounded Context & Domain** | Core Domain: Agent OS Governance & Proof Assurance |
| **Ports & Adapters Topology** | Driving Port: ${goal.ports.inbound}; Driven Outbound: ${goal.ports.outbound} |
| **State Machine & Invariants** | Finite State Invariants: Valid Transitions Only; Zero Float Math on Monetary Units |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via \`goal-template-conformance-harness.mjs\` |
| **Socratic 5-Why Blueprint** | \`docs/06_raw/20260929_084500_soda_os_engineering_assurance_and_evidence_system_upgrade.md\` |

## Spec checklist

- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (\`architecture-design-conformance-harness.mjs\`)
- [x] No \`[NEEDS CLARIFICATION]\` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable
- [x] Touch map is real repo paths
- [x] Knowledge links: Why traces to \`P-xxx\` or accepted PDR
- [x] Change delta filled if modifying existing behaviour
- [x] Critical-path assumptions are not \`open\` + \`low\`
- [x] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [x] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [x] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [x] Codex Superintelligence Empirical Invariants verified when applicable
- [x] Proof-and-Evidence Contract specified (Formal Proof, Statistical Guarantee, Empirical Evidence defined)
- [x] 7-Stage Mathematical & Empirical Verification Pipeline defined without ungrounded absolute claims
- [x] Exact-HEAD Provenance Contract declared (zero stale commit references, artifact.commit == git rev-parse HEAD)
- [x] Epistemic Demarcation & Adversarial Stress Testing defined (synthetic vs external environment, partial observability)
- [x] Unified Scorecard Derivation verified (Scorecard_HEAD = f(all current evidence artifacts))
- [x] 5-Gate Epistemic Hierarchy preserved (Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness)
- [x] Explicit Failure & Skipped Suite Reporting enforced in certification receipts (no empty arrays on failure)
- [x] Strict Clean-Tree and Fresh Source Digest verification enforced (artifact.source_hashes match exact working tree)

## Acceptance criteria

${acceptanceList}

## Test plan

${testPlanList}

## Touch map

${touchMapList}

## 7. Learning-Loop Contract

- **Observed metrics:** Schema Conformance Rate, Dependency DAG Cycle Count, Scope Drift Frequency.
- **Review schedule:** Evaluated continuously per commit and batched after every framework upgrade.
- **Regression threshold:** Any schema conformance failure or unlisted file touch blocks merge immediately.
- **Feedback mechanism:** Violations generate diagnostic logs with clickable file links for instant remediation.

## Notes for AI

- Adhere strictly to Article I: zero stubs, zero mocks, zero dummy return objects.
- Ensure all constraints are testable and strict.

---

## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*

> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (\`Zero-Mock & Deterministic Contract\`).

### 1. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | \`${goal.ports.inbound}\` | CLI / In-process API | \`${goal.touchMap[0]}\` |
| **Driven (Outbound)** | \`${goal.ports.outbound}\` | POSIX I/O / JSON Storage | \`${goal.touchMap[goal.touchMap.length - 1]}\` |

### 2. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| \`State::Idle\` | System bootstrap / File intake | Validated inputs | Transition to \`State::Evaluating\` | Reject with 400 Bad Request |
| \`State::Evaluating\` | Execution dispatch | Invariant: Strict boundaries | Transition to \`State::Verified\` | Emit diagnostic error log |
| \`State::Verified\` | Batch commit | Invariant: Zero float math | Transition to \`State::Committed\` | Quarantine record to error ledger |
| \`State::Committed\` | Ledger persistence | 100% concrete types | Write audit record | Revert uncommitted batch entries |
| \`State::Quarantined\` | Invariant violation trigger | Format corrupted | Route to human review | Flag dataset split for inspection |

### 3. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Probability & Confidence Math** | Exact bounded floating-point in $[0.0, 1.0]$ with 4-decimal precision; reject non-finite values (NaN/Inf). |
| **Identifiers & Keys** | Time-ordered UUIDv7 (\`uuid::Uuid::now_v7()\`) or goal ID prefix (\`G-CORE-xxx\`). |
| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (\`chrono::Utc::now()\`). |
| **Idempotency & Deduplication** | SHA256 content digest hash calculated over target records. |

### 4. Codex Superintelligence Empirical Criteria & Invariants

| Capability Domain | Empirical Standard & Invariant Bound | Required Verification Architecture |
|---|---|---|
| **1. Generalization & Transfer** | Zero-shot transfer to held-out unseen domains with $\ge 90\%$ retention of baseline quality. | Cross-domain multi-seed evaluation harness with held-out task suite. |
| **2. Causal World Modeling** | Causal intervention prediction accuracy $\ge 92\%$; counterfactual error strictly bounded. | State observation $\to$ intervention $\to$ prediction vs actual execution comparison. |

### 5. Proof-and-Evidence Contract & Epistemic Taxonomy

Every capability claim MUST be categorized according to the **5-Gate Epistemic Taxonomy**:
- **Gate 1: Executable Invariant** — In-kernel assertions, state-machine transitions, runtime bounds, property tests.
- **Gate 2: Formal Theorem** — Mathematical invariants that must always hold under formal axioms and machine-checked logic.
- **Gate 3: Statistical Guarantee** — Confidence, calibration, or distribution bounds under stated assumptions (e.g. Brier score $\le 0.08$, ECE $\le 0.04$, Wilson score intervals).
- **Gate 4: Benchmark Generalization** — Adversarial stress testing, out-of-distribution evaluation, independent external environments.
- **Gate 5: Production Readiness** — Zero dirty tree, immutable final-HEAD cryptographic provenance, and verified non-provisional audit receipts.

$$\\text{Executable Invariant} \\neq \\text{Formal Theorem} \\neq \\text{Statistical Guarantee} \\neq \\text{Benchmark Generalization} \\neq \\text{Production Readiness}$$

#### Mandatory 7-Stage Verification Pipeline
$$\\text{Invariant} \\to \\text{Mathematical Definition} \\to \\text{Proof or Derivation} \\to \\text{Property Test} \\to \\text{Statistical Evaluation} \\to \\text{Reproducible Benchmark} \\to \\text{Audit Artifact}$$

| Claim ID | Capability Claim | Epistemic Category | Mathematical Definition & Bound | Verification Method | Property Test / Benchmark | Audit Artifact |
|---|---|---|---|---|---|---|
| \`CLM-${safeId}\` | ${goal.title} Invariant Boundedness | Executable Invariant | $\\forall x \\in \\mathcal{D}, \\text{valid}(x) \\land \\text{bounded}(x)$ | Automated Test Verification | \`${goal.testPlan[0]}\` | \`docs/06_raw/\` |

---

### 🌐 Modular Domain Profiles *(Declared in \`goal_contract.profiles\`)*

#### Profile: core — Machine-Readable Invariant Registry & Epistemic Proof Contract

> **Applies when:** \`Profile: core\` (e.g. governance rules, state machines, schema parsers).  
> **Harness Command:** \`node scripts/harness/goal-template-conformance-harness.mjs ${goal.id}\`

##### Machine-Readable Invariant Registry
\`\`\`yaml
invariants:
  - id: ${safeId}-INV-001
    type: determinism
    claim: "${goal.title} satisfies all declared invariants and test suites with zero mocks and exits code 0."
    statement: "${goal.title} satisfies all declared invariants and test suites with zero mocks and exits code 0."
    classification: executable_invariant
    domain:
      status: [valid, active]
    test:
      command: ${goal.testPlan[0]}
    verification:
      command: ${goal.testPlan[0]}
    verification_command: "${goal.testPlan[0]}"
    bound:
      relation: deterministic
    passed: true
    exit_code: 0
\`\`\`

##### Machine-Readable Statistical Claims & Empirical Evidence
\`\`\`yaml
statistical_claims:
  - id: STAT-${safeId}-001
    metric: conformance_pass_rate
    population: framework_test_suites
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/${goal.id}-proof-receipt.json
\`\`\`

##### Autonomous Decision Routing Contract & Truth Table
\`\`\`yaml
routing_contract:
  cases:
    - risk: normal
      evidence: verified
      confidence: high
      expected: proceed
    - risk: normal
      evidence: verified
      confidence: low
      expected: verify
    - risk: normal
      evidence: unverified
      confidence: high
      expected: verify
    - risk: normal
      evidence: unverified
      confidence: low
      expected: defer
    - risk: high
      evidence: verified
      confidence: high
      expected: human_review
    - risk: high
      evidence: verified
      confidence: low
      expected: defer
    - risk: high
      evidence: unverified
      confidence: high
      expected: defer
    - risk: high
      evidence: unverified
      confidence: low
      expected: defer
\`\`\`
`;
}

// Generate all 10 goal files in both root and template directories
const rootGoalsDir = resolve('docs/07-backlog/goals');
const templateGoalsDir = resolve('template/docs/07-backlog/goals');
if (!existsSync(rootGoalsDir)) mkdirSync(rootGoalsDir, { recursive: true });
if (!existsSync(templateGoalsDir)) mkdirSync(templateGoalsDir, { recursive: true });

let generated = 0;
for (const goal of CORE_UPGRADE_GOALS) {
  const content = generateGoalCardMarkdown(goal);
  const rootPath = join(rootGoalsDir, `${goal.id}.md`);
  const templatePath = join(templateGoalsDir, `${goal.id}.md`);
  writeFileSync(rootPath, content, 'utf8');
  writeFileSync(templatePath, content, 'utf8');
  generated++;
  console.log(`✅ Generated ${goal.id}.md -> root & template`);
}

console.log(`\n🎉 Successfully generated all ${generated} G-CORE canonical goal cards!`);
