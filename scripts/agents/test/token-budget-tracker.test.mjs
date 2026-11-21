import test from 'node:test';
import assert from 'node:assert/strict';
import { createTokenBudgetTracker } from '../lib/token-budget-tracker.mjs';

test('stops after a mid-session token update exceeds the limit', () => {
  const tracker = createTokenBudgetTracker({ maxInputTokens: 100, maxOutputTokens: 50 });
  assert.equal(tracker.observe({ inputTokens: 80, outputTokens: 10 }).stop, false);
  const result = tracker.observe({ inputTokens: 110, outputTokens: 50 });
  assert.equal(result.stop, true);
  assert.equal(result.stopReason, 'token_budget_exceeded');
  assert.equal(tracker.snapshot().stopReason, 'token_budget_exceeded');
});
