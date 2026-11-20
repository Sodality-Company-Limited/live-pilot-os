#!/usr/bin/env node
/**
 * tests/unit/test-circuit-breaker.mjs
 *
 * Comprehensive Unit Test Suite for Goal G-ML-023:
 * Rollback and Model-Version Compatibility State Machine
 *
 * Test Coverage:
 * 1. Default instantiation and parameter configuration
 * 2. Fail-closed threshold validation (reject non-integer, negative, or zero thresholds)
 * 3. Initial Active state and attempt permission
 * 4. Consecutive failure tracking without tripping below threshold
 * 5. State transitions: exactly 3 consecutive failures trip breaker to Fallback mode (test_state_transitions)
 * 6. Intermittent success resetting consecutive failure count
 * 7. Fallback routing: high-risk decisions forced to human_review
 * 8. Fallback routing: low/normal-risk decisions forced to verify
 * 9. Active routing: delegates cleanly to defaultRouter
 * 10. HalfOpen probing and state restoration after 5 consecutive healthy probes
 * 11. Intermittent failure during HalfOpen recovery immediately aborting probe and re-tripping breaker
 * 12. Manual trip and halfOpen state controls
 * 13. State change callback invocation
 * 14. Metrics snapshotting and history logging
 * 15. Manual reset restoring clean Active state
 * 16. Command-line `-k` substring filtering support
 */

import assert from 'node:assert/strict';
import {
  ModelCircuitBreaker,
  CircuitState,
  DEFAULT_FAILURE_THRESHOLD,
  DEFAULT_RECOVERY_THRESHOLD
} from '../../scripts/lib/model-circuit-breaker.mjs';

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
console.log('🧪 RUNNING MODEL CIRCUIT BREAKER UNIT TEST SUITE (G-ML-023)');
if (testFilter) {
  console.log(`   Applying filter: -k "${testFilter}"`);
}
console.log('════════════════════════════════════════════════════════════════════════════════\n');

// 1. Initial State & Configuration
runTest('test_initial_state_defaults', () => {
  const cb = new ModelCircuitBreaker();
  assert.equal(cb.getState(), CircuitState.ACTIVE);
  assert.equal(cb.canAttempt(), true);
  assert.equal(cb.failureThreshold, DEFAULT_FAILURE_THRESHOLD);
  assert.equal(cb.recoveryThreshold, DEFAULT_RECOVERY_THRESHOLD);
  assert.equal(cb.consecutiveFailures, 0);
  assert.equal(cb.consecutiveSuccesses, 0);
  assert.equal(cb.totalFailures, 0);
  assert.equal(cb.totalSuccesses, 0);
});

// 2. Custom Thresholds
runTest('test_custom_thresholds_configuration', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 5, recoveryThreshold: 10 });
  assert.equal(cb.failureThreshold, 5);
  assert.equal(cb.recoveryThreshold, 10);
  assert.equal(cb.getState(), CircuitState.ACTIVE);
});

// 3. Fail-Closed Threshold Validation
runTest('test_fail_closed_threshold_validation', () => {
  assert.throws(() => new ModelCircuitBreaker({ failureThreshold: 0 }), RangeError);
  assert.throws(() => new ModelCircuitBreaker({ failureThreshold: -2 }), RangeError);
  assert.throws(() => new ModelCircuitBreaker({ failureThreshold: 2.5 }), TypeError);
  assert.throws(() => new ModelCircuitBreaker({ failureThreshold: 'three' }), TypeError);

  assert.throws(() => new ModelCircuitBreaker({ recoveryThreshold: 0 }), RangeError);
  assert.throws(() => new ModelCircuitBreaker({ recoveryThreshold: -1 }), RangeError);
  assert.throws(() => new ModelCircuitBreaker({ recoveryThreshold: 3.14 }), TypeError);
  assert.throws(() => new ModelCircuitBreaker({ recoveryThreshold: null }), TypeError);
});

// 4. Consecutive Failures Below Threshold
runTest('test_consecutive_failures_below_threshold', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 3 });
  cb.recordFailure(new Error('Connection reset'));
  assert.equal(cb.getState(), CircuitState.ACTIVE);
  assert.equal(cb.canAttempt(), true);
  assert.equal(cb.consecutiveFailures, 1);

  cb.recordFailure(new Error('Timeout'));
  assert.equal(cb.getState(), CircuitState.ACTIVE);
  assert.equal(cb.canAttempt(), true);
  assert.equal(cb.consecutiveFailures, 2);
});

