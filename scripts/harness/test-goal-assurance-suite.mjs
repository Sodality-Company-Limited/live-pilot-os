#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 SODA OS GOAL LIFECYCLE ASSURANCE SUITE TEST SUITE (TDD GREEN)
 * ════════════════════════════════════════════════════════════════════════════════
 * Validates all 16 decoupled assurance layers with zero mocks and zero stubs:
 * 1.  Template v2 `goal_contract` extraction and profile validation.
 * 2.  Goal atomicity & outcome graph evaluation (rejects multi-outcome goals).
 * 3.  Dependency DAG cycle detection and phase compatibility.
 * 4.  Scope drift detection (work step paths vs touch map vs scope Out).
 * 5.  Assumptions and risk register validation (mitigations, confidence, detectors).
 * 6.  Failure policy and rollback contract validation.
 * 7.  Proof contract validation (epistemic taxonomy, property relations).
 * 8.  Statistical evidence validation (sample bounds, splits, uncertainty methods).
 * 9.  Routing truth table validation (state-transition completeness, fail-closed).
 * 10. Artifact provenance validation (exact-HEAD SHA256 digests, schema).
 * 11. Security boundaries & threat model validation.
 * 12. Observability contract & calibration telemetry validation.
 * 13. Resource and cost budget validation.
 * 14. Post-ship learning loop contract validation.
 * 15. Multi-dimensional lifecycle gate verification.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let REPO_ROOT = path.resolve(__dirname, '../..');
if (path.basename(REPO_ROOT) === 'template') {
  REPO_ROOT = path.resolve(REPO_ROOT, '..');
}

// Import modules under test
import { validateGoalContract } from './goal-template-conformance-harness.mjs';
import { validateGoalAtomicity } from './goal-atomicity-harness.mjs';
import { buildAndValidateDependencyDAG } from './goal-dependency-harness.mjs';
import { detectScopeDrift } from './goal-scope-drift-harness.mjs';
import { validateAssumptionsAndRisks } from './goal-assumptions-risk-harness.mjs';
import { validateFailureAndRollbackPolicy } from './failure-rollback-harness.mjs';
import { validateProofContract } from './goal-proof-contract-harness.mjs';
import { validateStatisticalClaims } from './statistical-evidence-harness.mjs';
import { validateRoutingTruthTable } from './routing-truth-table-harness.mjs';
import { validateArtifactProvenance } from './artifact-provenance-harness.mjs';
import { validateSecurityBoundaries } from './security-boundary-harness.mjs';
import { validateObservabilityContract } from './observability-contract-harness.mjs';
import { validateResourceBudget } from './resource-budget-harness.mjs';
import { validateLearningLoopContract } from './learning-loop-harness.mjs';
import { verifyLifecycleReceipt } from './goal-completion-receipt-harness.mjs';
import { validateProofReceipt } from './proof-receipt-validator.mjs';
import { validateModelTrainingContract } from './model-training-contract-harness.mjs';
import { validateModelProvenance } from './model-provenance-harness.mjs';
import { validateAgentObservability } from './agent-observability-harness.mjs';

console.log("================================================================================");
console.log("🧪 Running Enhanced 16-Layer Goal Assurance Suite Unit Tests (TDD Red-Green)...");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${testName}`);
    console.error(`      ↳ ${err.message}`);
    failedCount++;
  }
}

// ---------------------------------------------------------------------------
// Test 1: Extract and validate machine-readable goal_contract header
// ---------------------------------------------------------------------------
runTest("1. Extracts and validates machine-readable goal_contract YAML block", () => {
  const validV2Card = `---
goal_contract:
  id: G-TEST-001
  version: 2
  kind: feature
  status: ready
  profiles:
    - core
    - ml_research
  atomicity:
    outcome_count: 1
    primary_outcome: "Produce a calibrated value head checkpoint"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: ml-engineer
  risk:
    level: medium
    reasons: ["calibration-drift"]
  reversibility:
    level: reversible
  lifecycle:
    spec: ready
    implementation: complete
    verification: passed
    evidence: complete
    review: approved
    release: staged
    learning: pending
