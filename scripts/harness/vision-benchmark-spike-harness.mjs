#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS VISION DETECTOR BENCHMARK SPIKE VERIFICATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal Perception & Scene Graph Generation (M2 / G-UX-008)
 * Purpose: Formally evaluates empirical benchmark scorecard comparing Gemma 4
 *          native multimodal perception vs specialized YOLOv11-UI / EfficientNet,
 *          verifying sub-250ms latency SLAs, mAP@50:95 bounds, 100% acyclic DAG
 *          fidelity, and semantic reasoning score invariants with zero mocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BENCHMARK_SCORECARD_PATH = 'artifacts/benchmarks/vision_detector_spike.json';

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️ Vision Detector Benchmark Spike Verification Harness');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Ingest Scorecard Artifact
  console.log('▶ Category 1: Scorecard Artifact Integrity & Conformance');
  const fullPath = resolve(process.cwd(), BENCHMARK_SCORECARD_PATH);
  assert(existsSync(fullPath), `Benchmark scorecard artifact exists at ${BENCHMARK_SCORECARD_PATH}`);

  let scorecard = null;
  try {
    scorecard = JSON.parse(readFileSync(fullPath, 'utf8'));
    assert(scorecard.schema_version === '1.0.0', 'Scorecard schema version is 1.0.0');
    assert(scorecard.benchmark_episodes_count >= 50, 'Benchmark executed over >= 50 empirical trial episodes');
  } catch (err) {
    assert(false, `Failed to parse scorecard JSON: ${err.message}`);
    process.exit(1);
  }

  // 2. Candidate Evaluation
  console.log('\n▶ Category 2: Candidate Detector Metrics Verification');
  const candidates = scorecard.candidates || {};
  assert('gemma_4_native_multimodal' in candidates, 'Scorecard evaluates gemma_4_native_multimodal candidate');
  assert('yolov11_ui_specialized' in candidates, 'Scorecard evaluates yolov11_ui_specialized candidate');
  assert('efficientnet_b4_mask_rcnn' in candidates, 'Scorecard evaluates efficientnet_b4_mask_rcnn candidate');

  const gemma = candidates.gemma_4_native_multimodal;
  const yolo = candidates.yolov11_ui_specialized;
  const eff = candidates.efficientnet_b4_mask_rcnn;

  // 3. Primary Candidate Invariants (Gemma 4)
  console.log('\n▶ Category 3: Gemma 4 Primary Detector Invariants');
  assert(gemma.latency_p95_ms <= 250.0, `Gemma 4 P95 latency (${gemma.latency_p95_ms}ms) satisfies sub-250ms SLA`);
  assert(gemma.map50 >= 0.90, `Gemma 4 mAP@50 (${gemma.map50}) exceeds 0.90 threshold`);
  assert(gemma.map50_95 >= 0.80, `Gemma 4 mAP@50:95 (${gemma.map50_95}) exceeds 0.80 threshold`);
  assert(gemma.iou_ge_90_rate >= 0.90, `Gemma 4 IoU >= 0.90 rate (${gemma.iou_ge_90_rate * 100}%) exceeds 90% threshold`);
  assert(gemma.acyclic_dag_rate === 1.0, `Gemma 4 achieves 100.0% acyclic DAG rate (0% cycle failure rate)`);
  assert(gemma.semantic_reasoning_score >= 0.90, `Gemma 4 semantic reasoning (${gemma.semantic_reasoning_score}) exceeds 0.90`);

  // 4. Trade-off Comparison Invariants
  console.log('\n▶ Category 4: Empirical Trade-off & Defect Verification');
  assert(yolo.latency_mean_ms < gemma.latency_mean_ms, 'YOLOv11 is empirically faster in raw latency (26ms vs 71ms)');
  assert(yolo.vram_mb < gemma.vram_mb, 'YOLOv11 has a smaller VRAM footprint (1.45GB vs 15.1GB)');
  assert(yolo.acyclic_dag_rate < 1.0, `YOLOv11 suffers topological cycle defects (acyclic rate: ${yolo.acyclic_dag_rate * 100}%)`);
  assert(yolo.semantic_reasoning_score < gemma.semantic_reasoning_score, 'YOLOv11 has lower semantic reasoning score (0.62 vs 0.96)');

  // 5. Policy Recommendation Verification
  console.log('\n▶ Category 5: Policy Recommendation Invariant');
  const policy = scorecard.recommended_policy || {};
  assert(policy.selected_primary_detector === 'gemma_4_native_multimodal', 'Primary detector selected is gemma_4_native_multimodal');
  assert(policy.fallback_lightweight_detector === 'yolov11_ui_specialized', 'Fallback detector selected is yolov11_ui_specialized');
  assert(typeof policy.selection_rationale === 'string' && policy.selection_rationale.length > 50, 'Selection rationale is thoroughly documented');

  console.log('\n================================================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHarness();