// 5. State Transitions (test_state_transitions)
runTest('test_state_transitions', () => {
  let transitionLogged = null;
  const cb = new ModelCircuitBreaker({
    failureThreshold: 3,
    recoveryThreshold: 5,
    onStateChange: (oldState, newState, reason) => {
      transitionLogged = { oldState, newState, reason };
    }
  });

  assert.equal(cb.getState(), CircuitState.ACTIVE);

  cb.recordFailure(new Error('503 Service Unavailable'));
  assert.equal(cb.getState(), CircuitState.ACTIVE);

  cb.recordFailure(new Error('Gateway Timeout'));
  assert.equal(cb.getState(), CircuitState.ACTIVE);

  // Third consecutive failure trips the breaker
  cb.recordFailure(new Error('Network partition'));
  assert.equal(cb.getState(), CircuitState.FALLBACK);
  assert.equal(cb.canAttempt(), false);
  assert.equal(cb.consecutiveFailures, 3);
  assert.ok(transitionLogged);
  assert.equal(transitionLogged.oldState, CircuitState.ACTIVE);
  assert.equal(transitionLogged.newState, CircuitState.FALLBACK);
});

// 6. Intermittent Success Resets Consecutive Failures
runTest('test_intermittent_success_resets_failures', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 3 });
  cb.recordFailure(new Error('Failure 1'));
  cb.recordFailure(new Error('Failure 2'));
  assert.equal(cb.consecutiveFailures, 2);

  // Success resets consecutive failure count
  cb.recordSuccess();
  assert.equal(cb.consecutiveFailures, 0);
  assert.equal(cb.getState(), CircuitState.ACTIVE);

  // Two more failures still do not trip
  cb.recordFailure(new Error('Failure 3'));
  cb.recordFailure(new Error('Failure 4'));
  assert.equal(cb.consecutiveFailures, 2);
  assert.equal(cb.getState(), CircuitState.ACTIVE);
});

// 7. Fallback Routing: High-Risk Forced to Human Review
runTest('test_fallback_routing_high_risk_forced_to_human_review', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 2 });
  cb.recordFailure(new Error('Error 1'));
  cb.recordFailure(new Error('Error 2'));
  assert.equal(cb.getState(), CircuitState.FALLBACK);

  const highRiskDecision = {
    decisionId: 'dec_high_01',
    riskLevel: 'high',
    confidence: 0.95,
    evidenceGrounding: 'verified',
    suggestedAction: 'proceed'
  };

  const routed = cb.routeWithCircuitBreaker(highRiskDecision);
  assert.equal(routed.action, 'human_review');
  assert.equal(routed.tripped, true);
  assert.equal(routed.circuitBreakerState, CircuitState.FALLBACK);
  assert.ok(routed.reason.includes('forces high-risk decision to human_review'));
});

// 8. Fallback Routing: Low/Normal-Risk Routed to Verify
runTest('test_fallback_routing_normal_risk_routed_to_verify', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 2 });
  cb.recordFailure(new Error('Error 1'));
  cb.recordFailure(new Error('Error 2'));
  assert.equal(cb.getState(), CircuitState.FALLBACK);

  const normalRiskDecision = {
    decisionId: 'dec_normal_01',
    riskLevel: 'normal',
    confidence: 0.90,
    evidenceGrounding: 'verified',
    suggestedAction: 'proceed'
  };

  const routed = cb.routeWithCircuitBreaker(normalRiskDecision);
  assert.equal(routed.action, 'verify');
  assert.equal(routed.tripped, true);
  assert.equal(routed.circuitBreakerState, CircuitState.FALLBACK);
  assert.ok(routed.reason.includes('routes normal-risk decision to verify'));
});

// 9. Active Routing: Delegates to Default Router
runTest('test_active_routing_delegates_to_default_router', () => {
  const cb = new ModelCircuitBreaker();
  assert.equal(cb.getState(), CircuitState.ACTIVE);

  const decision = {
    decisionId: 'dec_active_01',
    riskLevel: 'normal',
    confidence: 0.92,
    evidenceGrounding: 'verified'
  };

  const mockRouter = (dec) => ({ action: 'proceed', delegated: true, decId: dec.decisionId });
  const routed = cb.routeWithCircuitBreaker(decision, mockRouter);
  assert.equal(routed.action, 'proceed');
  assert.equal(routed.delegated, true);
  assert.equal(routed.decId, 'dec_active_01');
});

