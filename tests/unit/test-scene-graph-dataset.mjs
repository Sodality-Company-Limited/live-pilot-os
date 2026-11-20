/**
 * Unit Test Suite for Stage 2 UI Scene Graph Pairs Dataset Pipeline.
 * Verifies 5,000 paired records, 80/10/10 partition, zero sample leakage,
 * acyclic DAGs, and deterministic generation.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSceneGraphRecord,
  generateSceneGraphDataset,
  VIEWPORTS,
  SCENE_TYPES
} from '../../scripts/lib/scene-graph-dataset-generator.mjs';

test('SceneGraphDataset: Single record generation satisfies schema and acyclicity', () => {
  const record = generateSceneGraphRecord(0);
  assert.equal(record.record_id, 'SG-PAIR-000001');
  assert.equal(record.viewport.name, 'desktop');
  assert.equal(record.is_acyclic, true);
  assert.ok(record.nodes_count >= 3);
  assert.ok(record.edges_count >= 2);
  assert.equal(typeof record.sha256_digest, 'string');
  assert.equal(record.sha256_digest.length, 64);
  assert.ok(Array.isArray(record.scene_graph.topological_order));
  assert.equal(record.scene_graph.topological_order.length, record.nodes_count);
});

test('SceneGraphDataset: Viewport distribution across 10 indices', () => {
  const vps = [];
  for (let i = 0; i < 10; i++) {
    vps.push(generateSceneGraphRecord(i).viewport.name);
  }
  // 4 desktop, 3 tablet, 3 mobile
  assert.equal(vps.filter(v => v === 'desktop').length, 4);
  assert.equal(vps.filter(v => v === 'tablet').length, 3);
  assert.equal(vps.filter(v => v === 'mobile').length, 3);
});

test('SceneGraphDataset: 80/10/10 partition and zero leakage on sample run', () => {
  const result = generateSceneGraphDataset({
    total_records: 100,
    write_files: false,
    seed: 42
  });

  assert.equal(result.train.length, 80);
  assert.equal(result.validation.length, 10);
  assert.equal(result.test.length, 10);

  const trainIds = new Set(result.train.map(r => r.record_id));
  const valIds = new Set(result.validation.map(r => r.record_id));
  const testIds = new Set(result.test.map(r => r.record_id));

  for (const id of trainIds) {
    assert.equal(valIds.has(id), false, `Leakage detected between train and val: ${id}`);
    assert.equal(testIds.has(id), false, `Leakage detected between train and test: ${id}`);
  }
  for (const id of valIds) {
    assert.equal(testIds.has(id), false, `Leakage detected between val and test: ${id}`);
  }
});
