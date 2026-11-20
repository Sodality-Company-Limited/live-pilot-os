/**
 * Unit Test Suite for Vision Detector Benchmark Spike.
 * Verifies benchmark candidate evaluation, latency distributions,
 * trade-off calculations, and scorecard JSON schema structure.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SCORECARD_PATH = 'artifacts/benchmarks/vision_detector_spike.json';

test('VisionBenchmarkSpike: Scorecard Artifact Exists and Is Valid JSON', () => {
  const fullPath = resolve(process.cwd(), SCORECARD_PATH);
  assert.ok(existsSync(fullPath), 'Scorecard file must exist');

  const content = JSON.parse(readFileSync(fullPath, 'utf8'));
  assert.equal(content.schema_version, '1.0.0');
  assert.equal(content.benchmark_episodes_count, 50);
  assert.ok(content.candidates);
});

test('VisionBenchmarkSpike: Gemma 4 Metrics & SLA Bounds', () => {
  const content = JSON.parse(readFileSync(resolve(process.cwd(), SCORECARD_PATH), 'utf8'));
  const gemma = content.candidates.gemma_4_native_multimodal;

  assert.ok(gemma);
  assert.equal(gemma.parameter_count, 9240000000);
  assert.ok(gemma.latency_p95_ms < 250.0);
  assert.ok(gemma.map50 >= 0.90);
  assert.ok(gemma.map50_95 >= 0.80);
  assert.ok(gemma.iou_ge_90_rate >= 0.90);
  assert.equal(gemma.acyclic_dag_rate, 1.0);
  assert.ok(gemma.semantic_reasoning_score >= 0.90);
});

test('VisionBenchmarkSpike: YOLOv11 and EfficientNet Comparison Invariants', () => {
  const content = JSON.parse(readFileSync(resolve(process.cwd(), SCORECARD_PATH), 'utf8'));
  const gemma = content.candidates.gemma_4_native_multimodal;
  const yolo = content.candidates.yolov11_ui_specialized;
  const eff = content.candidates.efficientnet_b4_mask_rcnn;

  // YOLO is faster in mean latency
  assert.ok(yolo.latency_mean_ms < gemma.latency_mean_ms);
  // But YOLO has lower mAP and cycle failures
  assert.ok(yolo.map50_95 < gemma.map50_95);
  assert.ok(yolo.acyclic_dag_rate < 1.0);

  // EfficientNet is between YOLO and Gemma in parameters
  assert.ok(eff.parameter_count > yolo.parameter_count);
  assert.ok(eff.parameter_count < gemma.parameter_count);
});

test('VisionBenchmarkSpike: Policy Selection Logic', () => {
  const content = JSON.parse(readFileSync(resolve(process.cwd(), SCORECARD_PATH), 'utf8'));
  const policy = content.recommended_policy;

  assert.equal(policy.selected_primary_detector, 'gemma_4_native_multimodal');
  assert.equal(policy.fallback_lightweight_detector, 'yolov11_ui_specialized');
  assert.ok(policy.selection_rationale.includes('Gemma 4 native multimodal'));
});