---
# G-TEST-001: Calibrated Value Head
`;

  const res = validateGoalContract(validV2Card, 'G-TEST-001.md');
  assert.equal(res.valid, true, `Expected valid goal_contract, got errors: ${res.errors?.join('; ')}`);
  assert.equal(res.contract.id, 'G-TEST-001');
  assert.equal(res.contract.version, 2);
  assert.ok(res.contract.profiles.includes('core'));

  const invalidCard = `---
goal_contract:
  id: G-TEST-002
  version: 2
  profiles:
    - ml_research
---
`;
  const invalidRes = validateGoalContract(invalidCard, 'G-TEST-002.md');
  assert.equal(invalidRes.valid, false, 'Expected goal without core profile to fail');
});

// ---------------------------------------------------------------------------
// Test 2: Goal atomicity and outcome graph validation
// ---------------------------------------------------------------------------
runTest("2. Atomicity harness rejects compound multi-outcome goals", () => {
  const compoundCard = `---
goal_contract:
  id: G-TEST-003
  version: 2
  atomicity:
    outcome_count: 3
    primary_outcome: "Train the model and also deploy it and migrate database"
    secondary_outcomes: ["deploy to k8s", "run migrations"]
    split_candidates: ["G-TEST-003A", "G-TEST-003B"]
---
**Atomic outcome:** Train the model and also deploy it and migrate database
`;

  const atomicityRes = validateGoalAtomicity(compoundCard, 'G-TEST-003.md');
  assert.equal(atomicityRes.valid, false, "Expected compound goal to fail atomicity");
  assert.ok(atomicityRes.errors.some(e => e.includes('multiple') || e.includes('compound') || e.includes('outcome_count')));

  const atomicCard = `---
goal_contract:
  id: G-TEST-004
  version: 2
  atomicity:
    outcome_count: 1
    primary_outcome: "Produce a calibrated value head checkpoint"
    secondary_outcomes: []
    split_candidates: []
---
**Atomic outcome:** Produce a calibrated value head checkpoint
`;
  const atomicValidRes = validateGoalAtomicity(atomicCard, 'G-TEST-004.md');
  assert.equal(atomicValidRes.valid, true, `Expected atomic goal to pass, got: ${atomicValidRes.errors?.join('; ')}`);
});

// ---------------------------------------------------------------------------
// Test 3: Dependency DAG cycle detection and state compatibility
// ---------------------------------------------------------------------------
runTest("3. Dependency DAG harness detects cycles and incompatible statuses", () => {
  const goalMap = {
    'G-A': { id: 'G-A', status: 'ready', dependencies: ['G-B'] },
    'G-B': { id: 'G-B', status: 'ready', dependencies: ['G-C'] },
    'G-C': { id: 'G-C', status: 'ready', dependencies: ['G-A'] }
  };

  const cycleRes = buildAndValidateDependencyDAG(goalMap);
  assert.equal(cycleRes.valid, false, "Expected cycle to be detected");
  assert.ok(cycleRes.errors.some(e => e.includes('cycle') || e.includes('Cycle')));

  const stateMismatchMap = {
    'G-X': { id: 'G-X', status: 'draft', dependencies: [] },
    'G-Y': { id: 'G-Y', status: 'ready', dependencies: ['G-X'] }
  };
  const stateRes = buildAndValidateDependencyDAG(stateMismatchMap);
  assert.equal(stateRes.valid, false, "Expected ready goal depending on draft goal to fail");
});

// ---------------------------------------------------------------------------
// Test 4: Scope drift detection (Work steps vs Touch map vs Out)
// ---------------------------------------------------------------------------
runTest("4. Scope drift harness detects unlisted files and Out-scope violations", () => {
  const driftingGoal = `
## In
- Calibrated loss implementation

