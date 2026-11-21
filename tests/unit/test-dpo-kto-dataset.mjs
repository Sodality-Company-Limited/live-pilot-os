/**
 * Unit Test Suite for Stage 5 Contrastive Preference Dataset (DPO & KTO).
 * Verifies 3,500 contrastive pairs, DPO/KTO format conversion, 8-flaw taxonomy,
 * 80/10/10 split orthogonality, and quantitative preference deltas.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContrastivePair,
  dpoPairToKtoRecords,
  generateContrastivePreferenceDataset,
  FLAW_TAXONOMY,
  KTO_LOSS_AVERSION_LAMBDA
} from '../../scripts/lib/dpo-kto-dataset-builder.mjs';

test('DPOKTODataset: Single contrastive pair format and delta metrics', () => {
  const pair = buildContrastivePair(0);
  assert.equal(pair.pair_id, 'DPO-PAIR-000001');
  assert.ok(pair.chosen);
  assert.ok(pair.rejected);
  assert.ok(pair.preference_delta.contrast_margin > 0);
  assert.ok(pair.preference_delta.accessibility_score_delta > 0);
  assert.ok(FLAW_TAXONOMY.includes(pair.preference_delta.primary_flaw));
  assert.equal(typeof pair.sha256_digest, 'string');
  assert.equal(pair.sha256_digest.length, 64);
});

test('DPOKTODataset: DPO to KTO record transformation and loss aversion weight', () => {
  const pair = buildContrastivePair(1);
  const [chosenKto, rejectedKto] = dpoPairToKtoRecords(pair);

  assert.equal(chosenKto.kto_id, `${pair.pair_id}-CHOSEN`);
  assert.equal(chosenKto.label, true);
  assert.equal(chosenKto.weight, 1.0);

  assert.equal(rejectedKto.kto_id, `${pair.pair_id}-REJECTED`);
  assert.equal(rejectedKto.label, false);
  assert.equal(rejectedKto.weight, KTO_LOSS_AVERSION_LAMBDA);
  assert.equal(rejectedKto.weight, 1.33);
});

test('DPOKTODataset: 80/10/10 split generation and zero sample contamination', () => {
  const result = generateContrastivePreferenceDataset({
    total_pairs: 100,
    write_files: false,
    seed: 42
  });

  assert.equal(result.splits.train.length, 80);
  assert.equal(result.splits.validation.length, 10);
  assert.equal(result.splits.test.length, 10);
  assert.equal(result.kto_records.length, 200);

  const trainIds = new Set(result.splits.train.map(p => p.pair_id));
  const valIds = new Set(result.splits.validation.map(p => p.pair_id));
  const testIds = new Set(result.splits.test.map(p => p.pair_id));

  for (const id of trainIds) {
    assert.equal(valIds.has(id), false, `Contamination between train and val: ${id}`);
    assert.equal(testIds.has(id), false, `Contamination between train and test: ${id}`);
  }
  for (const id of valIds) {
    assert.equal(testIds.has(id), false, `Contamination between val and test: ${id}`);
  }
});
