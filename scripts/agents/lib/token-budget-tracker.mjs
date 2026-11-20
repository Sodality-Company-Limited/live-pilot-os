import { budgetStatus } from './token-usage.mjs';

export function createTokenBudgetTracker(budget) {
  let latest = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let stopReason = null;
  return {
    observe(usage) {
      latest = { ...latest, ...usage, totalTokens: usage.inputTokens + usage.outputTokens };
      const status = budgetStatus(latest, budget);
      if (status.exceeded) stopReason = 'token_budget_exceeded';
      return { ...status, stop: Boolean(stopReason), stopReason };
    },
    snapshot() { return { usage: latest, stopReason }; },
  };
}