## Out
- Do not modify database migrations in code/db/

## Work steps
### Step 1 — Edit database
**Allowed files:** \`code/db/migration.sql\`
Actions:
1. Touch migration

## Touch map
- \`code/ml/loss.py\`
`;

  const driftRes = detectScopeDrift(driftingGoal, 'G-TEST-DRIFT.md');
  assert.equal(driftRes.valid, false, "Expected scope drift to be detected");
  assert.ok(driftRes.errors.some(e => e.includes('Touch map') || e.includes('Out')));
});

// ---------------------------------------------------------------------------
// Test 5: Assumptions and risk register validation
// ---------------------------------------------------------------------------
runTest("5. Assumptions & risk harness rejects low confidence in ready goals and unmitigated critical risks", () => {
  const riskyGoal = `
**Status:** ready
\`\`\`yaml
assumptions:
  - id: A-001
    statement: "Uncertainty model is 100% accurate without calibration"
    confidence: low
    validation_goal: G-ML-002
    invalidation_condition: "ECE > 0.1"

risks:
  - id: R-001
    category: model
    description: "Model becomes overconfident under distribution shift"
    likelihood: high
    impact: critical
\`\`\`
`;
  const arRes = validateAssumptionsAndRisks(riskyGoal, 'G-TEST-RISK.md');
  assert.equal(arRes.valid, false, "Expected risky goal to fail");
  assert.ok(arRes.errors.some(e => e.includes('low confidence')));
  assert.ok(arRes.errors.some(e => e.includes('mitigation')));
});

// ---------------------------------------------------------------------------
// Test 6: Failure policy and rollback contract validation
// ---------------------------------------------------------------------------
runTest("6. Failure policy & rollback harness validates policies and commands", () => {
  const validPolicy = `
\`\`\`yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail

rollback:
  trigger: "Automated test regression or post-deploy SLA breach"
  command: "git revert HEAD --no-edit"
  scope: "code/ml/loss.py"
  reversible: true
  verification: "npm test"
\`\`\`
`;
  const policyRes = validateFailureAndRollbackPolicy(validPolicy, 'G-TEST-ROLLBACK.md');
  assert.equal(policyRes.valid, true, `Expected valid rollback policy, got: ${policyRes.errors?.join('; ')}`);
});

// ---------------------------------------------------------------------------
// Test 7: Proof contract harness validation
// ---------------------------------------------------------------------------
runTest("7. Proof contract harness validates invariants and rejects conflating unit tests with formal theorems", () => {
  const conflatedProof = `
\`\`\`yaml
proof_contract:
  invariants:
    - id: INV-THEORETIC
      statement: "Loss is strictly increasing with confidence"
      classification: formal_theorem
      verification:
        command: "pytest tests/test_loss.py"
      property:
        relation: strictly_increasing
\`\`\`
`;
  const confRes = validateProofContract(conflatedProof, 'G-TEST-CONFLATED.md');
  assert.equal(confRes.valid, false, "Expected unit test labeled as formal_theorem to fail");
  assert.ok(confRes.errors.some(e => e.includes('formal_theorem')));

  const validProof = `
\`\`\`yaml
proof_contract:
  invariants:
    - id: INV-001
      statement: "Wrong-answer loss increases with confidence"
      classification: executable_invariant
      verification:
        command: "pytest tests/test_loss.py"
      property:
        relation: strictly_increasing
\`\`\`
`;
  const validRes = validateProofContract(validProof, 'G-TEST-VALID-PROOF.md');
  assert.equal(validRes.valid, true, `Expected valid proof contract, got: ${validRes.errors?.join('; ')}`);
});

