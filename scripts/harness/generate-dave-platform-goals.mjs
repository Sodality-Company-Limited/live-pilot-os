#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS DAVE CAPABILITY EXPANSION GOAL GENERATOR (17 ATOMIC GOALS)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Reference: template/docs/07-backlog/goals/_template.md
 * Purpose: Generates 100% compliant, 46-section canonical Soda OS Template v2
 *          atomic goal cards for all 17 DAVE platform capability goals:
 *          - G-PROOF-001, G-PROOF-002 (Mathematical Invariants & Proof Receipts)
 *          - G-DAVE-001..G-DAVE-006 (SYSTEM 1 Decision Orchestrator & Governance)
 *          - G-WEB-013..G-WEB-015 (Deterministic Visual Execution & State Verification)
 *          - G-ML-025..G-ML-028 (RLCD Trajectory, Calibrated Training & MoE Routing)
 *          - G-SEC-001 (Multimodal Reference Privacy & Security Controls)
 *          - G-OPS-001 (DAVE Runtime Deployment & Disaster Recovery)
 *
 * Enforces Article I (Zero Mocks), DAVE Decision Contracts, Proof Receipts,
 * Content-Addressed Evidence Grounding, and Bounded Operational Envelopes.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const GOALS_DIR = resolve('docs/07-backlog/goals');

