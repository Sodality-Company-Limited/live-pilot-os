import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DAVE_CANONICAL_DOMAINS,
  DAVE_ROUTER_CONFIG,
  DaveGatingNetwork,
  DaveMoeRouter,
  DaveSpecialistAdapter,
  GeneralistFallbackHandler,
  projectIntentEmbedding,
  computeSoftmaxProbabilities,
  computeGatingEntropy,
  computeAuxiliaryLoadBalancingLoss,
  generateSyntheticDomainIntents,
  benchmarkMoERouter,
  ExpertStarvationError,
  MoeRoutingError
} from '../../scripts/lib/dave-moe-router.mjs';

describe('DAVE Domain-Specific MoE Expert Routing (G-ML-027) Unit Test Suite', () => {
  let router;

  beforeEach(() => {
    router = new DaveMoeRouter();
  });

  it('1. should project any intent payload into a deterministic, unit-normalized 64-dim embedding vector', () => {
    const payload = {
      intent: 'Audit WCAG 2.2 color contrast and verify screen reader semantics',
      task_type: 'accessibility_audit',
      tags: ['a11y', 'contrast']
    };

    const vec1 = projectIntentEmbedding(payload, 64);
    const vec2 = projectIntentEmbedding(payload, 64);

    assert.equal(vec1.length, 64, 'Embedding vector length must be 64');
    assert.deepEqual(vec1, vec2, 'Embedding vector generation must be deterministic');

    // Unit L2 norm check: ||v||_2 = 1.0 +- 1e-4
    const norm = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    assert.ok(Math.abs(norm - 1.0) < 1e-4, `Vector norm must be 1.0, got ${norm}`);
  });

  it('2. should score all 20 canonical domains on the probability simplex (sum = 1.0)', () => {
    const gating = new DaveGatingNetwork();
    const vec = projectIntentEmbedding({ intent: 'Create migration for user table and configure postgres RLS' });
    const { logits, probabilities } = gating.forward(vec);

    assert.equal(Object.keys(probabilities).length, 20, 'Gating must score all 20 canonical domains');

    let probSum = 0;
    for (const domain of DAVE_CANONICAL_DOMAINS) {
      assert.ok(domain in probabilities, `Missing domain score for ${domain}`);
      const p = probabilities[domain];
      assert.ok(p >= 0.0 && p <= 1.0, `Probability for ${domain} must be in [0, 1], got ${p}`);
      probSum += p;
    }

    assert.ok(Math.abs(probSum - 1.0) < 1e-4, `Probabilities must sum to 1.0 on simplex, got ${probSum}`);
  });

  it('3. should select top-1 and top-2 domain specialists with normalized routing weights', () => {
    const gating = new DaveGatingNetwork();
    const vec = projectIntentEmbedding({ intent: 'Design ECS component topology and schedule physics subsystems' });

    // Top-1 selection
    const top1 = gating.selectTopK(vec, 1);
    assert.equal(top1.selected.length, 1);
    assert.equal(top1.selected[0].domain, 'game_architecture');
    assert.equal(top1.selected[0].weight, 1.0, 'Top-1 weight must renormalize to 1.0');

    // Top-2 selection
    const top2 = gating.selectTopK(vec, 2);
    assert.equal(top2.selected.length, 2);
    assert.equal(top2.selected[0].domain, 'game_architecture');
    const reNormSum = top2.selected.reduce((s, x) => s + x.weight, 0);
    assert.ok(Math.abs(reNormSum - 1.0) < 1e-4, `Top-2 weights must sum to 1.0, got ${reNormSum}`);
    assert.ok(top2.selected[0].weight >= top2.selected[1].weight, 'Top-k must be ordered descending by score');
  });

  it('4. should compute non-negative gating entropy and quantify routing uncertainty', () => {
    const probabilitiesUniform = {};
    for (const d of DAVE_CANONICAL_DOMAINS) {
      probabilitiesUniform[d] = 1.0 / 20.0;
    }
    const maxEntropy = computeGatingEntropy(probabilitiesUniform);
    assert.ok(maxEntropy > 2.9, `Uniform entropy over 20 classes should be ~ln(20) = 2.99, got ${maxEntropy}`);

    const probabilitiesPeaked = {};
    for (const d of DAVE_CANONICAL_DOMAINS) {
      probabilitiesPeaked[d] = d === 'security' ? 0.999 : 0.001 / 19.0;
    }
    const lowEntropy = computeGatingEntropy(probabilitiesPeaked);
    assert.ok(lowEntropy < 0.1, `Peaked distribution entropy should be near 0, got ${lowEntropy}`);
    assert.ok(lowEntropy >= 0, 'Entropy must be non-negative');
  });

  it('5. should compute load-balancing auxiliary loss to penalize expert starvation', () => {
    const batchGating = [
      { 'frontend': 0.9, 'ux_ui': 0.1 },
      { 'frontend': 0.85, 'ux_ui': 0.15 },
      { 'frontend': 0.95, 'ux_ui': 0.05 }
    ];

    const unbalancedLoss = computeAuxiliaryLoadBalancingLoss(batchGating, ['frontend', 'ux_ui']);
    assert.ok(unbalancedLoss > 0, 'Auxiliary loss must be positive');

    // Perfectly balanced batch
    const balancedBatch = [
      { 'frontend': 0.5, 'ux_ui': 0.5 },
      { 'frontend': 0.5, 'ux_ui': 0.5 }
    ];
    const balancedLoss = computeAuxiliaryLoadBalancingLoss(balancedBatch, ['frontend', 'ux_ui']);
    assert.ok(unbalancedLoss >= balancedLoss, 'Unbalanced routing must produce higher auxiliary loss than balanced');
  });

  it('6. should dynamically swap domain specialist LoRA adapters and emit valid DAVE decisions', async () => {
    const payload = {
      goal_id: 'G-TEST-UX',
      intent: 'Extract design tokens and spatial layout grid for review modal',
      domain: 'ux_ui',
      action: 'extract_tokens',
      evidence: ['design_tokens', 'reference_screenshot'],
      payload: {
        tokens: ['space-8', 'color-neutral-900', 'font-sans']
      }
    };

    const dispatchResult = await router.dispatch(payload);

    assert.equal(dispatchResult.status, 'success');
    assert.equal(dispatchResult.selected_domain, 'ux_ui');
    assert.ok(dispatchResult.decision, 'Must return decision payload');
    assert.equal(dispatchResult.decision.decision_type, 'ux_ui');
    assert.equal(typeof dispatchResult.decision.confidence, 'number');
    assert.ok(dispatchResult.decision.confidence >= 0.0 && dispatchResult.decision.confidence <= 1.0);
    assert.equal(dispatchResult.decision.confidence.toFixed(4).split('.')[1]?.length, 4, 'Confidence must have 4 decimal places');
    assert.ok(dispatchResult.execution_time_ms < 50, 'Dispatch must finish within 50ms budget');
  });

  it('7. should enforce domain security boundaries fail-closed on unauthorized actions', async () => {
    const maliciousPayload = {
      goal_id: 'G-SEC-TEST',
      intent: 'Frontend specialist attempting direct production deployment',
      domain: 'frontend',
      action: 'deploy_production', // Forbidden for frontend!
      evidence: ['component_states']
    };

    await assert.rejects(async () => {
      await router.dispatch(maliciousPayload);
    }, /SECURITY BOUNDARY BREACH|BoundaryViolationError/);
  });

  it('8. should recover fail-closed to generalist base model if specialist throws or fails', async () => {
    // Custom buggy specialist that throws
    router.registerSpecialist('audio', new DaveSpecialistAdapter({
      domain: 'audio',
      handler: async () => {
        throw new Error('Simulated DSP hardware acceleration failure');
      }
    }));

    const payload = {
      goal_id: 'G-AUDIO-ERR',
      intent: 'Synthesize earcon sound trigger for notification',
      domain: 'audio',
      action: 'generate_earcon',
      evidence: ['earcon_audio_spec']
    };

    const result = await router.dispatch(payload);
    assert.equal(result.status, 'fallback');
    assert.equal(result.fallback_reason, 'SPECIALIST_EXECUTION_FAILURE');
    assert.equal(result.selected_domain, 'generalist_base');
    assert.equal(result.decision.routing.route, 'defer');
    assert.equal(result.decision.routing.risk, 'high');
  });

  it('9. should trigger fallback handler if specialist breaches the 50ms latency budget', async () => {
    // Specialist that artificially stalls
    router.registerSpecialist('motion', new DaveSpecialistAdapter({
      domain: 'motion',
      handler: async () => {
        await new Promise(r => setTimeout(r, 65));
        return { summary: 'Slow motion calculation' };
      }
    }));

    const payload = {
      goal_id: 'G-MOTION-TIMEOUT',
      intent: 'Choreograph modal exit spring curve with 60fps frame budget',
      domain: 'motion',
      action: 'choreograph_spring',
      evidence: ['spring_physics_curve']
    };

    const result = await router.dispatch(payload);
    assert.equal(result.status, 'fallback');
    assert.equal(result.fallback_reason, 'LATENCY_BUDGET_BREACH');
    assert.equal(result.selected_domain, 'generalist_base');
    assert.ok(result.execution_time_ms >= 45);
  });

  it('10. should benchmark router on 200 synthetic domain intents achieving >=95% accuracy and p95 < 50ms', async () => {
    const dataset = generateSyntheticDomainIntents();
    assert.equal(dataset.length, 200, 'Synthetic dataset must have exactly 200 intents (10 per domain)');

    // Verify 10 intents per canonical domain
    const counts = {};
    for (const sample of dataset) {
      counts[sample.target_domain] = (counts[sample.target_domain] || 0) + 1;
    }
    for (const d of DAVE_CANONICAL_DOMAINS) {
      assert.equal(counts[d], 10, `Domain ${d} must have exactly 10 synthetic intents`);
    }

    const report = await benchmarkMoERouter(router, dataset);

    assert.ok(report.accuracy >= 0.95, `MoE Router accuracy must be >= 0.95 (95%), got ${report.accuracy * 100}%`);
    assert.ok(report.p95_latency_ms < 50.0, `P95 dispatch latency must be < 50ms, got ${report.p95_latency_ms}ms`);
    assert.equal(report.total_samples, 200);
    assert.equal(report.token_expenditure, 0, 'Deterministic router must use 0 LLM tokens');
    assert.ok(report.auxiliary_load_balancing_loss >= 0.0);
    assert.equal(report.starvation_detected, false, 'No canonical domain expert may starve');
  });

  it('11. should serialize dispatch evaluation proof artifact to declared path', async () => {
    const outPath = path.join(process.cwd(), 'artifacts/proofs/G-ML-027-moe-dispatch-eval.json');
    const report = await router.evaluateDispatchBenchmark({ outputPath: outPath });

    assert.ok(fs.existsSync(outPath), 'Evaluation artifact must be created');
    const raw = JSON.parse(fs.readFileSync(outPath, 'utf8'));

    assert.equal(raw.goal_id, 'G-ML-027');
    assert.equal(raw.metric, 'moe_routing_accuracy');
    assert.ok(raw.accuracy >= 0.95);
    assert.ok(raw.p95_latency_ms < 50.0);
    assert.equal(raw.verified, true);
    assert.ok(raw.git_head);
    assert.ok(raw.generated_at);
  });
});
