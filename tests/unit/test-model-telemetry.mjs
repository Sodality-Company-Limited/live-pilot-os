/**
 * tests/unit/test-model-telemetry.mjs
 *
 * Unit test suite for Inference-Time Token and Latency Accounting Engine.
 * Goal: G-ML-018 (Inference-Time Token and Latency Accounting Engine)
 *
 * Supports test filtering via:
 *   node tests/unit/test-model-telemetry.mjs -k <filter_pattern>
 */

import assert from 'node:assert/strict';
import {
  ModelTelemetry,
  DEFAULT_PROMPT_RATE_SATANG_PER_1K,
  DEFAULT_COMPLETION_RATE_SATANG_PER_1K,
  DEFAULT_OVERHEAD_THRESHOLD_RATIO
} from '../../scripts/lib/model-telemetry.mjs';

// CLI filter argument parsing (-k <name>)
const args = process.argv.slice(2);
let testFilter = null;
const kIndex = args.indexOf('-k');
if (kIndex !== -1 && args[kIndex + 1]) {
  testFilter = args[kIndex + 1];
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// -----------------------------------------------------------------------------
// Test 1: Default Telemetry Instantiation
// -----------------------------------------------------------------------------
test('test_default_telemetry_instantiation', async () => {
  const telemetry = new ModelTelemetry();
  assert.equal(telemetry.promptRateSatangPer1k, DEFAULT_PROMPT_RATE_SATANG_PER_1K);
  assert.equal(telemetry.completionRateSatangPer1k, DEFAULT_COMPLETION_RATE_SATANG_PER_1K);
  assert.equal(telemetry.overheadThresholdRatio, DEFAULT_OVERHEAD_THRESHOLD_RATIO);
  assert.equal(telemetry.spans.length, 0);

  const metrics = telemetry.getMetrics();
  assert.equal(metrics.spanCount, 0);
  assert.equal(metrics.totalPromptTokens, 0);
  assert.equal(metrics.totalCostSatang, 0);
});

// -----------------------------------------------------------------------------
// Test 2: Custom Rate and Threshold Options Parsing
// -----------------------------------------------------------------------------
test('test_custom_options_parsing', async () => {
  const telemetry = new ModelTelemetry({
    promptRateSatangPer1k: 80,
    completionRateSatangPer1k: 240,
    overheadThresholdRatio: 0.10
  });
  assert.equal(telemetry.promptRateSatangPer1k, 80);
  assert.equal(telemetry.completionRateSatangPer1k, 240);
  assert.equal(telemetry.overheadThresholdRatio, 0.10);
});

// -----------------------------------------------------------------------------
// Test 3: Record Inference Span
// -----------------------------------------------------------------------------
test('test_record_inference_span', async () => {
  const telemetry = new ModelTelemetry();
  const span = telemetry.recordInferenceSpan({
    promptTokens: 250,
    completionTokens: 75,
    latencyMs: 142.5,
    model: 'soda-os-cognitive-v1.0.0'
  });

  assert.equal(span.promptTokens, 250);
  assert.equal(span.completionTokens, 75);
  assert.equal(span.totalTokens, 325);
  assert.equal(span.latencyMs, 142.5);
  assert.equal(span.latencyUs, 142500);
  assert.equal(typeof span.spanId, 'string');
  assert.equal(typeof span.traceId, 'string');
  assert.equal(span.overheadAlert, false);

  // Cost check: 250 * 50 = 12500 milli-Satang, 75 * 150 = 11250 milli-Satang
  // Total = 23750 milli-Satang => ceil(23750 / 1000) = 24 Satang
  assert.equal(span.costSatang, 24);
  assert.equal(telemetry.spans.length, 1);
});

// -----------------------------------------------------------------------------
// Test 4: Live Span Timing with Microsecond Resolution
// -----------------------------------------------------------------------------
test('test_start_and_end_span', async () => {
  const telemetry = new ModelTelemetry();
  const activeSpan = telemetry.startSpan('agent.decision.inference', {
    model: 'test-model'
  });

  // Active workload delay
  const start = Date.now();
  while (Date.now() - start < 15) {
    // Busy wait 15ms to guarantee measurable duration
  }

  const span = activeSpan.end({
    promptTokens: 100,
    completionTokens: 50
  });

  assert.equal(span.name, 'agent.decision.inference');
  assert.equal(span.promptTokens, 100);
  assert.equal(span.completionTokens, 50);
  assert.equal(span.totalTokens, 150);
  assert.ok(span.latencyUs >= 10000, `Expected latencyUs >= 10000, got ${span.latencyUs}`);
  assert.ok(span.latencyMs >= 10.0, `Expected latencyMs >= 10.0, got ${span.latencyMs}`);
  assert.equal(telemetry.spans.length, 1);

  // Calling end again must throw
  assert.throws(() => activeSpan.end(), /already ended/);
});

// -----------------------------------------------------------------------------
// Test 5: Value-Head Overhead Threshold Monitor & Alert
// -----------------------------------------------------------------------------
test('test_overhead_monitor', async () => {
  const alerts = [];
  const telemetry = new ModelTelemetry({
    overheadThresholdRatio: 0.15,
    onOverheadAlert: (alert) => alerts.push(alert)
  });

  // Case A: High overhead breaching 15% budget (20,000 / 100,000 = 20%)
  const highSpan = telemetry.recordInferenceSpan({
    baseLatencyUs: 100000,
    valueHeadLatencyUs: 20000,
    promptTokens: 500,
    completionTokens: 100
  });

  assert.equal(highSpan.overheadRatio, 0.20);
  assert.equal(highSpan.overheadAlert, true);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].overheadRatio, 0.20);
  assert.equal(alerts[0].threshold, 0.15);

  // Case B: Normal overhead within 15% budget (8,000 / 100,000 = 8%)
  const normalSpan = telemetry.recordInferenceSpan({
    baseLatencyUs: 100000,
    valueHeadLatencyUs: 8000,
    promptTokens: 500,
    completionTokens: 100
  });

  assert.equal(normalSpan.overheadRatio, 0.08);
  assert.equal(normalSpan.overheadAlert, false);
  assert.equal(alerts.length, 1); // No new alert

  // Case C: Exact boundary (15,000 / 100,000 = 15.00%)
  const boundarySpan = telemetry.recordInferenceSpan({
    baseLatencyUs: 100000,
    valueHeadLatencyUs: 15000,
    promptTokens: 500,
    completionTokens: 100
  });

  assert.equal(boundarySpan.overheadRatio, 0.15);
  assert.equal(boundarySpan.overheadAlert, false); // Strict > 0.15 triggers alert
  assert.equal(alerts.length, 1);
});

