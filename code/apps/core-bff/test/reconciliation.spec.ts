/**
 * Unit & Integration Tests for Core BFF Timeout & Reconciliation Policy
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CoreBffReconciliationPolicy } from '../src/reconciliation.js';

describe('G-CORE-086: Core BFF Timeout and Reconciliation Policy', () => {
  it('classifies upstream timeout as UNKNOWN_RECONCILIATION_REQUIRED and forbids blind retry', () => {
    const result = CoreBffReconciliationPolicy.classify({ isTimeout: true, code: 'LP03007' });

    assert.equal(result.classification, 'UNKNOWN_RECONCILIATION_REQUIRED');
    assert.equal(result.canRetryImmediately, false);
    assert.equal(result.requiresReconciliation, true);
    assert.equal(result.problemCode, 'LP03007');
  });

  it('classifies transient network disconnect as TRANSIENT_RETRYABLE within budget', () => {
    const result = CoreBffReconciliationPolicy.classify({ isNetworkDisconnect: true, code: 'ECONNRESET' }, 1);

    assert.equal(result.classification, 'TRANSIENT_RETRYABLE');
    assert.equal(result.canRetryImmediately, true);
    assert.equal(result.requiresReconciliation, false);
    assert.ok(result.recommendedBackoffMs && result.recommendedBackoffMs > 0);
  });

  it('escalates to reconciliation required if network disconnect exceeds retry budget', () => {
    const result = CoreBffReconciliationPolicy.classify({ isNetworkDisconnect: true, code: 'ECONNRESET' }, 4);

    assert.equal(result.classification, 'UNKNOWN_RECONCILIATION_REQUIRED');
    assert.equal(result.canRetryImmediately, false);
    assert.equal(result.requiresReconciliation, true);
  });

  it('classifies 400 Bad Request as PERMANENT_REJECTED with zero retries', () => {
    const result = CoreBffReconciliationPolicy.classify({ statusCode: 400, code: 'LP03002', message: 'Invalid payload' });

    assert.equal(result.classification, 'PERMANENT_REJECTED');
    assert.equal(result.canRetryImmediately, false);
    assert.equal(result.requiresReconciliation, false);
    assert.equal(result.problemCode, 'LP03002');
  });

  it('classifies 429 rate limit as TRANSIENT_RETRYABLE with backoff', () => {
    const result = CoreBffReconciliationPolicy.classify({ statusCode: 429, code: 'LP03009' });

    assert.equal(result.classification, 'TRANSIENT_RETRYABLE');
    assert.equal(result.canRetryImmediately, false);
    assert.equal(result.recommendedBackoffMs, 1000);
  });
});
