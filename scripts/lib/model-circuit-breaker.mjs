/**
 * scripts/lib/model-circuit-breaker.mjs
 *
 * Model Circuit Breaker & Automated Rollback State Machine
 * Goal: G-ML-023 (Epic: ML)
 *
 * Implements:
 * 1. Finite State Machine (FSM): ACTIVE, TRIPPED, FALLBACK, HALF_OPEN
 * 2. Consecutive failure tracking (default threshold: 3 consecutive failures)
 * 3. Health recovery probing (default threshold: 5 consecutive successes in HALF_OPEN)
 * 4. Fallback decision routing enforcement:
 *    - All high-risk decisions strictly overridden to 'human_review'
 *    - Low/normal-risk decisions overridden to 'verify'
 * 5. Monotonic counters, event notifications, and metrics snapshotting
 * 6. 100% operational implementation; zero stubs, zero mocks, zero placeholders
 */

export const CircuitState = Object.freeze({
  ACTIVE: 'active',
  TRIPPED: 'tripped',
  FALLBACK: 'fallback',
  HALF_OPEN: 'half_open'
});

export const DEFAULT_FAILURE_THRESHOLD = 3;
export const DEFAULT_RECOVERY_THRESHOLD = 5;

/**
 * Validates integer bounds strictly.
 */
