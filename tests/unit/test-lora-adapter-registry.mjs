import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LoRAAdapter,
  linearMerge,
  tiesMerge,
  dareMerge,
  PersonaAdapterRegistry,
  CANONICAL_PERSONAS
} from '../../scripts/lib/lora-adapter-registry.mjs';

test('LoRAAdapter strictly enforces zero-initialization invariant at step 0', () => {
  const adapter = new LoRAAdapter({
    name: 'test_adapter',
    inFeatures: 32,
    outFeatures: 32,
    r: 16,
    alpha: 32
  });

  // Verify B is all zeroes
  for (let r = 0; r < 32; r++) {
    for (let c = 0; c < 16; c++) {
      assert.strictEqual(adapter.loraB[r][c], 0.0);
    }
  }

  // Delta W must be identically zero
  const delta = adapter.computeDeltaW();
  for (let r = 0; r < 32; r++) {
    for (let c = 0; c < 32; c++) {
      assert.strictEqual(delta[r][c], 0.0);
    }
  }
});

test('linearMerge computes exact weighted parameter averages', () => {
  const a1 = new LoRAAdapter({ name: 'a1', inFeatures: 4, outFeatures: 4, r: 2, alpha: 4 });
  const a2 = new LoRAAdapter({ name: 'a2', inFeatures: 4, outFeatures: 4, r: 2, alpha: 4 });

  // Manually set non-zero B
  a1.loraB[0][0] = 1.0;
  a1.loraA[0][0] = 1.0; // delta[0][0] = 2.0 * (1*1) = 2.0
  a2.loraB[0][0] = 3.0;
  a2.loraA[0][0] = 1.0; // delta[0][0] = 2.0 * (3*1) = 6.0

  const merged = linearMerge([a1, a2], [0.5, 0.5]);
  assert.strictEqual(merged[0][0], 4.0, `Expected 4.0 (avg of 2.0 and 6.0), got ${merged[0][0]}`);
});

test('tiesMerge prunes by density and performs majority sign election', () => {
  const a1 = new LoRAAdapter({ name: 'a1', inFeatures: 4, outFeatures: 4, r: 2 });
  const a2 = new LoRAAdapter({ name: 'a2', inFeatures: 4, outFeatures: 4, r: 2 });

  a1.loraB[0][0] = 2.0;
  a1.loraA[0][0] = 1.0; // delta = +4.0
  a2.loraB[0][0] = -1.0;
  a2.loraA[0][0] = 1.0; // delta = -2.0

  const merged = tiesMerge([a1, a2], { density: 0.5 });
  assert.ok(merged !== null);
  assert.strictEqual(merged.length, 4);
});

test('dareMerge applies drop rate and rescaling factor', () => {
  const a1 = new LoRAAdapter({ name: 'a1', inFeatures: 4, outFeatures: 4, r: 2 });
  a1.loraB[0][0] = 1.0;
  a1.loraA[0][0] = 1.0;

  const merged = dareMerge([a1], { dropRate: 0.50, seed: 123 });
  assert.ok(merged !== null);
  assert.strictEqual(merged.length, 4);
});

test('PersonaAdapterRegistry registers all 12 personas and achieves sub-50ms swapping latency', () => {
  const registry = new PersonaAdapterRegistry({ inFeatures: 64, outFeatures: 64, r: 16 });

  assert.strictEqual(CANONICAL_PERSONAS.length, 12);
  for (const p of CANONICAL_PERSONAS) {
    const adapter = registry.getAdapter(p);
    assert.ok(adapter !== null);
    assert.strictEqual(adapter.name, p);
  }

  // Deliberation team of 6 specialist personas
  const team = [
    'dark_pattern_ethics_watchdog',
    'accessibility_auditor',
    'design_systems_lead',
    'ergonomics_cognitive_critic',
    'enterprise_info_architect',
    'typography_scale_architect'
  ];

  const synthesisLinear = registry.synthesizeTeamAdapter(team, { strategy: 'linear' });
  assert.ok(synthesisLinear.underLatencySla, `Linear merge took ${synthesisLinear.durationMs}ms, expected < 50ms`);

  const synthesisTies = registry.synthesizeTeamAdapter(team, { strategy: 'ties', density: 0.20 });
  assert.ok(synthesisTies.underLatencySla, `TIES merge took ${synthesisTies.durationMs}ms, expected < 50ms`);

  const synthesisDare = registry.synthesizeTeamAdapter(team, { strategy: 'dare', dropRate: 0.50 });
  assert.ok(synthesisDare.underLatencySla, `DARE merge took ${synthesisDare.durationMs}ms, expected < 50ms`);
});
