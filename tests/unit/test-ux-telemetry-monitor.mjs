/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ UNIT TESTS: STREAMING RUNTIME TELEMETRY & CALIBRATION DRIFT MONITOR (G-UX-027)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TELEMETRY_SCHEMA_VERSION,
  CIRCUIT_STATES,
  TELEMETRY_THRESHOLDS,
  calculate10BinEce,
  calculateBrierScore,
  calculateHcer,
  calculateLatencyPercentiles,
  UxCalibrationDriftMonitor
} from '../../scripts/lib/ux-calibration-drift-monitor.mjs';

describe('G-UX-027: Streaming Telemetry & Calibration Drift Monitor', () => {

  describe('1. Schema & Threshold Definitions', () => {
    it('declares schema version 1, circuit states, and quantitative SLA thresholds', () => {
      assert.equal(TELEMETRY_SCHEMA_VERSION, 1);
      assert.equal(CIRCUIT_STATES.CLOSED, 'CLOSED');
      assert.equal(CIRCUIT_STATES.TRIPPED_DEFER, 'TRIPPED_DEFER');
      assert.equal(CIRCUIT_STATES.TRIPPED_REJECT, 'TRIPPED_REJECT');
      assert.equal(CIRCUIT_STATES.HALF_OPEN, 'HALF_OPEN');

      assert.equal(TELEMETRY_THRESHOLDS.targetEce, 0.050);
      assert.equal(TELEMETRY_THRESHOLDS.targetBrier, 0.150);
      assert.equal(TELEMETRY_THRESHOLDS.targetHcer, 0.020);
      assert.equal(TELEMETRY_THRESHOLDS.slaP99LatencyMs, 50.0);
    });
  });

  describe('2. Mathematical Calibration Metrics Calculation', () => {
    it('computes 10-bin Expected Calibration Error (ECE)', () => {
      // Empty input
      assert.equal(calculate10BinEce([]), 0.0);

      // Calibrated stream
      const calibratedSamples = [];
      // 90 samples with conf 0.90, 81 correct (90% accuracy)
      for (let i = 0; i < 90; i++) {
        calibratedSamples.push({ confidence: 0.90, correct: i < 81 });
      }
      // 10 samples with conf 0.50, 5 correct (50% accuracy)
      for (let i = 0; i < 10; i++) {
        calibratedSamples.push({ confidence: 0.50, correct: i < 5 });
      }

      const ece = calculate10BinEce(calibratedSamples);
      assert.ok(ece <= 0.020, `Expected low ECE for calibrated samples, got ${ece}`);

      // Grossly overconfident uncalibrated stream
      const uncalibratedSamples = [];
      for (let i = 0; i < 50; i++) {
        uncalibratedSamples.push({ confidence: 0.95, correct: false }); // 95% confident but 0% correct!
      }
      const badEce = calculate10BinEce(uncalibratedSamples);
      assert.ok(badEce >= 0.90, `Expected high ECE for overconfident errors, got ${badEce}`);
    });

    it('computes strictly proper Brier calibration score', () => {
      assert.equal(calculateBrierScore([]), 0.0);

      // Perfect predictions
      const perfect = [{ confidence: 1.0, correct: true }, { confidence: 0.0, correct: false }];
      assert.equal(calculateBrierScore(perfect), 0.0);

      // Completely wrong predictions
      const worst = [{ confidence: 1.0, correct: false }, { confidence: 0.0, correct: true }];
      assert.equal(calculateBrierScore(worst), 1.0);
    });

    it('computes High-Confidence Error Rate (HCER)', () => {
      assert.equal(calculateHcer([]), 0.0);

      const stream = [
        { confidence: 0.95, correct: true },
        { confidence: 0.88, correct: true },
        { confidence: 0.82, correct: false }, // high conf error (>=0.80)
        { confidence: 0.60, correct: false }  // low conf error (<0.80)
      ];
      // 1 high conf error out of 4 samples = 0.25
      assert.equal(calculateHcer(stream), 0.25);
    });

    it('computes latency percentiles P50, P90, P99', () => {
      const latencies = [];
      for (let i = 1; i <= 100; i++) {
        latencies.push({ latency_ms: i * 0.5 }); // 0.5ms to 50.0ms
      }

      const p = calculateLatencyPercentiles(latencies);
      assert.equal(p.count, 100);
      assert.equal(p.min, 0.5);
      assert.equal(p.max, 50.0);
      assert.ok(p.p50 >= 24.0 && p.p50 <= 26.0);
      assert.ok(p.p90 >= 44.0 && p.p90 <= 46.0);
      assert.ok(p.p99 >= 49.0 && p.p99 <= 50.0);
    });
  });

  describe('3. Monitor Ingestion, Zero-Float Token Accounting & Window Capacity', () => {
    it('ingests streaming events and maintains sliding window size', () => {
      const monitor = new UxCalibrationDriftMonitor({ windowSize: 50 });

      for (let i = 0; i < 60; i++) {
        monitor.recordDecision({
          decision_id: `DEC-${i}`,
          confidence: 0.88,
          correct: true,
          latency_ms: 15.0,
          tokens_in: 1000,
          tokens_out: 500
        });
      }

      assert.equal(monitor.samples.length, 50); // sliding window capped at 50
    });

    it('performs exact multi-currency zero-float token cost accounting using BigInt and Money', () => {
      const monitor = new UxCalibrationDriftMonitor({
        defaultCurrency: 'USD',
        inputRateMinorPer1k: 15,  // $0.15 in cents per 1k tokens
        outputRateMinorPer1k: 30  // $0.30 in cents per 1k tokens
      });

      // Ingest 2,000 input tokens and 1,000 output tokens
      // Cost in = (2000 * 15) / 1000 = 30 cents
      // Cost out = (1000 * 30) / 1000 = 30 cents
      // Total cost = 60 cents
      monitor.recordDecision({
        decision_id: 'DEC-TOKEN-1',
        confidence: 0.90,
        correct: true,
        tokens_in: 2000,
        tokens_out: 1000
      });

      assert.equal(monitor.totalTokensIn, 2000n);
      assert.equal(monitor.totalTokensOut, 1000n);
      assert.equal(monitor.totalCostMinor, 60n);

      const report = monitor.getTelemetryReport();
      assert.equal(report.token_accounting.currency, 'USD');
      assert.equal(report.token_accounting.total_tokens_in, '2000');
      assert.equal(report.token_accounting.total_tokens_out, '1000');
      assert.equal(report.token_accounting.total_cost_minor, '60');
      assert.ok(report.token_accounting.formatted_cost.includes('0.60'));
    });
  });

  describe('4. Automated Circuit Breaker & Autonomy Routing State Machine', () => {
    it('authorizes PROCEED in CLOSED state when confidence >= 0.75', () => {
      const monitor = new UxCalibrationDriftMonitor();
      const guardHigh = monitor.checkRoutingGuard(0.88);
      assert.equal(guardHigh.action, 'PROCEED');
      assert.equal(guardHigh.allowed, true);

      const guardLow = monitor.checkRoutingGuard(0.65);
      assert.equal(guardLow.action, 'DEFER');
      assert.equal(guardLow.allowed, false);
    });

    it('automatically trips to TRIPPED_DEFER upon detecting calibration drift', () => {
      const monitor = new UxCalibrationDriftMonitor({ windowSize: 50 });

      // Ingest 20 decisions with severe overconfidence drift (conf 0.95, correct: false)
      for (let i = 0; i < 20; i++) {
        monitor.recordDecision({
          decision_id: `DRIFT-${i}`,
          confidence: 0.95,
          correct: false,
          latency_ms: 20.0
        });
      }

      // Circuit breaker should have tripped!
      assert.notEqual(monitor.circuitState, CIRCUIT_STATES.CLOSED);
      assert.ok(monitor.circuitState === CIRCUIT_STATES.TRIPPED_DEFER || monitor.circuitState === CIRCUIT_STATES.TRIPPED_REJECT);

      // In tripped state, all routing fails closed
      const guard = monitor.checkRoutingGuard(0.99);
      assert.equal(guard.allowed, false);
      assert.ok(['DEFER', 'REJECT_AS_UNSAFE'].includes(guard.action));
    });

    it('supports recovery through HALF_OPEN probing and reset', () => {
      const monitor = new UxCalibrationDriftMonitor({ recoveryProbesRequired: 3 });
      monitor.trip(CIRCUIT_STATES.TRIPPED_DEFER, 'Manual test trip');
      assert.equal(monitor.circuitState, CIRCUIT_STATES.TRIPPED_DEFER);

      monitor.setHalfOpen();
      assert.equal(monitor.circuitState, CIRCUIT_STATES.HALF_OPEN);

      const probeGuard = monitor.checkRoutingGuard(0.85);
      assert.equal(probeGuard.action, 'PROBE');
      assert.equal(probeGuard.allowed, true);

      monitor.reset();
      assert.equal(monitor.circuitState, CIRCUIT_STATES.CLOSED);
      assert.equal(monitor.checkRoutingGuard(0.85).action, 'PROCEED');
    });
  });
});
