#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GOAL LIFECYCLE ASSURANCE SUITE (MASTER RUNNER)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multi-Layer Goal Lifecycle Assurance & Formal Epistemic Governance
 * Purpose: Complete end-to-end assurance orchestrator executing the 15-harness family:
 *   Layer 1:  Template v2 Conformance & Machine-Readable Goal Contract
 *   Layer 2:  Semantic Goal Atomicity & Outcome Graph
 *   Layer 3:  Dependency DAG & State Compatibility
 *   Layer 4:  Scope Drift & Touch Map Integrity
 *   Layer 5:  Assumptions & Risk Register Governance
 *   Layer 6:  Failure Policy & Rollback Verification
 *   Layer 7:  Mathematical Proof Contract
 *   Layer 8:  Mathematical & Executable Invariant Proofs
 *   Layer 9:  Statistical Claims & Empirical Evidence
 *   Layer 10: Routing Truth Table & State-Transition Completeness
 *   Layer 11: Artifact Provenance & Exact-HEAD SHA256 Verification
 *   Layer 12: Security Boundaries & Zero-Trust Sandboxing
 *   Layer 13: Observability Contracts & Drift Telemetry
 *   Layer 14: Resource & Cost Budgets
 *   Layer 15: Post-Ship Learning Loop Contracts
 *   Layer 16: Multi-Dimensional Lifecycle Gates & Final Completion Receipt
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { execSync } from 'node:child_process';

// Import specialized sub-harness engines
import { validateGoalConformance, validateGoalContract } from './goal-template-conformance-harness.mjs';
import { validateGoalAtomicity } from './goal-atomicity-harness.mjs';
import { buildAndValidateDependencyDAG, loadGoalMapFromDirectory } from './goal-dependency-harness.mjs';
import { detectScopeDrift } from './goal-scope-drift-harness.mjs';
import { validateAssumptionsAndRisks } from './goal-assumptions-risk-harness.mjs';
import { validateFailureAndRollbackPolicy } from './failure-rollback-harness.mjs';
import { validateProofContract } from './goal-proof-contract-harness.mjs';
import { executeGoalInvariants, extractInvariantsFromGoal } from './mathematical-invariant-proof-harness.mjs';
import { validateStatisticalClaims } from './statistical-evidence-harness.mjs';
import { validateRoutingTruthTable } from './routing-truth-table-harness.mjs';
import { validateGoalArtifacts } from './artifact-provenance-harness.mjs';
import { validateSecurityBoundaries } from './security-boundary-harness.mjs';
import { validateObservabilityContract } from './observability-contract-harness.mjs';
import { validateResourceBudget } from './resource-budget-harness.mjs';
import { validateLearningLoopContract } from './learning-loop-harness.mjs';
import { verifyLifecycleReceipt } from './goal-completion-receipt-harness.mjs';

/**
 * Executes the complete 16-layer assurance audit on a single goal file.
 */