// 10. Recovery Probing and Restoration to Active (5 consecutive successes)
runTest('test_recovery_probe_restores_active_state', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 3, recoveryThreshold: 5 });
  // Trip breaker
  cb.recordFailure(new Error('Fail 1'));
  cb.recordFailure(new Error('Fail 2'));
  cb.recordFailure(new Error('Fail 3'));
  assert.equal(cb.getState(), CircuitState.FALLBACK);

  // First probe success transitions to HALF_OPEN
  cb.recordSuccess();
  assert.equal(cb.getState(), CircuitState.HALF_OPEN);
  assert.equal(cb.canAttempt(), true);
  assert.equal(cb.consecutiveSuccesses, 1);

  // Subsequent probe successes
  cb.recordSuccess(); // 2
  cb.recordSuccess(); // 3
  cb.recordSuccess(); // 4
  assert.equal(cb.getState(), CircuitState.HALF_OPEN);

  // 5th consecutive success restores ACTIVE
  cb.recordSuccess(); // 5
  assert.equal(cb.getState(), CircuitState.ACTIVE);
  assert.equal(cb.canAttempt(), true);
  assert.equal(cb.consecutiveFailures, 0);
  assert.equal(cb.consecutiveSuccesses, 0);
});

// 11. Intermittent Failure During HalfOpen Aborts Recovery
runTest('test_recovery_abort_on_intermittent_failure', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 3, recoveryThreshold: 5 });
  cb.recordFailure(new Error('Fail 1'));
  cb.recordFailure(new Error('Fail 2'));
  cb.recordFailure(new Error('Fail 3'));
  assert.equal(cb.getState(), CircuitState.FALLBACK);

  cb.halfOpen('Initiating test probe');
  assert.equal(cb.getState(), CircuitState.HALF_OPEN);

  cb.recordSuccess();
  cb.recordSuccess();
  cb.recordSuccess();
  assert.equal(cb.consecutiveSuccesses, 3);

  // Intermittent failure during probe aborts recovery and re-trips
  cb.recordFailure(new Error('Flaky connection dropped'));
  assert.equal(cb.getState(), CircuitState.FALLBACK);
  assert.equal(cb.consecutiveSuccesses, 0);
  assert.equal(cb.canAttempt(), false);
});

// 12. Manual Controls (trip, halfOpen)
runTest('test_manual_trip_and_half_open_controls', () => {
  const cb = new ModelCircuitBreaker();
  assert.equal(cb.getState(), CircuitState.ACTIVE);

  cb.trip('Admin maintenance window');
  assert.equal(cb.getState(), CircuitState.FALLBACK);
  assert.equal(cb.canAttempt(), false);

  cb.halfOpen('Canary trial');
  assert.equal(cb.getState(), CircuitState.HALF_OPEN);
  assert.equal(cb.canAttempt(), true);
});

// 13. Metrics Snapshotting
runTest('test_metrics_snapshotting', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 3, recoveryThreshold: 5 });
  cb.recordSuccess();
  cb.recordFailure(new Error('Timeout test'));

  const metrics = cb.getMetrics();
  assert.equal(metrics.state, CircuitState.ACTIVE);
  assert.equal(metrics.totalSuccesses, 1);
  assert.equal(metrics.totalFailures, 1);
  assert.equal(metrics.consecutiveFailures, 1);
  assert.equal(metrics.failureThreshold, 3);
  assert.equal(metrics.recoveryThreshold, 5);
  assert.ok(metrics.lastFailureTime);
  assert.ok(metrics.lastSuccessTime);
  assert.equal(metrics.lastError, 'Timeout test');
});

// 14. Manual Reset Functionality
runTest('test_manual_reset', () => {
  const cb = new ModelCircuitBreaker({ failureThreshold: 2 });
  cb.recordFailure(new Error('Err 1'));
  cb.recordFailure(new Error('Err 2'));
  assert.equal(cb.getState(), CircuitState.FALLBACK);

  cb.reset();
  assert.equal(cb.getState(), CircuitState.ACTIVE);
  assert.equal(cb.canAttempt(), true);
  assert.equal(cb.consecutiveFailures, 0);
  assert.equal(cb.consecutiveSuccesses, 0);
  assert.equal(cb.lastError, null);
});

// 15. Invalid Input Validation to routeWithCircuitBreaker
runTest('test_route_with_circuit_breaker_validation', () => {
  const cb = new ModelCircuitBreaker();
  assert.throws(() => cb.routeWithCircuitBreaker(null), TypeError);
  assert.throws(() => cb.routeWithCircuitBreaker('invalid'), TypeError);
});

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful (0 failures).`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');
