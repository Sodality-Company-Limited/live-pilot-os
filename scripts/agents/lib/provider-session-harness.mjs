import { createTokenBudgetTracker } from './token-budget-tracker.mjs';

/** Run a provider adapter through bounded lifecycle hooks. The adapter owns transport details. */
export async function runBoundedProviderSession({ budget, start, onTelemetry = async () => {}, onCleanup = async () => {} }) {
  const tracker = createTokenBudgetTracker(budget);
  let stopReason = 'complete';
  const controller = new AbortController();
  try {
    await start({ signal: controller.signal, observe: (usage) => {
      const status = tracker.observe(usage);
      if (status.stop) {
        stopReason = status.stopReason;
        controller.abort();
      }
      return status;
    }});
  } catch (error) {
    stopReason = controller.signal.aborted ? tracker.snapshot().stopReason : 'provider_error';
    if (!controller.signal.aborted) throw error;
  } finally {
    await onCleanup();
    await onTelemetry({ ...tracker.snapshot(), stopReason });
  }
  return { ...tracker.snapshot(), stopReason };
}
