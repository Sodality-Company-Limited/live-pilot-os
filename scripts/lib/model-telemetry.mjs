/**
 * scripts/lib/model-telemetry.mjs
 *
 * Inference-Time Token and Latency Accounting Engine for Soda OS
 * Goal: G-ML-018 (Inference-Time Token and Latency Accounting Engine)
 *
 * Provides high-resolution microsecond latency measurement, token consumption accounting,
 * value-head compute overhead threshold monitoring, and exact ISO 4217 minor-unit monetary
 * cost calculation without floating-point arithmetic.
 */

import { performance } from 'node:perf_hooks';
import crypto from 'node:crypto';

/**
 * Standard default monetary rates and threshold constants.
 * Uses atomic minor units (e.g. Cents for USD/EUR, minor units for THB, Yen for JPY).
 */
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_PROMPT_RATE_MINOR_PER_1K = 50;
export const DEFAULT_COMPLETION_RATE_MINOR_PER_1K = 150;
export const DEFAULT_OVERHEAD_THRESHOLD_RATIO = 0.15; // 15% budget

/** @deprecated Use DEFAULT_PROMPT_RATE_MINOR_PER_1K instead */
export const DEFAULT_PROMPT_RATE_SATANG_PER_1K = DEFAULT_PROMPT_RATE_MINOR_PER_1K;
/** @deprecated Use DEFAULT_COMPLETION_RATE_MINOR_PER_1K instead */
export const DEFAULT_COMPLETION_RATE_SATANG_PER_1K = DEFAULT_COMPLETION_RATE_MINOR_PER_1K;

/**
 * Production-grade inference accounting and telemetry engine.
 */
export class ModelTelemetry {
  /**
   * @param {object} [options]
   * @param {string} [options.currency] - ISO 4217 currency code (default: 'USD')
   * @param {number} [options.promptRateMinorPer1k] - Minor units per 1k prompt tokens (default: 50)
   * @param {number} [options.completionRateMinorPer1k] - Minor units per 1k completion tokens (default: 150)
   * @param {number} [options.promptRateSatangPer1k] - @deprecated Alias for promptRateMinorPer1k
   * @param {number} [options.completionRateSatangPer1k] - @deprecated Alias for completionRateMinorPer1k
   * @param {number} [options.overheadThresholdRatio] - Maximum allowed value-head overhead ratio (default: 0.15)
   * @param {function} [options.onOverheadAlert] - Callback invoked when overhead alert fires
   */
  constructor(options = {}) {
    this.currency = options.currency || DEFAULT_CURRENCY;

    const rawPromptRate = options.promptRateMinorPer1k !== undefined
      ? options.promptRateMinorPer1k
      : options.promptRateSatangPer1k;
    this.promptRateMinorPer1k = rawPromptRate !== undefined
      ? this._validateRate(rawPromptRate, 'promptRateMinorPer1k')
      : DEFAULT_PROMPT_RATE_MINOR_PER_1K;
    this.promptRateSatangPer1k = this.promptRateMinorPer1k;

    const rawCompletionRate = options.completionRateMinorPer1k !== undefined
      ? options.completionRateMinorPer1k
      : options.completionRateSatangPer1k;
    this.completionRateMinorPer1k = rawCompletionRate !== undefined
      ? this._validateRate(rawCompletionRate, 'completionRateMinorPer1k')
      : DEFAULT_COMPLETION_RATE_MINOR_PER_1K;
    this.completionRateSatangPer1k = this.completionRateMinorPer1k;

    this.overheadThresholdRatio = options.overheadThresholdRatio !== undefined
      ? this._validateRatio(options.overheadThresholdRatio, 'overheadThresholdRatio')
      : DEFAULT_OVERHEAD_THRESHOLD_RATIO;

    this.onOverheadAlert = typeof options.onOverheadAlert === 'function'
      ? options.onOverheadAlert
      : (alertData) => {
          console.warn(`[ModelTelemetry WARNING] Value-head overhead budget breached: ${(alertData.overheadRatio * 100).toFixed(2)}% > ${(this.overheadThresholdRatio * 100).toFixed(2)}% on span ${alertData.spanId || 'unknown'}`);
        };

    /** @type {Array<object>} */
    this.spans = [];
  }

