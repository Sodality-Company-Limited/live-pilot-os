import test from 'node:test';
import assert from 'node:assert/strict';
import { runBoundedProviderSession } from '../lib/provider-session-harness.mjs';

test('cancels a provider stream when the token budget is exceeded', async () => {
  let cleaned = false;
  let telemetry;
  const result = await runBoundedProviderSession({
    budget: { maxInputTokens: 10, maxOutputTokens: 5 },
    start: async ({ observe, signal }) => {
      observe({ inputTokens: 8, outputTokens: 1 });
      observe({ inputTokens: 10, outputTokens: 5 });
      assert.equal(signal.aborted, true);
      throw new Error('stream cancelled');
    },
    onCleanup: async () => { cleaned = true; },
    onTelemetry: async (record) => { telemetry = record; },
  });
  assert.equal(result.stopReason, 'token_budget_exceeded');
  assert.equal(cleaned, true);
  assert.equal(telemetry.stopReason, 'token_budget_exceeded');
});