// -----------------------------------------------------------------------------
// Test 6: Integer Satang Monetary Cost Calculation
// -----------------------------------------------------------------------------
test('test_satang_cost_calculation', async () => {
  const telemetry = new ModelTelemetry();

  // Benchmark trace 1: 2,000 prompt tokens, 1,000 completion tokens
  // Prompt: 2000 * 50 / 1000 = 100 Satang
  // Completion: 1000 * 150 / 1000 = 150 Satang
  // Total = 250 Satang
  const cost1 = telemetry.calculateCostSatang({ promptTokens: 2000, completionTokens: 1000 });
  assert.equal(cost1, 250);

  // Positional arguments
  const costPos = telemetry.calculateCostSatang(2000, 1000);
  assert.equal(costPos, 250);

  // Static convenience
  const costStatic = ModelTelemetry.calculateCostSatang(2000, 1000);
  assert.equal(costStatic, 250);

  // Zero tokens
  assert.equal(telemetry.calculateCostSatang({ promptTokens: 0, completionTokens: 0 }), 0);

  // Fractional milli-satang round-up (1 prompt token at 50 / 1k = 50 milli-Satang => 1 Satang)
  assert.equal(telemetry.calculateCostSatang({ promptTokens: 1, completionTokens: 0 }), 1);

  // Custom rates
  const customCost = telemetry.calculateCostSatang({
    promptTokens: 1000,
    completionTokens: 1000,
    promptSatangPer1k: 100,
    completionSatangPer1k: 300
  });
  assert.equal(customCost, 400);
});

