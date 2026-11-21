import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetStatus, normalizeTokenUsage } from '../lib/token-usage.mjs';

test('prefers exact provider counters', () => {
  const usage = normalizeTokenUsage({ input_tokens: 10, output_tokens: 4 }, 'ignored');
  assert.deepEqual(usage, { inputTokens: 10, outputTokens: 4, totalTokens: 14, source: 'provider' });
});

test('labels byte-based fallback as an estimate', () => {
  const usage = normalizeTokenUsage({}, '12345678');
  assert.equal(usage.source, 'estimate');
  assert.equal(usage.inputTokens, 2);
});

test('reports warning and hard budget states', () => {
  assert.equal(budgetStatus({ inputTokens: 21000, outputTokens: 5000 }, { maxInputTokens: 24000, maxOutputTokens: 8000 }).warning, true);
  assert.equal(budgetStatus({ inputTokens: 24000, outputTokens: 8000 }, { maxInputTokens: 24000, maxOutputTokens: 8000 }).exceeded, true);
});

test('reports independent input and output ceiling violations', () => {
  const inputViolation = budgetStatus(
    { inputTokens: 24000, outputTokens: 1 },
    { maxInputTokens: 24000, maxOutputTokens: 8000 },
  );
  assert.equal(inputViolation.inputExceeded, true);
  assert.equal(inputViolation.outputExceeded, false);
  assert.equal(inputViolation.exceeded, true);

  const outputViolation = budgetStatus(
    { inputTokens: 1, outputTokens: 8000 },
    { maxInputTokens: 24000, maxOutputTokens: 8000 },
  );
  assert.equal(outputViolation.inputExceeded, false);
  assert.equal(outputViolation.outputExceeded, true);
  assert.equal(outputViolation.exceeded, true);
});