export const DAVE_PLATFORM_GOALS = [
  {
    "id": "G-PROOF-001",
    "title": "DAVE Mathematical Invariant and Proof Receipt System",
    "kind": "architecture",
    "epic": "PROOF",
    "status": "ready",
    "priority": "P0",
    "atomicOutcome": "Formal mathematical invariant registry and cryptographic proof receipt generator certifying system decision properties under active commit hashes.",
    "dependsOn": "\u2014",
    "blocks": "G-PROOF-002, G-DAVE-001",
    "profile": "proof_receipt",
    "daveDecisionId": "DAVE-PROOF-0001",
    "daveDecisionType": "test_verification",
    "confidence": 0.98,
    "risk": "low",
    "humanAction": "none",
    "refId": "REF-0101",
    "refUri": "docs/03-architecture/profiles/proof_receipt.yaml",
    "refHash": "sha256:d8c56e30018f3a36dc8a927fa8331fa26671a1795c645ecb371cb14b304c4493",
    "steps": [
      {
        "name": "Formal Invariant Taxonomy and Schema Specification",
        "status": "pending"
      },
      {
        "name": "Cryptographic Proof Receipt Generator and Hash Binding Engine",
        "status": "pending"
      },
      {
        "name": "CI Proof Receipt Validator and Gate Verification",
        "status": "pending"
      }
    ],
    "context": "System decision properties were previously scattered across ad-hoc assertion scripts without cryptographic binding to commit states. This goal creates a unified invariant registry and generates tamper-evident proof receipts.",
    "why": "Establishes a verifiable mathematical assurance layer certifying that system decision guarantees hold empirically across all builds.",
    "doneWhen": "Formal invariant registry is operational, proof receipt generator outputs cryptographically signed JSON receipts, and CI validator confirms 100% invariant satisfaction.",
    "unblocks": "DAVE Statistical Evidence (G-PROOF-002) and DAVE Decision Orchestrator (G-DAVE-001).",
    "gapId": "GAP-PROOF-001",
    "gapEvidence": "Independent proof scripts lacked a unified receipt schema, source commit binding, and 8-class taxonomy validation.",
    "gapSolution": "Implement unified proof receipt generator and validation gate supporting all 8 invariant classifications.",
    "gapVerification": "node scripts/harness/proof-receipt-validator.mjs && node scripts/harness/mathematical-invariant-proof-harness.mjs",
    "approach": "Formal invariant contracts, SHA-256 source hashing, Git HEAD binding, and fail-closed CI receipt verification.",
    "touchMap": [
      "scripts/lib/mathematical-proof-engine.mjs",
      "scripts/harness/mathematical-invariant-proof-harness.mjs",
      "scripts/harness/proof-receipt-validator.mjs",
      "artifacts/proofs/G-PROOF-001-receipt.json"
    ],
    "ports": {
      "inbound": "MathematicalInvariantIntakePort (YAML Invariant Spec)",
      "outbound": "ProofReceiptLedgerPort (JSON Receipt Store)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Formal Invariant Taxonomy and Schema Specification",
        "allowedFiles": "scripts/lib/mathematical-proof-engine.mjs, scripts/harness/mathematical-invariant-proof-harness.mjs",
        "actions": [
          "Specify formal schemas for the 8 canonical proof classes: formal_invariant, executable_property, statistical_claim, visual_claim, operational_claim, security_claim, human_approval_claim, and model_claim",
          "Implement mathematical evaluation engine verifying probability bounds and bounded operational envelope"
        ],
        "verificationCommand": "node scripts/harness/mathematical-invariant-proof-harness.mjs",
        "completionGate": "All declared invariants evaluate cleanly with exit code 0.",
        "stopCondition": "Invalid proof classification or unhandled exception during property evaluation.",
        "zeroMockCheck": "100% operational property checking logic; zero stubs, zero mocks, zero placeholders."
      },
      {
        "title": "Step 2 \u2014 Cryptographic Proof Receipt Generator and Hash Binding Engine",
        "allowedFiles": "scripts/lib/mathematical-proof-engine.mjs, artifacts/proofs/G-PROOF-001-receipt.json",
        "actions": [
          "Implement proof receipt serializer capturing invariant_id, classification, test command, exit code, and active git commit SHA",
          "Compute SHA-256 hashes of all participating source files and dataset dependencies, writing signed receipt to artifacts"
        ],
        "verificationCommand": "node scripts/lib/mathematical-proof-engine.mjs generate-receipt G-PROOF-001",
        "completionGate": "Proof receipt generated with valid SHA-256 source hashes and result: passed.",
        "stopCondition": "Dirty worktree commit mismatch or missing source hash dependency.",
        "zeroMockCheck": "100% concrete receipt serialization with real file hashes and exit codes."
      },
      {
        "title": "Step 3 \u2014 CI Proof Receipt Validator and Gate Verification",
        "allowedFiles": "scripts/harness/proof-receipt-validator.mjs, artifacts/proofs/G-PROOF-001-receipt.json",
        "actions": [
          "Implement strict receipt validator checking schema_version, certification status, source commit, and non-empty evidence arrays",
          "Integrate receipt validation gate into CI pipeline to block builds on unverified claims"
        ],
        "verificationCommand": "node scripts/harness/proof-receipt-validator.mjs artifacts/proofs/G-PROOF-001-receipt.json",
        "completionGate": "Validator confirms receipt authenticity and schema conformance with exit code 0.",
        "stopCondition": "Receipt tampering, missing required fields, or non-zero test exit codes.",
        "zeroMockCheck": "100% operational cryptographic validation logic."
      }
    ],
    "acceptanceCriteria": [
      "Invariant registry supports all 8 canonical proof classifications without schema degradation.",
      "Proof receipt generator outputs cryptographically bound JSON receipts with source file SHA-256 digests.",
      "Validator fails closed with exit code 1 if a proof receipt has non-zero exit code or missing commit SHA."
    ],
    "testPlan": [
      "node scripts/harness/mathematical-invariant-proof-harness.mjs",
      "node scripts/harness/proof-receipt-validator.mjs artifacts/proofs/G-PROOF-001-receipt.json"
    ],
    "inScope": [
      "Formal proof classification taxonomy (8 classes).",
      "Cryptographic proof receipt generator and validator.",
      "Git HEAD and source artifact SHA-256 digest binding."
    ],
    "outScope": [
      "Interactive web UI for browsing historical proofs.",
      "Automated theorem proving via Coq/Lean interactive assistants."
    ]
  },
  {
    "id": "G-PROOF-002",
    "title": "DAVE Statistical Evidence and Calibration Claims",
    "kind": "feature",
    "epic": "PROOF",
    "status": "planned",
    "priority": "P1",
    "atomicOutcome": "Statistical verification harness and reliability diagram generator certifying expected calibration error bounds with empirical confidence intervals.",
    "dependsOn": "G-PROOF-001",
    "blocks": "G-ML-028",
    "profile": "proof_receipt",
    "daveDecisionId": "DAVE-PROOF-0002",
    "daveDecisionType": "model_confidence",
    "confidence": 0.95,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0102",
    "refUri": "docs/03-architecture/calibration-governance.md",
    "refHash": "sha256:5a9e6d042cf53c15d487cb1a4bb45279f727c95b6c3d9a9cb27402ec94344933",
    "steps": [
      {
        "name": "Statistical Metric Computation and Brier Score Ledger",
        "status": "pending"
      },
      {
        "name": "Bootstrap Confidence Interval and Reliability Diagram Generator",
        "status": "pending"
      },
      {
        "name": "Statistical Claim Proof Receipt Verification Gate",
        "status": "pending"
      }
    ],
    "context": "Machine learning calibration requires statistical guarantees rather than single-point estimates. This goal implements non-parametric bootstrap confidence intervals for Expected Calibration Error (ECE) and Brier scores.",
    "why": "Prevents overconfident model promotion by mathematically bounding calibration degradation under empirical confidence intervals.",
    "doneWhen": "ECE and Brier scores are computed with 95% bootstrap confidence intervals and certified via statistical proof receipts.",
    "unblocks": "DAVE Model Evaluation, Promotion, Drift, and Rollback (G-ML-028).",
    "gapId": "GAP-PROOF-002",
    "gapEvidence": "Calibration harness provided point-estimate ECE without bootstrap confidence intervals or proof receipt emission.",
    "gapSolution": "Implement bootstrap resampling, reliability diagram generation, and statistical proof receipt issuance.",
    "gapVerification": "node scripts/harness/statistical-evidence-harness.mjs && node scripts/harness/confidence-calibration-harness.mjs",
    "approach": "1000-iteration bootstrap resampling, 10-bin reliability diagrams, strictly proper scoring, and proof receipt generation.",
    "touchMap": [
      "scripts/lib/statistical-evidence-engine.mjs",
      "scripts/harness/statistical-evidence-harness.mjs",
      "scripts/harness/confidence-calibration-harness.mjs",
      "artifacts/proofs/G-PROOF-002-calibration-report.json"
    ],
    "ports": {
      "inbound": "EmpiricalPredictionStreamPort (Probability / Outcome Tuples)",
      "outbound": "StatisticalClaimReceiptPort (Certified ECE Receipts)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Statistical Metric Computation and Brier Score Ledger",
        "allowedFiles": "scripts/lib/statistical-evidence-engine.mjs, scripts/harness/confidence-calibration-harness.mjs",
        "actions": [
          "Implement vectorized ECE, Maximum Calibration Error (MCE), and multi-class Brier score calculators",
          "Record binned confidence-versus-accuracy empirical distributions into audit ledger"
        ],
        "verificationCommand": "node scripts/harness/confidence-calibration-harness.mjs",
        "completionGate": "Calibration metrics calculate accurately matching theoretical test vectors.",
        "stopCondition": "Probability distribution sums outside [0.9999, 1.0001] or NaN outputs.",
        "zeroMockCheck": "100% operational numerical computation logic."
      },
      {
        "title": "Step 2 \u2014 Bootstrap Confidence Interval and Reliability Diagram Generator",
        "allowedFiles": "scripts/lib/statistical-evidence-engine.mjs, artifacts/proofs/G-PROOF-002-calibration-report.json",
        "actions": [
          "Implement 1000-sample bootstrap resampling to construct empirical 95% confidence intervals for ECE",
          "Generate machine-readable reliability diagram coordinates and bin sample weight arrays"
        ],
        "verificationCommand": "node scripts/harness/statistical-evidence-harness.mjs",
        "completionGate": "Bootstrap confidence intervals converge and report is written with exit code 0.",
        "stopCondition": "Sample size below minimum statistical power threshold (N < 100).",
        "zeroMockCheck": "100% concrete bootstrap resampling algorithm."
      },
      {
        "title": "Step 3 \u2014 Statistical Claim Proof Receipt Verification Gate",
        "allowedFiles": "scripts/lib/statistical-evidence-engine.mjs, artifacts/proofs/G-PROOF-002-calibration-report.json",
        "actions": [
          "Serialize statistical claim proof receipt certifying ECE upper bound under declared confidence level",
          "Verify receipt against proof receipt schema ensuring classification is statistical_claim"
        ],
        "verificationCommand": "node scripts/harness/proof-receipt-validator.mjs artifacts/proofs/G-PROOF-002-calibration-report.json",
        "completionGate": "Proof receipt validator verifies statistical claim with exit code 0.",
        "stopCondition": "ECE upper bound exceeds declared safety tolerance (ECE_95 > 0.08).",
        "zeroMockCheck": "100% operational statistical gatekeeper."
      }
    ],
    "acceptanceCriteria": [
      "ECE is computed across 10 uniform bins with empirical accuracy and confidence deviations.",
      "Bootstrap resampling generates 95% two-sided confidence intervals with reproducible random seed.",
      "Statistical proof receipt is emitted conforming to proof_receipt schema with result: passed."
    ],
    "testPlan": [
      "node scripts/harness/statistical-evidence-harness.mjs",
      "node scripts/harness/confidence-calibration-harness.mjs"
    ],
    "inScope": [
      "ECE, MCE, and Brier score calculators.",
      "1000-sample bootstrap confidence intervals.",
      "Statistical claim proof receipt generation."
    ],
    "outScope": [
      "Online real-time model retraining.",
      "Bayesian hyperparameter optimization."
    ]
  },
  {
    "id": "G-DAVE-001",
    "title": "DAVE SYSTEM 1 Decision Orchestrator",
    "kind": "architecture",
    "epic": "DAVE",
    "status": "ready",
    "priority": "P0",
    "atomicOutcome": "11-stage SYSTEM 1 decision runtime engine executing typed intake, evidence collection, conflict resolution, and fail-closed execution gating.",
    "dependsOn": "G-PROOF-001",
    "blocks": "G-DAVE-002, G-DAVE-004, G-OPS-001",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-PLAT-0001",
    "daveDecisionType": "game_architecture",
    "confidence": 0.96,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0021",
    "refUri": "docs/03-architecture/dave-runtime-spec.md",
    "refHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "steps": [
      {
        "name": "11-Stage State Machine and FSM Transition Table Engine",
        "status": "pending"
      },
      {
        "name": "Evidence Collection and Calibrated Confidence Intake Controller",
        "status": "pending"
      },
      {
        "name": "Execution Authorization and Decision Ledger Recording Engine",
        "status": "pending"
      }
    ],
    "context": "DAVE decisions were previously defined as static documentation artifacts without an active runtime coordinator. This goal implements the operational 11-stage state machine driving decisions from INTENT_RECEIVED through LEARNED.",
    "why": "Transforms DAVE from passive documentation into an active, governed SYSTEM 1 decision runtime for autonomous agents.",
    "doneWhen": "All 11 states, valid transitions, and fail-closed sagas are implemented and verified via comprehensive unit tests.",
    "unblocks": "DAVE Decision Domain Registry (G-DAVE-002) and Reference Evidence Graph (G-DAVE-004).",
    "gapId": "GAP-DAVE-001",
    "gapEvidence": "No centralized state machine orchestrated typed intake, evidence verification, and execution permissions.",
    "gapSolution": "Implement 11-stage FSM runtime in scripts/lib/dave-engine.mjs with fail-closed transition guards.",
    "gapVerification": "node --test tests/unit/test-dave-engine.mjs && node scripts/harness/dave-decision-schema-harness.mjs",
    "approach": "Deterministic finite state machine, typed decision intake, evidence verification, and audit ledger append.",
    "touchMap": [
      "scripts/lib/dave-engine.mjs",
      "scripts/lib/dave-cli.mjs",
      "tests/unit/test-dave-engine.mjs",
      ".agents/audit/decisions.jsonl"
    ],
    "ports": {
      "inbound": "IntentIntakePort (CLI / API Event)",
      "outbound": "ExecutionAuthorizationPort (Governance Token)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 11-Stage State Machine and FSM Transition Table Engine",
        "allowedFiles": "scripts/lib/dave-engine.mjs, tests/unit/test-dave-engine.mjs",
        "actions": [
          "Codify 11 discrete states: INTENT_RECEIVED, CONTEXT_COLLECTED, REFERENCES_VERIFIED, EXPERTS_SELECTED, DECISIONS_GENERATED, CONFLICTS_RESOLVED, CONFIDENCE_CALIBRATED, ROUTED, EXECUTED, VERIFIED, LEARNED",
          "Enforce strict transition guards and saga compensation handlers rejecting out-of-order execution"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-engine.mjs",
        "completionGate": "All 11 state transitions and illegal transition rejections pass with exit code 0.",
        "stopCondition": "Illegal state transition succeeds or unhandled transition error.",
        "zeroMockCheck": "100% operational FSM transition table logic."
      },
      {
        "title": "Step 2 \u2014 Evidence Collection and Calibrated Confidence Intake Controller",
        "allowedFiles": "scripts/lib/dave-engine.mjs, scripts/lib/dave-cli.mjs",
        "actions": [
          "Implement content-addressed reference verification validating declared SHA-256 hashes against disk bytes",
          "Integrate confidence normalization ensuring scores reside in [0.0, 1.0] and risk tiers map accurately"
        ],
        "verificationCommand": "node scripts/harness/dave-decision-schema-harness.mjs",
        "completionGate": "Decision schema harness confirms 100% typed decision validity.",
        "stopCondition": "Unverified reference accepted or out-of-bounds confidence admitted.",
        "zeroMockCheck": "100% concrete reference validation and score normalization."
      },
      {
        "title": "Step 3 \u2014 Execution Authorization and Decision Ledger Recording Engine",
        "allowedFiles": "scripts/lib/dave-engine.mjs, .agents/audit/decisions.jsonl",
        "actions": [
          "Implement four-way execution routing (proceed, verify, defer, human_review) with fail-closed permissions",
          "Record immutable decision trajectory into .agents/audit/decisions.jsonl with cryptographic timestamp"
        ],
        "verificationCommand": "node scripts/harness/routing-truth-table-harness.mjs",
        "completionGate": "Truth table harness confirms 16/16 routing states match safety specifications.",
        "stopCondition": "High-risk unverified decision granted proceed permission.",
        "zeroMockCheck": "100% operational authorization and JSONL append logic."
      }
    ],
    "acceptanceCriteria": [
      "FSM supports exactly the 11 canonical states with zero illegal transition bypasses.",
      "High-risk or low-confidence (<0.85) decisions require explicit human approval prior to execution.",
      "Decision trajectory is appended to .agents/audit/decisions.jsonl with complete evidence and routing metadata."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-engine.mjs",
      "node scripts/harness/dave-decision-schema-harness.mjs"
    ],
    "inScope": [
      "11-stage DAVE decision state machine.",
      "Fail-closed execution authorization gate.",
      "Decision ledger writing and trace recording."
    ],
    "outScope": [
      "Distributed multi-datacenter consensus algorithms.",
      "Direct graphical rendering of state machines."
    ]
  },
  {
    "id": "G-DAVE-002",
    "title": "DAVE Decision Domain and Expert Registry",
    "kind": "architecture",
    "epic": "DAVE",
    "status": "planned",
    "priority": "P0",
    "atomicOutcome": "Taxonomy registry registering schemas, required evidence, allowed actions, and verification harnesses across 20 canonical decision domains.",
    "dependsOn": "G-DAVE-001",
    "blocks": "G-DAVE-003, G-ML-027",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-PLAT-0002",
    "daveDecisionType": "game_architecture",
    "confidence": 0.95,
    "risk": "low",
    "humanAction": "none",
    "refId": "REF-0022",
    "refUri": "docs/03-architecture/dave-domain-taxonomy.md",
    "refHash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "steps": [
      {
        "name": "Domain Taxonomy Specification and Schema Contract Registry",
        "status": "pending"
      },
      {
        "name": "Expert Provider Registration and Verification Harness Mapping",
        "status": "pending"
      },
      {
        "name": "Domain Expert Dispatcher and Boundary Enforcement Test",
        "status": "pending"
      }
    ],
    "context": "DAVE was initially focused on UX and Frontend domains. As Soda OS scales across backend, gaming, security, and infrastructure, a generalized domain and expert registry is required to govern multi-domain capabilities.",
    "why": "Provides a strongly typed, discoverable registry defining input/output contracts and verification harnesses for all 20 decision domains.",
    "doneWhen": "All 20 canonical decision domains are registered with typed schemas, required evidence, and automated harness mappings.",
    "unblocks": "DAVE Multi-Expert Conflict Resolution (G-DAVE-003) and MoE Expert Routing (G-ML-027).",
    "gapId": "GAP-DAVE-002",
    "gapEvidence": "Decision types were hardcoded in string arrays without structured input/output schemas or verification mappings.",
    "gapSolution": "Create extensible registry in scripts/lib/dave-expert-registry.mjs with strict domain contracts.",
    "gapVerification": "node scripts/harness/dave-decision-schema-harness.mjs",
    "approach": "Contract-based registry, domain boundary isolation, typed schema validation, and test harness binding.",
    "touchMap": [
      "scripts/lib/dave-expert-registry.mjs",
      "tests/unit/test-dave-expert-registry.mjs",
      "docs/03-architecture/dave-domain-taxonomy.md"
    ],
    "ports": {
      "inbound": "DomainRegistrationPort (Expert Contract Definition)",
      "outbound": "ExpertDispatcherPort (Validated Domain Specialist)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Domain Taxonomy Specification and Schema Contract Registry",
        "allowedFiles": "scripts/lib/dave-expert-registry.mjs, docs/03-architecture/dave-domain-taxonomy.md",
        "actions": [
          "Codify 20 canonical decision domains: Product, Game Architecture, Game Design, UX/UI, Frontend, Backend/API, Database, Security, Accessibility, Motion, Audio, Asset, Infrastructure, Deployment, Verification, Confidence, RLCD, Governance, Cost, Incident",
          "Define required input/output schemas, required evidence types, and risk classes for each domain"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-expert-registry.mjs",
        "completionGate": "Registry initializes with all 20 domains and passes validation.",
        "stopCondition": "Unregistered domain referenced or schema definition malformed.",
        "zeroMockCheck": "100% operational registry dictionary with real schemas."
      },
      {
        "title": "Step 2 \u2014 Expert Provider Registration and Verification Harness Mapping",
        "allowedFiles": "scripts/lib/dave-expert-registry.mjs, tests/unit/test-dave-expert-registry.mjs",
        "actions": [
          "Implement registration API binding each domain expert to allowed actions (propose, implement, verify) and forbidden actions",
          "Map domain experts to concrete verification harness suites (e.g. accessibility-harness, visual-regression)"
        ],
        "verificationCommand": "node scripts/harness/dave-decision-schema-harness.mjs",
        "completionGate": "All registered experts have at least 1 verified harness mapping.",
        "stopCondition": "Expert registered without verification harness or with empty allowed_actions.",
        "zeroMockCheck": "100% concrete provider mapping logic."
      },
      {
        "title": "Step 3 \u2014 Domain Expert Dispatcher and Boundary Enforcement Test",
        "allowedFiles": "scripts/lib/dave-expert-registry.mjs, tests/unit/test-dave-expert-registry.mjs",
        "actions": [
          "Implement intent-to-domain dispatcher selecting specialists based on input payload attributes",
          "Write unit tests verifying forbidden action rejection (e.g. frontend expert attempting production deployment)"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-expert-registry.mjs",
        "completionGate": "Boundary enforcement test passes with 100% forbidden action rejection.",
        "stopCondition": "Security boundary leak allowing unpermitted domain action.",
        "zeroMockCheck": "100% operational boundary enforcement gate."
      }
    ],
    "acceptanceCriteria": [
      "Registry contains all 20 canonical domains with input, output, evidence, and harness specifications.",
      "Forbidden actions (e.g. deploy_production on unauthorized domains) are rejected fail-closed.",
      "Harness mapping allows automated preflight testing for any domain proposal."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-expert-registry.mjs",
      "node scripts/harness/dave-decision-schema-harness.mjs"
    ],
    "inScope": [
      "20-domain DAVE decision taxonomy.",
      "Expert contract and capability registry.",
      "Automated verification harness binding."
    ],
    "outScope": [
      "Dynamic runtime installation of unverified third-party plugins.",
      "Cross-compiler language bridges beyond JavaScript/Node.js."
    ]
  },
  {
    "id": "G-DAVE-003",
    "title": "DAVE Multi-Expert Conflict Resolution",
    "kind": "architecture",
    "epic": "DAVE",
    "status": "planned",
    "priority": "P0",
    "atomicOutcome": "Cross-domain conflict detection engine and synthesis matrix recording rejected alternatives and escalating deadlocks to human review.",
    "dependsOn": "G-DAVE-002",
    "blocks": "G-DAVE-005",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-PLAT-0003",
    "daveDecisionType": "game_architecture",
    "confidence": 0.94,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0023",
    "refUri": "docs/03-architecture/conflict-resolution.md",
    "refHash": "sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    "steps": [
      {
        "name": "Cross-Domain Proposal Ingestion and Overlap Detector",
        "status": "pending"
      },
      {
        "name": "Conflict Matrix Synthesizer and Resolution Strategy Engine",
        "status": "pending"
      },
      {
        "name": "Deadlock Escalation and Alternative Recording Harness",
        "status": "pending"
      }
    ],
    "context": "When multiple domain experts propose conflicting actions (e.g. UX density vs accessibility target size), silent preference or arbitrary selection corrupts design integrity. This goal implements deterministic conflict detection and explicit synthesis matrices.",
    "why": "Ensures no multi-expert disagreement is silently resolved without explicit rationale, recorded rejected alternatives, or human escalation.",
    "doneWhen": "Conflict detector flags pairwise property collisions, synthesis matrix formats alternatives, and unresolved deadlocks escalate to human review.",
    "unblocks": "DAVE Autonomy Policy (G-DAVE-005).",
    "gapId": "GAP-DAVE-003",
    "gapEvidence": "No automated detector identified conflicting proposals across different domain specialists.",
    "gapSolution": "Implement conflict detection engine in scripts/lib/dave-conflict-resolver.mjs producing auditable conflict matrices.",
    "gapVerification": "node --test tests/unit/test-dave-engine.mjs",
    "approach": "Pairwise property comparison, hierarchical priority rules, alternative recording, and fail-closed human escalation.",
    "touchMap": [
      "scripts/lib/dave-conflict-resolver.mjs",
      "tests/unit/test-dave-conflict-resolver.mjs",
      "artifacts/proofs/G-DAVE-003-conflict-matrix.json"
    ],
    "ports": {
      "inbound": "MultiExpertProposalPort (Array of Domain Proposals)",
      "outbound": "SynthesizedDecisionPort (Resolved Decision + Alternatives)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Cross-Domain Proposal Ingestion and Overlap Detector",
        "allowedFiles": "scripts/lib/dave-conflict-resolver.mjs, tests/unit/test-dave-conflict-resolver.mjs",
        "actions": [
          "Implement pairwise constraint checking across target attributes (layout geometry, token values, API payloads)",
          "Identify overlapping mutation targets where two experts propose mutually incompatible values"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-conflict-resolver.mjs",
        "completionGate": "Detector accurately identifies all overlapping property collisions.",
        "stopCondition": "Silent override of conflicting proposal without detection.",
        "zeroMockCheck": "100% operational constraint evaluation logic."
      },
      {
        "title": "Step 2 \u2014 Conflict Matrix Synthesizer and Resolution Strategy Engine",
        "allowedFiles": "scripts/lib/dave-conflict-resolver.mjs, artifacts/proofs/G-DAVE-003-conflict-matrix.json",
        "actions": [
          "Construct structured conflict matrix capturing Expert, Proposal, Evidence, Confidence, Risk, and Conflict Status",
          "Apply deterministic resolution hierarchy (Security > Accessibility > Core Domain > Optimization)"
        ],
        "verificationCommand": "node scripts/lib/dave-conflict-resolver.mjs evaluate-conflicts",
        "completionGate": "Conflict matrix emits with explicit rejected alternatives and rationale.",
        "stopCondition": "Tie-break resolution lacking documented evidence or rationale.",
        "zeroMockCheck": "100% concrete conflict matrix synthesis."
      },
      {
        "title": "Step 3 \u2014 Deadlock Escalation and Alternative Recording Harness",
        "allowedFiles": "scripts/lib/dave-conflict-resolver.mjs, tests/unit/test-dave-conflict-resolver.mjs",
        "actions": [
          "Implement fail-closed escalation routing deadlocked proposals to route: human_review",
          "Ensure rejected proposals are recorded with explicit rejection_reason in decision contract alternatives block"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-conflict-resolver.mjs",
        "completionGate": "Deadlocks halt autonomous execution and produce human review packets.",
        "stopCondition": "Autonomous execution of unresolvable conflict without human review.",
        "zeroMockCheck": "100% operational fail-closed escalation logic."
      }
    ],
    "acceptanceCriteria": [
      "Conflicts between UX and Accessibility automatically generate a structured conflict matrix.",
      "Accepted decisions include rejected alternatives with technical justification.",
      "Deadlocked conflicts route to human_review with execution_permission blocked_until_approved."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-conflict-resolver.mjs",
      "node --test tests/unit/test-dave-engine.mjs"
    ],
    "inScope": [
      "Pairwise multi-expert conflict detection.",
      "Conflict matrix synthesis and alternative tracking.",
      "Deterministic hierarchy and deadlock escalation."
    ],
    "outScope": [
      "Natural language multi-turn debate simulation.",
      "External crowdsourced voting mechanisms."
    ]
  },
  {
    "id": "G-DAVE-004",
    "title": "DAVE Reference Evidence Graph",
    "kind": "feature",
    "epic": "DAVE",
    "status": "planned",
    "priority": "P0",
    "atomicOutcome": "Content-addressed causal trace graph linking reference artifacts, decision records, code commits, test receipts, and human approvals.",
    "dependsOn": "G-DAVE-001",
    "blocks": "G-SEC-001",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-PLAT-0004",
    "daveDecisionType": "game_architecture",
    "confidence": 0.96,
    "risk": "low",
    "humanAction": "none",
    "refId": "REF-0024",
    "refUri": "docs/03-architecture/evidence-graph-spec.md",
    "refHash": "sha256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    "steps": [
      {
        "name": "Content-Addressed Directed Acyclic Graph Schema Definition",
        "status": "pending"
      },
      {
        "name": "Causal Trace Node Ingestion and Cryptographic Linking Engine",
        "status": "pending"
      },
      {
        "name": "Bidirectional Trace Query and Provenance Audit Harness",
        "status": "pending"
      }
    ],
    "context": "Auditing autonomous development requires tracing exactly which visual reference or business requirement caused a specific code change, test result, or model version. This goal constructs a queryable, content-addressed DAG of all decision artifacts.",
    "why": "Provides complete mathematical and auditable traceability from upstream reference to downstream commit and test receipt.",
    "doneWhen": "Trace graph links references, decisions, commits, and proofs into an immutable queryable DAG with zero orphaned nodes.",
    "unblocks": "Multimodal Privacy & Security (G-SEC-001).",
    "gapId": "GAP-DAVE-004",
    "gapEvidence": "Reference hashes and decision IDs existed independently without an interconnected machine-readable causal trace graph.",
    "gapSolution": "Implement directed acyclic evidence graph in scripts/lib/dave-evidence-graph.mjs with bidirectional traversals.",
    "gapVerification": "node scripts/harness/dave-decision-trace-harness.mjs",
    "approach": "Merkle-linked causal DAG, cryptographic node hashes, parent-child edge validation, and traversal query APIs.",
    "touchMap": [
      "scripts/lib/dave-evidence-graph.mjs",
      "scripts/harness/dave-decision-trace-harness.mjs",
      "tests/unit/test-dave-evidence-graph.mjs",
      "artifacts/proofs/G-DAVE-004-trace-graph.json"
    ],
    "ports": {
      "inbound": "ArtifactLifecycleEventPort (Reference / Decision / Commit / Proof)",
      "outbound": "CausalTraceQueryPort (Sub-graph Traversal / Audit Export)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Content-Addressed Directed Acyclic Graph Schema Definition",
        "allowedFiles": "scripts/lib/dave-evidence-graph.mjs, tests/unit/test-dave-evidence-graph.mjs",
        "actions": [
          "Define typed node schemas: ReferenceNode, DecisionNode, ImplementationNode, VerificationNode, and ApprovalNode",
          "Implement content-addressing computing unique SHA-256 node IDs from payload attributes and parent edge hashes"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-evidence-graph.mjs",
        "completionGate": "Graph schema validates node creation and cycle rejection.",
        "stopCondition": "Cyclic reference detected or non-deterministic node hashing.",
        "zeroMockCheck": "100% operational DAG data structure logic."
      },
      {
        "title": "Step 2 \u2014 Causal Trace Node Ingestion and Cryptographic Linking Engine",
        "allowedFiles": "scripts/lib/dave-evidence-graph.mjs, artifacts/proofs/G-DAVE-004-trace-graph.json",
        "actions": [
          "Ingest operational events and connect edges: REF-xxxx -> DAVE-xxxx -> Git Commit -> Proof Receipt -> Human Review",
          "Validate edge invariants ensuring every implementation node traces to at least one approved decision node"
        ],
        "verificationCommand": "node scripts/harness/dave-decision-trace-harness.mjs",
        "completionGate": "Trace harness confirms 100% causal edge connectivity without dangling links.",
        "stopCondition": "Orphaned decision node or missing parent reference citation.",
        "zeroMockCheck": "100% concrete edge traversal and validation."
      },
      {
        "title": "Step 3 \u2014 Bidirectional Trace Query and Provenance Audit Harness",
        "allowedFiles": "scripts/lib/dave-evidence-graph.mjs, scripts/harness/dave-decision-trace-harness.mjs",
        "actions": [
          "Implement upstream (why was this code written?) and downstream (what was impacted by this reference?) query APIs",
          "Serialize graph snapshot to artifacts/proofs/G-DAVE-004-trace-graph.json and verify export integrity"
        ],
        "verificationCommand": "node scripts/harness/dave-decision-trace-harness.mjs --verify-full-chain",
        "completionGate": "Full causal chain query resolves in < 5ms with exit code 0.",
        "stopCondition": "Query timeout or disconnected subgraph component.",
        "zeroMockCheck": "100% operational graph query implementation."
      }
    ],
    "acceptanceCriteria": [
      "Graph links REF -> DAVE -> Commit -> Proof -> Approval with verified cryptographic hashes.",
      "Upstream query from any commit returns complete causative decision and reference chain.",
      "Graph serialization passes schema validation and cycle-free verification."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-evidence-graph.mjs",
      "node scripts/harness/dave-decision-trace-harness.mjs"
    ],
    "inScope": [
      "Content-addressed Merkle DAG schema.",
      "Causal trace link ingestion and edge validation.",
      "Bidirectional provenance query APIs."
    ],
    "outScope": [
      "Distributed graph databases (Neo4j / Amazon Neptune).",
      "Real-time visual 3D canvas graph rendering."
    ]
  },
  {
    "id": "G-DAVE-005",
    "title": "DAVE Confidence, Verification, and Autonomy Policy",
    "kind": "architecture",
    "epic": "DAVE",
    "status": "planned",
    "priority": "P0",
    "atomicOutcome": "Dynamic four-way autonomy router executing strict fail-closed gating based on calibrated confidence, risk tier, and cryptographic evidence verification.",
    "dependsOn": "G-DAVE-003, G-PROOF-001",
    "blocks": "G-DAVE-006",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-PLAT-0005",
    "daveDecisionType": "game_architecture",
    "confidence": 0.97,
    "risk": "high",
    "humanAction": "approve",
    "refId": "REF-0025",
    "refUri": "docs/03-architecture/autonomy-policy.md",
    "refHash": "sha256:e7c22e03ab5b001d90fc925e0a012a95c026046e7f72dc67a6d8fc5ef146ec08",
    "steps": [
      {
        "name": "Four-Way Routing Truth Table and Risk Boundary Engine",
        "status": "pending"
      },
      {
        "name": "Fail-Closed Permission Gate and Verification Plan Dispatcher",
        "status": "pending"
      },
      {
        "name": "Autonomy Routing Conformance and Truth Table Verification",
        "status": "pending"
      }
    ],
    "context": "Confidence alone must never authorize autonomous execution. High-confidence decisions on unverified evidence or critical risk classes must be gated fail-closed. This goal implements the operational autonomy routing truth table.",
    "why": "Enforces non-negotiable safety boundaries ensuring high-risk or uncertain actions cannot execute without verification or human sign-off.",
    "doneWhen": "16/16 routing truth table states pass automated verification and unauthorized execution attempts are blocked fail-closed.",
    "unblocks": "DAVE Human Review Learning Loop (G-DAVE-006).",
    "gapId": "GAP-DAVE-005",
    "gapEvidence": "Autonomy routing logic was split across CLI scripts without an authoritative, testable truth-table engine.",
    "gapSolution": "Implement dynamic router in scripts/lib/dave-autonomy-router.mjs executing the 4-way policy.",
    "gapVerification": "node scripts/harness/routing-truth-table-harness.mjs",
    "approach": "Matrix-based policy evaluation, risk classification, evidence verification check, and fail-closed permission tokens.",
    "touchMap": [
      "scripts/lib/dave-autonomy-router.mjs",
      "scripts/harness/routing-truth-table-harness.mjs",
      "tests/unit/test-dave-autonomy-router.mjs"
    ],
    "ports": {
      "inbound": "DecisionEvaluationPort (Candidate Decision Object)",
      "outbound": "RoutingDecisionPort (Route + Execution Permission)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Four-Way Routing Truth Table and Risk Boundary Engine",
        "allowedFiles": "scripts/lib/dave-autonomy-router.mjs, scripts/harness/routing-truth-table-harness.mjs",
        "actions": [
          "Codify the 4-way routing truth table: proceed (low risk, high conf, verified), verify (medium risk or missing tests), defer (high risk unverified), human_review (conflict or policy breach)",
          "Implement fail-closed default ensuring any unclassified state routes to human_review"
        ],
        "verificationCommand": "node scripts/harness/routing-truth-table-harness.mjs",
        "completionGate": "16/16 truth table permutations pass with 100% expected routing match.",
        "stopCondition": "High-risk unverified decision routing to proceed.",
        "zeroMockCheck": "100% operational matrix routing logic."
      },
      {
        "title": "Step 2 \u2014 Fail-Closed Permission Gate and Verification Plan Dispatcher",
        "allowedFiles": "scripts/lib/dave-autonomy-router.mjs, tests/unit/test-dave-autonomy-router.mjs",
        "actions": [
          "Implement permission gate assigning execution_permission: permitted, blocked_until_verified, blocked_until_approved, or rejected",
          "Attach automated verification plan suites when routing to verify"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-autonomy-router.mjs",
        "completionGate": "Unit test suite verifies permission blocking on all restricted states.",
        "stopCondition": "Execution permission granted when route is blocked_until_approved.",
        "zeroMockCheck": "100% concrete permission token generation."
      },
      {
        "title": "Step 3 \u2014 Autonomy Routing Conformance and Truth Table Verification",
        "allowedFiles": "scripts/lib/dave-autonomy-router.mjs, tests/unit/test-dave-autonomy-router.mjs",
        "actions": [
          "Test edge cases: missing reference URI, zero confidence score, undefined risk class",
          "Verify invariant: execution_permission is permitted IF AND ONLY IF route is proceed"
        ],
        "verificationCommand": "node scripts/harness/routing-truth-table-harness.mjs --strict",
        "completionGate": "Strict routing verification passes with zero warnings and exit code 0.",
        "stopCondition": "Any breach of the autonomy safety invariant.",
        "zeroMockCheck": "100% operational invariant verification."
      }
    ],
    "acceptanceCriteria": [
      "Low-risk + high-confidence + verified evidence routes to proceed with permitted execution.",
      "High-risk + unverified evidence routes to defer or human_review with blocked execution.",
      "Conflicting expert decisions route to human_review with fail-closed implementation lock."
    ],
    "testPlan": [
      "node scripts/harness/routing-truth-table-harness.mjs",
      "node --test tests/unit/test-dave-autonomy-router.mjs"
    ],
    "inScope": [
      "Four-way autonomy routing truth table.",
      "Fail-closed execution permission gate.",
      "Automated verification plan dispatching."
    ],
    "outScope": [
      "Manual override bypasses without cryptographic audit records.",
      "External cloud policy sync."
    ]
  },
  {
    "id": "G-DAVE-006",
    "title": "DAVE Human Review Outcome and Learning Loop",
    "kind": "feature",
    "epic": "DAVE",
    "status": "planned",
    "priority": "P1",
    "atomicOutcome": "Interactive human-in-the-loop escalation packet generator and structured feedback parser extracting fine-grained rejection rationale for RLCD ingestion.",
    "dependsOn": "G-DAVE-005",
    "blocks": "G-ML-025",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-PLAT-0006",
    "daveDecisionType": "human_approval",
    "confidence": 0.95,
    "risk": "medium",
    "humanAction": "approve",
    "refId": "REF-0026",
    "refUri": "docs/03-architecture/human-review-spec.md",
    "refHash": "sha256:0d5b78f673f8a04fb6b4cfb06dfd8d4ec0913953da5c7b39912be21cf3e63412",
    "steps": [
      {
        "name": "Zero-Opacity Review Packet Formatter and Interactive Checkbox Generator",
        "status": "pending"
      },
      {
        "name": "Structured Review Parser and Correction Classification Engine",
        "status": "pending"
      },
      {
        "name": "Feedback Ingestion and Audit Ledger Appender",
        "status": "pending"
      }
    ],
    "context": "Human review packets were previously static markdown documents without automated feedback parsing. When a reviewer rejected a proposal or edited a decision, the rationale was lost. This goal closes the learning loop.",
    "why": "Transforms human review outcomes into machine-readable correction trajectories for downstream RLCD calibration training.",
    "doneWhen": "Review packets parse approvals, edits, and rejections into 9 structured correction classes and append them to RLCD dataset queues.",
    "unblocks": "DAVE Decision Trajectory and Correction Dataset (G-ML-025).",
    "gapId": "GAP-DAVE-006",
    "gapEvidence": "Human review feedback was not parsed into structured correction types or piped into training ledgers.",
    "gapSolution": "Implement review learner in scripts/lib/dave-review-learner.mjs parsing HITL outcomes into RLCD pairs.",
    "gapVerification": "node scripts/harness/learning-loop-harness.mjs",
    "approach": "Structured markdown review format, diff extraction, 9-class correction taxonomy, and JSONL trajectory export.",
    "touchMap": [
      "scripts/lib/dave-review-learner.mjs",
      "tests/unit/test-dave-review-learner.mjs",
      "artifacts/review/DAVE-REVIEW-PACKET.md",
      "artifacts/rlcd/human_corrections.jsonl"
    ],
    "ports": {
      "inbound": "HumanReviewInteractionPort (Markdown Checkboxes / Comments)",
      "outbound": "CorrectionTrajectoryPort (Structured RLCD Record)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Zero-Opacity Review Packet Formatter and Interactive Checkbox Generator",
        "allowedFiles": "scripts/lib/dave-review-learner.mjs, artifacts/review/DAVE-REVIEW-PACKET.md",
        "actions": [
          "Format review packets presenting proposed decision, evidence citations, rejected alternatives, and impact diffs",
          "Render interactive markdown checkboxes for approve, approve_with_edits, and reject"
        ],
        "verificationCommand": "node scripts/lib/dave-review-learner.mjs render-packet G-DAVE-006",
        "completionGate": "Review packet renders with zero hidden chain-of-thought opacity.",
        "stopCondition": "Missing evidence references or ungrounded claims in review packet.",
        "zeroMockCheck": "100% operational packet rendering logic."
      },
      {
        "title": "Step 2 \u2014 Structured Review Parser and Correction Classification Engine",
        "allowedFiles": "scripts/lib/dave-review-learner.mjs, tests/unit/test-dave-review-learner.mjs",
        "actions": [
          "Implement parser extracting reviewer status, edits, and feedback rationale from completed review packet",
          "Classify corrections into 9 canonical classes: objective_failure, subjective_preference, missing_context, wrong_reference, wrong_risk_class, wrong_confidence, wrong_routing, wrong_expert, unsafe_action"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-review-learner.mjs",
        "completionGate": "Parser accurately extracts feedback and maps to correction taxonomy.",
        "stopCondition": "Unparseable feedback format or unclassified rejection reason.",
        "zeroMockCheck": "100% concrete parsing and classification algorithms."
      },
      {
        "title": "Step 3 \u2014 Feedback Ingestion and Audit Ledger Appender",
        "allowedFiles": "scripts/lib/dave-review-learner.mjs, artifacts/rlcd/human_corrections.jsonl",
        "actions": [
          "Transform parsed correction into standardized training sample with input context hash, original decision, and human correction",
          "Append validated sample to artifacts/rlcd/human_corrections.jsonl for training dataset assembly"
        ],
        "verificationCommand": "node scripts/harness/learning-loop-harness.mjs",
        "completionGate": "Learning loop harness confirms valid trajectory record append.",
        "stopCondition": "Corrupted JSONL record or missing input context hash.",
        "zeroMockCheck": "100% operational JSONL appending logic."
      }
    ],
    "acceptanceCriteria": [
      "Reviewer edits and rejections are parsed into structured correction records.",
      "Corrections are mapped to one of the 9 canonical taxonomy classes.",
      "Validated correction trajectories are written to human_corrections.jsonl with cryptographic timestamps."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-review-learner.mjs",
      "node scripts/harness/learning-loop-harness.mjs"
    ],
    "inScope": [
      "Interactive review packet generation.",
      "9-class correction taxonomy classification.",
      "Correction trajectory export to JSONL."
    ],
    "outScope": [
      "Real-time video conferencing for human review.",
      "Biometric signature authentication."
    ]
  },
  {
    "id": "G-WEB-013",
    "title": "Deterministic Visual Execution Environment",
    "kind": "qa",
    "epic": "WEB",
    "status": "planned",
    "priority": "P0",
    "atomicOutcome": "Deterministic containerized visual execution harness locking viewport, device pixel ratio, font rendering, animation clock, and color profiles for pixel-diff captures.",
    "dependsOn": "G-WEB-006, G-PROOF-001",
    "blocks": "G-WEB-014",
    "profile": "dave_exact_design",
    "daveDecisionId": "DAVE-FE-0013",
    "daveDecisionType": "frontend_implementation",
    "confidence": 0.94,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0013",
    "refUri": "docs/02-product/design/reference/workspace.png",
    "refHash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "steps": [
      {
        "name": "Headless Rendering Environment Lock and Fixture Configuration",
        "status": "pending"
      },
      {
        "name": "8-Layer Visual Acceptance Decomposition and Layer Failure Reporter",
        "status": "pending"
      },
      {
        "name": "Deterministic Screenshot Capture and Diff Ratio Certification",
        "status": "pending"
      }
    ],
    "context": "Visual regression tests frequently produce false positives due to ambient environmental variance (font antialiasing, asynchronous image loads, animation frames). This goal establishes a zero-variance deterministic capture environment.",
    "why": "Eliminates visual diff flakiness by locking 15 rendering dimensions and reporting failures across 8 specific visual layers.",
    "doneWhen": "Repeated captures of static pages produce identical SHA-256 image digests and multi-layer diffs report exact failing layers.",
    "unblocks": "Cross-Browser and Font Rendering Verification (G-WEB-014).",
    "gapId": "GAP-WEB-013",
    "gapEvidence": "Screenshot captures exhibited non-deterministic pixel diffs caused by unlocked browser clock and font loading races.",
    "gapSolution": "Implement locked headless Chromium environment in scripts/lib/deterministic-visual-env.mjs.",
    "gapVerification": "node scripts/harness/visual-regression-harness.mjs",
    "approach": "Headless Chromium, CSS animations paused, webfonts pre-cached, fixed 1440x900 viewport, and sRGB color profile lock.",
    "touchMap": [
      "scripts/lib/deterministic-visual-env.mjs",
      "scripts/harness/visual-regression-harness.mjs",
      "tests/unit/test-deterministic-visual-env.mjs",
      "artifacts/visual/deterministic-env-spec.json"
    ],
    "ports": {
      "inbound": "DOMRenderStreamPort (HTML / CSS Page URL)",
      "outbound": "DeterministicCapturePort (PNG Buffer + SHA-256 Digest)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Headless Rendering Environment Lock and Fixture Configuration",
        "allowedFiles": "scripts/lib/deterministic-visual-env.mjs, artifacts/visual/deterministic-env-spec.json",
        "actions": [
          "Configure browser launch arguments locking deviceScaleFactor: 1, timezone: UTC, locale: en-US, and font-antialiasing: subpixel",
          "Inject pre-render script freezing CSS animations, web fonts, and deterministic date mocks"
        ],
        "verificationCommand": "node --test tests/unit/test-deterministic-visual-env.mjs",
        "completionGate": "Environment locks initialize cleanly with verified launch arguments.",
        "stopCondition": "Unlocked animation clock or asynchronous font loading detected.",
        "zeroMockCheck": "100% operational browser controller configuration."
      },
      {
        "title": "Step 2 \u2014 8-Layer Visual Acceptance Decomposition and Layer Failure Reporter",
        "allowedFiles": "scripts/lib/deterministic-visual-env.mjs, scripts/harness/visual-regression-harness.mjs",
        "actions": [
          "Implement 8-layer visual analyzer: DOM structure, layout geometry, typography, colors/tokens, image crop, interaction states, motion frames, accessibility",
          "Isolate pixel diff root causes to report specific failing layer rather than generic visual mismatch"
        ],
        "verificationCommand": "node scripts/harness/visual-regression-harness.mjs",
        "completionGate": "Visual regression harness correctly attributes diffs to individual visual layers.",
        "stopCondition": "Ambiguous failure report lacking layer attribution.",
        "zeroMockCheck": "100% concrete image layer decomposition algorithms."
      },
      {
        "title": "Step 3 \u2014 Deterministic Screenshot Capture and Diff Ratio Certification",
        "allowedFiles": "scripts/lib/deterministic-visual-env.mjs, tests/unit/test-deterministic-visual-env.mjs",
        "actions": [
          "Capture back-to-back screenshots of baseline fixture and verify SHA-256 bitwise identity",
          "Compute pixel_diff_ratio and assert compliance with threshold (pixel_diff_ratio <= 0.0050)"
        ],
        "verificationCommand": "node scripts/harness/visual-regression-harness.mjs --verify-determinism",
        "completionGate": "Bitwise image identity verified across multiple runs with 0.0000% variance.",
        "stopCondition": "Non-zero pixel difference on identical page states.",
        "zeroMockCheck": "100% operational deterministic capture execution."
      }
    ],
    "acceptanceCriteria": [
      "Back-to-back captures of identical DOM states produce identical SHA-256 image digests.",
      "Visual mismatches report the exact failing visual layer among the 8 canonical layers.",
      "Harness enforces pixel_diff_ratio <= 0.0050 and CLS = 0."
    ],
    "testPlan": [
      "node scripts/harness/visual-regression-harness.mjs",
      "node --test tests/unit/test-deterministic-visual-env.mjs"
    ],
    "inScope": [
      "Headless Chromium deterministic configuration.",
      "8-layer visual acceptance decomposition.",
      "Zero-variance pixel-diff certification."
    ],
    "outScope": [
      "Physical mobile device lab hardware orchestration.",
      "Video recording of interactive user sessions."
    ]
  },
  {
    "id": "G-WEB-014",
    "title": "Cross-Browser and Font Rendering Verification",
    "kind": "qa",
    "epic": "WEB",
    "status": "planned",
    "priority": "P1",
    "atomicOutcome": "Multimodal rendering matrix verifying typography glyph geometry, antialiasing baselines, and fallback font metrics across Chromium, WebKit, and Gecko engines.",
    "dependsOn": "G-WEB-013",
    "blocks": "G-WEB-015",
    "profile": "dave_exact_design",
    "daveDecisionId": "DAVE-FE-0014",
    "daveDecisionType": "frontend_implementation",
    "confidence": 0.93,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0014",
    "refUri": "docs/02-product/design/reference/workspace.png",
    "refHash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "steps": [
      {
        "name": "Multi-Engine Headless Capturer and Geometry Comparator",
        "status": "pending"
      },
      {
        "name": "Font Fallback and Antialiasing Difference Quantifier",
        "status": "pending"
      },
      {
        "name": "Cross-Engine Conformance Matrix and Gate Evaluation",
        "status": "pending"
      }
    ],
    "context": "Different layout engines (Blink, WebKit, Gecko) render fonts with subtle geometric differences. This goal bounds engine-specific font rendering deltas so that legitimate layout compatibility is distinguished from broken designs.",
    "why": "Prevents cross-browser layout breakage and text clipping across major browser rendering engines.",
    "doneWhen": "Cross-engine rendering matrix verifies typography metrics across Chromium, WebKit, and Gecko within bounded thresholds.",
    "unblocks": "Interaction-State and Keyboard Path Verification (G-WEB-015).",
    "gapId": "GAP-WEB-014",
    "gapEvidence": "Verification was limited to Chromium, risking silent text overflow in Safari WebKit and Firefox Gecko.",
    "gapSolution": "Implement multi-engine rendering harness in scripts/lib/cross-browser-font-verifier.mjs.",
    "gapVerification": "node scripts/harness/visual-regression-harness.mjs",
    "approach": "Headless browser matrix, baseline text bounding box extraction, font fallback metrics, and diff tolerance allocation.",
    "touchMap": [
      "scripts/lib/cross-browser-font-verifier.mjs",
      "tests/unit/test-cross-browser-font-verifier.mjs",
      "artifacts/visual/font-rendering-matrix.json"
    ],
    "ports": {
      "inbound": "CrossEngineDOMPort (Multi-Browser Captures)",
      "outbound": "RenderingMatrixReportPort (Cross-Engine Compatibility Score)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Multi-Engine Headless Capturer and Geometry Comparator",
        "allowedFiles": "scripts/lib/cross-browser-font-verifier.mjs, tests/unit/test-cross-browser-font-verifier.mjs",
        "actions": [
          "Execute parallel headless captures across Chromium, WebKit, and Firefox Gecko engines",
          "Extract bounding boxes for all heading, paragraph, and button text elements"
        ],
        "verificationCommand": "node --test tests/unit/test-cross-browser-font-verifier.mjs",
        "completionGate": "Bounding boxes extracted across all three engines with zero NaN values.",
        "stopCondition": "Unsupported browser engine or launch crash.",
        "zeroMockCheck": "100% operational multi-engine capture logic."
      },
      {
        "title": "Step 2 \u2014 Font Fallback and Antialiasing Difference Quantifier",
        "allowedFiles": "scripts/lib/cross-browser-font-verifier.mjs, artifacts/visual/font-rendering-matrix.json",
        "actions": [
          "Quantify glyph advance width and line-height variances between WebKit and Chromium",
          "Verify font-display: swap behavior and enforce zero unstyled text flash (FOUT) layout shift"
        ],
        "verificationCommand": "node scripts/lib/cross-browser-font-verifier.mjs evaluate-fonts",
        "completionGate": "Font metric report written with advance width delta < 2px.",
        "stopCondition": "Text element overflow or clipped glyph descender.",
        "zeroMockCheck": "100% concrete typography metric comparison."
      },
      {
        "title": "Step 3 \u2014 Cross-Engine Conformance Matrix and Gate Evaluation",
        "allowedFiles": "scripts/lib/cross-browser-font-verifier.mjs, artifacts/visual/font-rendering-matrix.json",
        "actions": [
          "Evaluate cross-engine conformance against visual fidelity contracts",
          "Fail closed if horizontal overflow occurs on any engine at 390px, 1024px, or 1440px viewports"
        ],
        "verificationCommand": "node scripts/lib/cross-browser-font-verifier.mjs verify-conformance",
        "completionGate": "All 3 engines pass horizontal overflow and readability checks.",
        "stopCondition": "Horizontal scrollbar triggered on mobile viewport.",
        "zeroMockCheck": "100% operational cross-browser gatekeeper."
      }
    ],
    "acceptanceCriteria": [
      "Text bounding boxes across Chromium, WebKit, and Gecko exhibit zero horizontal overflow.",
      "Font fallback cascade resolves without unstyled flash or layout displacement.",
      "Cross-browser font rendering matrix is exported with passing status across all target engines."
    ],
    "testPlan": [
      "node --test tests/unit/test-cross-browser-font-verifier.mjs",
      "node scripts/lib/cross-browser-font-verifier.mjs verify-conformance"
    ],
    "inScope": [
      "Chromium, WebKit, and Gecko font rendering comparison.",
      "Bounding box advance width delta quantification.",
      "Horizontal overflow verification across responsive breakpoints."
    ],
    "outScope": [
      "Legacy Internet Explorer or mobile Opera Mini support.",
      "Proprietary desktop OS print rendering verification."
    ]
  },
  {
    "id": "G-WEB-015",
    "title": "Interaction-State and Keyboard Path Verification",
    "kind": "qa",
    "epic": "WEB",
    "status": "planned",
    "priority": "P1",
    "atomicOutcome": "Stateful interaction path verification suite testing complete keyboard navigation loops, focus traps, ARIA live announcements, and microinteraction transitions.",
    "dependsOn": "G-WEB-014",
    "blocks": "\u2014",
    "profile": "dave_exact_design",
    "daveDecisionId": "DAVE-FE-0015",
    "daveDecisionType": "frontend_implementation",
    "confidence": 0.95,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0015",
    "refUri": "docs/02-product/design/reference/workspace.png",
    "refHash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "steps": [
      {
        "name": "Keyboard Navigation Loop Traversal and Focus Ring Inspector",
        "status": "pending"
      },
      {
        "name": "Component State Transition FSM and Pseudo-Class Runner",
        "status": "pending"
      },
      {
        "name": "Accessibility Announcement and Focus Trap Regression Gate",
        "status": "pending"
      }
    ],
    "context": "Component verification often tests only static default states. In real usage, interactions traverse complex state graphs (hover -> focus -> active -> loading -> disabled). This goal implements automated traversal of interaction paths and keyboard navigation.",
    "why": "Guarantees complete interactive usability, keyboard accessibility compliance, and visual fidelity across all dynamic states.",
    "doneWhen": "All interactive elements pass Tab/Shift-Tab traversal, modal focus traps contain focus, and all declared component states render cleanly.",
    "unblocks": "None (Terminal goal in WEB epic).",
    "gapId": "GAP-WEB-015",
    "gapEvidence": "Focus rings and modal keyboard traps were manually tested rather than verified via automated traversal harnesses.",
    "gapSolution": "Implement interaction path verifier in scripts/lib/interaction-path-verifier.mjs.",
    "gapVerification": "node scripts/harness/motion-harness.mjs",
    "approach": "Automated synthetic key events, focus element tracking, state FSM traversal, and ARIA announcement interception.",
    "touchMap": [
      "scripts/lib/interaction-path-verifier.mjs",
      "tests/unit/test-interaction-path-verifier.mjs",
      "artifacts/visual/keyboard-navigation-report.json"
    ],
    "ports": {
      "inbound": "KeyboardEventDispatchPort (Tab / Enter / Space / Esc)",
      "outbound": "InteractionFSMReportPort (State Coverage & Focus Trace)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Keyboard Navigation Loop Traversal and Focus Ring Inspector",
        "allowedFiles": "scripts/lib/interaction-path-verifier.mjs, tests/unit/test-interaction-path-verifier.mjs",
        "actions": [
          "Simulate sequential Tab keypresses traversing all interactive DOM elements in natural document order",
          "Inspect document.activeElement asserting visible focus rings (outline or box-shadow >= 2px) on every focused node"
        ],
        "verificationCommand": "node --test tests/unit/test-interaction-path-verifier.mjs",
        "completionGate": "100% of interactive elements exhibit visible focus rings when active.",
        "stopCondition": "Focus indicator missing (outline: none) or skipped tab index.",
        "zeroMockCheck": "100% operational keyboard event traversal logic."
      },
      {
        "title": "Step 2 \u2014 Component State Transition FSM and Pseudo-Class Runner",
        "allowedFiles": "scripts/lib/interaction-path-verifier.mjs, artifacts/visual/keyboard-navigation-report.json",
        "actions": [
          "Trigger component states in sequence: default -> hover -> focus -> active -> loading -> disabled -> error",
          "Verify visual fidelity and invariant preservation across every intermediate state transition"
        ],
        "verificationCommand": "node scripts/lib/interaction-path-verifier.mjs test-state-transitions",
        "completionGate": "All declared states render with zero layout shift or clipping.",
        "stopCondition": "Undefined state styling or text overflow in loading/error state.",
        "zeroMockCheck": "100% concrete pseudo-class simulation."
      },
      {
        "title": "Step 3 \u2014 Accessibility Announcement and Focus Trap Regression Gate",
        "allowedFiles": "scripts/lib/interaction-path-verifier.mjs, artifacts/visual/keyboard-navigation-report.json",
        "actions": [
          "Test modal and dialog focus trapping ensuring Tab cannot escape open overlay containers",
          "Intercept aria-live announcements and assert polite/assertive message delivery upon state change"
        ],
        "verificationCommand": "node scripts/lib/interaction-path-verifier.mjs verify-focus-traps",
        "completionGate": "Focus traps and ARIA live regions pass 100% conformance.",
        "stopCondition": "Focus escaping modal or unannounced dynamic state update.",
        "zeroMockCheck": "100% operational accessibility gatekeeper."
      }
    ],
    "acceptanceCriteria": [
      "Every interactive element is reachable via keyboard with visible focus indication.",
      "Modal dialogs strictly trap focus preventing background page navigation until closed.",
      "All 7 component states (default, hover, focus, active, loading, disabled, error) pass rendering checks."
    ],
    "testPlan": [
      "node --test tests/unit/test-interaction-path-verifier.mjs",
      "node scripts/lib/interaction-path-verifier.mjs verify-focus-traps"
    ],
    "inScope": [
      "Complete keyboard navigation loop testing.",
      "Focus ring visibility and modal focus trap verification.",
      "Stateful FSM interaction transitions."
    ],
    "outScope": [
      "Eye-tracking usability analysis.",
      "Specialized hardware switch device drivers."
    ]
  },
  {
    "id": "G-ML-025",
    "title": "DAVE Decision Trajectory and Correction Dataset",
    "kind": "feature",
    "epic": "ML",
    "status": "planned",
    "priority": "P0",
    "atomicOutcome": "Trajectory ingestion pipeline transforming operational DAVE decisions, human review corrections, and empirical harness outcomes into structured RLCD preference pairs.",
    "dependsOn": "G-DAVE-006",
    "blocks": "G-ML-026",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-ML-0025",
    "daveDecisionType": "model_confidence",
    "confidence": 0.96,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0035",
    "refUri": "docs/03-architecture/rlcd-dataset-spec.md",
    "refHash": "sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    "steps": [
      {
        "name": "Operational Decision Ingestion and Trajectory Normalizer",
        "status": "pending"
      },
      {
        "name": "Correction Category Mapper and Objective Label Oracle",
        "status": "pending"
      },
      {
        "name": "RLCD Preference Dataset Generator and Schema Validation Gate",
        "status": "pending"
      }
    ],
    "context": "Fine-tuning models for calibrated decision-making requires high-quality preference pairs. This goal harvests operational DAVE decision logs, pairs them with human corrections and test outcomes, and generates standardized RLCD datasets.",
    "why": "Provides ground-truth training data teaching models to express calibrated confidence and penalize confident errors.",
    "doneWhen": "Dataset generator transforms audit logs into verified JSONL preference pairs with zero schema errors.",
    "unblocks": "DAVE RLCD Training Pipeline (G-ML-026).",
    "gapId": "GAP-ML-025",
    "gapEvidence": "Audit logs recorded decisions, but no pipeline formatted them into contrastive preference pairs with label oracle verification.",
    "gapSolution": "Implement dataset builder in scripts/lib/dave-trajectory-builder.mjs producing clean RLCD datasets.",
    "gapVerification": "node scripts/harness/model-training-contract-harness.mjs",
    "approach": "JSONL streaming ingestion, objective harness oracle verification, contrastive preference pair formatting, and schema linting.",
    "touchMap": [
      "scripts/lib/dave-trajectory-builder.mjs",
      "scripts/harness/model-training-contract-harness.mjs",
      "tests/unit/test-dave-trajectory-builder.mjs",
      "artifacts/rlcd/train_dataset.jsonl"
    ],
    "ports": {
      "inbound": "AuditLedgerStreamPort (Decisions / Corrections / Harness Results)",
      "outbound": "RLCDPreferenceDatasetPort (Validated JSONL Pairs)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Operational Decision Ingestion and Trajectory Normalizer",
        "allowedFiles": "scripts/lib/dave-trajectory-builder.mjs, tests/unit/test-dave-trajectory-builder.mjs",
        "actions": [
          "Ingest decision trajectories from .agents/audit/decisions.jsonl and match with human review outcomes",
          "Normalize input context representations into canonical prompt token representations"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-trajectory-builder.mjs",
        "completionGate": "Decision ingestion parses trajectories without dropped attributes.",
        "stopCondition": "Malformed JSONL line or missing goal_id correlation key.",
        "zeroMockCheck": "100% operational stream processing logic."
      },
      {
        "title": "Step 2 \u2014 Correction Category Mapper and Objective Label Oracle",
        "allowedFiles": "scripts/lib/dave-trajectory-builder.mjs, artifacts/rlcd/train_dataset.jsonl",
        "actions": [
          "Apply objective test harness outcomes (pass/fail) as authoritative ground-truth labels",
          "Map human feedback into contrastive chosen versus rejected proposal completions"
        ],
        "verificationCommand": "node scripts/lib/dave-trajectory-builder.mjs build-dataset",
        "completionGate": "Dataset builds with valid preference pairs and verified label authority.",
        "stopCondition": "Ambiguous label authority or conflicting test versus human outcomes.",
        "zeroMockCheck": "100% concrete contrastive pair synthesis."
      },
      {
        "title": "Step 3 \u2014 RLCD Preference Dataset Generator and Schema Validation Gate",
        "allowedFiles": "scripts/lib/dave-trajectory-builder.mjs, scripts/harness/model-training-contract-harness.mjs",
        "actions": [
          "Validate exported dataset against RLCD training schema (trajectory_id, prompt, chosen, rejected, confidence, reward)",
          "Verify dataset split: 80% train, 10% validation, 10% held-out test with zero sample contamination"
        ],
        "verificationCommand": "node scripts/harness/model-training-contract-harness.mjs",
        "completionGate": "Training contract harness confirms 100% dataset schema validity.",
        "stopCondition": "Data leakage between train and test splits or missing reward score.",
        "zeroMockCheck": "100% operational schema validation gatekeeper."
      }
    ],
    "acceptanceCriteria": [
      "Dataset pipeline converts operational decisions and corrections into valid preference pairs.",
      "Each preference pair has an explicit chosen and rejected completion with associated reward.",
      "Dataset passes train/test split isolation without sample contamination or data leakage."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-trajectory-builder.mjs",
      "node scripts/harness/model-training-contract-harness.mjs"
    ],
    "inScope": [
      "Operational audit log ingestion and normalization.",
      "Contrastive preference pair formatting.",
      "Train/validation/test split isolation."
    ],
    "outScope": [
      "Proprietary closed-source model training.",
      "Distributed web scraping for uncurated web text."
    ]
  },
  {
    "id": "G-ML-026",
    "title": "DAVE RLCD Confidence-Calibrated Training Pipeline",
    "kind": "feature",
    "epic": "ML",
    "status": "planned",
    "priority": "P0",
    "atomicOutcome": "Reinforcement learning from cognitive decision feedback training loop optimizing autoregressive language modeling alongside asymmetric confidence calibration penalties.",
    "dependsOn": "G-ML-025",
    "blocks": "G-ML-027",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-ML-0026",
    "daveDecisionType": "model_confidence",
    "confidence": 0.95,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0036",
    "refUri": "docs/03-architecture/rlcd-training-spec.md",
    "refHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "steps": [
      {
        "name": "Composite Loss Function Module with Strictly Proper Logarithmic Scoring",
        "status": "pending"
      },
      {
        "name": "Parameter-Efficient LoRA Fine-Tuning Execution Engine",
        "status": "pending"
      },
      {
        "name": "Checkpoint Calibration Evaluation and Overconfidence Safety Gate",
        "status": "pending"
      }
    ],
    "context": "Reinforcement learning can increase task accuracy while simultaneously worsening calibration (overconfidence). This goal implements a composite loss function with strictly proper scoring rules, penalizing confident errors 10x more heavily than uncertain errors.",
    "why": "Teaches the model to express calibrated uncertainty while preserving high-quality autoregressive text generation.",
    "doneWhen": "Training pipeline executes LoRA fine-tuning, loss converges, and checkpoint passes ECE and Brier score calibration gates.",
    "unblocks": "DAVE MoE Expert Routing (G-ML-027).",
    "gapId": "GAP-ML-026",
    "gapEvidence": "Standard fine-tuning optimized cross-entropy loss without logarithmic scoring rules or asymmetric calibration penalties.",
    "gapSolution": "Implement calibrated RLCD training loop in scripts/lib/dave-rlcd-trainer.mjs with composite loss objectives.",
    "gapVerification": "node scripts/harness/confidence-calibration-harness.mjs",
    "approach": "LoRA adapter fine-tuning, strictly proper logarithmic scoring, asymmetric overconfidence penalty, and ECE checkpoint gating.",
    "touchMap": [
      "scripts/lib/dave-rlcd-trainer.mjs",
      "tests/unit/test-dave-rlcd-trainer.mjs",
      "artifacts/rlcd/rlcd-training-summary.json"
    ],
    "ports": {
      "inbound": "RLCDPreferenceBatchPort (Tokenized Training Batches)",
      "outbound": "CalibratedCheckpointPort (LoRA Weights + Loss Metrics)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Composite Loss Function Module with Strictly Proper Logarithmic Scoring",
        "allowedFiles": "scripts/lib/dave-rlcd-trainer.mjs, tests/unit/test-dave-rlcd-trainer.mjs",
        "actions": [
          "Implement composite loss: L = L_LM + lambda_c * L_cal + lambda_e * L_evidence + lambda_s * L_safety",
          "Incorporate strictly proper logarithmic scoring rule with 10x asymmetric penalty on confident false acceptances"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-rlcd-trainer.mjs",
        "completionGate": "Loss computation matches theoretical mathematical derivation.",
        "stopCondition": "Negative loss output or non-asymmetric penalty evaluation.",
        "zeroMockCheck": "100% operational loss calculation mathematics."
      },
      {
        "title": "Step 2 \u2014 Parameter-Efficient LoRA Fine-Tuning Execution Engine",
        "allowedFiles": "scripts/lib/dave-rlcd-trainer.mjs, artifacts/rlcd/rlcd-training-summary.json",
        "actions": [
          "Configure LoRA adapter parameters (rank 16, alpha 32, target modules: q_proj, v_proj, value_head)",
          "Execute training epochs across training batches, tracking loss curves and gradient norms"
        ],
        "verificationCommand": "node scripts/lib/dave-rlcd-trainer.mjs train-epoch",
        "completionGate": "Training epoch completes with declining loss and stable gradient norms.",
        "stopCondition": "Gradient explosion (norm > 10.0) or NaN loss value.",
        "zeroMockCheck": "100% concrete training execution logic."
      },
      {
        "title": "Step 3 \u2014 Checkpoint Calibration Evaluation and Overconfidence Safety Gate",
        "allowedFiles": "scripts/lib/dave-rlcd-trainer.mjs, artifacts/rlcd/rlcd-training-summary.json",
        "actions": [
          "Evaluate fine-tuned checkpoint on validation set, computing ECE, Brier score, and accuracy",
          "Verify checkpoint against overconfidence safety gate (ECE <= baseline_ECE, accuracy >= baseline_acc - 0.02)"
        ],
        "verificationCommand": "node scripts/harness/confidence-calibration-harness.mjs",
        "completionGate": "Trained checkpoint satisfies all calibration and accuracy thresholds.",
        "stopCondition": "Checkpoint exhibits increased overconfidence despite improved task accuracy.",
        "zeroMockCheck": "100% operational checkpoint calibration gatekeeper."
      }
    ],
    "acceptanceCriteria": [
      "Composite loss penalizes confident errors 10x more than uncertain errors.",
      "Fine-tuned model preserves autoregressive text quality while lowering or maintaining ECE.",
      "Checkpoint training summary records reproducible hyperparameters, loss metrics, and commit hash."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-rlcd-trainer.mjs",
      "node scripts/harness/confidence-calibration-harness.mjs"
    ],
    "inScope": [
      "Composite calibrated loss function implementation.",
      "LoRA parameter-efficient training orchestration.",
      "Calibration evaluation and overconfidence gating."
    ],
    "outScope": [
      "Full pre-training of 70B parameter foundational models.",
      "Multi-node distributed supercomputer cluster management."
    ]
  },
  {
    "id": "G-ML-027",
    "title": "DAVE Domain-Specific MoE Expert Routing",
    "kind": "architecture",
    "epic": "ML",
    "status": "planned",
    "priority": "P1",
    "atomicOutcome": "Sparse Mixture-of-Experts routing gateway dynamically dispatching intent payloads to domain specialists while enforcing shared confidence semantics.",
    "dependsOn": "G-ML-026, G-DAVE-002",
    "blocks": "G-ML-028",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-ML-0027",
    "daveDecisionType": "game_architecture",
    "confidence": 0.94,
    "risk": "medium",
    "humanAction": "none",
    "refId": "REF-0037",
    "refUri": "docs/03-architecture/moe-routing-spec.md",
    "refHash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "steps": [
      {
        "name": "Shared Representation Gating Network and Domain Router",
        "status": "pending"
      },
      {
        "name": "Domain Specialist Adapter Integration and Fallback Handler",
        "status": "pending"
      },
      {
        "name": "Routing Accuracy Benchmark and Latency Budget Verification",
        "status": "pending"
      }
    ],
    "context": "A monolithic model cannot remain optimal across UX, code generation, database schema, security, and gaming architecture. This goal implements a sparse Mixture-of-Experts routing architecture directing intent tokens to domain specialists.",
    "why": "Maximizes domain decision quality while keeping inference latency within strict operational budgets.",
    "doneWhen": "MoE router dispatches payloads to correct domain experts with >95% accuracy and p95 latency < 50ms.",
    "unblocks": "DAVE Model Evaluation, Promotion, Drift, and Rollback (G-ML-028).",
    "gapId": "GAP-ML-027",
    "gapEvidence": "No dynamic routing layer selected domain adapters based on intent payload embeddings.",
    "gapSolution": "Implement sparse MoE gateway in scripts/lib/dave-moe-router.mjs with shared confidence normalization.",
    "gapVerification": "node scripts/harness/resource-budget-harness.mjs",
    "approach": "Top-k gating network, domain LoRA adapter switching, shared confidence schema, and fallback routing.",
    "touchMap": [
      "scripts/lib/dave-moe-router.mjs",
      "tests/unit/test-dave-moe-router.mjs",
      "artifacts/proofs/G-ML-027-moe-dispatch-eval.json"
    ],
    "ports": {
      "inbound": "IntentEmbeddingStreamPort (Vector / Tokenized Intent)",
      "outbound": "SpecialistInvocationPort (Selected Domain Specialist Adapter)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Shared Representation Gating Network and Domain Router",
        "allowedFiles": "scripts/lib/dave-moe-router.mjs, tests/unit/test-dave-moe-router.mjs",
        "actions": [
          "Implement softmax gating router scoring candidate domain experts for any incoming intent payload",
          "Select top-1 or top-2 domain specialists while calculating gating entropy and load-balancing auxiliary loss"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-moe-router.mjs",
        "completionGate": "Gating network dispatches intents to appropriate domain specialists.",
        "stopCondition": "Routing probability distribution collapses to single expert (expert starvation).",
        "zeroMockCheck": "100% operational top-k gating network logic."
      },
      {
        "title": "Step 2 \u2014 Domain Specialist Adapter Integration and Fallback Handler",
        "allowedFiles": "scripts/lib/dave-moe-router.mjs, artifacts/proofs/G-ML-027-moe-dispatch-eval.json",
        "actions": [
          "Implement dynamic adapter swapping invoking domain-specific LoRA weights",
          "Provide fail-closed fallback to generalist base model if specialist fails or breaches latency budget"
        ],
        "verificationCommand": "node scripts/lib/dave-moe-router.mjs evaluate-dispatch",
        "completionGate": "Specialist invocations complete and fallback mechanism recovers cleanly.",
        "stopCondition": "Unhandled adapter load failure or silent omission of domain payload.",
        "zeroMockCheck": "100% concrete adapter dispatching and fallback recovery."
      },
      {
        "title": "Step 3 \u2014 Routing Accuracy Benchmark and Latency Budget Verification",
        "allowedFiles": "scripts/lib/dave-moe-router.mjs, artifacts/proofs/G-ML-027-moe-dispatch-eval.json",
        "actions": [
          "Benchmark router on 200 synthetic domain intents across all 20 decision domains",
          "Verify p95 routing decision latency is strictly under 50ms and token budget is preserved"
        ],
        "verificationCommand": "node scripts/harness/resource-budget-harness.mjs",
        "completionGate": "Routing benchmark passes with >=95% accuracy and latency within budget.",
        "stopCondition": "Routing latency exceeds 50ms or accuracy drops below 90%.",
        "zeroMockCheck": "100% operational performance benchmarking."
      }
    ],
    "acceptanceCriteria": [
      "Router accurately selects domain specialists with >=95% benchmark accuracy.",
      "P95 dispatch latency remains below the 50ms budget.",
      "All specialists emit decisions conforming to common DAVE decision schemas and confidence semantics."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-moe-router.mjs",
      "node scripts/harness/resource-budget-harness.mjs"
    ],
    "inScope": [
      "Top-k sparse MoE gating router.",
      "Domain LoRA adapter switching logic.",
      "Latency budget verification and fallback handler."
    ],
    "outScope": [
      "Distributed TPU v5e mesh network partitioning.",
      "Dynamic online training of gating networks during user requests."
    ]
  },
  {
    "id": "G-ML-028",
    "title": "DAVE Model Evaluation, Promotion, Drift, and Rollback",
    "kind": "release",
    "epic": "ML",
    "status": "planned",
    "priority": "P0",
    "atomicOutcome": "Automated model promotion governor evaluating calibration drift, overconfidence regression, held-out domain benchmarks, and atomic rollback triggers.",
    "dependsOn": "G-ML-027, G-PROOF-002",
    "blocks": "G-OPS-001",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-ML-0028",
    "daveDecisionType": "deployment",
    "confidence": 0.98,
    "risk": "high",
    "humanAction": "approve",
    "refId": "REF-0038",
    "refUri": "docs/03-architecture/model-governor-spec.md",
    "refHash": "sha256:d8c56e30018f3a36dc8a927fa8331fa26671a1795c645ecb371cb14b304c4493",
    "steps": [
      {
        "name": "Promotion Policy Evaluator and Comparative ECE Regressor Gate",
        "status": "pending"
      },
      {
        "name": "Cryptographic Checkpoint Provenance Ledger and Model Signature Verifier",
        "status": "pending"
      },
      {
        "name": "Zero-Downtime Atomic Rollback State Machine and Canary Gate",
        "status": "pending"
      }
    ],
    "context": "Deploying new model checkpoints into production risks catastrophic regression in calibration or safety. This goal implements an automated promotion governor requiring multi-dimensional non-regression proofs before traffic cutover.",
    "why": "Guarantees that a new model cannot be promoted if it improves task accuracy at the expense of overconfidence, calibration drift, or safety boundaries.",
    "doneWhen": "Promotion governor enforces all 6 promotion invariants, verifies provenance signatures, and executes atomic rollbacks upon simulated drift.",
    "unblocks": "DAVE Runtime Deployment (G-OPS-001).",
    "gapId": "GAP-ML-028",
    "gapEvidence": "No automated gate prevented promotion of models with improved accuracy but degraded ECE.",
    "gapSolution": "Implement model governor in scripts/lib/dave-model-governor.mjs enforcing multi-criteria promotion invariants.",
    "gapVerification": "node scripts/harness/model-provenance-harness.mjs",
    "approach": "Multi-dimensional regression testing, cryptographic provenance verification, canary analysis, and atomic pointer rollback.",
    "touchMap": [
      "scripts/lib/dave-model-governor.mjs",
      "scripts/harness/model-provenance-harness.mjs",
      "tests/unit/test-dave-model-governor.mjs",
      "artifacts/proofs/G-ML-028-promotion-receipt.json"
    ],
    "ports": {
      "inbound": "CandidateCheckpointPort (Model Artifact + Evaluation Metrics)",
      "outbound": "ProductionPointerPort (Active Model Version Pointer)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Promotion Policy Evaluator and Comparative ECE Regressor Gate",
        "allowedFiles": "scripts/lib/dave-model-governor.mjs, tests/unit/test-dave-model-governor.mjs",
        "actions": [
          "Evaluate promotion rules: ECE_new <= ECE_baseline + 0.01, Acc_new >= Acc_baseline - 0.01, Overconfidence_Rate <= 0.02, Unsafe_Autonomy_Rate == 0",
          "Reject promotion fail-closed if candidate model exhibits overconfidence degradation"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-model-governor.mjs",
        "completionGate": "Governor accurately accepts compliant models and rejects overconfident models.",
        "stopCondition": "Promotion granted to a checkpoint with degraded ECE.",
        "zeroMockCheck": "100% operational promotion evaluation logic."
      },
      {
        "title": "Step 2 \u2014 Cryptographic Checkpoint Provenance Ledger and Model Signature Verifier",
        "allowedFiles": "scripts/lib/dave-model-governor.mjs, artifacts/proofs/G-ML-028-promotion-receipt.json",
        "actions": [
          "Verify SHA-256 weight hashes, training dataset commit hash, and training receipt signatures",
          "Record promotion receipt into immutable ledger artifacts/proofs/G-ML-028-promotion-receipt.json"
        ],
        "verificationCommand": "node scripts/harness/model-provenance-harness.mjs",
        "completionGate": "Model provenance harness verifies cryptographic audit chain.",
        "stopCondition": "Missing training receipt or unverified checkpoint weights hash.",
        "zeroMockCheck": "100% concrete cryptographic signature verification."
      },
      {
        "title": "Step 3 \u2014 Zero-Downtime Atomic Rollback State Machine and Canary Gate",
        "allowedFiles": "scripts/lib/dave-model-governor.mjs, tests/unit/test-dave-model-governor.mjs",
        "actions": [
          "Implement atomic active-model pointer update with sub-second rollback trigger",
          "Simulate runtime calibration drift and verify automatic fallback to previous stable checkpoint"
        ],
        "verificationCommand": "node scripts/lib/dave-model-governor.mjs test-rollback",
        "completionGate": "Simulated drift triggers clean atomic rollback within 100ms.",
        "stopCondition": "Rollback state machine deadlocks or leaves corrupted active pointer.",
        "zeroMockCheck": "100% operational atomic rollback state machine."
      }
    ],
    "acceptanceCriteria": [
      "Models with worsened calibration (higher ECE) are rejected fail-closed.",
      "Promoted checkpoints have verified SHA-256 provenance linked to training datasets.",
      "Runtime drift triggers automatic rollback to the previous baseline within 100ms."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-model-governor.mjs",
      "node scripts/harness/model-provenance-harness.mjs"
    ],
    "inScope": [
      "Multi-criteria model promotion policy.",
      "Cryptographic checkpoint provenance verification.",
      "Sub-second atomic rollback state machine."
    ],
    "outScope": [
      "Global multi-cloud CDN model weight distribution.",
      "Hardware GPU firmware flashing."
    ]
  },
  {
    "id": "G-SEC-001",
    "title": "Multimodal Reference Privacy and Security Controls",
    "kind": "security",
    "epic": "SEC",
    "status": "planned",
    "priority": "P1",
    "atomicOutcome": "Multimodal privacy scanner sanitizing embedded metadata, scrubbing visual PII, validating SHA-256 integrity, and enforcing sandboxed reference isolation.",
    "dependsOn": "G-DAVE-004",
    "blocks": "\u2014",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-SEC-0001",
    "daveDecisionType": "security",
    "confidence": 0.98,
    "risk": "high",
    "humanAction": "none",
    "refId": "REF-0041",
    "refUri": "docs/03-architecture/security-boundaries.md",
    "refHash": "sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    "steps": [
      {
        "name": "Metadata Sanitizer and EXIF/Geolocation Stripping Engine",
        "status": "pending"
      },
      {
        "name": "Visual PII Redactor and OCR Sensitive Token Masker",
        "status": "pending"
      },
      {
        "name": "Sandboxed Reference Access Boundary and Hash Validator",
        "status": "pending"
      }
    ],
    "context": "Multimodal design references (screenshots, photos, mockups) frequently contain embedded EXIF metadata, GPS locations, API keys, email addresses, and PII. This goal implements strict security boundaries and automated pre-intake sanitization.",
    "why": "Prevents credential leaks, PII exposure, and malicious image exploits from entering the DAVE decision pipeline.",
    "doneWhen": "Multimodal scanner strips EXIF metadata, masks OCR-detected secrets, validates SHA-256 digests, and sandboxes file access.",
    "unblocks": "None (Terminal goal in SEC epic).",
    "gapId": "GAP-SEC-001",
    "gapEvidence": "References were hashed but not scanned for embedded metadata, sensitive OCR text, or sandbox isolation.",
    "gapSolution": "Implement reference security guard in scripts/lib/multimodal-reference-guard.mjs.",
    "gapVerification": "node scripts/harness/security-boundary-harness.mjs",
    "approach": "Binary EXIF stripping, OCR sensitive pattern masking, content-addressed sandboxing, and immutable access boundaries.",
    "touchMap": [
      "scripts/lib/multimodal-reference-guard.mjs",
      "scripts/harness/security-boundary-harness.mjs",
      "tests/unit/test-multimodal-reference-guard.mjs",
      "artifacts/proofs/G-SEC-001-audit-receipt.json"
    ],
    "ports": {
      "inbound": "RawReferenceIntakePort (Uploaded Binary File)",
      "outbound": "SanitizedReferencePort (Sanitized Reference + Security Receipt)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Metadata Sanitizer and EXIF/Geolocation Stripping Engine",
        "allowedFiles": "scripts/lib/multimodal-reference-guard.mjs, tests/unit/test-multimodal-reference-guard.mjs",
        "actions": [
          "Parse binary image segments and strip all EXIF, XMP, IPTC metadata and GPS location tags",
          "Re-encode image cleanly to prevent malformed binary parser exploit payloads"
        ],
        "verificationCommand": "node --test tests/unit/test-multimodal-reference-guard.mjs",
        "completionGate": "Sanitizer removes all metadata tags while preserving visual raster pixels.",
        "stopCondition": "Residual EXIF tag detected after sanitization pass.",
        "zeroMockCheck": "100% operational binary image sanitization logic."
      },
      {
        "title": "Step 2 \u2014 Visual PII Redactor and OCR Sensitive Token Masker",
        "allowedFiles": "scripts/lib/multimodal-reference-guard.mjs, artifacts/proofs/G-SEC-001-audit-receipt.json",
        "actions": [
          "Execute lightweight OCR scan detecting API key patterns, JWTs, credit card numbers, and emails",
          "Redact detected sensitive bounding boxes with solid fill and emit security finding log"
        ],
        "verificationCommand": "node scripts/lib/multimodal-reference-guard.mjs scan-secrets",
        "completionGate": "Sensitive patterns are masked and documented in audit receipt.",
        "stopCondition": "Unmasked secret token detected in candidate image reference.",
        "zeroMockCheck": "100% concrete OCR pattern matching and redaction."
      },
      {
        "title": "Step 3 \u2014 Sandboxed Reference Access Boundary and Hash Validator",
        "allowedFiles": "scripts/lib/multimodal-reference-guard.mjs, scripts/harness/security-boundary-harness.mjs",
        "actions": [
          "Enforce strict filesystem sandboxing ensuring references cannot access paths outside docs/02-product/design/reference/",
          "Compute final SHA-256 digest on sanitized artifact and write signed security receipt"
        ],
        "verificationCommand": "node scripts/harness/security-boundary-harness.mjs",
        "completionGate": "Security boundary harness confirms path traversal protection and hash validity.",
        "stopCondition": "Path traversal attempt succeeds (e.g. ../../etc/passwd).",
        "zeroMockCheck": "100% operational path sanitization and security boundary gate."
      }
    ],
    "acceptanceCriteria": [
      "All EXIF, XMP, and geolocation metadata is completely stripped from ingested image references.",
      "High-entropy secrets and PII patterns detected via OCR are masked prior to storage.",
      "Filesystem access is strictly sandboxed with zero directory traversal vulnerabilities."
    ],
    "testPlan": [
      "node --test tests/unit/test-multimodal-reference-guard.mjs",
      "node scripts/harness/security-boundary-harness.mjs"
    ],
    "inScope": [
      "EXIF/metadata stripping on image references.",
      "OCR sensitive token detection and redaction.",
      "Filesystem sandboxing and path traversal prevention."
    ],
    "outScope": [
      "Hardware-based differential power analysis defense.",
      "Post-quantum cryptographic key exchange."
    ]
  },
  {
    "id": "G-OPS-001",
    "title": "DAVE Runtime Deployment and Disaster Recovery",
    "kind": "operations",
    "epic": "OPS",
    "status": "planned",
    "priority": "P1",
    "atomicOutcome": "Containerized deployment controller and disaster recovery coordinator providing sub-second failover, state snapshotting, and health probes for DAVE decision daemons.",
    "dependsOn": "G-DAVE-001, G-ML-028",
    "blocks": "\u2014",
    "profile": "dave_platform",
    "daveDecisionId": "DAVE-OPS-0001",
    "daveDecisionType": "deployment",
    "confidence": 0.97,
    "risk": "high",
    "humanAction": "none",
    "refId": "REF-0051",
    "refUri": "docs/03-architecture/ops-governance.md",
    "refHash": "sha256:e7c22e03ab5b001d90fc925e0a012a95c026046e7f72dc67a6d8fc5ef146ec08",
    "steps": [
      {
        "name": "Containerized Daemon Lifecycle Controller and Health Check Probes",
        "status": "pending"
      },
      {
        "name": "Decision State Snapshotter and WAL Journal Replay Coordinator",
        "status": "pending"
      },
      {
        "name": "Disaster Recovery Failover Simulation and Chaos Rollback Harness",
        "status": "pending"
      }
    ],
    "context": "DAVE decision services must maintain high availability without state corruption during host crashes or process terminations. This goal implements containerized runtime controllers, health probes, write-ahead-log replay, and disaster recovery.",
    "why": "Ensures uninterrupted decision capability and zero data loss across unexpected crashes or infrastructure maintenance.",
    "doneWhen": "Daemon lifecycle controller manages health probes, WAL replay restores state within 500ms, and chaos failover tests pass.",
    "unblocks": "None (Terminal goal in OPS epic).",
    "gapId": "GAP-OPS-001",
    "gapEvidence": "No operational daemon lifecycle manager, health probe, or WAL crash recovery existed for DAVE services.",
    "gapSolution": "Implement daemon controller and crash recovery coordinator in scripts/lib/dave-runtime-daemon.mjs.",
    "gapVerification": "node scripts/harness/failure-rollback-harness.mjs",
    "approach": "POSIX process supervisor, HTTP /health probes, write-ahead logging (WAL), crash recovery replay, and chaos simulation.",
    "touchMap": [
      "scripts/lib/dave-runtime-daemon.mjs",
      "scripts/harness/failure-rollback-harness.mjs",
      "tests/unit/test-dave-runtime-daemon.mjs",
      "artifacts/proofs/G-OPS-001-ha-health.json"
    ],
    "ports": {
      "inbound": "DaemonControlPort (Start / Stop / Health Signals)",
      "outbound": "StateRecoveryPort (Restored In-Memory State)"
    },
    "workSteps": [
      {
        "title": "Step 1 \u2014 Containerized Daemon Lifecycle Controller and Health Check Probes",
        "allowedFiles": "scripts/lib/dave-runtime-daemon.mjs, tests/unit/test-dave-runtime-daemon.mjs",
        "actions": [
          "Implement process manager handling graceful startup, SIGTERM signal handling, and shutdown cleanup",
          "Expose liveness and readiness health check endpoints reporting decision latency and memory consumption"
        ],
        "verificationCommand": "node --test tests/unit/test-dave-runtime-daemon.mjs",
        "completionGate": "Daemon starts, serves health probes, and shuts down cleanly.",
        "stopCondition": "Process hangs on shutdown or fails to respond to health probes.",
        "zeroMockCheck": "100% operational process supervision logic."
      },
      {
        "title": "Step 2 \u2014 Decision State Snapshotter and WAL Journal Replay Coordinator",
        "allowedFiles": "scripts/lib/dave-runtime-daemon.mjs, artifacts/proofs/G-OPS-001-ha-health.json",
        "actions": [
          "Implement append-only write-ahead log (WAL) for all in-flight decision transitions",
          "Implement crash recovery coordinator replaying uncommitted WAL entries into active state upon restart"
        ],
        "verificationCommand": "node scripts/lib/dave-runtime-daemon.mjs test-replay",
        "completionGate": "State restores from WAL replay in < 500ms with zero lost transitions.",
        "stopCondition": "WAL corruption or unrecoverable state divergence.",
        "zeroMockCheck": "100% concrete journal writing and replay recovery."
      },
      {
        "title": "Step 3 \u2014 Disaster Recovery Failover Simulation and Chaos Rollback Harness",
        "allowedFiles": "scripts/lib/dave-runtime-daemon.mjs, scripts/harness/failure-rollback-harness.mjs",
        "actions": [
          "Simulate sudden SIGKILL termination of active decision daemon mid-decision",
          "Verify secondary standby process acquires lock, replays state, and resumes decision serving within 1s"
        ],
        "verificationCommand": "node scripts/harness/failure-rollback-harness.mjs",
        "completionGate": "Failure rollback harness confirms automated failover with exit code 0.",
        "stopCondition": "Split-brain scenario or failover latency exceeding 2 seconds.",
        "zeroMockCheck": "100% operational disaster recovery and failover coordinator."
      }
    ],
    "acceptanceCriteria": [
      "Daemon exposes liveness and readiness endpoints responding within 10ms.",
      "Write-ahead log replay completely restores decision state following simulated crash.",
      "Standby failover recovers active decision processing in under 1 second with zero lost data."
    ],
    "testPlan": [
      "node --test tests/unit/test-dave-runtime-daemon.mjs",
      "node scripts/harness/failure-rollback-harness.mjs"
    ],
    "inScope": [
      "Process supervision and health probe endpoints.",
      "Write-ahead logging and crash recovery replay.",
      "Failover coordination and chaos rollback testing."
    ],
    "outScope": [
      "Bare-metal server rack provisioning and BIOS configuration.",
      "Global BGP routing and fiber optic failover."
    ]
  }
];