export async function assureGoal(filePath, options = {}) {
  const goalFilename = basename(filePath, '.md');
  const content = readFileSync(filePath, 'utf8');
  const results = {
    goal: goalFilename,
    path: filePath,
    passed: true,
    layers: {}
  };

  // Layer 1: Template Conformance & Goal Contract
  const confRes = validateGoalConformance(filePath);
  const contractRes = validateGoalContract(content, filePath);
  results.layers.layer1_conformance = {
    passed: confRes.valid,
    isV2: contractRes.isV2,
    contract: contractRes.contract,
    errors: confRes.errors
  };

  // Layer 2: Goal Atomicity
  const atomicityRes = validateGoalAtomicity(content, filePath);
  results.layers.layer2_atomicity = {
    passed: atomicityRes.valid,
    outcomeCount: atomicityRes.outcomeCount,
    primaryOutcome: atomicityRes.primaryOutcome,
    errors: atomicityRes.errors
  };

  // Layer 3: Dependency DAG
  const parentDir = resolve(filePath, '..');
  const goalsDir = basename(parentDir) === '_archived' ? resolve(parentDir, '..') : parentDir;
  const goalMap = loadGoalMapFromDirectory(goalsDir);
  const dagRes = buildAndValidateDependencyDAG(goalMap);
  results.layers.layer3_dependencies = {
    passed: dagRes.valid,
    errors: dagRes.errors.filter(e => e.includes(goalFilename))
  };

  // Layer 4: Scope Drift
  const driftRes = detectScopeDrift(content, filePath);
  results.layers.layer4_scope_drift = {
    passed: driftRes.valid,
    touchMapPaths: driftRes.touchMapPaths,
    workStepPaths: driftRes.workStepPaths,
    errors: driftRes.errors
  };

  // Layer 5: Assumptions & Risks
  const arRes = validateAssumptionsAndRisks(content, filePath);
  results.layers.layer5_assumptions_risks = {
    passed: arRes.valid,
    assumptionCount: arRes.assumptionCount,
    riskCount: arRes.riskCount,
    errors: arRes.errors
  };

  // Layer 6: Failure Policy & Rollback
  const rollbackRes = validateFailureAndRollbackPolicy(content, filePath);
  results.layers.layer6_failure_rollback = {
    passed: rollbackRes.valid,
    errors: rollbackRes.errors
  };

  // Layer 7: Proof Contract Schema
  const proofContractRes = validateProofContract(content, filePath);
  results.layers.layer7_proof_contract = {
    passed: proofContractRes.valid,
    invariantCount: proofContractRes.invariantCount,
    errors: proofContractRes.errors
  };

  // Layer 8: Mathematical & Statistical Invariant Execution
  const invariants = extractInvariantsFromGoal(filePath);
  let mathPassed = true;
  let invariantResults = [];
  if (invariants.length > 0) {
    const mathReport = await executeGoalInvariants({
      goalId: goalFilename,
      invariants,
      goalPath: filePath
    });
    mathPassed = mathReport.overall_passed;
    invariantResults = mathReport.results;
  }
  results.layers.layer8_mathematical_proof = {
    passed: mathPassed,
    invariantsCount: invariants.length,
    results: invariantResults
  };

  // Layer 9: Statistical Claims & Empirical Evidence
  const statRes = validateStatisticalClaims(content, filePath);
  results.layers.layer9_statistical_evidence = {
    passed: statRes.valid,
    claimCount: statRes.claimCount,
    errors: statRes.errors
  };

  // Layer 10: Routing Truth Table & State Machine
  const routingRes = validateRoutingTruthTable(content, filePath);
  results.layers.layer10_routing_truth_table = {
    passed: routingRes.valid,
    caseCount: routingRes.caseCount,
    errors: routingRes.errors
  };

  // Layer 11: Artifact Provenance
  const artRes = validateGoalArtifacts(content, filePath, { verifyGitHead: true });
  results.layers.layer11_artifact_provenance = {
    passed: artRes.valid,
    artifactCount: artRes.artifactCount,
    verifiedCount: artRes.verifiedCount,
    errors: artRes.errors
  };

  // Layer 12: Security Boundaries & Sandboxing
  const secRes = validateSecurityBoundaries(content, filePath);
  results.layers.layer12_security_boundaries = {
    passed: secRes.valid,
    domainsCovered: secRes.domainsCovered,
    errors: secRes.errors
  };

  // Layer 13: Observability & Drift Telemetry
  const obsRes = validateObservabilityContract(content, filePath);
  results.layers.layer13_observability = {
    passed: obsRes.valid,
    metricCount: obsRes.metricCount,
    alertCount: obsRes.alertCount,
    errors: obsRes.errors
  };

  // Layer 14: Resource & Cost Budgets
  const budgetRes = validateResourceBudget(content, filePath);
  results.layers.layer14_resource_budget = {
    passed: budgetRes.valid,
    budgetCount: budgetRes.budgetCount,
    errors: budgetRes.errors
  };

  // Layer 15: Post-Ship Learning Loop
  const learnRes = validateLearningLoopContract(content, filePath);
  results.layers.layer15_learning_loop = {
    passed: learnRes.valid,
    errors: learnRes.errors
  };

  // Layer 16: Multi-Dimensional Lifecycle Receipts
  let lifecyclePassed = true;
  let lifecycleErrors = [];
  if (contractRes.contract && contractRes.contract.lifecycle) {
    const lifeRes = verifyLifecycleReceipt(contractRes.contract);
    lifecyclePassed = lifeRes.valid;
    lifecycleErrors = lifeRes.errors;
  }
  results.layers.layer16_lifecycle = {
    passed: lifecyclePassed,
    errors: lifecycleErrors
  };

  // Evaluate overall goal status across all 16 layers
  results.passed =
    results.layers.layer1_conformance.passed &&
    results.layers.layer2_atomicity.passed &&
    (results.layers.layer3_dependencies.errors.length === 0) &&
    results.layers.layer4_scope_drift.passed &&
    results.layers.layer5_assumptions_risks.passed &&
    results.layers.layer6_failure_rollback.passed &&
    results.layers.layer7_proof_contract.passed &&
    results.layers.layer8_mathematical_proof.passed &&
    results.layers.layer9_statistical_evidence.passed &&
    results.layers.layer10_routing_truth_table.passed &&
    results.layers.layer11_artifact_provenance.passed &&
    results.layers.layer12_security_boundaries.passed &&
    results.layers.layer13_observability.passed &&
    results.layers.layer14_resource_budget.passed &&
    results.layers.layer15_learning_loop.passed &&
    results.layers.layer16_lifecycle.passed;

  // Emit composite assurance receipt if passed
  if (results.passed) {
    const proofsDir = resolve(process.cwd(), 'artifacts/proofs');
    if (!existsSync(proofsDir)) {
      mkdirSync(proofsDir, { recursive: true });
    }
    let gitHead = '0000000000000000000000000000000000000000';
    try { gitHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch {}

    const assuranceReceipt = {
      receipt_schema: 'soda_goal_assurance_v2',
      goal_id: goalFilename,
      status: 'ASSURED_PRODUCTION_READY',
      assurance_levels: {
        template_conformance: true,
        atomicity_outcome_graph: true,
        dependency_dag: true,
        scope_drift_integrity: true,
        assumptions_risk_governance: true,
        failure_rollback_policy: true,
        proof_contract: true,
        executable_invariants: results.layers.layer8_mathematical_proof.passed,
        statistical_evidence: true,
        routing_truth_table: true,
        artifact_provenance: true,
        security_boundaries: true,
        observability_telemetry: true,
        resource_budgets: true,
        post_ship_learning: true,
        lifecycle_receipts: true
      },
      git_head: gitHead,
      generated_at: new Date().toISOString()
    };
    writeFileSync(
      join(proofsDir, `${goalFilename}_assurance_receipt.json`),
      JSON.stringify(assuranceReceipt, null, 2),
      'utf8'
    );
  }

  return results;
}

/**
 * Main CLI Runner.
 */
export async function runAssuranceSuite(targetGoalId) {
  console.log("════════════════════════════════════════════════════════════════════════════════");
  console.log("🛡️  SODA OS GOAL LIFECYCLE ASSURANCE SUITE (16-LAYER HARNESS FAMILY)");
  console.log("════════════════════════════════════════════════════════════════════════════════\n");

  const goalsDir = resolve(process.cwd(), 'docs/07-backlog/goals');
  const targetFiles = [];

  if (targetGoalId && targetGoalId !== '--all') {
    let directFile = join(goalsDir, `${targetGoalId}.md`);
    if (!existsSync(directFile)) {
      const archivedFile = join(goalsDir, '_archived', `${targetGoalId}.md`);
      if (existsSync(archivedFile)) {
        directFile = archivedFile;
      } else {
        console.error(`❌ Goal file not found: ${directFile}`);
        process.exit(1);
      }
    }
    targetFiles.push(directFile);
  } else {
    if (existsSync(goalsDir)) {
      const entries = readdirSync(goalsDir);
      for (const entry of entries) {
        if (entry.endsWith('.md') && !entry.startsWith('_')) {
          targetFiles.push(join(goalsDir, entry));
        }
      }
    }
  }

  if (targetFiles.length === 0) {
    console.log("No goal files found to assure.");
    process.exit(0);
  }

  let totalGoals = targetFiles.length;
  let passedGoals = 0;
  let failedGoals = 0;

  for (const file of targetFiles) {
    const goalId = basename(file, '.md');
    console.log(`▶ Assuring [${goalId}] across 16 decoupled assurance layers...`);
    const res = await assureGoal(file);

    if (res.passed) {
      passedGoals++;
      console.log(`  ✅ 100% Goal Assurance Certified: ${goalId}`);
      console.log(`     ↳ Conformance: PASS | Atomicity: PASS | DAG: PASS | Scope: PASS | Risks: PASS | Rollback: PASS | Proof: PASS | Math: PASS | Stats: PASS | Routing: PASS | Provenance: PASS | Security: PASS | OTel: PASS | Budget: PASS | Learn: PASS | Lifecycle: PASS`);
    } else {
      failedGoals++;
      console.error(`  ❌ Assurance Failed: ${goalId}`);
      for (const [layerName, layerData] of Object.entries(res.layers)) {
        if (!layerData.passed || (layerData.errors && layerData.errors.length > 0)) {
          console.error(`     ↳ [${layerName}] errors:`);
          for (const err of (layerData.errors || [])) {
            console.error(`        - ${err}`);
          }
        }
      }
    }
  }

  console.log("\n════════════════════════════════════════════════════════════════════════════════");
  console.log(`📊 Assurance Summary: ${passedGoals} / ${totalGoals} Goals Certified Green`);
  console.log("════════════════════════════════════════════════════════════════════════════════\n");

  if (failedGoals > 0) {
    console.error("❌ Some goals failed lifecycle assurance verification!");
    process.exit(1);
  } else {
    console.log("🏆 ALL GOALS CERTIFIED 100% PRODUCTION-READY VIA 16-LAYER ASSURANCE SUITE!\n");
    process.exit(0);
  }
}

if (process.argv[1] && process.argv[1].endsWith('goal-assurance-suite.mjs')) {
  const target = process.argv[2] || '--all';
  runAssuranceSuite(target).catch(err => {
    console.error("Assurance Suite fatal error:", err);
    process.exit(1);
  });
}
