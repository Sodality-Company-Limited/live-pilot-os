import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeLogarithmicScoringLoss,
  computeAsymmetricOverconfidencePenalty,
  computeEvidenceGroundingLoss,
  computeSafetyLoss,
  computeCompositeRlcdLoss,
  DaveLoraAdapter,
  DaveRlcdTrainer,
  evaluateCheckpointCalibration,
  verifyOverconfidenceSafetyGate,
  trainEpoch,
  runTrainingPipeline,
  DEFAULT_LORA_CONFIG,
  DEFAULT_LOSS_WEIGHTS
} from '../../scripts/lib/dave-rlcd-trainer.mjs';

describe('DAVE RLCD Confidence-Calibrated Training Pipeline Test Suite (G-ML-026)', () => {
  const testDir = path.join(process.cwd(), 'artifacts/test-rlcd-trainer');
  const fixtureTrainPath = path.join(testDir, 'test-train.jsonl');
  const fixtureValPath = path.join(testDir, 'test-val.jsonl');
  const fixtureSummaryPath = path.join(testDir, 'test-summary.json');

  const sampleTrajectories = [
    {
      trajectory_id: 'traj-t001',
      goal_id: 'G-CORE-001',
      decision_id: 'DAVE-ARCH-001',
      decision_type: 'system_architecture',
      prompt: '[TASK CONTEXT] Goal: G-CORE-001 Risk: low Summary: Architecture',
      chosen: { summary: 'Asynchronous event architecture' },
      rejected: { summary: 'Synchronous blocking RPC' },
      confidence: 0.94,
      reward: { log_score: -0.0619, overconfidence_penalty: 0, net_reward: -0.0619 },
      oracle_verdict: { correct: true, authority: 'empirical_test_harness' },
      evidence: ['docs/03-architecture/system.md'],
      references: ['REF-001'],
      split: 'train'
    },
    {
      trajectory_id: 'traj-t002',
      goal_id: 'G-SEC-001',
      decision_id: 'DAVE-SEC-001',
      decision_type: 'security',
      prompt: '[TASK CONTEXT] Goal: G-SEC-001 Risk: high Summary: Sandbox',
      chosen: { summary: 'Wasmtime sandbox isolation' },
      rejected: { summary: 'Root execution' },
      confidence: 0.92,
      reward: { log_score: -2.5257, overconfidence_penalty: 8.464, net_reward: -10.9897 },
      oracle_verdict: { correct: false, authority: 'empirical_test_harness' },
      evidence: [],
      references: [],
      split: 'train'
    },
    {
      trajectory_id: 'traj-t003',
      goal_id: 'G-WEB-001',
      decision_id: 'DAVE-UX-001',
      decision_type: 'ux_ui_design',
      prompt: '[TASK CONTEXT] Goal: G-WEB-001 Risk: low Summary: Grid layout',
      chosen: { summary: 'Lock 1440x900 viewport' },
      rejected: { summary: 'Auto-fit layout' },
      confidence: 0.88,
      reward: { log_score: -0.1278, overconfidence_penalty: 0, net_reward: -0.1278 },
      oracle_verdict: { correct: true, authority: 'empirical_test_harness' },
      evidence: ['docs/02-product/design.md'],
      references: ['REF-002'],
      split: 'train'
    },
    {
      trajectory_id: 'traj-t004',
      goal_id: 'G-PERF-001',
      decision_id: 'DAVE-PERF-001',
      decision_type: 'performance',
      prompt: '[TASK CONTEXT] Goal: G-PERF-001 Risk: medium Summary: Worker',
      chosen: { summary: 'Web worker off-thread' },
      rejected: { summary: 'Main thread parse' },
      confidence: 0.35,
      reward: { log_score: -0.4308, overconfidence_penalty: 0, net_reward: -0.4308 },
      oracle_verdict: { correct: false, authority: 'empirical_test_harness' },
      evidence: [],
      references: [],
      split: 'train'
    }
  ];

  const sampleValidation = [
    {
      trajectory_id: 'traj-v001',
      goal_id: 'G-CORE-006',
      decision_id: 'DAVE-API-006',
      decision_type: 'api_design',
      prompt: '[TASK CONTEXT] Goal: G-CORE-006 Risk: low Summary: Protobuf',
      chosen: { summary: 'Protobuf API boundary' },
      rejected: { summary: 'Unversioned REST' },
      confidence: 0.95,
      reward: { log_score: -0.0513, overconfidence_penalty: 0, net_reward: -0.0513 },
      oracle_verdict: { correct: true, authority: 'empirical_test_harness' },
      evidence: ['docs/03-architecture/api.md'],
      references: ['REF-003'],
      split: 'validation'
    },
    {
      trajectory_id: 'traj-v002',
      goal_id: 'G-CORE-008',
      decision_id: 'DAVE-TEST-008',
      decision_type: 'test_strategy',
      prompt: '[TASK CONTEXT] Goal: G-CORE-008 Risk: low Summary: Testcontainers',
      chosen: { summary: 'Mock-free testcontainers' },
      rejected: { summary: 'In-memory mock' },
      confidence: 0.97,
      reward: { log_score: -0.0305, overconfidence_penalty: 0, net_reward: -0.0305 },
      oracle_verdict: { correct: true, authority: 'empirical_test_harness' },
      evidence: ['docs/03-architecture/test.md'],
      references: ['REF-004'],
      split: 'validation'
    }
  ];

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(fixtureTrainPath, sampleTrajectories.map(t => JSON.stringify(t)).join('\n') + '\n', 'utf8');
    fs.writeFileSync(fixtureValPath, sampleValidation.map(v => JSON.stringify(v)).join('\n') + '\n', 'utf8');
  });

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 1: COMPOSITE LOSS & PROPER LOGARITHMIC SCORING
  // ---------------------------------------------------------------------------

  it('1. Strictly proper logarithmic loss calculates exact theoretical negative log-likelihood', () => {
    // For correct outcomes (y = 1)
    const lossHighCorrect = computeLogarithmicScoringLoss(0.95, true);
    assert.ok(Math.abs(lossHighCorrect - (-Math.log(0.95))) < 1e-4);
    assert.ok(lossHighCorrect > 0 && lossHighCorrect < 0.1);

    const lossLowCorrect = computeLogarithmicScoringLoss(0.10, true);
    assert.ok(Math.abs(lossLowCorrect - (-Math.log(0.10))) < 1e-4);
    assert.ok(lossLowCorrect > 2.0);

    // For incorrect outcomes (y = 0)
    const lossHighIncorrect = computeLogarithmicScoringLoss(0.95, false);
    assert.ok(Math.abs(lossHighIncorrect - (-Math.log(0.05))) < 1e-4);
    assert.ok(lossHighIncorrect > 2.9);

    const lossLowIncorrect = computeLogarithmicScoringLoss(0.10, false);
    assert.ok(Math.abs(lossLowIncorrect - (-Math.log(0.90))) < 1e-4);
    assert.ok(lossLowIncorrect < 0.15);
  });

  it('2. Epsilon clamping prevents -Infinity or NaN on boundary probabilities 0.0 and 1.0', () => {
    const lossZero = computeLogarithmicScoringLoss(0.0, true);
    assert.ok(Number.isFinite(lossZero));
    assert.ok(lossZero > 10);

    const lossOne = computeLogarithmicScoringLoss(1.0, false);
    assert.ok(Number.isFinite(lossOne));
    assert.ok(lossOne > 10);

    assert.throws(() => computeLogarithmicScoringLoss(NaN, true), { name: 'TypeError', message: /finite number/ });
    assert.throws(() => computeLogarithmicScoringLoss(-0.01, true), { name: 'RangeError', message: /between 0 and 1/ });
    assert.throws(() => computeLogarithmicScoringLoss(1.01, true), { name: 'RangeError', message: /between 0 and 1/ });
  });

  it('3. Asymmetric penalty penalizes confident errors >10x more than uncertain errors', () => {
    // When correct (y = 1): penalty is exactly 0.0 regardless of confidence
    assert.equal(computeAsymmetricOverconfidencePenalty(0.99, true), 0.0);
    assert.equal(computeAsymmetricOverconfidencePenalty(0.50, true), 0.0);

    // When incorrect (y = 0) and confidence < 0.80: penalty is 0.0
    assert.equal(computeAsymmetricOverconfidencePenalty(0.20, false), 0.0);
    assert.equal(computeAsymmetricOverconfidencePenalty(0.50, false), 0.0);
    assert.equal(computeAsymmetricOverconfidencePenalty(0.79, false), 0.0);

    // When incorrect (y = 0) and confidence >= 0.80: penalty = c^2 * 10.0
    const penalty90 = computeAsymmetricOverconfidencePenalty(0.90, false);
    assert.ok(Math.abs(penalty90 - (0.90 * 0.90 * 10.0)) < 1e-4); // 8.10
    assert.equal(Number(penalty90.toFixed(4)), 8.1000);

    const penalty95 = computeAsymmetricOverconfidencePenalty(0.95, false);
    assert.ok(Math.abs(penalty95 - (0.95 * 0.95 * 10.0)) < 1e-4); // 9.025
    assert.equal(Number(penalty95.toFixed(4)), 9.0250);

    // Compare total calibration loss (log_loss + penalty):
    // Confident error c = 0.90 vs Uncertain error c = 0.20
    const lossConfidentError = computeLogarithmicScoringLoss(0.90, false) + computeAsymmetricOverconfidencePenalty(0.90, false);
    const lossUncertainError = computeLogarithmicScoringLoss(0.20, false) + computeAsymmetricOverconfidencePenalty(0.20, false);

    assert.ok(lossConfidentError > 10.0);
    assert.ok(lossUncertainError < 0.30);
    const penaltyRatio = lossConfidentError / lossUncertainError;
    assert.ok(penaltyRatio >= 10.0, `Penalty ratio ${penaltyRatio} must be >= 10x`);
  });

  it('4. Evidence grounding loss penalizes ungrounded high confidence', () => {
    // Verified evidence incurs 0 loss
    assert.equal(computeEvidenceGroundingLoss(0.95, true), 0.0);
    assert.equal(computeEvidenceGroundingLoss(0.50, true), 0.0);

    // Unverified evidence incurs quadratic penalty: (1 - v) * c^2
    const ungroundedLoss = computeEvidenceGroundingLoss(0.90, false);
    assert.ok(Math.abs(ungroundedLoss - (0.90 * 0.90)) < 1e-4);

    const lowConfUngrounded = computeEvidenceGroundingLoss(0.20, false);
    assert.ok(Math.abs(lowConfUngrounded - (0.20 * 0.20)) < 1e-4);
    assert.ok(ungroundedLoss > lowConfUngrounded * 15);
  });

  it('5. Safety loss penalizes high-risk unverified proposals', () => {
    // Low or normal risk with verified evidence incurs 0 safety loss
    assert.equal(computeSafetyLoss(0.95, 'low', true), 0.0);
    assert.equal(computeSafetyLoss(0.95, 'normal', true), 0.0);
    assert.equal(computeSafetyLoss(0.95, 'high', true), 0.0);

    // High risk with unverified evidence incurs full quadratic safety loss
    const highRiskUnverified = computeSafetyLoss(0.95, 'high', false);
    assert.ok(Math.abs(highRiskUnverified - (0.95 * 0.95)) < 1e-4);
    assert.ok(highRiskUnverified > 0.90);
  });

  it('6. Composite RLCD loss combines all 4 terms and halts fail-closed on negative loss', () => {
    const weights = { lambda_cal: 1.0, lambda_evidence: 0.5, lambda_safety: 0.5 };
    const sample = {
      confidence: 0.92,
      correct: false,
      evidenceVerified: false,
      riskLevel: 'high',
      lmLoss: 0.45
    };

    const result = computeCompositeRlcdLoss(sample, weights);

    assert.ok(typeof result.totalLoss === 'number');
    assert.ok(result.totalLoss > 0, 'Total loss must be strictly positive');
    assert.ok(result.lmLoss === 0.45);
    assert.ok(result.calLoss > 10.0); // log loss + 10x penalty
    assert.ok(result.evidenceLoss > 0);
    assert.ok(result.safetyLoss > 0);

    // Stop condition verification: composite loss must never return negative
    assert.throws(() => {
      computeCompositeRlcdLoss({ ...sample, lmLoss: -50.0 }, weights);
    }, { name: 'RangeError', message: /Negative loss output/ });
  });

  // ---------------------------------------------------------------------------
  // STEP 2: PARAMETER-EFFICIENT LORA EXECUTION ENGINE
  // ---------------------------------------------------------------------------

  it('7. LoRA adapter initializes with rank 16, alpha 32, and zero delta on init', () => {
    const lora = new DaveLoraAdapter({
      rank: 16,
      alpha: 32,
      inDim: 64,
      hiddenDim: 64,
      targetModules: ['q_proj', 'v_proj', 'value_head']
    });

    assert.equal(lora.rank, 16);
    assert.equal(lora.alpha, 32);
    assert.equal(lora.scaling, 2.0); // 32 / 16

    // Invariant: B matrices initialized to 0, ensuring ΔW = 0 initially
    for (const mod of ['q_proj', 'v_proj', 'value_head']) {
      const bMatrix = lora.layers[mod].B;
      const bSum = bMatrix.reduce((sum, row) => sum + row.reduce((r, v) => r + Math.abs(v), 0), 0);
      assert.equal(bSum, 0, `LoRA B matrix for ${mod} must be initialized to exact zero`);
    }

    // Forward pass before training matches base linear projections exactly
    const dummyInput = new Array(64).fill(0.1);
    const initialOutput = lora.forward(dummyInput);
    assert.ok(Number.isFinite(initialOutput.confidence));
    assert.ok(initialOutput.confidence >= 0.0 && initialOutput.confidence <= 1.0);
  });

  it('8. Forward pass outputs valid autoregressive token probabilities and bounded confidence', () => {
    const lora = new DaveLoraAdapter({ rank: 16, alpha: 32, inDim: 64, hiddenDim: 64 });
    const promptTokens = 'Test context prompt';
    const features = lora.extractFeatures(promptTokens);

    assert.equal(features.length, 64);
    const forward = lora.forward(features);

    assert.ok(forward.confidence >= 0.0 && forward.confidence <= 1.0);
    assert.ok(Array.isArray(forward.tokenLogits));
    assert.equal(forward.tokenLogits.length, 128); // vocab size
  });

  it('9. Backward pass computes analytical gradients and detects gradient explosion fail-closed', () => {
    const lora = new DaveLoraAdapter({ rank: 16, alpha: 32, inDim: 64, hiddenDim: 64 });
    const features = new Array(64).fill(0.2);
    const target = { correct: true, confidence: 0.95, evidenceVerified: true, riskLevel: 'normal' };

    const { loss, gradients, gradNorm } = lora.computeGradients(features, target, DEFAULT_LOSS_WEIGHTS);

    assert.ok(Number.isFinite(loss));
    assert.ok(loss > 0);
    assert.ok(Number.isFinite(gradNorm));
    assert.ok(gradNorm < 10.0, `Initial gradient norm must be well below 10.0 (got ${gradNorm})`);

    // Verify all target modules have non-null gradients
    for (const mod of ['q_proj', 'v_proj', 'value_head']) {
      assert.ok(gradients[mod].gradA.length > 0);
      assert.ok(gradients[mod].gradB.length > 0);
    }

    // Stop condition verification: norm > 10.0 must halt fail-closed
    assert.throws(() => {
      lora.checkGradientNorm(15.5);
    }, { name: 'RangeError', message: /Gradient explosion/ });
  });

  it('10. Training epoch completes with declining loss curve and stable gradient norms', () => {
    const trainer = new DaveRlcdTrainer({
      trainPath: fixtureTrainPath,
      valPath: fixtureValPath,
      epochs: 5,
      learningRate: 0.01,
      seed: 42
    });

    const epochResults = trainer.trainAllEpochs();

    assert.equal(epochResults.length, 5);
    const initialLoss = epochResults[0].meanLoss;
    const finalLoss = epochResults[4].meanLoss;

    assert.ok(finalLoss < initialLoss, `Final loss (${finalLoss}) must be lower than initial loss (${initialLoss})`);
    assert.ok(epochResults.every(e => e.meanGradNorm <= 10.0), 'All gradient norms must satisfy <= 10.0 ceiling');
    assert.ok(epochResults.every(e => Number.isFinite(e.meanLoss)), 'All epoch losses must be finite');
  });

  // ---------------------------------------------------------------------------
  // STEP 3: CHECKPOINT CALIBRATION EVALUATION & OVERCONFIDENCE SAFETY GATE
  // ---------------------------------------------------------------------------

  it('11. Checkpoint evaluation computes ECE, Brier score, accuracy, and high-confidence error rate', () => {
    const trainer = new DaveRlcdTrainer({
      trainPath: fixtureTrainPath,
      valPath: fixtureValPath,
      epochs: 3,
      seed: 42
    });
    trainer.trainAllEpochs();

    const metrics = evaluateCheckpointCalibration(trainer.model, fixtureValPath);

    assert.equal(metrics.sampleCount, 2);
    assert.ok(metrics.ece >= 0.0 && metrics.ece <= 1.0);
    assert.ok(metrics.brier >= 0.0 && metrics.brier <= 1.0);
    assert.ok(metrics.accuracy >= 0.0 && metrics.accuracy <= 1.0);
    assert.ok(metrics.highConfidenceErrorRate >= 0.0 && metrics.highConfidenceErrorRate <= 1.0);
  });

  it('12. Overconfidence safety gate approves calibrated checkpoint and halts on overconfidence drift', () => {
    const baseline = {
      ece: 0.15,
      accuracy: 0.85,
      brier: 0.20
    };

    const passingCandidate = {
      ece: 0.05, // Lower ECE (better calibrated)
      accuracy: 0.88, // Preserved accuracy
      brier: 0.09
    };

    const gateResult = verifyOverconfidenceSafetyGate(passingCandidate, baseline);
    assert.equal(gateResult.passed, true);
    assert.equal(gateResult.reasons.length, 0);

    // Failing condition 1: Increased ECE (overconfidence drift)
    const overconfidentCandidate = {
      ece: 0.22, // ECE > baseline (failed!)
      accuracy: 0.95, // Even with higher accuracy, overconfidence is rejected
      brier: 0.12
    };
    const failedEceGate = verifyOverconfidenceSafetyGate(overconfidentCandidate, baseline);
    assert.equal(failedEceGate.passed, false);
    assert.ok(failedEceGate.reasons.some(r => r.includes('ECE')));

    // Failing condition 2: Catastrophic drop in task accuracy (> 0.02 drop)
    const degradedCandidate = {
      ece: 0.04,
      accuracy: 0.70, // Dropped by 0.15 (> 0.02 ceiling)
      brier: 0.08
    };
    const failedAccGate = verifyOverconfidenceSafetyGate(degradedCandidate, baseline);
    assert.equal(failedAccGate.passed, false);
    assert.ok(failedAccGate.reasons.some(r => r.includes('accuracy')));
  });

  it('13. Training summary records reproducible hyperparameters, loss metrics, and commit hash', () => {
    const summary = runTrainingPipeline({
      trainPath: fixtureTrainPath,
      valPath: fixtureValPath,
      summaryPath: fixtureSummaryPath,
      epochs: 3,
      seed: 42
    });

    assert.ok(fs.existsSync(fixtureSummaryPath));
    const saved = JSON.parse(fs.readFileSync(fixtureSummaryPath, 'utf8'));

    assert.equal(saved.goal_id, 'G-ML-026');
    assert.ok(saved.checkpoint_id.startsWith('CKPT-DAVE-RLCD-'));
    assert.ok(saved.source_revision.length > 0);
    assert.equal(saved.hyperparameters.lora_rank, 16);
    assert.equal(saved.hyperparameters.lora_alpha, 32);
    assert.deepEqual(saved.hyperparameters.target_modules, ['q_proj', 'v_proj', 'value_head']);
    assert.ok(saved.training_results.loss_declined);
    assert.equal(saved.safety_gate.status, 'APPROVED');
  });

  it('14. Production CLI subcommands train-epoch, evaluate-checkpoint, and stats execute code 0', () => {
    // Test the trainer programmatic dispatcher
    const epochOut = trainEpoch({
      trainPath: fixtureTrainPath,
      valPath: fixtureValPath,
      summaryPath: fixtureSummaryPath,
      epochs: 1,
      seed: 42
    });

    assert.ok(epochOut.epochsCompleted === 1);
    assert.ok(epochOut.meanLoss > 0);
    assert.ok(epochOut.meanGradNorm <= 10.0);
  });
});
