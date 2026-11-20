import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatChatTemplate,
  formatSceneGraphContext,
  validateUxDecisionSchema,
  computeTokenCrossEntropy,
  evaluateSchemaConformance,
  createCanonicalUxDecision,
  runSftPipeline
} from '../../scripts/lib/ux-sft-pipeline.mjs';

test('formatSceneGraphContext serializes nodes and edges deterministically', () => {
  const sg = {
    viewport: 'desktop',
    nodes: [
      { id: 'btn_1', role: 'button', bounding_box: [100, 200, 150, 40] },
      { id: 'hdr_1', role: 'heading', bounding_box: [50, 50, 300, 60] }
    ],
    edges: [
      { source: 'hdr_1', target: 'btn_1', relationship: 'precedes' }
    ]
  };
  const formatted = formatSceneGraphContext(sg);
  assert.ok(formatted.includes('[UI_SCENE_GRAPH: viewport=desktop, node_count=2]'));
  assert.ok(formatted.includes('NODE id=btn_1 role=button'));
  assert.ok(formatted.includes('NODE id=hdr_1 role=heading'));
  assert.ok(formatted.includes('EDGE hdr_1 --(precedes)--> btn_1'));
});

test('formatChatTemplate builds multi-turn prompt with system prompt and personas', () => {
  const result = formatChatTemplate({
    taskIntent: 'Ensure 7:1 contrast on submit button.',
    participatingPersonas: ['accessibility_auditor', 'dark_pattern_ethics_watchdog'],
    constraints: 'Zero raw hex literals',
    targetDecision: { summary: 'Use bg-primary-600' }
  });

  assert.ok(result.prompt.includes('<|system|>'));
  assert.ok(result.prompt.includes('accessibility_auditor, dark_pattern_ethics_watchdog'));
  assert.ok(result.prompt.includes('[CONSTRAINTS]\nZero raw hex literals'));
  assert.ok(result.completion.includes('Use bg-primary-600'));
});

test('validateUxDecisionSchema correctly validates canonical decision vs flawed', () => {
  const validDecision = createCanonicalUxDecision({
    decisionId: 'UX-DEC-0001-001',
    goalId: 'G-UX-015'
  });
  const validRes = validateUxDecisionSchema(validDecision);
  assert.strictEqual(validRes.valid, true, `Validation errors: ${validRes.errors.join(', ')}`);

  const invalidDecision = {
    schema_version: 2, // invalid version
    decision_id: 'bad-id',
    confidence: 1.5 // out of bounds
  };
  const invalidRes = validateUxDecisionSchema(invalidDecision);
  assert.strictEqual(invalidRes.valid, false);
  assert.ok(invalidRes.errors.length >= 3);
});

test('validateUxDecisionSchema rejects empty string fields fail-closed', () => {
  const dec1 = createCanonicalUxDecision();
  dec1.decision_id = '';
  assert.strictEqual(validateUxDecisionSchema(dec1).valid, false);

  const dec2 = createCanonicalUxDecision();
  dec2.lifecycle_state = '';
  assert.strictEqual(validateUxDecisionSchema(dec2).valid, false);

  const dec3 = createCanonicalUxDecision();
  dec3.risk_level = '';
  assert.strictEqual(validateUxDecisionSchema(dec3).valid, false);
});

test('computeTokenCrossEntropy masks prompt tokens and computes loss on completion', () => {
  // Vocabulary size 4
  const logits = [
    [5.0, 0.1, 0.1, 0.1], // token 0: prompt
    [0.1, 5.0, 0.1, 0.1], // token 1: prompt
    [0.1, 0.1, 6.0, 0.1], // token 2: completion (target 2)
    [0.1, 0.1, 0.1, 6.0]  // token 3: completion (target 3)
  ];
  const targets = [0, 1, 2, 3];
  const promptLength = 2;

  const loss = computeTokenCrossEntropy(logits, targets, promptLength);
  assert.ok(typeof loss === 'number');
  assert.ok(loss >= 0.0);
  assert.ok(loss < 0.1, `Loss should be very small for high target logits, got ${loss}`);
});

test('runSftPipeline achieves >= 98% schema conformance target', async () => {
  const summary = await runSftPipeline({
    validationSampleCount: 500,
    targetConformanceRate: 0.980
  });

  assert.strictEqual(summary.pipeline, 'ux_supervised_fine_tuning');
  assert.strictEqual(summary.goal_id, 'G-UX-015');
  assert.ok(summary.evaluation.evaluated_samples === 500);
  assert.ok(summary.evaluation.conformance_rate >= 0.980, `Expected >= 98%, got ${summary.evaluation.conformance_rate}`);
  assert.strictEqual(summary.evaluation.passed, true);
});
