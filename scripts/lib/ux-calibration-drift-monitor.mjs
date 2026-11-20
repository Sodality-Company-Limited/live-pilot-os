/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS STREAMING RUNTIME TELEMETRY & CALIBRATION DRIFT MONITOR
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M6 / G-UX-027)
 * Architecture Blueprint: docs/03-architecture/agent-observability.md
 * Purpose: Real-time rolling window computation of 10-bin ECE (<= 0.050),
 *          Brier score (<= 0.150), HCER (<= 0.020), latency percentiles
 *          (P50, P90, P99 < 50ms), multi-currency zero-float token accounting,
 *          and automated circuit breaker state machine.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { Money, ISO_4217_CURRENCIES } from './multi-currency-money.mjs';

export const TELEMETRY_SCHEMA_VERSION = 1;

/**
 * Circuit Breaker States
 */
export const CIRCUIT_STATES = Object.freeze({
  CLOSED: 'CLOSED',                 // Normal operation
  HALF_OPEN: 'HALF_OPEN',           // Probing recovery
  TRIPPED_DEFER: 'TRIPPED_DEFER',   // Drift detected -> route to DEFER
  TRIPPED_REJECT: 'TRIPPED_REJECT'  // Severe drift / adversarial -> fail-closed REJECT
});

/**
 * Thresholds for SLAs and Drift Monitoring
 */
export const TELEMETRY_THRESHOLDS = Object.freeze({
  targetEce: 0.050,
  targetBrier: 0.150,
  targetHcer: 0.020,
  driftEceThreshold: 0.070,
  driftHcerThreshold: 0.030,
  severeHcerThreshold: 0.050,
  slaP99LatencyMs: 50.0,
  criticalP99LatencyMs: 100.0
});

/**
 * Calculates 10-bin Expected Calibration Error (ECE) over prediction samples.
 * Bins: [0.0, 0.1), [0.1, 0.2), ..., [0.9, 1.0].
 */
export function calculate10BinEce(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0.0;
  }

  const numBins = 10;
  const binCounts = new Array(numBins).fill(0);
  const binConfSums = new Array(numBins).fill(0.0);
  const binAccSums = new Array(numBins).fill(0.0);

  for (const s of samples) {
    const conf = Math.max(0.0, Math.min(1.0, s.confidence));
    const acc = s.correct ? 1.0 : 0.0;

    let binIdx = Math.min(numBins - 1, Math.floor(conf * numBins));
    binCounts[binIdx]++;
    binConfSums[binIdx] += conf;
    binAccSums[binIdx] += acc;
  }

  const n = samples.length;
  let ece = 0.0;

  for (let b = 0; b < numBins; b++) {
    if (binCounts[b] > 0) {
      const avgConf = binConfSums[b] / binCounts[b];
      const avgAcc = binAccSums[b] / binCounts[b];
      ece += (binCounts[b] / n) * Math.abs(avgAcc - avgConf);
    }
  }

  return ece;
}

/**
 * Calculates strictly proper Brier calibration score.
 * Brier = (1/N) * sum((c_i - o_i)^2)
 */
export function calculateBrierScore(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0.0;
  }

  let sum = 0.0;
  for (const s of samples) {
    const conf = Math.max(0.0, Math.min(1.0, s.confidence));
    const outcome = s.correct ? 1.0 : 0.0;
    const diff = conf - outcome;
    sum += diff * diff;
  }

  return sum / samples.length;
}

/**
 * Calculates High-Confidence Error Rate (HCER).
 * HCER = |{i : c_i >= 0.80 and o_i = 0}| / N
 */
export function calculateHcer(samples, threshold = 0.80) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0.0;
  }

  let highConfErrors = 0;
  for (const s of samples) {
    const conf = Math.max(0.0, Math.min(1.0, s.confidence));
    const isCorrect = Boolean(s.correct);
    if (conf >= threshold && !isCorrect) {
      highConfErrors++;
    }
  }

  return highConfErrors / samples.length;
}

/**
 * Computes latency percentiles (P50, P90, P99).
 */
export function calculateLatencyPercentiles(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return { p50: 0.0, p90: 0.0, p99: 0.0, max: 0.0, min: 0.0, count: 0 };
  }

  const latencies = samples.map((s) => s.latency_ms || 0.0).sort((a, b) => a - b);
  const n = latencies.length;

  const p50Idx = Math.min(n - 1, Math.floor(n * 0.50));
  const p90Idx = Math.min(n - 1, Math.floor(n * 0.90));
  const p99Idx = Math.min(n - 1, Math.floor(n * 0.99));

  return {
    p50: latencies[p50Idx],
    p90: latencies[p90Idx],
    p99: latencies[p99Idx],
    max: latencies[n - 1],
    min: latencies[0],
    count: n
  };
}