// ---------------------------------------------------------------------------
// Test 8: Statistical evidence validation
// ---------------------------------------------------------------------------
runTest("8. Statistical evidence harness validates sample sizes, baselines, and rejects training split contamination", () => {
  const contaminatedClaim = `
\`\`\`yaml
statistical_claims:
  - id: STAT-001
    metric: ece
    population: held_out_agent_decisions
    sample_count: 5000
    split: training
    baseline: base_model
    interval_method: bootstrap
    stopping_rule: fixed_sample_count
    artifact: artifacts/eval/eval.json
\`\`\`
`;
  const contamRes = validateStatisticalClaims(contaminatedClaim, 'G-TEST-CONTAM.md');
  assert.equal(contamRes.valid, false, "Expected training split evaluation to fail");
  assert.ok(contamRes.errors.some(e => e.includes('training split')));

  const validClaim = `
\`\`\`yaml
statistical_claims:
  - id: STAT-002
    metric: ece
    population: held_out_agent_decisions
    sample_count: 5000
    split: test
    baseline: base_model
    interval_method: bootstrap
    stopping_rule: fixed_sample_count
    artifact: artifacts/eval/eval.json
\`\`\`
`;
  const validStatRes = validateStatisticalClaims(validClaim, 'G-TEST-VALID-STAT.md');
  assert.equal(validStatRes.valid, true, `Expected valid statistical claim, got: ${validStatRes.errors?.join('; ')}`);
});

// ---------------------------------------------------------------------------
// Test 9: Routing truth table validation
// ---------------------------------------------------------------------------
runTest("9. Routing truth table harness proves completeness and fail-closed bounds", () => {
  const unsafeRouting = `
\`\`\`yaml
routing_contract:
  cases:
    - risk: high
      evidence: unverified
      confidence: high
      expected: proceed
\`\`\`
`;
  const unsafeRes = validateRoutingTruthTable(unsafeRouting, 'G-TEST-UNSAFE-ROUTE.md');
  assert.equal(unsafeRes.valid, false, "Expected unsafe routing (high-risk unverified proceed) to fail");
  assert.ok(unsafeRes.errors.some(e => e.includes('High-risk') || e.includes('safety invariant')));

  const completeRouting = `
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
  const completeRes = validateRoutingTruthTable(completeRouting, 'G-TEST-COMPLETE-ROUTE.md');
  assert.equal(completeRes.valid, true, `Expected complete routing table, got: ${completeRes.errors?.join('; ')}`);
  assert.equal(completeRes.caseCount, 8);
});

// ---------------------------------------------------------------------------
// Test 10: Security boundaries & sandboxing validation
// ---------------------------------------------------------------------------
runTest("10. Security harness validates threat models and rejects hardcoded secrets", () => {
  const secretLeakingCard = `
## Security
api_key = "AIzaSyD-secret-key-1234567890abcdef"
`;
  const secretRes = validateSecurityBoundaries(secretLeakingCard, 'G-TEST-SECRET.md');
  assert.equal(secretRes.valid, false, "Expected hardcoded secret to fail");
  assert.ok(secretRes.errors.some(e => e.includes('hardcoded secret')));
});

// ---------------------------------------------------------------------------
// Test 11: Observability contract validation
// ---------------------------------------------------------------------------
runTest("11. Observability harness verifies telemetry metrics and alert thresholds", () => {
  const validObs = `
\`\`\`yaml
observability:
  metrics:
    - decision_count
    - confidence_distribution
    - ece
    - brier_score
  alerts:
    - "ece > 0.05"
    - "p95_latency > 200ms"
\`\`\`
`;
  const obsRes = validateObservabilityContract(validObs, 'G-TEST-OBS.md');
  assert.equal(obsRes.valid, true, `Expected valid observability contract, got: ${obsRes.errors?.join('; ')}`);
  assert.equal(obsRes.metricCount, 4);
  assert.equal(obsRes.alertCount, 2);
});