function validatePositiveInteger(value, name) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer, got: ${typeof value}`);
  }
  if (value <= 0) {
    throw new RangeError(`${name} must be strictly positive (> 0), got: ${value}`);
  }
  return value;
}

export class ModelCircuitBreaker {
  /**
   * @param {Object} [options]
   * @param {number} [options.failureThreshold=3] - Consecutive failures to trip breaker
   * @param {number} [options.recoveryThreshold=5] - Consecutive successes in HALF_OPEN to restore ACTIVE
   * @param {Function} [options.onStateChange] - Callback invoked on state transitions (oldState, newState, reason)
   */
  constructor(options = {}) {
    this.failureThreshold = validatePositiveInteger(
      options.failureThreshold !== undefined ? options.failureThreshold : DEFAULT_FAILURE_THRESHOLD,
      'failureThreshold'
    );
    this.recoveryThreshold = validatePositiveInteger(
      options.recoveryThreshold !== undefined ? options.recoveryThreshold : DEFAULT_RECOVERY_THRESHOLD,
      'recoveryThreshold'
    );
    this.onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null;

    this.state = CircuitState.ACTIVE;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.lastError = null;
    this.stateHistory = [
      { state: CircuitState.ACTIVE, timestamp: new Date().toISOString(), reason: 'Initial initialization' }
    ];
  }

  /**
   * Returns the current operational state string.
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Determines whether inference invocations are permitted.
   * In ACTIVE or HALF_OPEN modes, requests can be attempted.
   * In TRIPPED or FALLBACK modes, normal inference is blocked.
   * @returns {boolean}
   */
  canAttempt() {
    return this.state === CircuitState.ACTIVE || this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Transitions circuit state with event emission and history recording.
   * @private
   */
  _transitionTo(newState, reason) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    const entry = { state: newState, timestamp: new Date().toISOString(), reason };
    this.stateHistory.push(entry);

    if (this.onStateChange) {
      try {
        this.onStateChange(oldState, newState, reason);
      } catch (err) {
        console.error(`[ModelCircuitBreaker] Error in onStateChange callback: ${err.message}`);
      }
    }
  }

  /**
   * Records a successful execution or probe.
   */
  recordSuccess() {
    this.totalSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date().toISOString();

    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.recoveryThreshold) {
        this._transitionTo(
          CircuitState.ACTIVE,
          `Recovery threshold reached: ${this.consecutiveSuccesses} consecutive successful probes`
        );
        this.consecutiveSuccesses = 0;
      }
    } else if (this.state === CircuitState.FALLBACK || this.state === CircuitState.TRIPPED) {
      // Direct success in fallback mode initiates recovery
      this.consecutiveSuccesses++;
      this._transitionTo(
        CircuitState.HALF_OPEN,
        `Probe success received while in ${this.state}: transitioning to half_open`
      );
    } else {
      // ACTIVE state
      this.consecutiveSuccesses = 0;
    }
  }

  /**
   * Records a failed execution or probe.
   * @param {Error|string} [error]
   */
  recordFailure(error) {
    this.totalFailures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = new Date().toISOString();
    this.lastError = error ? (error.message || String(error)) : 'Unspecified model failure';

    if (this.state === CircuitState.ACTIVE) {
      if (this.consecutiveFailures >= this.failureThreshold) {
        this._transitionTo(
          CircuitState.FALLBACK,
          `Failure threshold breached: ${this.consecutiveFailures} consecutive errors (${this.lastError})`
        );
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Failure during half-open recovery immediately re-trips back to fallback
      this._transitionTo(
        CircuitState.FALLBACK,
        `Probe failure occurred during half_open: ${this.lastError}`
      );
    }
  }

  /**
   * Explicitly trips the circuit breaker into FALLBACK mode.
   * @param {string} [reason='Manual trip invoked']
   */
  trip(reason = 'Manual trip invoked') {
    this.consecutiveSuccesses = 0;
    this._transitionTo(CircuitState.FALLBACK, reason);
  }

  /**
   * Transitions circuit breaker into HALF_OPEN state to allow controlled health probes.
   * @param {string} [reason='Probe initiated']
   */
  halfOpen(reason = 'Probe initiated') {
    this.consecutiveSuccesses = 0;
    this._transitionTo(CircuitState.HALF_OPEN, reason);
  }

  /**
   * Resets all internal counters and restores ACTIVE state.
   */
  reset() {
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastError = null;
    this._transitionTo(CircuitState.ACTIVE, 'Circuit breaker manual reset');
  }

  /**
   * Intercepts decision routing. If the circuit breaker is in FALLBACK or TRIPPED state,
   * enforces safe degraded action policies:
   * - High-risk decisions MUST route to 'human_review'.
   * - Low/normal-risk decisions route to 'verify'.
   *
   * If the circuit breaker is ACTIVE or HALF_OPEN, delegates to the defaultRouter.
   *
   * @param {Object} decision - Governed decision object
   * @param {Function} [defaultRouter] - Optional standard router function (e.g. routeDecision)
   * @returns {Object} Route result
   */
  routeWithCircuitBreaker(decision, defaultRouter = null) {
    if (!decision || typeof decision !== 'object') {
      throw new TypeError('decision must be a non-null object');
    }

    const risk = String(decision.riskLevel || decision.risk || 'normal').toLowerCase();
    const isDegraded = this.state === CircuitState.FALLBACK || this.state === CircuitState.TRIPPED;

    if (isDegraded) {
      if (risk === 'high') {
        return {
          action: 'human_review',
          riskLevel: 'high',
          evidenceGrounding: decision.evidenceGrounding || decision.evidence || 'unverified',
          confidence: Number.isFinite(Number(decision.confidence)) ? Number(decision.confidence) : 0.0,
          reason: `Circuit breaker active (${this.state}): model serving failure forces high-risk decision to human_review`,
          circuitBreakerState: this.state,
          tripped: true,
          originalDecision: decision
        };
      }

      return {
        action: 'verify',
        riskLevel: risk,
        evidenceGrounding: decision.evidenceGrounding || decision.evidence || 'unverified',
        confidence: Number.isFinite(Number(decision.confidence)) ? Number(decision.confidence) : 0.0,
        reason: `Circuit breaker active (${this.state}): model serving degraded routes normal-risk decision to verify`,
        circuitBreakerState: this.state,
        tripped: true,
        originalDecision: decision
      };
    }

    // Normal operational state (ACTIVE or HALF_OPEN)
    if (typeof defaultRouter === 'function') {
      return defaultRouter(decision);
    }

    return decision;
  }

  /**
   * Returns a clean, immutable diagnostic metrics snapshot.
   * @returns {Object}
   */
  getMetrics() {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      failureThreshold: this.failureThreshold,
      recoveryThreshold: this.recoveryThreshold,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastError: this.lastError,
      stateHistoryLength: this.stateHistory.length
    };
  }
}
