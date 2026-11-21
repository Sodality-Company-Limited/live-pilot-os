import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateGuidanceSafety,
  redactGuidanceText,
  GuidanceEvaluationRequest,
  GuidanceSafetyStatus,
} from '../src/guidance-safety.js';

describe('G-CORE-072: F02 Guidance Freshness, Redaction, and Withdrawal', () => {
  it('passes guidance when fresh, in-stock, and free of sensitive data', () => {
    const request: GuidanceEvaluationRequest = {
      suggestionId: 'sug-001',
      generatedAt: new Date(Date.now() - 5000), // 5 seconds ago
      currentStock: 10,
      emergencyPaused: false,
      text: 'Special discount on Organic Tea! Order now.',
    };

    const result = evaluateGuidanceSafety(request);
    assert.equal(result.status, GuidanceSafetyStatus.VALID);
    assert.equal(result.redactedText, 'Special discount on Organic Tea! Order now.');
  });

  it('withdraws guidance when stale (> 30 seconds old)', () => {
    const request: GuidanceEvaluationRequest = {
      suggestionId: 'sug-002',
      generatedAt: new Date(Date.now() - 35000), // 35 seconds ago
      currentStock: 10,
      emergencyPaused: false,
      text: 'Special discount on Organic Tea!',
    };

    const result = evaluateGuidanceSafety(request);
    assert.equal(result.status, GuidanceSafetyStatus.WITHDRAWN_STALE);
    assert.match(result.reason, /freshness TTL exceeded/);
  });

  it('withdraws guidance when product becomes out-of-stock', () => {
    const request: GuidanceEvaluationRequest = {
      suggestionId: 'sug-003',
      generatedAt: new Date(),
      currentStock: 0,
      emergencyPaused: false,
      text: 'Special discount on Organic Tea!',
    };

    const result = evaluateGuidanceSafety(request);
    assert.equal(result.status, GuidanceSafetyStatus.WITHDRAWN_OUT_OF_STOCK);
  });

  it('withdraws guidance when emergency pause is active', () => {
    const request: GuidanceEvaluationRequest = {
      suggestionId: 'sug-004',
      generatedAt: new Date(),
      currentStock: 10,
      emergencyPaused: true,
      text: 'Special discount on Organic Tea!',
    };

    const result = evaluateGuidanceSafety(request);
    assert.equal(result.status, GuidanceSafetyStatus.WITHDRAWN_PAUSED);
  });

  it('redacts sensitive PII (phone numbers, email addresses) from guidance text', () => {
    const textWithPii = 'Contact admin at john@example.com or call 081-234-5678 for bulk orders';
    const redacted = redactGuidanceText(textWithPii);
    assert.equal(redacted.includes('john@example.com'), false);
    assert.equal(redacted.includes('081-234-5678'), false);
    assert.match(redacted, /\[REDACTED_EMAIL\]/);
    assert.match(redacted, /\[REDACTED_PHONE\]/);
  });
});