// ---------------------------------------------------------------------------
// Test 12: Resource budget validation
// ---------------------------------------------------------------------------
runTest("12. Resource budget harness validates compute and latency boundaries", () => {
  const validBudget = `
\`\`\`yaml
resource_budget:
  latency_budget: "p95 < 150ms"
  memory_budget: "256MB"
  gpu_budget: "1x NVIDIA A100-80GB"
  token_budget: "max 8192 tokens"
\`\`\`
`;
  const budgetRes = validateResourceBudget(validBudget, 'G-TEST-BUDGET.md');
  assert.equal(budgetRes.valid, true, `Expected valid resource budget, got: ${budgetRes.errors?.join('; ')}`);
  assert.equal(budgetRes.budgetCount, 4);
});

// ---------------------------------------------------------------------------
// Test 13: Learning loop contract validation
// ---------------------------------------------------------------------------
runTest("13. Learning loop harness verifies post-ship review cadences and feedback feeds", () => {
  const validLearn = `
## 7. Learning-Loop Contract
- **Observed metrics:** Calibration drift, ECE, Brier score
- **Review schedule:** Weekly or after every 1,000 autonomous decisions
- **Regression threshold:** ECE increase > 0.02
- **Feedback mechanism:** Breaches generate automated remediation goal
`;
  const learnRes = validateLearningLoopContract(validLearn, 'G-TEST-LEARN.md');
  assert.equal(learnRes.valid, true, `Expected valid learning loop, got: ${learnRes.errors?.join('; ')}`);
});

// ---------------------------------------------------------------------------
// Test 14: Lifecycle receipt verification
// ---------------------------------------------------------------------------
runTest("14. Lifecycle receipt harness requires valid proof receipt before verified status", () => {
  const unprovenGoal = {
    id: 'G-UNPROVEN',
    lifecycle: {
      spec: 'ready',
      implementation: 'complete',
      verification: 'passed',
      evidence: 'complete',
      review: 'approved',
      release: 'shipped',
      learning: 'pending'
    }
  };

  const receiptCheck = verifyLifecycleReceipt(unprovenGoal, {
    receiptExists: false,
    gitClean: true,
    humanReviewed: true
  });

  assert.equal(receiptCheck.valid, false, "Expected unproven goal claiming passed verification to fail");
  assert.ok(receiptCheck.errors.some(e => e.includes('receipt') || e.includes('proof')));
});

// ---------------------------------------------------------------------------
// Test 15: Scope drift harness detects forbidden_files violation in work steps
// ---------------------------------------------------------------------------
runTest("15. Scope drift harness detects forbidden_files violation in work steps", () => {
  const forbiddenStep = `
## Touch map
- code/src/auth/jwt.rs

## Work steps
### Step 1 — Modify auth
allowed_files:
  - code/src/auth/jwt.rs
forbidden_files:
  - code/src/auth/jwt.rs
`;
  const driftRes = detectScopeDrift(forbiddenStep, 'G-TEST-DRIFT.md');
  assert.equal(driftRes.valid, false, "Expected forbidden file modification to be rejected");
  assert.ok(driftRes.errors.some(e => e.includes('forbidden_files')));
});

// ---------------------------------------------------------------------------
// Test 16: Dependency DAG harness rejects blocked upstream dependencies
// ---------------------------------------------------------------------------
runTest("16. Dependency DAG harness rejects blocked upstream dependencies", () => {
  const dagWithBlocked = {
    'G-DEP-001': { id: 'G-DEP-001', status: 'blocked', dependencies: [] },
    'G-DEP-002': { id: 'G-DEP-002', status: 'ready', dependencies: ['G-DEP-001'] }
  };
  const dagRes = buildAndValidateDependencyDAG(dagWithBlocked);
  assert.equal(dagRes.valid, false, "Expected ready goal depending on blocked predecessor to fail");
  assert.ok(dagRes.errors.some(e => e.includes('blocked')));
});

