#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ ADVERSARIAL EMPIRICAL STRESS SUITE: MILESTONE 4 (M4)
 * ════════════════════════════════════════════════════════════════════════════════
 * Challenger: challenger_wave4_2 (Empirical Challenger)
 * Scope:
 *   - G-UX-017: Calibration-Aware RL (CARL) & "Rewarding Doubt" Loss
 *   - G-UX-018: Multi-Agent Policy LoRA Adapter Registry & Merging Engine
 *   - G-UX-019: Cryptographic Model Provenance & Artifact Ledger
 *
 * Invariants: Zero mocks, zero stubs, 100% concrete operational execution.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';

// G-UX-017 Imports
import {
  computeCarlLoss,
  computeBrierScore,
  computeEce,
  computeAuroc,
  computeHcer,
  evaluateCalibrationBattery,
  routeDecisionByConfidence,
  runCarlEvaluation,
  CARL_DEFAULTS
} from '../../scripts/lib/carl-engine.mjs';

// G-UX-018 Imports
import {
  LoRAAdapter,
  createMatrix,
  matMul,
  linearMerge,
  tiesMerge,
  dareMerge,
  PersonaAdapterRegistry,
  CANONICAL_PERSONAS
} from '../../scripts/lib/lora-adapter-registry.mjs';

// G-UX-019 Imports
import {
  computeFileSha256,
  computeBufferSha256,
  canonicalJsonStringify,
  signPayloadHmac,
  verifyPayloadHmac,
  computeBlockHash,
  collectCurriculumLineage,
  validateProvenanceSchema,
  ModelProvenanceLedger,
  runModelProvenanceVerification,
  DEFAULT_PROVENANCE_KEY,
  GENESIS_PREV_HASH
} from '../../scripts/lib/model-provenance-ledger.mjs';

