import test from 'node:test';
import assert from 'node:assert';
import { classifyIntent, rankRisk } from '../../src/domain/intent-risk-engine.mjs';

test('G-CORE-066: Deterministic Intent Classification', () => {
  // 1. Discount intent
  const discountRes = classifyIntent('Is there any voucher or discount code available?');
  assert.strictEqual(discountRes.outcome, 'DETECTED');
  assert.strictEqual(discountRes.category, 'DISCOUNT_REQUEST');
  assert.ok(discountRes.confidence >= 0.7);
  assert.strictEqual(discountRes.evidence[0].redacted, true);

  // 2. Stock query
  const stockRes = classifyIntent('Do you have stock left for size L?');
  assert.strictEqual(stockRes.outcome, 'DETECTED');
  assert.strictEqual(stockRes.category, 'STOCK_QUERY');

  // 3. Low confidence / ambiguous intent deferred fail-closed
  const ambiguousRes = classifyIntent('hello there', 0.8);
  assert.strictEqual(ambiguousRes.outcome, 'DEFERRED');
  assert.strictEqual(ambiguousRes.reason, 'LOW_CONFIDENCE');
});

test('G-CORE-066: Deterministic Moderation Risk Detection & Severity Ranking', () => {
  // 1. Scam detection
  const scamRes = rankRisk('Please transfer money to my bank account for 50% discount');
  assert.ok(scamRes !== null);
  assert.strictEqual(scamRes.category, 'SCAM');
  assert.strictEqual(scamRes.severity, 'CRITICAL');
  assert.strictEqual(scamRes.handling, 'escalate');

  // 2. Spam detection
  const spamRes = rankRisk('Free crypto airdrop! Visit http://scam.xyz');
  assert.ok(spamRes !== null);
  assert.strictEqual(spamRes.category, 'SPAM');
  assert.strictEqual(spamRes.severity, 'HIGH');
  assert.strictEqual(spamRes.handling, 'filter');

  // 3. Clean content
  const cleanRes = rankRisk('What is the shipping time to Bangkok?');
  assert.strictEqual(cleanRes, null);
});