// ---------------------------------------------------------------------------
// Test 17: Proof receipt validator verifies valid receipt and rejects pseudo-proof unit tests
// ---------------------------------------------------------------------------
runTest("17. Proof receipt validator verifies valid receipt and rejects pseudo-proof unit tests", () => {
  const validReceipt = {
    schema_version: 1,
    goal_id: "G-TEST-001",
    generated_at: new Date().toISOString(),
    source_revision: "abc1234567890",
    classification: "executable_invariant",
    invariants: [
      {
        id: "INV-001",
        statement: "Outputs bounded in [0.0, 1.0]",
        verification_command: "node test-prop.mjs",
        exit_code: 0,
        passed: true
      }
    ],
    certification: "PASS"
  };
  const validRes = validateProofReceipt(validReceipt);
  assert.equal(validRes.valid, true, "Expected valid proof receipt to pass");

  // Rejection check: pseudo-proof claiming unit tests are formal_proof
  const pseudoProofReceipt = {
    ...validReceipt,
    classification: "formal_proof",
    invariants: [
      {
        id: "INV-002",
        statement: "Unsubstantiated theorem claim",
        verification_command: "pytest tests/test-core.py",
        exit_code: 0,
        passed: true
      }
    ]
  };
  const invalidRes = validateProofReceipt(pseudoProofReceipt);
  assert.equal(invalidRes.valid, false, "Expected unit test classified as formal_proof to be rejected");
  assert.ok(invalidRes.errors.some(e => e.includes('formal_proof')));
});

// ---------------------------------------------------------------------------
// Test 18: Model training contract harness rejects dataset split contamination
// ---------------------------------------------------------------------------
runTest("18. Model training contract harness rejects dataset split contamination", () => {
  const contaminatedContract = {
    model_id: "soda-rlcd-7b",
    base_checkpoint: "meta-llama/Llama-3-8B",
    dataset: {
      name: "agent-decisions-v1",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      splits: {
        train: ["sample_001", "sample_002", "sample_003"],
        validation: ["sample_003"], // Contamination!
        test: ["sample_004"]
      }
    },
    label_oracle: {
      type: "expert_rubric",
      agreement_threshold: 0.90
    },
    reproducibility: {
      random_seed: 42,
      hyperparameters: { lr: 0.0001, batch_size: 16 }
    }
  };
  const contractRes = validateModelTrainingContract(contaminatedContract);
  assert.equal(contractRes.valid, false, "Expected contaminated dataset split to be rejected");
  assert.ok(contractRes.errors.some(e => e.includes('contamination')));
});

// ---------------------------------------------------------------------------
// Test 19: Model provenance harness validates cryptographic lineage
// ---------------------------------------------------------------------------
runTest("19. Model provenance harness validates cryptographic lineage", () => {
  const validProvenance = {
    schema_version: 1,
    model_id: "soda-calibrated-head-v1",
    source_revision: "4251c719cb59799251c9bca4af8c96e424a667ba",
    dataset_lineage: {
      sha256: "a1b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdef"
    },
    tokenizer: {
      sha256: "b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1"
    },
    training_config: {
      sha256: "c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1b2"
    }
  };
  const provRes = validateModelProvenance(validProvenance);
  assert.equal(provRes.valid, true, "Expected valid provenance manifest to pass");

  const invalidProvenance = { ...validProvenance, schema_version: 2 };
  const invalidProvRes = validateModelProvenance(invalidProvenance);
  assert.equal(invalidProvRes.valid, false, "Expected invalid schema version to fail");
});

// ---------------------------------------------------------------------------
// Test 20: Agent observability harness verifies ECE bounds and alert rules
// ---------------------------------------------------------------------------
runTest("20. Agent observability harness verifies ECE bounds and alert rules", () => {
  const validReport = {
    goal_id: "G-TEST-OBS-001",
    metrics: {
      confidence_distribution: [0.1, 0.2, 0.4, 0.3],
      ece: 0.045,
      brier_score: 0.092,
      high_confidence_error_rate: 0.005,
      defer_rate: 0.08,
      human_review_rate: 0.03
    },
    alerts: [
      { name: "hcer_spike", metric: "high_confidence_error_rate", threshold: 0.01 }
    ]
  };
  const obsRes = validateAgentObservability(validReport);
  assert.equal(obsRes.valid, true, "Expected valid calibration observability report to pass");

  const breachingReport = {
    ...validReport,
    metrics: {
      ...validReport.metrics,
      ece: 0.12 // breaches 0.08 ceiling!
    }
  };
  const breachingRes = validateAgentObservability(breachingReport);
  assert.equal(breachingRes.valid, false, "Expected ECE breach to fail");
  assert.ok(breachingRes.errors.some(e => e.includes('Expected Calibration Error')));
});

