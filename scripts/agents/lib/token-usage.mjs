/** Normalize exact provider usage or produce an explicitly estimated fallback. */
export function normalizeTokenUsage(usage = {}, payload = '') {
  const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens);
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens);
  if (Number.isFinite(input) && Number.isFinite(output)) {
    return { inputTokens: input, outputTokens: output, totalTokens: input + output, source: 'provider' };
  }
  const estimated = Math.ceil(Buffer.byteLength(String(payload), 'utf8') / 4);
  return { inputTokens: estimated, outputTokens: 0, totalTokens: estimated, source: 'estimate' };
}

export function budgetStatus(usage, budget) {
  const inputLimit = Number(budget?.maxInputTokens ?? 24000);
  const outputLimit = Number(budget?.maxOutputTokens ?? 8000);
  const workerCumulativeLimit = Number(budget?.workerMaxTokens ?? 30000);
  const total = usage.inputTokens + usage.outputTokens;
  const hardLimit = Math.min(inputLimit + outputLimit, workerCumulativeLimit);
  const inputExceeded = usage.inputTokens >= inputLimit;
  const outputExceeded = usage.outputTokens >= outputLimit;
  const cumulativeExceeded = total >= workerCumulativeLimit;
  const warningLimit = hardLimit * 0.8;
  return {
    totalTokens: total,
    warning: total >= warningLimit && total < hardLimit,
    inputExceeded,
    outputExceeded,
    cumulativeExceeded,
    exceeded: inputExceeded || outputExceeded || cumulativeExceeded || total >= hardLimit,
    inputLimit,
    outputLimit,
    workerCumulativeLimit,
    hardLimit,
  };
}
