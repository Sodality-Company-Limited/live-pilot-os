#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS STREAMING RUNTIME TELEMETRY & DRIFT VERIFICATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M6 / G-UX-027)
 * Purpose: Verifies real-time streaming calculation of 10-bin ECE (<= 0.050),
 *          Brier score (<= 0.150), HCER (<= 0.020), latency percentiles (P99 < 50ms),
 *          multi-currency zero-float token accounting, and automated circuit breaker
 *          tripping under adversarial drift.
 *          Emits machine-readable proof artifact to artifacts/proofs/G-UX-027-telemetry-drift.json
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  UxCalibrationDriftMonitor,
  CIRCUIT_STATES,
  TELEMETRY_THRESHOLDS
} from '../lib/ux-calibration-drift-monitor.mjs';

const SODA_ROOT = path.resolve(import.meta.dirname, '../..');
const PROOFS_DIR = path.join(SODA_ROOT, 'artifacts/proofs');

export async function runUxTelemetryDriftHarness() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🛡️ RUNNING G-UX-027 STREAMING RUNTIME TELEMETRY & DRIFT HARNESS');
  console.log('══════════════════════════════════════════════════════════════════');

  const monitor = new UxCalibrationDriftMonitor({
    windowSize: 100,
    defaultCurrency: 'USD',
    inputRateMinorPer1k: 15,
    outputRateMinorPer1k: 30
  });

  const results = {
    workload_decisions_ingested: 0,
    healthy_phase_ece: 0.0,
    healthy_phase_brier: 0.0,
    healthy_phase_hcer: 0.0,
    healthy_phase_p99_latency_ms: 0.0,
    token_accounting_zero_float_verified: false,
    drift_circuit_breaker_tripped: false,
    fail_closed_blocking_verified: false,
    recovery_reset_verified: false,
    all_gates_passed: false,
    timestamp: new Date().toISOString()
  };

  // Phase 1: Ingest 150 well-calibrated decisions with sub-50ms latency
  let highCount = 0;
  let lowCount = 0;
  for (let i = 0; i < 150; i++) {
    const isHighConf = (i % 5) !== 0; // 80% high confidence
    let conf;
    let isCorrect;

    if (isHighConf) {
      conf = 0.96;
      // 98% accuracy (1 error every 50 high conf samples -> 2 errors in 100 window)
      isCorrect = (highCount % 50) !== 0;
      highCount++;
    } else {
      conf = 0.70;
      // Exactly 70% accuracy for 0.70 confidence bin (7 out of 10 correct)
      isCorrect = (lowCount % 10) < 7;
      lowCount++;
    }

    const latency = 8.0 + (i % 15) * 1.5; // 8.0ms to 29.0ms (P99 well under 50ms)

    monitor.recordDecision({
      decision_id: `DEC-STREAM-${i + 1}`,
      confidence: conf,
      correct: isCorrect,
      latency_ms: latency,
      tokens_in: 500 + (i % 50) * 10,
      tokens_out: 250 + (i % 25) * 10
    });
  }

  results.workload_decisions_ingested = 150;

  const healthyReport = monitor.getTelemetryReport();
  results.healthy_phase_ece = healthyReport.calibration_metrics.ece_10bin;
  results.healthy_phase_brier = healthyReport.calibration_metrics.brier_score;
  results.healthy_phase_hcer = healthyReport.calibration_metrics.hcer;
  results.healthy_phase_p99_latency_ms = healthyReport.latency_sla.p99_ms;

  // Verify Zero-Float Token Accounting:
  // total_tokens_in and total_cost_minor must be parseable as BigInt
  const tokensBig = BigInt(healthyReport.token_accounting.total_tokens_in);
  const costBig = BigInt(healthyReport.token_accounting.total_cost_minor);
  results.token_accounting_zero_float_verified = tokensBig > 0n && costBig > 0n;

  // Phase 2: Inject Severe Drift (40 overconfident wrong decisions)
  for (let i = 0; i < 40; i++) {
    monitor.recordDecision({
      decision_id: `DEC-ADVERSARIAL-DRIFT-${i + 1}`,
      confidence: 0.98,
      correct: false, // 98% confident but WRONG!
      latency_ms: 12.0,
      tokens_in: 1000,
      tokens_out: 500
    });
  }

  const driftedReport = monitor.getTelemetryReport();
  if (driftedReport.circuit_breaker.state !== CIRCUIT_STATES.CLOSED) {
    results.drift_circuit_breaker_tripped = true;
  }

  // Phase 3: Assert Fail-Closed Autonomy Blocking
  const routingCheck = monitor.checkRoutingGuard(0.95);
  if (!routingCheck.allowed && ['DEFER', 'REJECT_AS_UNSAFE'].includes(routingCheck.action)) {
    results.fail_closed_blocking_verified = true;
  }

  // Phase 4: Recovery Probe and Reset
  monitor.setHalfOpen();
  if (monitor.circuitState === CIRCUIT_STATES.HALF_OPEN) {
    monitor.reset();
    if (monitor.circuitState === CIRCUIT_STATES.CLOSED) {
      results.recovery_reset_verified = true;
    }
  }

  const passed = results.healthy_phase_ece <= TELEMETRY_THRESHOLDS.targetEce &&
                 results.healthy_phase_brier <= TELEMETRY_THRESHOLDS.targetBrier &&
                 results.healthy_phase_hcer <= TELEMETRY_THRESHOLDS.targetHcer &&
                 results.healthy_phase_p99_latency_ms <= TELEMETRY_THRESHOLDS.slaP99LatencyMs &&
                 results.token_accounting_zero_float_verified &&
                 results.drift_circuit_breaker_tripped &&
                 results.fail_closed_blocking_verified &&
                 results.recovery_reset_verified;

  results.all_gates_passed = passed;

  if (!fs.existsSync(PROOFS_DIR)) {
    fs.mkdirSync(PROOFS_DIR, { recursive: true });
  }

  const proofPath = path.join(PROOFS_DIR, 'G-UX-027-telemetry-drift.json');
  fs.writeFileSync(proofPath, JSON.stringify(results, null, 2), 'utf8');

  console.log(`✅ Workload Decisions Ingested: ${results.workload_decisions_ingested}`);
  console.log(`✅ Rolling 10-Bin ECE: ${results.healthy_phase_ece.toFixed(4)} (Threshold: <= 0.050)`);
  console.log(`✅ Brier Score: ${results.healthy_phase_brier.toFixed(4)} (Threshold: <= 0.150)`);
  console.log(`✅ High-Confidence Error Rate (HCER): ${results.healthy_phase_hcer.toFixed(4)} (Threshold: <= 0.020)`);
  console.log(`✅ P99 Latency SLA: ${results.healthy_phase_p99_latency_ms.toFixed(1)}ms (Threshold: <= 50.0ms)`);
  console.log(`✅ Zero-Float BigInt Token Accounting: ${results.token_accounting_zero_float_verified ? 'VERIFIED' : 'FAILED'}`);
  console.log(`✅ Circuit Breaker Automated Trip on Drift: ${results.drift_circuit_breaker_tripped ? 'TRIPPED_SUCCESS' : 'FAILED'}`);
  console.log(`✅ Fail-Closed Routing Guard: ${results.fail_closed_blocking_verified ? 'BLOCKED_FAIL_CLOSED' : 'FAILED'}`);
  console.log(`✅ Recovery Reset Cycle: ${results.recovery_reset_verified ? 'VERIFIED' : 'FAILED'}`);
  console.log(`📁 Proof Artifact Emitted: ${proofPath}`);
  console.log(`Verdict: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('══════════════════════════════════════════════════════════════════');

  if (!passed) {
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runUxTelemetryDriftHarness().catch((err) => {
    console.error('Fatal Harness Error:', err);
    process.exit(1);
  });
}
