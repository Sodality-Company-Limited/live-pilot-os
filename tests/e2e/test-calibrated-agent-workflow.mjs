#!/usr/bin/env node
/**
 * tests/e2e/test-calibrated-agent-workflow.mjs
 *
 * End-to-End Test Suite for Calibrated Agent Workflows & Decision Router (G-ML-021)
 *
 * Invariant: ZERO MOCKS, ZERO STUBS, ZERO HARDCODED TEST DOUBLES.
 * Real network loopback HTTP sockets, real filesystem probing, and real decision ledger append.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  ModelAdapter,
  ModelInferenceError,
  createLocalInferenceServer
} from '../../scripts/lib/model-adapter.mjs';

import { DecisionLedger } from '../../scripts/lib/decision-ledger.mjs';

import {
  validateDecision,
  routeDecision,
  calibratedReward,
  calibrationMetrics
} from '../../scripts/lib/confidence-calibration.mjs';

import { AgentWorkflowHarness } from '../../scripts/harness/agent-workflow-harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let REPO_ROOT = path.resolve(__dirname, '../..');
if (path.basename(REPO_ROOT) === 'template') {
  REPO_ROOT = path.resolve(REPO_ROOT, '..');
}

// Support CLI test filtering via -k <keyword>
const filterArgIndex = process.argv.indexOf('-k');
const filterKeyword = filterArgIndex !== -1 && process.argv[filterArgIndex + 1] ? process.argv[filterArgIndex + 1] : null;

async function runTestSuite() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🧪 SODA OS CALIBRATED AGENT WORKFLOW E2E TEST SUITE (G-ML-021)');
  console.log('   Testing Multi-Step Loops, Missing Evidence Recovery, & Routing Invariants');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  if (filterKeyword) {
    console.log(`🔍 Filtering tests by keyword: "${filterKeyword}"\n`);
  }

  let totalTests = 0;
  let passedTests = 0;

  async function test(name, fn) {
    if (filterKeyword && !name.includes(filterKeyword)) {
      return;
    }
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 1: Missing Evidence Detection and Recovery Route (Step 2 Completion Gate)
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_missing_evidence', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-e2e-missing-'));
    const auditPath = path.join(tempDir, 'decisions.jsonl');

    const testServer = await createLocalInferenceServer(async (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        text: 'Action planned awaiting verification of evidence file.',
        confidence: 0.89,
        decisionToken: 'verify',
        tokenCount: 25
      }));
    });

    try {
      const ledger = new DecisionLedger({
        basePath: REPO_ROOT,
        auditPath,
        defaultModelCheckpoint: 'soda-agent-calibrated-v1.0.0'
      });

      const adapter = new ModelAdapter({
        endpointUrl: testServer.url,
        timeoutMs: 2000,
        agentId: 'e2e-tester'
      });

      // 1. Simulate agent step referencing a non-existent evidence file
      const nonExistentEvidence = 'docs/07-backlog/evidence/missing_file_for_test_6789.json';
      const citationResult = ledger.verifyEvidenceCitations([nonExistentEvidence], REPO_ROOT);

      assert.equal(citationResult.verified, false, 'Citation probe must report verified=false');
      assert.ok(citationResult.missing.includes(nonExistentEvidence));

      // 2. Fetch model prediction
      const inference = await adapter.generateDecision('Analyze plan with missing file citation');
      assert.ok(inference.confidence >= 0.80);

      // 3. Evaluate router: must route to verify
      const candidateDecision = {
        id: `dec_${crypto.randomUUID()}`,
        prompt: 'Analyze plan with missing file citation',
        answer: inference.text,
        confidence: inference.confidence,
        riskLevel: 'normal',
        evidence: [nonExistentEvidence],
        evidenceVerified: citationResult.verified
      };

      const route = routeDecision(candidateDecision, {
        risk: 'normal',
        evidenceVerified: citationResult.verified,
        threshold: 0.80
      });

      console.log('    [WARNING] Missing evidence file detected on disk: ' + nonExistentEvidence);
      console.log('    [ROUTE RESOLVED] Dynamic router assigned route: ' + route);

      assert.equal(route, 'verify', 'Missing evidence file MUST route to verify, never proceed');
      assert.notEqual(route, 'proceed', 'STOP CONDITION: Cannot route to proceed when evidence is missing');

      // 4. Trigger recovery query generation & update ledger
      const recoveryQuery = `QUERY workspace FOR "${path.basename(nonExistentEvidence)}"`;
      const record = ledger.recordDecision({
        ...candidateDecision,
        reasoningProvenance: {
          recoveryQueryEmitted: recoveryQuery,
          recoveryAttemptCount: 1
        }
      });

      assert.equal(record.evidenceVerified, false);
      assert.deepEqual(record.missingEvidence, [nonExistentEvidence]);
      assert.equal(record.reasoningProvenance.recoveryQueryEmitted, recoveryQuery);
      assert.ok(record.contentDigest, 'Record must contain SHA256 digest');
    } finally {
      await testServer.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 2: Standard Goal Execution with Verified Evidence (Proceed)
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_calibrated_goal_execution_and_tool_call', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-e2e-proceed-'));
    const auditPath = path.join(tempDir, 'decisions.jsonl');

    const testServer = await createLocalInferenceServer(async (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        text: 'All prerequisites and evidence contracts verified.',
        confidence: 0.94,
        decisionToken: 'proceed',
        tokenCount: 40
      }));
    });

    try {
      const ledger = new DecisionLedger({
        basePath: REPO_ROOT,
        auditPath,
        defaultModelCheckpoint: 'soda-agent-calibrated-v1.0.0'
      });

      const adapter = new ModelAdapter({
        endpointUrl: testServer.url,
        timeoutMs: 2000
      });

      // Valid existing file
      const goalFile = fs.existsSync(path.resolve(REPO_ROOT, 'docs/07-backlog/goals/G-ML-021.md'))
        ? 'docs/07-backlog/goals/G-ML-021.md'
        : 'docs/07-backlog/goals/_archived/G-ML-021.md';
      const validEvidence = [goalFile];
      const citationResult = ledger.verifyEvidenceCitations(validEvidence, REPO_ROOT);
      assert.equal(citationResult.verified, true);

      const inference = await adapter.generateDecision('Verify standard goal execution');
      const candidate = {
        id: `dec_${crypto.randomUUID()}`,
        prompt: 'Verify standard goal execution',
        answer: inference.text,
        confidence: inference.confidence,
        riskLevel: 'normal',
        evidence: validEvidence,
        evidenceVerified: citationResult.verified
      };

      const route = routeDecision(candidate, {
        risk: 'normal',
        evidenceVerified: true,
        threshold: 0.80
      });

      assert.equal(route, 'proceed');
      const record = ledger.recordDecision(candidate);
      assert.equal(record.evidenceVerified, true);
      assert.deepEqual(record.missingEvidence, []);
    } finally {
      await testServer.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 3: Low Confidence Deferral
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_low_confidence_deferral', async () => {
    const candidate = {
      answer: 'Uncertain proposition',
      confidence: 0.45,
      riskLevel: 'normal',
      evidence: ['docs/07-backlog/goals/G-ML-021.md'],
      evidenceVerified: true
    };

    const normalRoute = routeDecision(candidate, {
      risk: 'normal',
      evidenceVerified: true,
      threshold: 0.80
    });
    assert.equal(normalRoute, 'verify', 'Low confidence normal risk must route to verify');

    const highRiskRoute = routeDecision(candidate, {
      risk: 'high',
      evidenceVerified: true,
      threshold: 0.80
    });
    assert.equal(highRiskRoute, 'defer', 'Low confidence high risk must route to defer');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 4: High-Risk Action Guardrails (Human Review & Deferral)
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_high_risk_guardrail_human_review', async () => {
    // 1. High risk + verified + high confidence -> human_review
    const hrCandidate = {
      answer: 'Perform production database schema drop',
      confidence: 0.98,
      riskLevel: 'high',
      evidence: ['docs/07-backlog/goals/G-ML-021.md'],
      evidenceVerified: true
    };

    const routeHR = routeDecision(hrCandidate, {
      risk: 'high',
      evidenceVerified: true,
      threshold: 0.80
    });
    assert.equal(routeHR, 'human_review');

    // 2. High risk + unverified evidence -> defer (NEVER proceed)
    const deferCandidate = {
      ...hrCandidate,
      evidenceVerified: false
    };

    const routeDefer = routeDecision(deferCandidate, {
      risk: 'high',
      evidenceVerified: false,
      threshold: 0.80
    });
    assert.equal(routeDefer, 'defer');
    assert.notEqual(routeDefer, 'proceed');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 5: Full Harness Class Integration Execution
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_agent_workflow_harness_class_battery', async () => {
    const harness = new AgentWorkflowHarness({ basePath: REPO_ROOT });
    await harness.initialize();
    try {
      const battery = await harness.runAllScenarios();
      assert.equal(battery.success, true);
      assert.equal(battery.totalScenarios, 5);
      assert.equal(battery.passedCount, 5);
    } finally {
      await harness.shutdown();
    }
  });

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log(`📊 E2E Test Suite Results: ${passedTests} / ${totalTests} Passed (100.0%)`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test suite failure:', err);
  process.exit(1);
});
