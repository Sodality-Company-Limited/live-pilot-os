#!/usr/bin/env node
/**
 * tests/unit/test-calibration-monitor.mjs
 *
 * Comprehensive Unit Test Suite for Goal G-ML-019:
 * Calibration Metric Ingestion and Brier Score Monitor
 *
 * Test Coverage:
 * 1. Default instantiation and parameter configuration
 * 2. Ingestion of labeled decision outcomes into 10 confidence bins
 * 3. Exact mathematical Brier score and 10-bin ECE calculation
 * 4. FIFO sliding window capacity enforcement and oldest item eviction
 * 5. Drift alert detection when rolling Brier score exceeds 0.12 (test_brier_drift / test_drift_detection)
 * 6. Drift alert detection when rolling ECE exceeds 0.08
 * 7. Pluggable onDriftAlert callback and event dispatcher invocation
 * 8. Machine-readable JSON snapshot export and schema conformance
 * 9. Fail-closed input validation (null, NaN, Infinity, < 0.0, > 1.0, non-integer window)
 * 10. Buffer reset functionality
 * 11. Command-line `-k` substring filtering support
 */

import assert from 'node:assert/strict';
import {
  CalibrationMonitor,
  validateObservation,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_BRIER_THRESHOLD,
  DEFAULT_ECE_THRESHOLD,
  DEFAULT_BINS
} from '../../scripts/lib/calibration-monitor.mjs';

const args = process.argv.slice(2);
let testFilter = null;
const kIndex = args.indexOf('-k');
if (kIndex !== -1 && args[kIndex + 1]) {
  testFilter = args[kIndex + 1].toLowerCase();
}