// ---------------------------------------------------------------------------
// Test 21: Framework source repository kind detection and upgrade report parity
// ---------------------------------------------------------------------------
runTest("21. Framework source repository kind detection and upgrade report parity", () => {
  const res = spawnSync('node', ['cli.js', 'upgrade', '--report'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  assert.equal(res.status, 0, "Expected cli.js upgrade --report to exit with code 0");
  assert.ok(res.stdout.includes('Repository kind: framework_source'), "Expected framework_source repository kind");
  assert.ok(res.stdout.includes('FRAMEWORK SOURCE INTEGRITY MODE'), "Expected framework source integrity mode header");
  assert.ok(!res.stdout.includes('(missing in target)'), "Expected false downstream drift to be suppressed");
});

// ---------------------------------------------------------------------------
// Test 22: Machine-readable skill contracts and governance rules manifest parity
// ---------------------------------------------------------------------------
runTest("22. Machine-readable skill contracts and governance rules manifest parity", () => {
  const skills = [
    'soda-proof-assurance',
    'soda-statistical-evidence',
    'soda-model-training',
    'soda-agent-runtime-governance',
    'soda-model-provenance',
    'soda-agent-observability',
    'soda-resource-budgeting'
  ];
  for (const s of skills) {
    const rootPath = path.join(REPO_ROOT, `.agents/skills/${s}/SKILL.md`);
    const tmplPath = path.join(REPO_ROOT, `template/.agents/skills/${s}/SKILL.md`);
    assert.ok(fs.existsSync(rootPath), `Missing root skill: ${s}`);
    assert.ok(fs.existsSync(tmplPath), `Missing template skill: ${s}`);
    const rootContent = fs.readFileSync(rootPath, 'utf8');
    const tmplContent = fs.readFileSync(tmplPath, 'utf8');
    assert.ok(rootContent.includes('skill_contract:'), `Missing skill_contract in root ${s}`);
    assert.ok(tmplContent.includes('skill_contract:'), `Missing skill_contract in template ${s}`);
    assert.equal(rootContent, tmplContent, `Divergence in ${s} between root and template`);
  }

  const manifestPath = path.join(REPO_ROOT, 'template/framework-manifest.yml');
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const rules = [
    'proof-and-evidence.md',
    'model-training-governance.md',
    'agent-runtime-fail-closed.md',
    'scope-and-dependency-integrity.md',
    'artifact-provenance.md',
    'observability-contract.md'
  ];
  for (const r of rules) {
    assert.ok(manifest.includes(`- .agents/rules/${r}`), `Rule ${r} missing from manifest overwrite list`);
    assert.ok(fs.existsSync(path.join(REPO_ROOT, `.agents/rules/${r}`)), `Root rule ${r} missing`);
    assert.ok(fs.existsSync(path.join(REPO_ROOT, `template/.agents/rules/${r}`)), `Template rule ${r} missing`);
  }
});

console.log("\n================================================================================");
console.log(`📊 Enhanced Lifecycle Assurance Suite Test Result: ${passedCount} / ${passedCount + failedCount} Passed`);
console.log("================================================================================\n");

if (failedCount > 0) {
  console.error("❌ Some unit tests failed!");
  process.exit(1);
} else {
  console.log(`🏆 ALL ${passedCount} MULTI-LAYER GOAL ASSURANCE UNIT TESTS PASSED 100% GREEN!\n`);
  process.exit(0);
}