/**
 * Streaming Runtime Telemetry & Calibration Drift Monitor Class
 */
export class UxCalibrationDriftMonitor {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 100;
    this.samples = [];
    this.circuitState = CIRCUIT_STATES.CLOSED;
    this.tripReason = null;
    this.tripTimestamp = null;
    this.recoveryProbesRequired = options.recoveryProbesRequired || 10;
    this.consecutiveHealthyProbes = 0;

    // Multi-currency token accounting (Zero-float BigInt)
    this.currency = options.defaultCurrency || 'USD';
    this.totalTokensIn = 0n;
    this.totalTokensOut = 0n;
    this.totalCostMinor = 0n; // in atomic integer minor units of currency
    // Default rate: 15 minor units per 1,000 input tokens ($0.15/1k in USD cents)
    this.inputRateMinorPer1k = BigInt(options.inputRateMinorPer1k || 15);
    // Output rate: 30 minor units per 1,000 output tokens ($0.30/1k in USD cents)
    this.outputRateMinorPer1k = BigInt(options.outputRateMinorPer1k || 30);
  }

  /**
   * Ingests a new streaming decision event into the rolling window.
   */
  recordDecision(event) {
    if (!event || typeof event !== 'object') {
      throw new Error('Decision event object required');
    }

    const decisionId = event.decision_id || `DEC-${this.samples.length + 1}`;
    const confidence = typeof event.confidence === 'number' ? event.confidence : 0.85;
    const correct = event.correct !== undefined ? Boolean(event.correct) : true;
    const latencyMs = typeof event.latency_ms === 'number' ? event.latency_ms : 12.5;

    // Zero-float Token Accounting
    const tokensIn = BigInt(event.tokens_in || 0);
    const tokensOut = BigInt(event.tokens_out || 0);

    // Calculate incremental cost using exact integer arithmetic:
    // costMinor = (tokensIn * inputRate / 1000) + (tokensOut * outputRate / 1000)
    const costInMinor = (tokensIn * this.inputRateMinorPer1k) / 1000n;
    const costOutMinor = (tokensOut * this.outputRateMinorPer1k) / 1000n;
    const incrementalCost = costInMinor + costOutMinor;

    this.totalTokensIn += tokensIn;
    this.totalTokensOut += tokensOut;
    this.totalCostMinor += incrementalCost;

    const sample = {
      decision_id: decisionId,
      confidence,
      correct,
      latency_ms: latencyMs,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_minor: incrementalCost,
      timestamp: event.timestamp || new Date().toISOString()
    };

    this.samples.push(sample);

    // Maintain sliding window capacity
    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }

    // Evaluate circuit breaker tripping
    this.evaluateCircuitState();

    return sample;
  }

  /**
   * Evaluates calibration metrics and updates circuit breaker state.
   */
  evaluateCircuitState() {
    if (this.samples.length < 10) {
      // Need minimum sample size before evaluating drift
      return;
    }

    const ece = calculate10BinEce(this.samples);
    const brier = calculateBrierScore(this.samples);
    const hcer = calculateHcer(this.samples);
    const latency = calculateLatencyPercentiles(this.samples);

    const isHealthy = ece <= TELEMETRY_THRESHOLDS.targetEce &&
                      hcer <= TELEMETRY_THRESHOLDS.targetHcer &&
                      latency.p99 <= TELEMETRY_THRESHOLDS.slaP99LatencyMs;

    if (this.circuitState === CIRCUIT_STATES.CLOSED) {
      if (hcer >= TELEMETRY_THRESHOLDS.severeHcerThreshold) {
        this.trip(CIRCUIT_STATES.TRIPPED_REJECT, `Severe HCER drift detected: ${(hcer * 100).toFixed(1)}% >= 5.0%`);
      } else if (ece >= TELEMETRY_THRESHOLDS.driftEceThreshold || hcer >= TELEMETRY_THRESHOLDS.driftHcerThreshold) {
        this.trip(CIRCUIT_STATES.TRIPPED_DEFER, `Calibration drift detected: ECE=${ece.toFixed(3)}, HCER=${hcer.toFixed(3)}`);
      }
    } else if (this.circuitState === CIRCUIT_STATES.HALF_OPEN) {
      if (isHealthy) {
        this.consecutiveHealthyProbes++;
        if (this.consecutiveHealthyProbes >= this.recoveryProbesRequired) {
          this.reset();
        }
      } else {
        // Probe failed, trip back
        this.trip(CIRCUIT_STATES.TRIPPED_DEFER, 'Recovery probe failed: metrics remain drifted');
      }
    }
  }

  /**
   * Trips the circuit breaker to a fail-closed state.
   */
  trip(targetState, reason) {
    this.circuitState = targetState;
    this.tripReason = reason;
    this.tripTimestamp = new Date().toISOString();
    this.consecutiveHealthyProbes = 0;
  }

  /**
   * Resets the circuit breaker to CLOSED (healthy).
   */
  reset() {
    this.circuitState = CIRCUIT_STATES.CLOSED;
    this.tripReason = null;
    this.tripTimestamp = null;
    this.consecutiveHealthyProbes = 0;
  }

  /**
   * Transitions circuit breaker to HALF_OPEN for recovery testing.
   */
  setHalfOpen() {
    this.circuitState = CIRCUIT_STATES.HALF_OPEN;
    this.consecutiveHealthyProbes = 0;
  }

  /**
   * Autonomy routing gate query.
   */
  checkRoutingGuard(proposedConfidence = 0.85) {
    if (this.circuitState === CIRCUIT_STATES.TRIPPED_REJECT) {
      return {
        action: 'REJECT_AS_UNSAFE',
        allowed: false,
        circuit_state: this.circuitState,
        reason: this.tripReason
      };
    }

    if (this.circuitState === CIRCUIT_STATES.TRIPPED_DEFER) {
      return {
        action: 'DEFER',
        allowed: false,
        circuit_state: this.circuitState,
        reason: this.tripReason
      };
    }

    if (this.circuitState === CIRCUIT_STATES.HALF_OPEN) {
      return {
        action: 'PROBE',
        allowed: true,
        circuit_state: this.circuitState,
        reason: 'Testing recovery probe'
      };
    }

    // Normal CLOSED operation
    if (proposedConfidence < 0.75) {
      return {
        action: 'DEFER',
        allowed: false,
        circuit_state: this.circuitState,
        reason: `Low calibrated confidence (${proposedConfidence.toFixed(3)} < 0.750)`
      };
    }

    return {
      action: 'PROCEED',
      allowed: true,
      circuit_state: this.circuitState,
      reason: 'Confidence calibrated and circuit breaker CLOSED'
    };
  }

  /**
   * Returns complete telemetry report over the current rolling window.
   */
  getTelemetryReport() {
    const ece = calculate10BinEce(this.samples);
    const brier = calculateBrierScore(this.samples);
    const hcer = calculateHcer(this.samples);
    const latency = calculateLatencyPercentiles(this.samples);

    const totalMoney = new Money(this.totalCostMinor, this.currency);

    return {
      window_size: this.windowSize,
      sample_count: this.samples.length,
      circuit_breaker: {
        state: this.circuitState,
        is_healthy: this.circuitState === CIRCUIT_STATES.CLOSED,
        trip_reason: this.tripReason,
        trip_timestamp: this.tripTimestamp
      },
      calibration_metrics: {
        ece_10bin: Number(ece.toFixed(4)),
        ece_passed: ece <= TELEMETRY_THRESHOLDS.targetEce,
        brier_score: Number(brier.toFixed(4)),
        brier_passed: brier <= TELEMETRY_THRESHOLDS.targetBrier,
        hcer: Number(hcer.toFixed(4)),
        hcer_passed: hcer <= TELEMETRY_THRESHOLDS.targetHcer
      },
      latency_sla: {
        p50_ms: Number(latency.p50.toFixed(2)),
        p90_ms: Number(latency.p90.toFixed(2)),
        p99_ms: Number(latency.p99.toFixed(2)),
        p99_sla_passed: latency.p99 <= TELEMETRY_THRESHOLDS.slaP99LatencyMs
      },
      token_accounting: {
        currency: this.currency,
        total_tokens_in: this.totalTokensIn.toString(),
        total_tokens_out: this.totalTokensOut.toString(),
        total_cost_minor: this.totalCostMinor.toString(),
        formatted_cost: totalMoney.toString()
      },
      timestamp: new Date().toISOString()
    };
  }
}
