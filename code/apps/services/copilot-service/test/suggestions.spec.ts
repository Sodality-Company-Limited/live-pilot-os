import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCopilotSuggestion,
  CopilotInputSignal,
  CatalogFact,
  SuggestionConfidence,
} from '../src/suggestions.js';

describe('G-CORE-071: Produce grounded F02 host copilot suggestions', () => {
  const mockCatalogFacts: CatalogFact[] = [
    {
      productId: 'prod-001',
      title: 'Premium Organic Green Tea',
      stockAvailable: 25,
      priceMinor: 25000n,
      currency: 'THB',
      scale: 2,
    },
  ];

  it('generates high-confidence suggestion when signal matches verified catalog fact', () => {
    const input: CopilotInputSignal = {
      sessionId: 'session-001',
      tenantId: 'tenant-001',
      intent: 'PRODUCT_INQUIRY',
      confidenceBps: 8500, // 85%
      extractedKeywords: ['tea', 'green tea'],
      timestamp: new Date(),
    };

    const suggestion = generateCopilotSuggestion(input, mockCatalogFacts);
    assert.ok(suggestion);
    assert.equal(suggestion.sessionId, 'session-001');
    assert.equal(suggestion.groundedFactId, 'prod-001');
    assert.equal(suggestion.confidence, SuggestionConfidence.HIGH);
    assert.match(suggestion.suggestedText, /Premium Organic Green Tea/);
  });

  it('fails closed (returns null) when confidence is below threshold (< 70%)', () => {
    const lowConfidenceInput: CopilotInputSignal = {
      sessionId: 'session-001',
      tenantId: 'tenant-001',
      intent: 'PRODUCT_INQUIRY',
      confidenceBps: 5500, // 55%
      extractedKeywords: ['tea'],
      timestamp: new Date(),
    };

    const suggestion = generateCopilotSuggestion(lowConfidenceInput, mockCatalogFacts);
    assert.equal(suggestion, null);
  });

  it('fails closed when catalog facts are missing or out of stock', () => {
    const outOfStockFacts: CatalogFact[] = [
      {
        productId: 'prod-001',
        title: 'Premium Organic Green Tea',
        stockAvailable: 0,
        priceMinor: 25000n,
        currency: 'THB',
        scale: 2,
      },
    ];

    const input: CopilotInputSignal = {
      sessionId: 'session-001',
      tenantId: 'tenant-001',
      intent: 'PRODUCT_INQUIRY',
      confidenceBps: 9000,
      extractedKeywords: ['tea'],
      timestamp: new Date(),
    };

    const suggestion = generateCopilotSuggestion(input, outOfStockFacts);
    assert.equal(suggestion, null);
  });
});