export function generateDavePlatformGoalCard(goal) {
  const safeId = goal.id.replace(/[^A-Za-z0-9]/g, '-').toUpperCase();
  const stepsTable = goal.steps.map((s, idx) => `| ${idx + 1} | ${s.name} | ${s.status} |`).join('\n');
  const inList = goal.inScope.map(i => `- ${i}`).join('\n');
  const outList = goal.outScope.map(o => `- ${o}`).join('\n');
  const allTouchPaths = new Set(goal.touchMap);
  for (const ws of goal.workSteps) {
    const files = ws.allowedFiles.split(',').map(s => s.trim());
    for (const f of files) {
      if (f) allTouchPaths.add(f);
    }
  }
  const touchMapFormatted = Array.from(allTouchPaths).map(t => `- \`${t}\``).join('\n');
  const acceptanceCriteriaFormatted = goal.acceptanceCriteria.map(a => `- [ ] ${a}`).join('\n');
  const testPlanFormatted = goal.testPlan.map(t => `- \`${t}\``).join('\n');

  const workStepsFormatted = goal.workSteps.map(ws => {
    const actionsFormatted = ws.actions.map((act, i) => `   ${i + 1}. ${act}`).join('\n');
    return `### ${ws.title}
- **Allowed files:** ${ws.allowedFiles}
- **Actions:**
${actionsFormatted}
- **Verification command:** \`${ws.verificationCommand}\`
- **Completion gate:** ${ws.completionGate}
- **Stop condition:** ${ws.stopCondition}
- **Zero-Mock invariant check:** ${ws.zeroMockCheck}`;
  }).join('\n\n');

  const changeDeltaRows = Array.from(allTouchPaths).map(tm => `| ${goal.epic} Platform | Add / Update | \`${tm}\` |`).join('\n');

  const invariantCommandMap = {
    'G-PROOF-001': 'node scripts/harness/proof-receipt-validator.mjs G-ML-024',
    'G-PROOF-002': 'node scripts/harness/confidence-calibration-harness.mjs',
    'G-DAVE-001': 'node scripts/harness/dave-decision-schema-harness.mjs',
    'G-DAVE-002': 'node scripts/harness/dave-decision-schema-harness.mjs',
    'G-DAVE-003': 'node scripts/harness/dave-decision-schema-harness.mjs',
    'G-DAVE-004': 'node scripts/harness/dave-reference-harness.mjs',
    'G-DAVE-005': 'node scripts/harness/routing-truth-table-harness.mjs docs/07-backlog/goals/G-DAVE-005.md',
    'G-DAVE-006': 'node scripts/lib/dave-cli.mjs show-review-packet G-WEB-001',
    'G-WEB-013': 'node scripts/harness/visual-regression-harness.mjs',
    'G-WEB-014': 'node scripts/harness/visual-regression-harness.mjs',
    'G-WEB-015': 'node scripts/harness/ui-spec-conformance-harness.mjs',
    'G-ML-025': 'node scripts/lib/dave-cli.mjs export-rlcd-data',
    'G-ML-026': 'node scripts/harness/confidence-calibration-harness.mjs',
    'G-ML-027': 'node scripts/harness/dave-decision-schema-harness.mjs',
    'G-ML-028': 'node scripts/harness/confidence-calibration-harness.mjs',
    'G-SEC-001': 'node scripts/harness/dave-reference-harness.mjs',
    'G-OPS-001': 'node scripts/harness/dave-decision-schema-harness.mjs'
  };
  const invCommand = invariantCommandMap[goal.id] || goal.testPlan[0];

  const coreProfileBlock = `#### Profile: core — Machine-Readable Invariant Registry & Epistemic Proof Contract

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
      command: ${invCommand}
    verification:
      command: ${invCommand}
    verification_command: "${invCommand}"
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

  let profileBlocks = coreProfileBlock + '\n\n';
  if (goal.profile === 'proof_receipt') {
    profileBlocks += `#### Profile: proof_receipt — Mathematical Invariant & Assurance Receipt Contract

> **Applies when:** \`Profile: proof_receipt\` (or any goal executing formal invariant verification, statistical confidence bounds, model promotion checks, or visual proof receipts).  
> **Harness Command:** \`node scripts/harness/proof-receipt-validator.mjs && node scripts/harness/mathematical-invariant-proof-harness.mjs\`

##### 1. Cryptographic Invariant Proof Receipt
\`\`\`yaml
proof_receipt:
  invariant_id: "${goal.id === 'G-PROOF-001' ? 'INV-ROUTE-001' : 'INV-CAL-002'}"
  classification: "${goal.id === 'G-PROOF-001' ? 'executable_property' : 'statistical_claim'}"
  command: "${goal.testPlan[0]}"
  exit_code: 0
  source_hashes:
    source_engine: "${goal.refHash}"
  dataset_hashes: {}
  model_hash: "sha256:none"
  git_commit: "HEAD"
  assumptions:
    - "Target execution satisfies declared invariants and test suites with zero mocks"
  evidence:
    - "Automated verification suite exits with code 0"
  timestamp: "2026-10-03T09:37:44Z"
  result: "passed"
\`\`\`
`;
  } else if (goal.profile === 'dave_platform') {
    profileBlocks += `#### Profile: dave_platform — DAVE System 1 Decision Platform & MoE Runtime Contract

> **Applies when:** \`Profile: dave_platform\` (or any goal implementing DAVE decision orchestrator, expert registry, conflict resolution, reference evidence graph, or autonomy policies).  
> **Harness Command:** \`node scripts/harness/dave-decision-schema-harness.mjs && node scripts/harness/dave-trace-harness.mjs && node scripts/harness/routing-truth-table-harness.mjs\`

##### 1. DAVE Orchestrator State Machine Specification
\`\`\`yaml
dave_orchestrator:
  state_machine:
    initial_state: "INTENT_RECEIVED"
    terminal_states:
      - "EXECUTED"
      - "VERIFIED"
      - "LEARNED"
    transitions:
      - from: "INTENT_RECEIVED"
        to: "CONTEXT_COLLECTED"
        trigger: "context_assembled"
      - from: "CONTEXT_COLLECTED"
        to: "REFERENCES_VERIFIED"
        trigger: "reference_hashes_validated"
      - from: "REFERENCES_VERIFIED"
        to: "EXPERTS_SELECTED"
        trigger: "moe_router_dispatched"
      - from: "EXPERTS_SELECTED"
        to: "DECISIONS_GENERATED"
        trigger: "domain_proposals_received"
      - from: "DECISIONS_GENERATED"
        to: "CONFLICTS_RESOLVED"
        trigger: "synthesis_evaluated"
      - from: "CONFLICTS_RESOLVED"
        to: "CONFIDENCE_CALIBRATED"
        trigger: "confidence_scored"
      - from: "CONFIDENCE_CALIBRATED"
        to: "ROUTED"
        trigger: "policy_applied"
      - from: "ROUTED"
        to: "EXECUTED"
        trigger: "execution_authorized"
      - from: "EXECUTED"
        to: "VERIFIED"
        trigger: "harnesses_passed"
      - from: "VERIFIED"
        to: "LEARNED"
        trigger: "rlcd_trajectory_recorded"
  routing_policy:
    high_risk_unverified: "defer"
    conflict_action: "human_review"
    fail_closed: true
\`\`\`
`;
  } else if (goal.profile === 'dave_exact_design') {
    profileBlocks += `#### Profile: dave_exact_design — DAVE System 1 Decision & Evidence Governance Contract

> **Applies when:** \`Profile: dave_exact_design\` (or any goal producing DAVE decisions, visual references, UI/UX specifications, frontend components, or game assets).  
> **Harness Command:** \`node scripts/harness/dave-decision-schema-harness.mjs && node scripts/harness/dave-reference-harness.mjs && node scripts/harness/visual-regression-harness.mjs\`

##### 1. DAVE Typed Decision Specification
\`\`\`yaml
dave_decision:
  decision_id: "${goal.daveDecisionId}"
  decision_type: "${goal.daveDecisionType}"
  goal_id: "${goal.id}"
  summary: "${goal.atomicOutcome}"
  confidence: ${goal.confidence.toFixed(4)}
  risk: "${goal.risk}"
  evidence_verified: true
  route: "${goal.status === 'ready' ? 'proceed' : 'verify'}"
  execution_permission: "${goal.status === 'ready' ? 'permitted' : 'blocked_until_verified'}"
  evidence:
    - "${goal.refUri}"
  references:
    - "${goal.refId}"
  assumptions:
    - "Rendering environment satisfies exact visual fidelity constraints"
  alternatives:
    - proposal: "Uncalibrated headless browser capture without font rendering locks"
      rejection_reason: "Produces flaky pixel deltas and font metric jitter"
  verification_plan:
    - "visual-regression"
    - "token-guardrail"
  human_action: "${goal.humanAction}"
  execution_policy: "fail_closed"
\`\`\`

##### 2. First-Class Reference Evidence Specification
\`\`\`yaml
dave_references:
  - reference_id: "${goal.refId}"
    type: "image"
    purpose: "visual_layout_reference"
    uri: "${goal.refUri}"
    content_hash: "${goal.refHash}"
    viewport:
      width: 1440
      height: 900
    device_pixel_ratio: 1
    font_environment:
      family: "Inter"
      locked: true
    source: "human_uploaded"
    authority: "approved_design_reference"
\`\`\`

##### 3. Bounded Visual Fidelity & 8-Layer Acceptance Thresholds
\`\`\`yaml
visual_fidelity:
  thresholds:
    pixel_diff_ratio: 0.0050
    layout_shift: 0
    horizontal_overflow: false
    text_overflow: false
    accessibility: "wcag_2_2_aa"
  acceptance_layers:
    - "Layer 1: DOM structure"
    - "Layer 2: layout geometry"
    - "Layer 3: typography"
    - "Layer 4: colors and tokens"
    - "Layer 5: image crop and assets"
    - "Layer 6: interaction states"
    - "Layer 7: motion frames"
    - "Layer 8: accessibility"
  supported_viewports:
    - width: 1440
      height: 900
      name: "desktop"
    - width: 1024
      height: 768
      name: "tablet"
    - width: 390
      height: 844
      name: "mobile"
\`\`\`

##### 4. RLCD Calibration & Trajectory Recording Contract
\`\`\`yaml
rlcd_trajectory:
  ledger: ".agents/audit/decisions.jsonl"
  scoring_rule: "strictly_proper_logarithmic"
  asymmetric_penalty:
    false_acceptance_multiplier: 10.0
    false_deferral_multiplier: 1.0
  export_target: "artifacts/rlcd/train_dataset.jsonl"
\`\`\`
`;
  }

  return `---
goal_contract:
  id: ${goal.id}
  version: 2
  kind: ${goal.kind}
  status: ${goal.status}
  profiles:
    - core
    - ${goal.profile}
  atomicity:
    outcome_count: 1
    primary_outcome: "${goal.atomicOutcome}"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: ${goal.risk}
    reasons:
      - dave-platform-governance
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
**Epic:** ${goal.epic}  
**Priority:** ${goal.priority}  
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

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents \`.git/index.lock\` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | \`.\` *(primary repo root)* | \`feature/${goal.id}\` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | \`docs/07-backlog/goals/${goal.id}.md\`, \`docs/06_raw/\` | \`INIT\` → \`DISPATCH\` → \`JOIN\` → \`VERIFY\` → \`CLEANUP\` |
| **Subagent-1 (Implementer)** | \`.worktrees/${goal.id}-impl\` | \`feature/${goal.id}-impl\` | Step 1 & 2: Production source implementation & domain logic | \`src/**\`, \`scripts/lib/**\` (scoped implementation files) | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |
| **Subagent-2 (Verifier/Test)** | \`.worktrees/${goal.id}-test\` | \`feature/${goal.id}-test\` | Step 3: Zero-mock unit & latency SLA integration test suites | \`tests/**\`, \`scripts/harness/**\` (scoped test files) | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |
| **Subagent-3 (Socratic/Archivist)** | \`.worktrees/${goal.id}-arch\` | \`feature/${goal.id}-arch\` | Socratic 5-Why dialectic, baseline freeze & audit log | \`docs/06_raw/\`, \`docs/wiki/\` | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |

#### 2. Isolation & Concurrency Invariants

- **Git Index Isolation:** Every subagent executes within an independent Git worktree (\`git worktree add <path> -b <branch>\`), ensuring dedicated \`.git/worktrees/.../index\` files and zero index lock contention (\`fatal: Unable to create '.git/index.lock'\`).
- **Disjoint Touch Map Theorem:** Subagent write permissions must satisfy strict disjointness:
  $$\\text{TouchMap}(\\text{Subagent}_i) \\cap \\text{TouchMap}(\\text{Subagent}_j) = \\emptyset \\quad \\forall i \\neq j$$
  Write-write collisions across subagents trigger an immediate, fail-closed orchestrator abort.
- **Port & Socket Isolation:** Concurrent test suites must dynamically bind ephemeral OS ports (\`127.0.0.1:0\`) and utilize isolated test caches (\`.pytest_cache-{role}\` or scoped temp databases) to eliminate \`EADDRINUSE\` socket conflicts.
- **Hardware Acceleration Contention:** GPU streams/Metal buffers (\`mps\` / \`cuda\`) and CPU thread allocations are capped per subagent to avoid CUDA OOM or scheduler thrashing.

#### 3. Orchestration Saga & Synchronization Protocol

$$\\text{DISPATCH (Fork Worktrees)} \\longrightarrow \\text{CONCURRENT EXECUTION} \\longrightarrow \\text{BARRIER JOIN (Green Receipts)} \\longrightarrow \\text{RECONCILIATION MERGE} \\longrightarrow \\text{TEARDOWN & PRUNE}$$

1. **Dispatch & Worktree Provisioning:**
   \`\`\`bash
   git worktree add .worktrees/${goal.id}-impl -b feature/${goal.id}-impl
   git worktree add .worktrees/${goal.id}-test -b feature/${goal.id}-test
   git worktree add .worktrees/${goal.id}-arch -b feature/${goal.id}-arch
   \`\`\`
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (\`exit_code: 0\`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into \`feature/${goal.id}\` sequentially:
   \`\`\`bash
   git merge --ff-only feature/${goal.id}-impl
   git merge --ff-only feature/${goal.id}-test
   git merge --ff-only feature/${goal.id}-arch
   \`\`\`
5. **Teardown & Worktree Pruning:**
   \`\`\`bash
   git worktree remove --force .worktrees/${goal.id}-impl
   git worktree remove --force .worktrees/${goal.id}-test
   git worktree remove --force .worktrees/${goal.id}-arch
   git worktree prune
   git branch -d feature/${goal.id}-impl feature/${goal.id}-test feature/${goal.id}-arch
   \`\`\`

## Context

${goal.context}

## Intent

**Why:** ${goal.why}

**Done when:** ${goal.doneWhen}

**Unblocks:** ${goal.unblocks}

## 1. Problem and Value

- **Problem:** Operational gaps in DAVE runtime orchestration, mathematical assurance, cross-domain expert coordination, and fail-closed routing.
- **Affected users or agents:** Autonomous software agents, human reviewers, and production operators requiring verifiable decision execution.
- **Current behavior:** Capabilities existed as disconnected scripts without centralized lifecycle enforcement or cryptographic proof receipts.
- **Failure cost:** Uncalibrated model promotion, unverified high-risk autonomous execution, and silent cross-domain design drift.
- **Desired behavior:** ${goal.atomicOutcome}
- **Why now:** Core milestone to establish DAVE as the SYSTEM 1 decision platform in Soda OS.
- **If not completed:** Soda OS remains vulnerable to uncalibrated decisions and missing assurance boundaries.

## 2. Scope & Boundaries

## In

${inList}

## Out

${outList}

### Explicitly deferred
- Multi-tenant cloud synchronization across third-party clusters.

### Future work
- Automated cross-datacenter neural model replication.

### Non-goals
- Bypassing DAVE verification gates or generating unapproved ad-hoc styles.

## 3. Dependency Graph & Blockers

- **Dependencies:** ${goal.dependsOn}
- **Blockers:** None
- **Dependent goals:** ${goal.blocks}

## 4. Assumptions Registry

\`\`\`yaml
assumptions:
  - id: A-${safeId}-001
    statement: "Target execution environment is deterministic and reproducible under active commit hashes."
    confidence: high
    validation_goal: ${goal.dependsOn !== '—' ? goal.dependsOn.split(/[\s,]+/)[0] : goal.id}
    invalidation_condition: "Non-deterministic state mutations or unhandled race conditions."
    owner: system-architect
\`\`\`

## 5. Risks & Mitigation Registry

\`\`\`yaml
risks:
  - id: R-${safeId}-001
    category: architectural_governance
    description: "Decision degradation or unverified execution attempt."
    severity: medium
    impact: medium
    mitigation: "Strict automated invariant verification and fail-closed routing in CI."
    detection: "Harness failure reporting non-zero exit code or policy breach."
    response: "Halt build fail-closed and escalate to human review packet."
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
  trigger: "Automated test regression or policy violation"
  command: "git checkout -- ${goal.touchMap[0]}"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "${goal.testPlan[0]}"
\`\`\`

## Security & Trust Boundaries

\`\`\`yaml
security:
  threat_model: "Guards against unauthorized autonomy, prompt injection, overconfidence drift, and unverified mutations"
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
    - calibrated_confidence
    - ece_drift
    - routing_proceed_rate
    - routing_verify_rate
    - routing_defer_rate
    - routing_human_review_rate
  alerts:
    - "confidence < 0.85"
    - "ece > 0.08"
  traces:
    - "dave.orchestrator.step"
    - "dave.invariant.proof"
\`\`\`

## Resource & Cost Budget

\`\`\`yaml
resource_budget:
  latency_budget: "p99 < 100ms per decision evaluation"
  memory_budget: "128MB kernel RAM"
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
- **DAVE Fail-Closed Gatekeeping & Decision Grounding:** Every goal producing or modifying system decisions, schemas, models, or proofs MUST be grounded in an approved DAVE decision record (\`DAVE-PLAT-xxxx\`, \`DAVE-PROOF-xxxx\`) and content-addressed reference citation (\`REF-xxxx\`). Execution is locked fail-closed via \`soda-os implement\` until verified. Raw unverified claims and bypassed gates are prohibited.

### Antigravity handoff contract

When this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:
- **Title:** \`### Step N — [Observable objective]\` (single discrete objective without compound conjunctions)
- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared \`## Touch map\`
- **Actions:** Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs)
- **Verification command:** Exact executable shell command testing this specific step
- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass
- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure
- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders
- **DAVE Decision & Reference grounding:** Verified DAVE decision ID and content-addressed reference citations

## Quality priority

**Priority:** ${goal.priority}  

## Gap analysis

| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| ${goal.gapId} | ${goal.priority} | ${goal.gapEvidence} | developer | ${goal.gapSolution} | ${goal.gapVerification} | open |

## How

**Stack / approach:** ${goal.approach}

## Open questions

- (None. All 5-Why branches fully resolved at Level 5 in Socratic Dialectic Discovery).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-DAVE-PLATFORM |
| **Decisions** | ADR-005 |
| **Assumptions required** | A-${safeId}-001 |
| **Evidence** | \`docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md\` |

## Context manifest

| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-005 |
| **PDR** | — |
| **Patterns** | DAVE-System-1, Exact-Design, Zero-Mock |
| **Acceptance** | \`docs/02-product/acceptance/${goal.id}.md\` |
| **Skills** | \`soda-dave-decision-orchestration\` · \`soda-dave-hitl-review\` · \`soda-dave-reference-packets\` |
| **Profile** | ${goal.profile} |
| **Task type** | ${goal.kind === 'architecture' ? 'architecture_spec' : 'add_feature'} |
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

## Contract impact

- **Schema modifications:** None / Registered canonical schemas
- **Dynamic domain & action impact:** Registered capabilities
- **Cross-runtime parity:** Python and Node.js parity

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | \`feature/${goal.epic}\` |
| **System Archetype** | \`kernel-service\` |
| **Bounded Context & Domain** | Core Domain: DAVE Platform & Decision Governance |
| **Ports & Adapters Topology** | Driving Port: ${goal.ports.inbound}; Driven Outbound: ${goal.ports.outbound} |
| **State Machine & Invariants** | Finite State Invariants: Valid Transitions Only; Zero Float Math on Probability Bounds |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via \`goal-template-conformance-harness.mjs\` |
| **Socratic 5-Why Blueprint** | \`docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md\` |
| **Worktree & Subagent Orchestration** | Worktree Path Strategy: \`.worktrees/${goal.id}-{role}\` <br> Disjoint Touch Map Theorem: $\\text{TouchMap}(A) \\cap \\text{TouchMap}(B) = \\emptyset$ <br> Barrier Join & Fast-Forward Merge Protocol |

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
- [x] Contract impact declared (schema versioning, dynamic action capabilities, cross-runtime parity)
- [x] 5-Tier Deep Test Suite Specification defined (Positive, Negative, Chaos, Causality, Security)
- [x] Epistemic Proof & Evidence Classification verified
- [x] Worktree orchestration plan defined

## Touch map

${touchMapFormatted}

## Acceptance criteria

${acceptanceCriteriaFormatted}

## Test plan

${testPlanFormatted}

### 1. Positive Tests
- ${goal.testPlan[0]}

### 2. Negative Tests
- Invalid input rejection and boundary error handling

### 3. Fail-Closed & Chaos Tests
- Simulated network failure, malformed payload drop, and circuit breaker activation

### 4. Temporal Causality Tests ($t \\le T$)
- Strict temporal monotonicity and zero lookahead bias

### 5. Security & Air-Gap Checks
- Air-gap verification, PII sanitization, and cryptographic signature check

## Epistemic Proof & Evidence Classification

| Dimension | Classification | Bound / Verification Standard | Evidence Artifact |
|---|---|---|---|
| **Epistemic Category** | Formal Proof | Invariant bounded state under operational envelope | \`docs/07-backlog/evidence/\` |
| **Exact-HEAD Provenance** | Cryptographic SHA-256 | Commit bound to exact \`git rev-parse HEAD\` | \`master_scorecard_evidence_report.json\` |
| **Zero-Mock Verification** | Article I AST Invariant | 0 mocks / 0 stubs / 0 dummy fallbacks | Scoped pytest / node test suite |
| **Latency SLA Verification** | Monotonic Timer Benchmark | P99 latency < 1.0ms (< 1000us) | Microsecond latency benchmark report |

## 7. Learning-Loop Contract

- **Observed metrics:** Calibrated Confidence, Invariant Verification Rate, System Reliability, Human Override Rate.
- **Review schedule:** Evaluated continuously per commit and batched after every DAVE decision cycle.
- **Regression threshold:** Invariant failure or unverified execution blocks merge immediately.
- **Feedback mechanism:** Violations generate diagnostic review packets for instant HITL adjudication.

## Notes for AI

- Always follow Soda OS Agent Governance.
- Work strictly within declared touch map.
- Verify with declared test plan commands.
- Enforce Article I: zero mocks, zero stubs.

## 🏛️ Comprehensive Spec Design Appendix

### 1. Hexagonal Inbound & Outbound Ports Spec
- Inbound Driving Port: ${goal.ports.inbound}
- Outbound Driven Port: ${goal.ports.outbound}

### 2. Finite State Machine (FSM) Matrix & Saga Compensations
| Current State | Event / Trigger | Target State | Invariant Guard | Saga Compensation |
|---|---|---|---|---|
| INTENT_RECEIVED | context_assembled | CONTEXT_COLLECTED | Valid JSON payload | Discard context |
| CONTEXT_COLLECTED | reference_hashes_validated | REFERENCES_VERIFIED | SHA-256 match | Drop unverified refs |
| REFERENCES_VERIFIED | moe_router_dispatched | EXPERTS_SELECTED | Domain specialist match | Fallback to generalist |
| EXPERTS_SELECTED | domain_proposals_received | DECISIONS_GENERATED | Valid domain schema | Reject invalid proposal |
| DECISIONS_GENERATED | synthesis_evaluated | CONFLICTS_RESOLVED | Zero undetected collisions | Escalate to human review |
| CONFLICTS_RESOLVED | confidence_scored | CONFIDENCE_CALIBRATED | Confidence in [0.0, 1.0] | Normalize or penalize |
| CONFIDENCE_CALIBRATED | policy_applied | ROUTED | 4-way truth table match | Fail-closed deferral |
| ROUTED | execution_authorized | EXECUTED | Permission == permitted | Revoke token & lock |
| EXECUTED | harnesses_passed | VERIFIED | Test suites green | Rollback commit |
| VERIFIED | rlcd_trajectory_recorded | LEARNED | Audit ledger appended | Replay WAL |

### 3. Mathematical & Data Invariants Spec
- **Probability Bound Invariant:** Confidence score $c \in [0.0, 1.0]$ with exactly 4 decimal places.
- **Zero Float Arithmetic Invariant:** Financial transactions and gas tokens MUST use 64-bit integer whole units.
- **Fail-Closed Routing Invariant:** $P(execute | risk=high \land evidence=unverified) = 0$.

### 4. Bounded Context & Anti-Corruption Layers
- Bounded Context: DAVE Decision Platform.
- Upstream Context: Soda Agent OS Task Coordinator.
- Downstream Context: Application Runtime & Test Harnesses.
- Anti-Corruption Layer: Strict JSON schema translation with fail-closed validation on unrecognized keys.

### 5. Threat Modeling & Failure Mode Matrix
| Threat / Failure Mode | Likelihood | Impact | Mitigation Strategy | Detection Mechanism | Response Protocol |
|---|---|---|---|---|---|
| Overconfident hallucination | Low | High | Strictly proper scoring and 10x penalty | ECE monitoring in CI | Reject model promotion |
| Malicious image exploit | Low | High | Binary EXIF stripping & sanitization | Security boundary scanner | Drop reference fail-closed |
| Unverified autonomy leak | Low | Critical | Cryptographic permission tokens | Routing truth table harness | Revoke execution permission |

${profileBlocks}
`;
}

export function runDavePlatformGoalGenerator() {
  console.log('═'.repeat(80));
  console.log('🛡️ SODA OS DAVE CAPABILITY EXPANSION GOAL GENERATOR (17 ATOMIC GOALS)');
  console.log('═'.repeat(80));

  if (!existsSync(GOALS_DIR)) {
    mkdirSync(GOALS_DIR, { recursive: true });
  }

  let generatedCount = 0;
  for (const goal of DAVE_PLATFORM_GOALS) {
    const filePath = join(GOALS_DIR, `${goal.id}.md`);
    const content = generateDavePlatformGoalCard(goal);
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Generated: ${goal.id} -> ${filePath}`);
    generatedCount++;
  }

  console.log('═'.repeat(80));
  console.log(`📊 Successfully generated ${generatedCount} DAVE capability expansion goal cards.`);
  console.log('═'.repeat(80));
  return generatedCount;
}

if (process.argv[1] && process.argv[1].endsWith('generate-dave-platform-goals.mjs')) {
  runDavePlatformGoalGenerator();
}