// -----------------------------------------------------------------------------
// Test 7: Fail-Closed Float Monetary & Token Rejection
// -----------------------------------------------------------------------------
test('test_fail_closed_floating_point_monetary_rejection', async () => {
  const telemetry = new ModelTelemetry();

  // Floating-point tokens must be rejected
  assert.throws(() => {
    telemetry.calculateCostSatang({ promptTokens: 12.5, completionTokens: 0 });
  }, TypeError);

  assert.throws(() => {
    telemetry.calculateCostSatang({ promptTokens: 100, completionTokens: 45.7 });
  }, TypeError);

  // Floating-point rates must be rejected
  assert.throws(() => {
    telemetry.calculateCostSatang({ promptTokens: 100, promptSatangPer1k: 50.5 });
  }, TypeError);

  // String non-numbers must be rejected
  assert.throws(() => {
    telemetry.calculateCostSatang({ promptTokens: '100' });
  }, TypeError);
});

// -----------------------------------------------------------------------------
// Test 8: Fail-Closed Negative Inputs Rejection
// -----------------------------------------------------------------------------
test('test_fail_closed_negative_inputs', async () => {
  const telemetry = new ModelTelemetry();

  assert.throws(() => {
    telemetry.calculateCostSatang({ promptTokens: -50 });
  }, RangeError);

  assert.throws(() => {
    telemetry.calculateCostSatang({ promptTokens: 100, completionTokens: -10 });
  }, RangeError);

  assert.throws(() => {
    telemetry.calculateCostSatang({ promptTokens: 100, promptSatangPer1k: -5 });
  }, RangeError);

  assert.throws(() => {
    new ModelTelemetry({ overheadThresholdRatio: -0.1 });
  }, RangeError);
});

// -----------------------------------------------------------------------------
// Test 9: Cumulative Metrics & Percentile Calculation
// -----------------------------------------------------------------------------
test('test_cumulative_metrics_aggregation', async () => {
  const telemetry = new ModelTelemetry();

  telemetry.recordInferenceSpan({ promptTokens: 1000, completionTokens: 500, latencyMs: 50 });
  telemetry.recordInferenceSpan({ promptTokens: 2000, completionTokens: 1000, latencyMs: 150 });
  telemetry.recordInferenceSpan({ promptTokens: 3000, completionTokens: 1500, latencyMs: 250 });

  const metrics = telemetry.getMetrics();
  assert.equal(metrics.spanCount, 3);
  assert.equal(metrics.totalPromptTokens, 6000);
  assert.equal(metrics.totalCompletionTokens, 3000);
  assert.equal(metrics.totalTokens, 9000);

  // Costs:
  // 1000*50/1k + 500*150/1k = 50 + 75 = 125
  // 2000*50/1k + 1000*150/1k = 100 + 150 = 250
  // 3000*50/1k + 1500*150/1k = 150 + 225 = 375
  // Total cost = 125 + 250 + 375 = 750 Satang
  assert.equal(metrics.totalCostSatang, 750);
  assert.equal(metrics.averageLatencyMs, 150.0);
  assert.equal(metrics.p95LatencyMs, 250);
  assert.equal(metrics.overheadAlertCount, 0);
});