describe('Adversarial Empirical Stress Suite: Milestone 4 (G-UX-017, G-UX-018, G-UX-019)', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. G-UX-017: CARL MATHEMATICAL INVARIANT STRESS & EXTREME VALUES FUZZING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. G-UX-017 CARL Mathematical Invariants & Extremal Fuzzing', () => {

    test('1.1 should safely clamp extreme confidence boundaries (0.0, 1.0, epsilon, 1-epsilon, +/-Infinity) without numeric divergence', () => {
      // Confidence = 0.0 (must be clamped to epsilon = 1e-6)
      const zeroConf = computeCarlLoss({ confidence: 0.0, target: false });
      assert.ok(!Number.isNaN(zeroConf.totalLoss), 'Loss must not be NaN for c=0.0');
      assert.ok(Number.isFinite(zeroConf.totalLoss), 'Loss must be finite for c=0.0');
      assert.ok(zeroConf.brierLoss <= 1e-11, 'Brier loss for c=0.0 (clamped to 1e-6) on y=0 must be <= 1e-11');
      assert.strictEqual(zeroConf.overconfPenalty, 0.0);

      // Confidence = 1.0 (must be clamped to 1.0 - epsilon = 0.999999)
      const oneConf = computeCarlLoss({ confidence: 1.0, target: true });
      assert.ok(!Number.isNaN(oneConf.totalLoss), 'Loss must not be NaN for c=1.0');
      assert.ok(Number.isFinite(oneConf.totalLoss), 'Loss must be finite for c=1.0');
      assert.ok(oneConf.brierLoss <= 1e-11, 'Brier loss for c=1.0 on y=1 must be <= 1e-11');
      assert.strictEqual(oneConf.overconfPenalty, 0.0);

      // Confidence = +Infinity (must be clamped to 1.0 - epsilon)
      const infConf = computeCarlLoss({ confidence: Infinity, target: true });
      assert.ok(Number.isFinite(infConf.totalLoss), 'Loss must be finite for c=Infinity');
      assert.ok(infConf.totalLoss < 0.01, 'Loss for c=Infinity on y=1 must be small');

      // Confidence = -Infinity (must be clamped to epsilon)
      const negInfConf = computeCarlLoss({ confidence: -Infinity, target: false });
      assert.ok(Number.isFinite(negInfConf.totalLoss), 'Loss must be finite for c=-Infinity');
      assert.ok(negInfConf.totalLoss < 0.01, 'Loss for c=-Infinity on y=0 must be small');

      // Out-of-bounds inputs (< 0.0 and > 1.0)
      const belowZero = computeCarlLoss({ confidence: -0.99, target: false });
      const aboveOne = computeCarlLoss({ confidence: 2.50, target: true });
      assert.ok(Number.isFinite(belowZero.totalLoss));
      assert.ok(Number.isFinite(aboveOne.totalLoss));
    });

    test('1.2 should strictly enforce asymmetric 10x quadratic overconfidence penalty on false acceptances', () => {
      // Critical boundary: c = 0.75 is the exact overconfidence threshold
      // Case A: c = 0.7499, y = 0 -> No penalty
      const subThreshold = computeCarlLoss({ confidence: 0.7499, target: false });
      assert.strictEqual(subThreshold.overconfPenalty, 0.0, 'No overconfidence penalty when c < 0.75');

      // Case B: c = 0.7500, y = 0 -> Penalty is 10.0 * 0.75^2 = 5.625
      const atThreshold = computeCarlLoss({ confidence: 0.7500, target: false });
      assert.strictEqual(atThreshold.overconfPenalty, 10.0 * Math.pow(0.75, 2));

      // Case C: c = 0.9000, y = 0 -> Penalty is 10.0 * 0.90^2 = 8.100
      const highOverconf = computeCarlLoss({ confidence: 0.9000, target: false });
      assert.ok(Math.abs(highOverconf.overconfPenalty - 8.100) < 1e-6, 'Penalty should be 8.100 within float precision');
      assert.ok(highOverconf.totalLoss >= 8.100, 'Total loss must include full overconfidence penalty');

      // Case D: c = 0.9999, y = 1 (Correct prediction) -> Zero penalty
      const correctHigh = computeCarlLoss({ confidence: 0.9999, target: true });
      assert.strictEqual(correctHigh.overconfPenalty, 0.0, 'Zero overconfidence penalty on correct predictions');
    });

    test('1.3 should reward justified doubt on ambiguous inputs and penalize overconfident action or false deferral', () => {
      // 1. Ambiguous deliberation context:
      // Case A: DEFER on ambiguous input with c = 0.35 -> Positive reward +1.0 * (1 - c) = +0.65
      const deferAmb = computeCarlLoss({
        confidence: 0.35,
        target: false,
        action: 'DEFER',
        isAmbiguous: true
      });
      assert.strictEqual(deferAmb.doubtReward, 0.65, 'Doubt reward must be +0.65 for c=0.35 DEFER');
      // Total loss should decrease by doubtReward
      assert.ok(deferAmb.totalLoss < deferAmb.properCalLoss, 'Total loss must be discounted by justified doubt reward');

      // Case B: PROCEED on ambiguous input with c = 0.85 -> Penalty -2.0 * c^2 = -1.445
      const proceedAmb = computeCarlLoss({
        confidence: 0.85,
        target: false,
        action: 'PROCEED',
        isAmbiguous: true
      });
      assert.strictEqual(proceedAmb.doubtReward, -2.0 * Math.pow(0.85, 2), 'Doubt reward must be negative penalty for PROCEED on ambiguous input');

      // 2. Unambiguous deliberation context:
      // Case C: DEFER on unambiguous correct proposal (false deferral: y = 1, DEFER) -> Penalty -0.5 * (1 - c)
      const falseDefer = computeCarlLoss({
        confidence: 0.90,
        target: true,
        action: 'DEFER',
        isAmbiguous: false
      });
      assert.strictEqual(falseDefer.doubtReward, -0.5 * (1.0 - 0.90), 'False deferral on correct unambiguous proposal must incur penalty');
    });

    test('1.4 should enforce fail-closed confidence routing state machine', () => {
      // Dark pattern detected -> immediate REJECT_AS_UNSAFE regardless of high confidence
      const darkPattern = routeDecisionByConfidence(0.99, { isDarkPattern: true });
      assert.strictEqual(darkPattern.action, 'REJECT_AS_UNSAFE');
      assert.strictEqual(darkPattern.confidence, 0.000);

      // Low confidence (c < 0.75) -> DEFER
      const lowConf = routeDecisionByConfidence(0.749);
      assert.strictEqual(lowConf.action, 'DEFER');

      // High confidence (c >= 0.75) but ambiguous context -> DEFER
      const ambigHighConf = routeDecisionByConfidence(0.92, { isAmbiguous: true });
      assert.strictEqual(ambigHighConf.action, 'DEFER');

      // High confidence (c >= 0.75) safe unambiguous -> PROCEED
      const safeProceed = routeDecisionByConfidence(0.88, { isAmbiguous: false, isDarkPattern: false });
      assert.strictEqual(safeProceed.action, 'PROCEED');
    });

    test('1.5 should verify all 4 statistical calibration invariants over 1,000 episodes and detect uncalibrated failure modes', async () => {
      // 1. Verified calibrated cohort
      const summary = await runCarlEvaluation({ sampleCount: 1000 });
      assert.strictEqual(summary.passed, true);
      assert.ok(summary.invariants.brier_score.value <= CARL_DEFAULTS.brierCeiling, `Brier ${summary.invariants.brier_score.value} > ${CARL_DEFAULTS.brierCeiling}`);
      assert.ok(summary.invariants.expected_calibration_error.value <= CARL_DEFAULTS.eceCeiling, `ECE ${summary.invariants.expected_calibration_error.value} > ${CARL_DEFAULTS.eceCeiling}`);
      assert.ok(summary.invariants.auroc_discriminator.value >= CARL_DEFAULTS.aurocFloor, `AUROC ${summary.invariants.auroc_discriminator.value} < ${CARL_DEFAULTS.aurocFloor}`);
      assert.ok(summary.invariants.high_confidence_error_rate.value <= CARL_DEFAULTS.hcerCeiling, `HCER ${summary.invariants.high_confidence_error_rate.value} > ${CARL_DEFAULTS.hcerCeiling}`);

      // 2. Adversarial uncalibrated cohort: systematically overconfident wrong predictions
      const adversarialCohort = [];
      for (let i = 0; i < 500; i++) {
        // High confidence wrong predictions (c = 0.95, target = 0)
        adversarialCohort.push({ confidence: 0.95, target: false, isAmbiguous: false });
      }
      for (let i = 0; i < 500; i++) {
        // Low confidence correct predictions (c = 0.10, target = 1)
        adversarialCohort.push({ confidence: 0.10, target: true, isAmbiguous: false });
      }

      const advEval = evaluateCalibrationBattery(adversarialCohort);
      assert.strictEqual(advEval.passed, false, 'Adversarial inverted cohort must fail calibration battery');
      assert.strictEqual(advEval.brierPassed, false, 'Brier score must fail on inverted cohort');
      assert.strictEqual(advEval.ecePassed, false, 'ECE must fail on inverted cohort');
      assert.strictEqual(advEval.aurocPassed, false, 'AUROC must fail on inverted cohort');
      assert.strictEqual(advEval.hcerPassed, false, 'HCER must fail on inverted cohort');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. G-UX-018: LORA ZERO-INITIALIZATION, MERGING INVARIANTS & LATENCY SLA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. G-UX-018 LoRA Zero-Init, Merging & Latency Invariants', () => {

    test('2.1 should enforce strict zero-initialization invariant across all 12 canonical specialist personas', () => {
      assert.strictEqual(CANONICAL_PERSONAS.length, 12, 'Expected exactly 12 canonical personas');

      for (const personaName of CANONICAL_PERSONAS) {
        const adapter = new LoRAAdapter({
          name: personaName,
          inFeatures: 64,
          outFeatures: 64,
          r: 16,
          alpha: 32
        });

        // B matrix must be strictly all zeroes
        for (let r = 0; r < 64; r++) {
          for (let c = 0; c < 16; c++) {
            assert.strictEqual(adapter.loraB[r][c], 0.0, `loraB[${r}][${c}] in persona ${personaName} is non-zero`);
          }
        }

        // Delta W = (alpha / r) * (B @ A) must be identically zero
        const deltaW = adapter.computeDeltaW();
        for (let r = 0; r < 64; r++) {
          for (let c = 0; c < 64; c++) {
            assert.strictEqual(deltaW[r][c], 0.0, `Delta W[${r}][${c}] in persona ${personaName} is non-zero at step 0`);
          }
        }
      }
    });

    test('2.2 should verify linearMerge, tiesMerge, and dareMerge under orthogonal, conflicting, and zero-weight tensors', () => {
      const inDim = 8;
      const outDim = 8;
      const r = 4;

      // Adapter 1: Non-zero weights on coordinate (0, 0) = +4.0
      const a1 = new LoRAAdapter({ name: 'a1', inFeatures: inDim, outFeatures: outDim, r });
      a1.loraB[0][0] = 2.0;
      a1.loraA[0][0] = 1.0; // delta[0][0] = (32/4) * (2*1) = 16.0

      // Adapter 2: Non-zero weights on coordinate (0, 0) = -8.0 (conflicting) and (1, 1) = +8.0 (orthogonal)
      const a2 = new LoRAAdapter({ name: 'a2', inFeatures: inDim, outFeatures: outDim, r });
      a2.loraB[0][0] = -1.0;
      a2.loraA[0][0] = 1.0; // delta[0][0] = 8.0 * (-1*1) = -8.0
      a2.loraB[1][0] = 1.0;
      a2.loraA[0][1] = 1.0; // delta[1][1] = 8.0 * (1*1) = +8.0

      // 1. Linear merge with equal weights [0.5, 0.5]
      const linMerged = linearMerge([a1, a2], [0.5, 0.5]);
      assert.strictEqual(linMerged[0][0], 0.5 * 16.0 + 0.5 * (-8.0)); // 4.0
      assert.strictEqual(linMerged[1][1], 0.5 * 0.0 + 0.5 * 8.0); // 4.0

      // 2. TIES merge: density = 0.5 (top parameters by magnitude)
      const tiesMerged = tiesMerge([a1, a2], { density: 0.5, weights: [0.5, 0.5] });
      assert.ok(tiesMerged !== null);
      // Coordinate (0, 0): Vote = 0.5*16 + 0.5*(-8) = +4.0 >= 0 -> majority sign is +1.
      // Adapter 1 has positive sign (+16), Adapter 2 has negative sign (-8).
      // Disjoint merge averages matching signs -> kept Adapter 1 value 16.0!
      assert.strictEqual(tiesMerged[0][0], 16.0, 'TIES merge must elect majority sign and discard conflicting sign');

      // 3. DARE merge with dropRate = 0.50
      const dareMerged = dareMerge([a1, a2], { dropRate: 0.50, seed: 999 });
      assert.ok(dareMerged !== null);
      assert.strictEqual(dareMerged.length, outDim);

      // 4. Fail-closed error handling on invalid inputs
      assert.throws(() => linearMerge([]), /non-empty array/);
      assert.throws(() => linearMerge([a1], [-1.0]), /positive/);
      assert.throws(() => tiesMerge([a1], { density: 0.0 }), /density/);
      assert.throws(() => tiesMerge([a1], { density: 1.5 }), /density/);
      assert.throws(() => dareMerge([a1], { dropRate: -0.1 }), /dropRate/);
      assert.throws(() => dareMerge([a1], { dropRate: 1.0 }), /dropRate/);
    });

    test('2.3 should benchmark adapter swapping latency over 500 consecutive persona transitions asserting P100 < 50ms SLA', () => {
      const registry = new PersonaAdapterRegistry({ inFeatures: 64, outFeatures: 64, r: 16 });
      const transitionCount = 500;
      const latencies = [];

      const strategies = ['linear', 'ties', 'dare'];

      for (let i = 0; i < transitionCount; i++) {
        // Pick a team of 4 to 8 personas dynamically
        const teamSize = 4 + (i % 5);
        const team = [];
        for (let j = 0; j < teamSize; j++) {
          team.push(CANONICAL_PERSONAS[(i + j * 3) % 12]);
        }
        const strategy = strategies[i % 3];

        const t0 = performance.now();
        const synthesis = registry.synthesizeTeamAdapter(team, {
          strategy,
          density: 0.20,
          dropRate: 0.50
        });
        const elapsed = performance.now() - t0;
        latencies.push(elapsed);

        assert.strictEqual(synthesis.underLatencySla, true, `Synthesis exceeded SLA at iteration ${i}: ${synthesis.durationMs}ms`);
      }

      latencies.sort((a, b) => a - b);
      const minLatency = latencies[0];
      const maxLatency = latencies[latencies.length - 1]; // P100
      const medianLatency = latencies[Math.floor(latencies.length * 0.50)];
      const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
      const p99Latency = latencies[Math.floor(latencies.length * 0.99)];
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      assert.ok(maxLatency < 50.0, `P100 max swapping latency ${maxLatency}ms violated < 50ms SLA`);
      assert.ok(p99Latency < 25.0, `P99 swapping latency ${p99Latency}ms should be < 25ms`);
      assert.ok(avgLatency < 10.0, `Average swapping latency ${avgLatency}ms should be < 10ms`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. G-UX-019: MODEL PROVENANCE LEDGER TAMPERING, CHAINING & DISK DIGESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. G-UX-019 Model Provenance Ledger Tamper Resistance & Lineage Invariants', () => {

    test('3.1 should detect bit-level payload tampering in sealed blocks fail-closed via HMAC signature mismatch', () => {
      const ledger = new ModelProvenanceLedger();
      const block0 = ledger.appendBlock({ modelId: 'test-model-sft' });
      const block1 = ledger.appendBlock({ modelId: 'test-model-dpo' });

      // Clean ledger passes
      const cleanVerify = ledger.verifyLedger();
      assert.strictEqual(cleanVerify.valid, true);

      // Attack 1: Mutate modelId in sealed block
      const tamperedLedger1 = new ModelProvenanceLedger();
      const corruptedBlock0 = JSON.parse(JSON.stringify(block0));
      corruptedBlock0.model_id = 'malicious-injected-weights';
      tamperedLedger1.blocks = [corruptedBlock0, block1];

      const tamperRes1 = tamperedLedger1.verifyLedger();
      assert.strictEqual(tamperRes1.valid, false, 'Ledger must fail closed when model_id is tampered');
      assert.ok(tamperRes1.errors.some(e => e.includes('Invalid HMAC-SHA256 signature')));

      // Attack 2: Mutate evaluation metric (e.g. claim falsified low ECE)
      const tamperedLedger2 = new ModelProvenanceLedger();
      const corruptedBlock1 = JSON.parse(JSON.stringify(block1));
      corruptedBlock1.evaluation_metrics.ece = 0.001; // Falsified metric
      tamperedLedger2.blocks = [block0, corruptedBlock1];

      const tamperRes2 = tamperedLedger2.verifyLedger();
      assert.strictEqual(tamperRes2.valid, false, 'Ledger must fail closed when evaluation metrics are falsified');
      assert.ok(tamperRes2.errors.some(e => e.includes('Invalid HMAC-SHA256 signature')));

      // Attack 3: Mutate dataset lineage hash
      const tamperedLedger3 = new ModelProvenanceLedger();
      const corruptedBlock2 = JSON.parse(JSON.stringify(block0));
      corruptedBlock2.dataset_lineage.stage2_scene_graphs_sha256 = '0'.repeat(64);
      tamperedLedger3.blocks = [corruptedBlock2, block1];

      const tamperRes3 = tamperedLedger3.verifyLedger();
      assert.strictEqual(tamperRes3.valid, false, 'Ledger must fail closed when dataset lineage hash is tampered');
      assert.ok(tamperRes3.errors.some(e => e.includes('Invalid HMAC-SHA256 signature')));
    });

    test('3.2 should detect broken hash chaining and out-of-order block injection fail-closed', () => {
      const ledger = new ModelProvenanceLedger();
      const block0 = ledger.appendBlock({ modelId: 'block-0' });
      const block1 = ledger.appendBlock({ modelId: 'block-1' });

      // Attack 1: Swap block 0 and block 1 (out-of-order injection)
      const swappedLedger = new ModelProvenanceLedger();
      swappedLedger.blocks = [block1, block0];

      const swapRes = swappedLedger.verifyLedger();
      assert.strictEqual(swapRes.valid, false, 'Out-of-order block sequence must fail verification');

      // Attack 2: Tamper with previous_block_hash in Block 1
      const brokenChainLedger = new ModelProvenanceLedger();
      const brokenBlock1 = JSON.parse(JSON.stringify(block1));
      brokenBlock1.previous_block_hash = 'e'.repeat(64); // Foreign hash
      brokenChainLedger.blocks = [block0, brokenBlock1];

      const chainRes = brokenChainLedger.verifyLedger();
      assert.strictEqual(chainRes.valid, false, 'Broken previous_block_hash chain linkage must fail verification');
      assert.ok(chainRes.errors.some(e => e.includes('Broken hash chain') || e.includes('Invalid HMAC-SHA256 signature')));
    });

    test('3.3 should enforce schema validation rejecting malformed, truncated, or invalid manifests', () => {
      // Empty manifest
      assert.strictEqual(validateProvenanceSchema(null).valid, false);
      assert.strictEqual(validateProvenanceSchema({}).valid, false);

      // Missing required field: source_revision
      const missingField = {
        schema_version: 1,
        model_id: 'test',
        base_checkpoint: 'base',
        // missing source_revision
        generated_at: new Date().toISOString(),
        dataset_lineage: { stage2_scene_graphs_sha256: 'a'.repeat(64), stage4_trajectories_sha256: 'b'.repeat(64), stage5_preferences_sha256: 'c'.repeat(64) },
        tokenizer: { name: 'tok', sha256: 'd'.repeat(64) },
        training_config: {},
        evaluation_metrics: {},
        artifacts: [],
        block_index: 0,
        previous_block_hash: GENESIS_PREV_HASH,
        hmac_signature: 'f'.repeat(64)
      };
      const resMissing = validateProvenanceSchema(missingField);
      assert.strictEqual(resMissing.valid, false);
      assert.ok(resMissing.errors.some(e => e.includes('source_revision')));

      // Invalid hash pattern (non-hex or wrong length)
      const invalidHash = {
        ...missingField,
        source_revision: 'abc',
        previous_block_hash: 'not-a-valid-sha256-hash'
      };
      const resInvalidHash = validateProvenanceSchema(invalidHash);
      assert.strictEqual(resInvalidHash.valid, false);
      assert.ok(resInvalidHash.errors.some(e => e.includes('previous_block_hash')));
    });

    test('3.4 should verify physical disk SHA-256 byte hashes for Stages 1 through 6 curriculum datasets', () => {
      const rootDir = process.cwd();
      const lineage = collectCurriculumLineage(rootDir);

      const targets = {
        stage1_taxonomy_sha256: 'schemas/ui-taxonomy.schema.json',
        stage2_scene_graphs_sha256: 'artifacts/curriculum/stage2_scene_graphs/manifest.json',
        stage3_heuristics_sha256: 'artifacts/curriculum/stage3_heuristics/summary.json',
        stage4_trajectories_sha256: 'artifacts/curriculum/stage4_trajectories/manifest.json',
        stage5_preferences_sha256: 'artifacts/curriculum/stage5_preferences/manifest.json',
        stage6_adversarial_sha256: 'artifacts/curriculum/stage6_adversarial/manifest.json'
      };

      for (const [key, relPath] of Object.entries(targets)) {
        const fullPath = path.resolve(rootDir, relPath);
        assert.ok(fs.existsSync(fullPath), `Curriculum dataset file missing on disk: ${relPath}`);

        // Compute direct byte hash from disk
        const fileBytes = fs.readFileSync(fullPath);
        const diskSha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');

        assert.strictEqual(
          lineage[key],
          diskSha256,
          `Lineage hash for ${key} (${lineage[key]}) does not match physical disk hash (${diskSha256})`
        );
      }
    });

    test('3.5 should verify end-to-end provenance verification workflow and output valid receipt', async () => {
      const summary = await runModelProvenanceVerification();
      assert.strictEqual(summary.passed, true);
      assert.strictEqual(summary.ledger_chain.total_blocks, 2);
      assert.strictEqual(summary.ledger_chain.chain_verified, true);
      assert.ok(summary.ledger_chain.genesis_block_hash.length === 64);
      assert.ok(summary.ledger_chain.head_block_hash.length === 64);
    });
  });
});