  /**
   * Validate monetary rate parameter ensuring non-negative integer.
   *
   * @private
   * @param {any} val
   * @param {string} name
   * @returns {number}
   */
  _validateRate(val, name) {
    if (typeof val !== 'number' && typeof val !== 'bigint') {
      throw new TypeError(`${name} must be a number or BigInt`);
    }
    const num = Number(val);
    if (!Number.isInteger(num)) {
      throw new TypeError(`${name} must be an integer (floating point monetary rates forbidden)`);
    }
    if (num < 0) {
      throw new RangeError(`${name} must be non-negative (received ${num})`);
    }
    return num;
  }

  /**
   * Validate ratio parameter ensuring non-negative finite float.
   *
   * @private
   * @param {any} val
   * @param {string} name
   * @returns {number}
   */
  _validateRatio(val, name) {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new TypeError(`${name} must be a finite number`);
    }
    if (val < 0) {
      throw new RangeError(`${name} must be non-negative`);
    }
    return val;
  }

  /**
   * Validate token count ensuring non-negative integer.
   *
   * @private
   * @param {any} val
   * @param {string} name
   * @returns {number}
   */
  _validateTokenCount(val, name) {
    if (typeof val !== 'number' && typeof val !== 'bigint') {
      throw new TypeError(`${name} must be an integer`);
    }
    const num = Number(val);
    if (!Number.isInteger(num)) {
      throw new TypeError(`${name} must be an integer (received ${val})`);
    }
    if (num < 0) {
      throw new RangeError(`${name} must be non-negative (received ${num})`);
    }
    return num;
  }

  /**
   * Calculate monetary token cost in exact integer ISO 4217 minor units without floating-point math.
   * Uses ceiling division to guarantee conservative accounting of minor units.
   *
   * @param {object|number} optionsOrPromptTokens - Configuration object or prompt token count
   * @param {number} [maybeCompletionTokens] - Completion tokens if using positional args
   * @param {number} [maybePromptRate] - Prompt rate if using positional args
   * @param {number} [maybeCompletionRate] - Completion rate if using positional args
   * @returns {number} Total cost in integer minor units
   */
  calculateCostMinor(optionsOrPromptTokens = {}, maybeCompletionTokens, maybePromptRate, maybeCompletionRate) {
    let promptTokens = 0;
    let completionTokens = 0;
    let promptRate = this.promptRateMinorPer1k;
    let completionRate = this.completionRateMinorPer1k;

    if (typeof optionsOrPromptTokens === 'object' && optionsOrPromptTokens !== null) {
      if (optionsOrPromptTokens.promptTokens !== undefined) {
        promptTokens = this._validateTokenCount(optionsOrPromptTokens.promptTokens, 'promptTokens');
      }
      if (optionsOrPromptTokens.completionTokens !== undefined) {
        completionTokens = this._validateTokenCount(optionsOrPromptTokens.completionTokens, 'completionTokens');
      }
      const rawPromptRate = optionsOrPromptTokens.promptRateMinorPer1k !== undefined
        ? optionsOrPromptTokens.promptRateMinorPer1k
        : (optionsOrPromptTokens.promptMinorPer1k !== undefined
            ? optionsOrPromptTokens.promptMinorPer1k
            : optionsOrPromptTokens.promptSatangPer1k);
      if (rawPromptRate !== undefined) {
        promptRate = this._validateRate(rawPromptRate, 'promptRateMinorPer1k');
      }
      const rawCompletionRate = optionsOrPromptTokens.completionRateMinorPer1k !== undefined
        ? optionsOrPromptTokens.completionRateMinorPer1k
        : (optionsOrPromptTokens.completionMinorPer1k !== undefined
            ? optionsOrPromptTokens.completionMinorPer1k
            : optionsOrPromptTokens.completionSatangPer1k);
      if (rawCompletionRate !== undefined) {
        completionRate = this._validateRate(rawCompletionRate, 'completionRateMinorPer1k');
      }
    } else {
      promptTokens = this._validateTokenCount(optionsOrPromptTokens, 'promptTokens');
      if (maybeCompletionTokens !== undefined) {
        completionTokens = this._validateTokenCount(maybeCompletionTokens, 'completionTokens');
      }
      if (maybePromptRate !== undefined) {
        promptRate = this._validateRate(maybePromptRate, 'promptRate');
      }
      if (maybeCompletionRate !== undefined) {
        completionRate = this._validateRate(maybeCompletionRate, 'completionRate');
      }
    }

    if (promptTokens === 0 && completionTokens === 0) {
      return 0;
    }

    // Exact integer arithmetic via BigInt in milli-minor units (1 minor unit = 1000 milli-minor units)
    const promptMilli = BigInt(promptTokens) * BigInt(promptRate);
    const completionMilli = BigInt(completionTokens) * BigInt(completionRate);
    const totalMilli = promptMilli + completionMilli;

    // Ceiling division: (total + 999) / 1000
    const totalMinor = (totalMilli + 999n) / 1000n;
    return Number(totalMinor);
  }

  /**
   * @deprecated Use calculateCostMinor instead. Maintained for backward compatibility.
   */
  calculateCostSatang(optionsOrPromptTokens = {}, maybeCompletionTokens, maybePromptRate, maybeCompletionRate) {
    return this.calculateCostMinor(optionsOrPromptTokens, maybeCompletionTokens, maybePromptRate, maybeCompletionRate);
  }

  /**
   * Static convenience method for calculating minor-unit token cost.
   *
   * @param {object|number} optionsOrPromptTokens
   * @param {number} [maybeCompletionTokens]
   * @returns {number}
   */
  static calculateCostMinor(optionsOrPromptTokens, maybeCompletionTokens) {
    const instance = new ModelTelemetry();
    return instance.calculateCostMinor(optionsOrPromptTokens, maybeCompletionTokens);
  }

  /**
   * @deprecated Use calculateCostMinor instead.
   */
  static calculateCostSatang(optionsOrPromptTokens, maybeCompletionTokens) {
    return ModelTelemetry.calculateCostMinor(optionsOrPromptTokens, maybeCompletionTokens);
  }

  /**
   * Begin an active latency measurement span.
   *
   * @param {string} [name='agent.inference'] - Span name
   * @param {object} [metadata={}] - Initial contextual attributes
   * @returns {object} Active span controller with `.end()` method
   */
  startSpan(name = 'agent.inference', metadata = {}) {
    const startHr = process.hrtime.bigint();
    const startTime = new Date().toISOString();
    const spanId = metadata.spanId || crypto.randomUUID();
    const traceId = metadata.traceId || crypto.randomUUID();

    let ended = false;

    return {
      name,
      traceId,
      spanId,
      startTime,
      /**
       * End the span, measure elapsed time with microsecond precision, and record telemetry.
       *
       * @param {object} [completionData={}]
       * @returns {object} The recorded span record
       */
      end: (completionData = {}) => {
        if (ended) {
          throw new Error(`Span ${spanId} has already ended`);
        }
        ended = true;
        const endHr = process.hrtime.bigint();
        const durationNs = endHr - startHr;
        const latencyUs = Number(durationNs / 1000n);
        const latencyMs = Number(durationNs) / 1_000_000;

        return this.recordInferenceSpan({
          ...metadata,
          ...completionData,
          name,
          traceId,
          spanId,
          startTime,
          endTime: new Date().toISOString(),
          latencyUs,
          latencyMs
        });
      }
    };
  }

  /**
   * Record a completed inference span with token counts, latencies, and financial accounting.
   *
   * @param {object} data
   * @returns {object} Immutable recorded span
   */
  recordInferenceSpan(data = {}) {
    const spanId = data.spanId || crypto.randomUUID();
    const traceId = data.traceId || crypto.randomUUID();
    const name = typeof data.name === 'string' ? data.name : 'agent.decision.inference';
    const model = typeof data.model === 'string' ? data.model : 'soda-os-cognitive-v1.0.0';

    const promptTokens = data.promptTokens !== undefined
      ? this._validateTokenCount(data.promptTokens, 'promptTokens')
      : 0;

    const completionTokens = data.completionTokens !== undefined
      ? this._validateTokenCount(data.completionTokens, 'completionTokens')
      : 0;

    const totalTokens = promptTokens + completionTokens;

    // Latency handling
    let latencyUs = 0;
    let latencyMs = 0;

    if (data.latencyUs !== undefined) {
      if (typeof data.latencyUs !== 'number' && typeof data.latencyUs !== 'bigint') {
        throw new TypeError('latencyUs must be a number or BigInt');
      }
      latencyUs = Math.max(0, Math.round(Number(data.latencyUs)));
      latencyMs = Number((latencyUs / 1000).toFixed(4));
    } else if (data.latencyMs !== undefined) {
      if (typeof data.latencyMs !== 'number' || !Number.isFinite(data.latencyMs)) {
        throw new TypeError('latencyMs must be a finite number');
      }
      latencyMs = Math.max(0, data.latencyMs);
      latencyUs = Math.round(latencyMs * 1000);
    }

    // Value-head overhead monitoring
    let baseLatencyUs = data.baseLatencyUs !== undefined
      ? this._validateRate(data.baseLatencyUs, 'baseLatencyUs')
      : (data.baseLatencyMs !== undefined ? Math.round(this._validateRatio(data.baseLatencyMs, 'baseLatencyMs') * 1000) : 0);

    let valueHeadLatencyUs = data.valueHeadLatencyUs !== undefined
      ? this._validateRate(data.valueHeadLatencyUs, 'valueHeadLatencyUs')
      : (data.valueHeadLatencyMs !== undefined ? Math.round(this._validateRatio(data.valueHeadLatencyMs, 'valueHeadLatencyMs') * 1000) : 0);

    let overheadRatio = 0;
    let overheadAlert = false;

    if (baseLatencyUs > 0 && valueHeadLatencyUs > 0) {
      overheadRatio = Number((valueHeadLatencyUs / baseLatencyUs).toFixed(4));
      if (overheadRatio > this.overheadThresholdRatio) {
        overheadAlert = true;
        this.onOverheadAlert({
          spanId,
          traceId,
          baseLatencyUs,
          valueHeadLatencyUs,
          overheadRatio,
          threshold: this.overheadThresholdRatio
        });
      }
    }

    // Exact integer ISO 4217 minor-unit cost calculation
    const costMinor = this.calculateCostMinor({
      promptTokens,
      completionTokens,
      promptRateMinorPer1k: data.promptRateMinorPer1k ?? data.promptMinorPer1k ?? data.promptSatangPer1k ?? this.promptRateMinorPer1k,
      completionRateMinorPer1k: data.completionRateMinorPer1k ?? data.completionMinorPer1k ?? data.completionSatangPer1k ?? this.completionRateMinorPer1k
    });

    const spanRecord = Object.freeze({
      traceId,
      spanId,
      name,
      model,
      currency: data.currency || this.currency,
      promptTokens,
      completionTokens,
      totalTokens,
      latencyUs,
      latencyMs,
      baseLatencyUs,
      valueHeadLatencyUs,
      overheadRatio,
      overheadAlert,
      costMinor,
      costSatang: costMinor, // Backward compatibility alias
      timestamp: data.timestamp || new Date().toISOString()
    });

    this.spans.push(spanRecord);
    return spanRecord;
  }

  /**
   * Return aggregated telemetry summary across all recorded spans.
   *
   * @returns {object}
   */
  getMetrics() {
    const totalSpans = this.spans.length;
    if (totalSpans === 0) {
      return {
        spanCount: 0,
        currency: this.currency,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCostMinor: 0,
        totalCostSatang: 0, // Backward compatibility alias
        averageLatencyMs: 0,
        p95LatencyMs: 0,
        overheadAlertCount: 0
      };
    }

    let totalPrompt = 0;
    let totalCompletion = 0;
    let totalCost = 0;
    let totalLatencyMs = 0;
    let alertCount = 0;
    const latencies = [];

    for (const span of this.spans) {
      totalPrompt += span.promptTokens;
      totalCompletion += span.completionTokens;
      totalCost += span.costMinor;
      totalLatencyMs += span.latencyMs;
      if (span.overheadAlert) {
        alertCount++;
      }
      latencies.push(span.latencyMs);
    }

    latencies.sort((a, b) => a - b);
    const p95Index = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
    const p95LatencyMs = latencies[p95Index];
    const averageLatencyMs = Number((totalLatencyMs / totalSpans).toFixed(4));

    return {
      spanCount: totalSpans,
      currency: this.currency,
      totalPromptTokens: totalPrompt,
      totalCompletionTokens: totalCompletion,
      totalTokens: totalPrompt + totalCompletion,
      totalCostMinor: totalCost,
      totalCostSatang: totalCost, // Backward compatibility alias
      averageLatencyMs,
      p95LatencyMs,
      overheadAlertCount: alertCount
    };
  }

  /**
   * Clear recorded spans and reset telemetry session.
   */
  reset() {
    this.spans = [];
  }
}