// -----------------------------------------------------------------------------
// Test 10: Reset Telemetry
// -----------------------------------------------------------------------------
test('test_reset_functionality', async () => {
  const telemetry = new ModelTelemetry();
  telemetry.recordInferenceSpan({ promptTokens: 100, completionTokens: 50, latencyMs: 20 });
  assert.equal(telemetry.spans.length, 1);

  telemetry.reset();
  assert.equal(telemetry.spans.length, 0);
  const metrics = telemetry.getMetrics();
  assert.equal(metrics.spanCount, 0);
  assert.equal(metrics.totalCostSatang, 0);
});

// -----------------------------------------------------------------------------
// Test 11: 100 Benchmark Inference Traces Bound Validation
// -----------------------------------------------------------------------------
test('test_100_benchmark_inference_traces', async () => {
  const telemetry = new ModelTelemetry();

  for (let i = 1; i <= 100; i++) {
    const promptTokens = i * 10;
    const completionTokens = i * 5;
    const baseLatencyUs = 50000 + i * 500;
    const valueHeadLatencyUs = Math.floor(baseLatencyUs * 0.10); // 10% overhead

    const span = telemetry.recordInferenceSpan({
      promptTokens,
      completionTokens,
      baseLatencyUs,
      valueHeadLatencyUs,
      latencyUs: baseLatencyUs + valueHeadLatencyUs
    });

    assert.equal(span.promptTokens, promptTokens);
    assert.equal(span.completionTokens, completionTokens);
    assert.equal(span.totalTokens, promptTokens + completionTokens);
    assert.ok(span.costSatang >= 1);
    assert.equal(span.overheadAlert, false);
  }

  const metrics = telemetry.getMetrics();
  assert.equal(metrics.spanCount, 100);
  assert.ok(metrics.totalCostSatang > 0);
  assert.ok(metrics.totalCostMinor > 0);
  assert.equal(metrics.overheadAlertCount, 0);
});

// -----------------------------------------------------------------------------
// Test 12: Universal Multi-Currency Minor-Unit Cost Calculation
// -----------------------------------------------------------------------------
test('test_universal_minor_unit_cost_calculation', async () => {
  const telemetry = new ModelTelemetry({
    currency: 'USD',
    promptRateMinorPer1k: 80,
    completionRateMinorPer1k: 240
  });

  assert.equal(telemetry.currency, 'USD');
  assert.equal(telemetry.promptRateMinorPer1k, 80);
  assert.equal(telemetry.completionRateMinorPer1k, 240);

  // 1,000 prompt tokens (80 cents) + 500 completion tokens (120 cents) = 200 cents ($2.00)
  const cost = telemetry.calculateCostMinor({ promptTokens: 1000, completionTokens: 500 });
  assert.equal(cost, 200);

  // Positional arguments
  const costPos = telemetry.calculateCostMinor(1000, 500);
  assert.equal(costPos, 200);

  // Static convenience with defaults (1000*50/1k + 500*150/1k = 125)
  const costStatic = ModelTelemetry.calculateCostMinor(1000, 500);
  assert.equal(costStatic, 125);

  const span = telemetry.recordInferenceSpan({
    promptTokens: 1000,
    completionTokens: 500,
    currency: 'USD'
  });
  assert.equal(span.currency, 'USD');
  assert.equal(span.costMinor, 200);
  assert.equal(span.costSatang, 200); // Backwards compatibility alias

  const metrics = telemetry.getMetrics();
  assert.equal(metrics.currency, 'USD');
  assert.equal(metrics.totalCostMinor, 200);
  assert.equal(metrics.totalCostSatang, 200);
});

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------
async function runTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🧪 RUNNING MODEL TELEMETRY UNIT TEST SUITE (G-ML-018)');
  if (testFilter) {
    console.log(`   Applying filter: -k "${testFilter}"`);
  }
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    if (testFilter && !name.includes(testFilter)) {
      continue;
    }

    try {
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(`      ↳ Error: ${err.message}`);
      console.error(err.stack);
      failed++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log(`📊 Summary: ${passed} / ${passed + failed} Tests Passed (${((passed / (passed + failed || 1)) * 100).toFixed(1)}%)`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