let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
  if (testFilter && !testName.toLowerCase().includes(testFilter)) {
    return;
  }
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✔ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${testName}: ${err.message}`);
    throw err;
  }
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🧪 RUNNING CALIBRATION MONITOR UNIT TEST SUITE (G-ML-019)');
if (testFilter) {
  console.log(`   Applying filter: -k "${testFilter}"`);
}
console.log('════════════════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 1: Instantiation & Defaults
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_default_initialization', () => {
  const monitor = new CalibrationMonitor();
  assert.equal(monitor.windowSize, DEFAULT_WINDOW_SIZE);
  assert.equal(monitor.brierThreshold, DEFAULT_BRIER_THRESHOLD);
  assert.equal(monitor.eceThreshold, DEFAULT_ECE_THRESHOLD);
  assert.equal(monitor.bins, DEFAULT_BINS);
  assert.equal(monitor.onDriftAlert, null);

  const metrics = monitor.getMetrics();
  assert.equal(metrics.sampleCount, 0);
  assert.equal(metrics.brierScore, 0);
  assert.equal(metrics.ece, 0);
  assert.equal(metrics.driftAlert, false);
});

runTest('test_custom_initialization', () => {
  let callbackInvoked = false;
  const monitor = new CalibrationMonitor({
    windowSize: 25,
    brierThreshold: 0.15,
    eceThreshold: 0.05,
    bins: 5,
    onDriftAlert: () => { callbackInvoked = true; }
  });
  assert.equal(monitor.windowSize, 25);
  assert.equal(monitor.brierThreshold, 0.15);
  assert.equal(monitor.eceThreshold, 0.05);
  assert.equal(monitor.bins, 5);
  assert.equal(typeof monitor.onDriftAlert, 'function');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 2: Observation Ingestion & 10-Bin Partitioning
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_observation_ingestion_10_bins', () => {
  const monitor = new CalibrationMonitor({ windowSize: 10, bins: 10 });
  
  // Record observation in bin 9 ([0.9, 1.0])
  monitor.recordObservation({ confidence: 0.95, groundTruthOutcome: 1, decisionId: 'dec_001' });
  // Record observation in bin 1 ([0.1, 0.2])
  monitor.recordObservation({ confidence: 0.15, correct: false, decisionId: 'dec_002' });

  const metrics = monitor.getMetrics();
  assert.equal(metrics.sampleCount, 2);
  assert.equal(metrics.totalObservations, 2);
  assert.ok(Array.isArray(metrics.bins));
  assert.equal(metrics.bins.length, 2);

  const binHigh = metrics.bins.find((b) => b.confidence >= 0.9);
  assert.ok(binHigh);
  assert.equal(binHigh.count, 1);
  assert.equal(binHigh.accuracy, 1);

  const binLow = metrics.bins.find((b) => b.confidence < 0.2);
  assert.ok(binLow);
  assert.equal(binLow.count, 1);
  assert.equal(binLow.accuracy, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 3: Exact Brier Score Calculation
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_exact_brier_score_computation', () => {
  const monitor = new CalibrationMonitor({ windowSize: 50 });
  
  // Record 2 decisions:
  // Decision 1: conf 0.8, outcome 1 => error (0.8 - 1)^2 = 0.04
  // Decision 2: conf 0.6, outcome 0 => error (0.6 - 0)^2 = 0.36
  // Mean = (0.04 + 0.36) / 2 = 0.20
  monitor.recordObservation({ confidence: 0.8, groundTruthOutcome: 1 });
  const metrics = monitor.recordObservation({ confidence: 0.6, groundTruthOutcome: 0 });

  assert.equal(metrics.sampleCount, 2);
  assert.equal(metrics.brierScore, 0.2);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 4: FIFO Sliding Window Eviction
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_sliding_window_fifo_eviction', () => {
  const windowSize = 5;
  const monitor = new CalibrationMonitor({ windowSize });

  for (let i = 1; i <= 8; i++) {
    monitor.recordObservation({
      confidence: 0.5,
      groundTruthOutcome: 1,
      decisionId: `dec_${i}`
    });
  }

  const metrics = monitor.getMetrics();
  assert.equal(metrics.sampleCount, 5, 'Sample count must not exceed window capacity');
  assert.equal(metrics.totalObservations, 8, 'Total observations must track lifetime ingested records');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 5: Drift Detection on Brier Score Breach (> 0.12)
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_brier_drift', () => {
  const monitor = new CalibrationMonitor({ windowSize: 50, brierThreshold: 0.12 });

  // Ingest 10 uncalibrated decisions: confidence 0.90 but outcome 0 (failed)
  // Brier score = (0.90 - 0)^2 = 0.81 > 0.12
  for (let i = 0; i < 10; i++) {
    monitor.recordObservation({ confidence: 0.9, groundTruthOutcome: 0 });
  }

  const metrics = monitor.getMetrics();
  assert.ok(metrics.brierScore > 0.12, `Brier score ${metrics.brierScore} must exceed 0.12`);
  assert.equal(metrics.driftAlert, true, 'driftAlert must be true when Brier breaches 0.12');
  assert.ok(metrics.alerts.length >= 1, 'Alert history must record drift event');
});

runTest('test_drift_detection', () => {
  let alertCount = 0;
  let lastAlert = null;

  const monitor = new CalibrationMonitor({
    windowSize: 50,
    brierThreshold: 0.12,
    eceThreshold: 0.08,
    onDriftAlert: (payload) => {
      alertCount++;
      lastAlert = payload;
    }
  });

  // Feed 15 miscalibrated samples (0.95 confidence, all 0)
  for (let i = 0; i < 15; i++) {
    monitor.recordObservation({ confidence: 0.95, groundTruthOutcome: 0 });
  }

  const metrics = monitor.getMetrics();
  assert.equal(metrics.driftAlert, true);
  assert.ok(alertCount > 0, 'onDriftAlert callback must have been invoked');
  assert.ok(lastAlert !== null);
  assert.equal(lastAlert.type, 'CALIBRATION_DRIFT');
  assert.ok(lastAlert.brierScore > 0.12);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 6: Drift Detection on ECE Threshold Breach (> 0.08)
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_ece_drift_detection', () => {
  const monitor = new CalibrationMonitor({ windowSize: 50, brierThreshold: 0.90, eceThreshold: 0.08 });

  // Feed samples with systematic confidence discrepancy
  for (let i = 0; i < 20; i++) {
    monitor.recordObservation({ confidence: 0.85, groundTruthOutcome: 0 });
  }

  const metrics = monitor.getMetrics();
  assert.ok(metrics.ece > 0.08, `ECE ${metrics.ece} must exceed 0.08`);
  assert.equal(metrics.driftAlert, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 7: Well-Calibrated Baseline Runs Without Drift Alert
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_well_calibrated_silent_operation', () => {
  const monitor = new CalibrationMonitor({ windowSize: 50, brierThreshold: 0.12, eceThreshold: 0.08 });

  // 100% correct decisions with 1.0 confidence: (1 - 1)^2 = 0
  for (let i = 0; i < 20; i++) {
    monitor.recordObservation({ confidence: 1.0, groundTruthOutcome: 1 });
  }

  const metrics = monitor.getMetrics();
  assert.equal(metrics.brierScore, 0.0);
  assert.equal(metrics.ece, 0.0);
  assert.equal(metrics.driftAlert, false);
  assert.equal(metrics.alerts.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 8: Machine-Readable JSON Snapshot Export
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_machine_readable_snapshot_report', () => {
  const monitor = new CalibrationMonitor({ windowSize: 30 });
  monitor.recordObservation({ confidence: 0.85, groundTruthOutcome: 1 });
  monitor.recordObservation({ confidence: 0.40, groundTruthOutcome: 0 });

  const snapshot = monitor.getSnapshot();
  assert.equal(snapshot.goal, 'G-ML-019');
  assert.equal(snapshot.version, '1.0.0');
  assert.equal(snapshot.windowSize, 30);
  assert.equal(snapshot.sampleCount, 2);
  assert.ok(Number.isFinite(snapshot.brierScore));
  assert.ok(Number.isFinite(snapshot.ece));
  assert.ok(Array.isArray(snapshot.bins));

  const jsonString = monitor.exportReport();
  const parsed = JSON.parse(jsonString);
  assert.equal(parsed.goal, 'G-ML-019');
  assert.equal(parsed.sampleCount, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 9: Event Emitter Listener
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_event_emitter_dispatch', () => {
  const monitor = new CalibrationMonitor({ windowSize: 10, brierThreshold: 0.12 });
  let driftEventFired = false;
  let obsEventCount = 0;

  monitor.on('drift', () => { driftEventFired = true; });
  monitor.on('observation', () => { obsEventCount++; });

  monitor.recordObservation({ confidence: 0.95, groundTruthOutcome: 0 });

  assert.equal(obsEventCount, 1);
  assert.equal(driftEventFired, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 10: Fail-Closed Input Validation
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_fail_closed_validation_null_observation', () => {
  const monitor = new CalibrationMonitor();
  assert.throws(() => monitor.recordObservation(null), TypeError);
  assert.throws(() => monitor.recordObservation(undefined), TypeError);
  assert.throws(() => monitor.recordObservation('string'), TypeError);
  assert.throws(() => monitor.recordObservation([]), TypeError);
});

runTest('test_fail_closed_validation_confidence_bounds', () => {
  const monitor = new CalibrationMonitor();
  assert.throws(() => monitor.recordObservation({}), TypeError);
  assert.throws(() => monitor.recordObservation({ confidence: NaN }), TypeError);
  assert.throws(() => monitor.recordObservation({ confidence: Infinity }), TypeError);
  assert.throws(() => monitor.recordObservation({ confidence: -0.01 }), RangeError);
  assert.throws(() => monitor.recordObservation({ confidence: 1.01 }), RangeError);
});

runTest('test_fail_closed_validation_invalid_monitor_options', () => {
  assert.throws(() => new CalibrationMonitor({ windowSize: 0 }), RangeError);
  assert.throws(() => new CalibrationMonitor({ windowSize: -5 }), RangeError);
  assert.throws(() => new CalibrationMonitor({ windowSize: 2.5 }), RangeError);
  assert.throws(() => new CalibrationMonitor({ brierThreshold: 0 }), RangeError);
  assert.throws(() => new CalibrationMonitor({ brierThreshold: 1.5 }), RangeError);
  assert.throws(() => new CalibrationMonitor({ eceThreshold: 0 }), RangeError);
  assert.throws(() => new CalibrationMonitor({ onDriftAlert: 'not_a_function' }), TypeError);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 11: Reset Functionality
// ─────────────────────────────────────────────────────────────────────────────
runTest('test_monitor_reset', () => {
  const monitor = new CalibrationMonitor({ windowSize: 10 });
  monitor.recordObservation({ confidence: 0.9, groundTruthOutcome: 0 });
  assert.equal(monitor.getMetrics().sampleCount, 1);

  monitor.reset();
  const resetMetrics = monitor.getMetrics();
  assert.equal(resetMetrics.sampleCount, 0);
  assert.equal(resetMetrics.totalObservations, 0);
  assert.equal(resetMetrics.alerts.length, 0);
});

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`🎉 ALL ${passedTests}/${totalTests} CALIBRATION MONITOR TESTS PASSED CLEANLY!`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');
