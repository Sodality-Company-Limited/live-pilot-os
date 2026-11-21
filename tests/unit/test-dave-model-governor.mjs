import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  DaveModelGovernor,
  ModelRollbackStateMachine,
  verifyModelProvenance,
  createPromotionReceipt,
  recordPromotionReceipt,
  DEFAULT_PROMOTION_THRESHOLDS,
  PromotionPolicyError,
  ProvenanceVerificationError,
  RollbackExecutionError
} from '../../scripts/lib/dave-model-governor.mjs';

describe('DAVE Model Evaluation, Promotion, Drift, and Rollback (G-ML-028) Unit Test Suite', () => {
  let governor;
  let rollbackMachine;

  const validBaselineMetrics = {
    ece: 0.045,
    accuracy: 0.940,
    overconfidenceRate: 0.010,
    unsafeAutonomyRate: 0.000,
    brier: 0.080,
    highConfidenceErrorRate: 0.015
  };

  const validCandidateMetrics = {
    ece: 0.048, // <= 0.045 + 0.010 (0.055) -> PASS
    accuracy: 0.952, // >= 0.940 - 0.010 (0.930) -> PASS
    overconfidenceRate: 0.012, // <= 0.020 -> PASS
    unsafeAutonomyRate: 0.000, // == 0 -> PASS
    brier: 0.078, // <= 0.080 + 0.020 (0.100) -> PASS
    highConfidenceErrorRate: 0.014 // <= 0.015 -> PASS
  };

  const dummyWeightsContent = 'SAFE_TENSORS_MOCK_CHECKPOINT_DATA_WEIGHTS_V1_2_3';
  const dummyWeightsHash = crypto.createHash('sha256').update(dummyWeightsContent).digest('hex');

  const validCandidateManifest = {
    schema_version: 1,
    model_id: 'soda-dave-reasoner-v2',
    source_revision: 'c6c8c872164acf8e483238444c9c111c406d45ae',
    dataset_lineage: {
      commit: '7f26153f3e18f5da22e06983e16646a65b2926cc',
      sha256: 'a1b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdef'
    },
    tokenizer: {
      name: 'dave-bpe-tokenizer-v2',
      sha256: 'b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1'
    },
    training_config: {
      epochs: 5,
      learning_rate: 0.0002,
      sha256: 'c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1b2'
    },
    artifacts: [
      {
        path: 'artifacts/proofs/test-checkpoint.safetensors',
        sha256: dummyWeightsHash
      }
    ],
    signature: {
      algorithm: 'HMAC-SHA256',
      key_id: 'dave-training-signer-2026',
      signature_hex: '' // populated in test setup
    }
  };

  const secretSignerKey = 'soda-dave-governor-training-secret-key-2026';
  const signManifest = (m, key) => {
    const payload = `${m.model_id}:${m.source_revision}:${m.dataset_lineage.sha256}:${m.tokenizer.sha256}:${m.training_config.sha256}`;
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
  };

  validCandidateManifest.signature.signature_hex = signManifest(validCandidateManifest, secretSignerKey);

  beforeEach(() => {
    governor = new DaveModelGovernor({
      signerSecret: secretSignerKey,
      thresholds: DEFAULT_PROMOTION_THRESHOLDS
    });

    rollbackMachine = new ModelRollbackStateMachine({
      initialActiveModel: {
        modelId: 'soda-dave-reasoner-v1',
        revision: 'baseline-rev-001',
        metrics: validBaselineMetrics
      }
    });
  });

  describe('Step 1: Promotion Policy Evaluator & Comparative ECE Regressor Gate', () => {
    it('1.1 should approve candidate model when all 6 promotion invariants pass', () => {
      const evaluation = governor.evaluatePromotion(validCandidateMetrics, validBaselineMetrics);

      assert.equal(evaluation.approved, true, 'Compliant model must be approved');
      assert.equal(evaluation.checks.eceCheck.passed, true);
      assert.equal(evaluation.checks.accuracyCheck.passed, true);
      assert.equal(evaluation.checks.overconfidenceCheck.passed, true);
      assert.equal(evaluation.checks.autonomyCheck.passed, true);
      assert.equal(evaluation.checks.brierCheck.passed, true);
      assert.equal(evaluation.checks.hcerCheck.passed, true);
      assert.equal(evaluation.failures.length, 0);
    });

    it('1.2 should reject candidate fail-closed when ECE degrades beyond baseline + 0.01', () => {
      const degradedCandidate = {
        ...validCandidateMetrics,
        ece: 0.058 // 0.058 > 0.045 + 0.010 = 0.055
      };

      const evaluation = governor.evaluatePromotion(degradedCandidate, validBaselineMetrics);
      assert.equal(evaluation.approved, false, 'Must reject degraded ECE');
      assert.equal(evaluation.checks.eceCheck.passed, false);
      assert.ok(evaluation.failures.some(f => f.includes('ECE degradation')));
    });

    it('1.3 should reject candidate fail-closed when task accuracy regresses beyond baseline - 0.01', () => {
      const regressedCandidate = {
        ...validCandidateMetrics,
        accuracy: 0.925 // 0.925 < 0.940 - 0.010 = 0.930
      };

      const evaluation = governor.evaluatePromotion(regressedCandidate, validBaselineMetrics);
      assert.equal(evaluation.approved, false, 'Must reject regressed accuracy');
      assert.equal(evaluation.checks.accuracyCheck.passed, false);
      assert.ok(evaluation.failures.some(f => f.includes('Accuracy regression')));
    });

    it('1.4 should reject candidate fail-closed when overconfidence rate exceeds 0.02', () => {
      const overconfidentCandidate = {
        ...validCandidateMetrics,
        overconfidenceRate: 0.025 // > 0.020
      };

      const evaluation = governor.evaluatePromotion(overconfidentCandidate, validBaselineMetrics);
      assert.equal(evaluation.approved, false, 'Must reject excessive overconfidence');
      assert.equal(evaluation.checks.overconfidenceCheck.passed, false);
      assert.ok(evaluation.failures.some(f => f.includes('Overconfidence rate')));
    });

    it('1.5 should reject candidate fail-closed when unsafe autonomy rate is non-zero', () => {
      const unsafeCandidate = {
        ...validCandidateMetrics,
        unsafeAutonomyRate: 0.005 // must be 0
      };

      const evaluation = governor.evaluatePromotion(unsafeCandidate, validBaselineMetrics);
      assert.equal(evaluation.approved, false, 'Must reject non-zero unsafe autonomy');
      assert.equal(evaluation.checks.autonomyCheck.passed, false);
      assert.ok(evaluation.failures.some(f => f.includes('Unsafe autonomy')));
    });

    it('1.6 should reject candidate fail-closed when Brier score degrades beyond baseline + 0.02', () => {
      const poorBrierCandidate = {
        ...validCandidateMetrics,
        brier: 0.105 // > 0.080 + 0.020 = 0.100
      };

      const evaluation = governor.evaluatePromotion(poorBrierCandidate, validBaselineMetrics);
      assert.equal(evaluation.approved, false, 'Must reject degraded Brier score');
      assert.equal(evaluation.checks.brierCheck.passed, false);
      assert.ok(evaluation.failures.some(f => f.includes('Brier score degradation')));
    });

    it('1.7 should reject candidate fail-closed when HCER exceeds baseline HCER', () => {
      const poorHcerCandidate = {
        ...validCandidateMetrics,
        highConfidenceErrorRate: 0.022 // > baseline 0.015
      };

      const evaluation = governor.evaluatePromotion(poorHcerCandidate, validBaselineMetrics);
      assert.equal(evaluation.approved, false, 'Must reject degraded HCER');
      assert.equal(evaluation.checks.hcerCheck.passed, false);
      assert.ok(evaluation.failures.some(f => f.includes('High-Confidence Error Rate degradation')));
    });
  });

  describe('Step 2: Cryptographic Checkpoint Provenance Ledger & Signature Verifier', () => {
    it('2.1 should verify cryptographic provenance manifest and valid HMAC signature', () => {
      const result = verifyModelProvenance(validCandidateManifest, {
        signerSecret: secretSignerKey
      });

      assert.equal(result.valid, true, 'Valid provenance must pass');
      assert.equal(result.signatureVerified, true);
      assert.equal(result.errors.length, 0);
    });

    it('2.2 should reject provenance fail-closed on tampered signature', () => {
      const tamperedManifest = {
        ...validCandidateManifest,
        signature: {
          algorithm: 'HMAC-SHA256',
          key_id: 'dave-training-signer-2026',
          signature_hex: '0000000000000000000000000000000000000000000000000000000000000000'
        }
      };

      const result = verifyModelProvenance(tamperedManifest, {
        signerSecret: secretSignerKey
      });

      assert.equal(result.valid, false, 'Tampered signature must fail');
      assert.equal(result.signatureVerified, false);
      assert.ok(result.errors.some(e => e.includes('Signature verification failed')));
    });

    it('2.3 should reject provenance fail-closed on missing dataset lineage or commit', () => {
      const missingDatasetManifest = {
        ...validCandidateManifest,
        dataset_lineage: null
      };

      const result = verifyModelProvenance(missingDatasetManifest, {
        signerSecret: secretSignerKey
      });

      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('dataset_lineage')));
    });

    it('2.4 should create, sign, and record canonical promotion receipt', () => {
      const targetPath = path.resolve(process.cwd(), 'artifacts/proofs/test-promotion-receipt.json');

      try {
        const receipt = createPromotionReceipt({
          goalId: 'G-ML-028',
          candidateManifest: validCandidateManifest,
          candidateMetrics: validCandidateMetrics,
          baselineMetrics: validBaselineMetrics,
          signerSecret: secretSignerKey,
          approverRole: 'tech-lead'
        });

        assert.equal(receipt.schema_version, 1);
        assert.equal(receipt.goal_id, 'G-ML-028');
        assert.equal(receipt.certification, 'PASS');
        assert.equal(receipt.promotion_status, 'APPROVED');
        assert.ok(receipt.source_revision);
        assert.ok(receipt.invariants.length >= 6);

        const recordedPath = recordPromotionReceipt(receipt, targetPath);
        assert.equal(fs.existsSync(recordedPath), true);

        const loaded = JSON.parse(fs.readFileSync(recordedPath, 'utf8'));
        assert.equal(loaded.goal_id, 'G-ML-028');
        assert.equal(loaded.certification, 'PASS');
      } finally {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
      }
    });
  });

  describe('Step 3: Zero-Downtime Atomic Rollback State Machine & Canary Gate', () => {
    it('3.1 should start in ACTIVE state with initial stable baseline model', () => {
      assert.equal(rollbackMachine.getState(), 'ACTIVE');
      assert.equal(rollbackMachine.getActiveModel().modelId, 'soda-dave-reasoner-v1');
      assert.equal(rollbackMachine.getPreviousModel(), null);
    });

    it('3.2 should atomically promote candidate to active and preserve previous checkpoint in history', () => {
      const candidateModel = {
        modelId: 'soda-dave-reasoner-v2',
        revision: 'candidate-rev-002',
        metrics: validCandidateMetrics
      };

      rollbackMachine.promoteToActive(candidateModel);

      assert.equal(rollbackMachine.getState(), 'ACTIVE');
      assert.equal(rollbackMachine.getActiveModel().modelId, 'soda-dave-reasoner-v2');
      assert.equal(rollbackMachine.getPreviousModel().modelId, 'soda-dave-reasoner-v1');
      assert.equal(rollbackMachine.getVersionHistory().length, 2);
    });

    it('3.3 should execute atomic rollback in < 100ms when telemetry drift occurs', () => {
      const candidateModel = {
        modelId: 'soda-dave-reasoner-v2',
        revision: 'candidate-rev-002',
        metrics: validCandidateMetrics
      };

      rollbackMachine.promoteToActive(candidateModel);
      assert.equal(rollbackMachine.getActiveModel().modelId, 'soda-dave-reasoner-v2');

      const startTime = performance.now();
      const rollbackResult = rollbackMachine.triggerRollback('Simulated calibration drift spike in production stream', {
        observedEce: 0.089,
        threshold: 0.055
      });
      const durationMs = performance.now() - startTime;

      assert.ok(durationMs < 100, `Rollback took ${durationMs}ms, must be < 100ms`);
      assert.equal(rollbackResult.success, true);
      assert.equal(rollbackMachine.getState(), 'ROLLED_BACK');
      assert.equal(rollbackMachine.getActiveModel().modelId, 'soda-dave-reasoner-v1', 'Must restore previous model pointer');
      assert.ok(rollbackResult.restoredRevision === 'baseline-rev-001');
      assert.ok(rollbackMachine.getRollbackEvents().length === 1);
    });

    it('3.4 should detect streaming telemetry drift and automatically invoke rollback', () => {
      const candidateModel = {
        modelId: 'soda-dave-reasoner-v2',
        revision: 'candidate-rev-002',
        metrics: validCandidateMetrics
      };

      rollbackMachine.promoteToActive(candidateModel);

      // Simulate a batch of 50 incoming production decisions with high miscalibration
      const driftedStream = Array.from({ length: 50 }, (_, i) => ({
        confidence: 0.95,
        correct: i % 3 === 0, // 33% accuracy with 0.95 confidence -> severe overconfidence
        evidence: ['simulated-ref']
      }));

      const monitorResult = rollbackMachine.monitorStreamingTelemetry(driftedStream, {
        maxEce: 0.08,
        maxHcer: 0.05
      });

      assert.equal(monitorResult.driftDetected, true);
      assert.equal(monitorResult.rollbackTriggered, true);
      assert.equal(rollbackMachine.getState(), 'ROLLED_BACK');
      assert.equal(rollbackMachine.getActiveModel().modelId, 'soda-dave-reasoner-v1');
    });

    it('3.5 should reject rollback trigger fail-closed if no previous stable model exists', () => {
      const freshMachine = new ModelRollbackStateMachine({
        initialActiveModel: {
          modelId: 'solo-v1',
          revision: 'rev-0'
        }
      });

      assert.throws(() => {
        freshMachine.triggerRollback('Illegal rollback attempt');
      }, {
        name: 'RollbackExecutionError',
        message: /No previous stable model checkpoint/
      });
    });
  });
});
