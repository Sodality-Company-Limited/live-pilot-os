import crypto from 'node:crypto';
import { validateSpawnRequest } from './session-budget.mjs';
import { buildCompactPrompt } from './compact-prompt.mjs';
import { budgetStatus, normalizeTokenUsage } from './token-usage.mjs';
import { createTokenBudgetTracker } from './token-budget-tracker.mjs';

/** Normalize and validate the contract shared by Codex, Claude, and Antigravity adapters. */
export function prepareProviderSession(input, activeKeys = new Set(), usedPromptHashes = new Set()) {
  const prompt = buildCompactPrompt(input);
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  const request = {
    goalId: input.goalId,
    role: input.role,
    persona: input.persona,
    promptHash,
    goalStatus: input.goalStatus,
    touchMap: input.touchMap,
    contextBytes: input.contextBytes ?? 0,
    childCount: input.childCount ?? 0,
    repoRoot: input.repoRoot,
  };
  const gate = validateSpawnRequest(request, activeKeys, usedPromptHashes);
  if (!gate.allowed) return { allowed: false, gate };
  const usage = normalizeTokenUsage(input.usage, input.prompt ?? input.mandate ?? '');
  const budget = budgetStatus(usage, input.budget);
  if (budget.exceeded) {
    const error = budget.inputExceeded
      ? 'input token budget exceeded'
      : budget.outputExceeded ? 'output token budget exceeded' : 'token budget exceeded';
    return { allowed: false, gate, usage, budget, error };
  }
  return {
    allowed: true,
    gate,
    usage,
    budget,
    tracker: createTokenBudgetTracker(input.budget),
    prompt,
    promptHash,
    cancellation: { signal: 'SIGTERM', graceSeconds: 10 },
    telemetry: {
      goalId: input.goalId,
      role: input.role,
      persona: input.persona,
      sessionKey: gate.key,
      stopReason: null,
    },
  };
}

/**
 * Validate end-to-end coordinator-to-subagent dispatch lifecycle.
 * Coordinates input packet, session preparation, budget gate, and telemetry binding.
 */
export function validateCoordinatorDispatchLifecycle(dispatchPacket, activeKeys = new Set(), usedPromptHashes = new Set()) {
  if (!dispatchPacket || typeof dispatchPacket !== 'object') {
    return { status: 'rejected', reason: 'invalid dispatch packet' };
  }
  const session = prepareProviderSession(dispatchPacket, activeKeys, usedPromptHashes);
  if (!session.allowed) {
    return {
      status: 'rejected',
      reason: session.error || (session.gate?.errors?.join(', ') ?? 'session preparation rejected'),
      details: session,
    };
  }

  return {
    status: 'dispatched',
    sessionKey: session.telemetry.sessionKey,
    goalId: session.telemetry.goalId,
    role: session.telemetry.role,
    persona: session.telemetry.persona,
    promptHash: session.promptHash,
    cancellation: session.cancellation,
    tracker: session.tracker,
    budget: session.budget,
  };
}

