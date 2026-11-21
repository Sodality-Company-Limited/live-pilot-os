/**
 * Model Tier Normalization & Provider Model Mapping for Soda OS.
 * Translates generic tiers ('reasoning', 'balanced', 'local_offline')
 * or specific model aliases into exact CLI provider flags.
 */

export const MODEL_TIERS = {
  reasoning: {
    description: 'High-capability complex reasoning and formal architectural planning',
    codex: 'gpt-5.6-luna',
    antigravity: 'gemini-2.5-pro',
    gemini: 'gemini-2.5-pro',
    claude: 'claude-3-7-sonnet',
    aider: 'claude-3-7-sonnet',
    ollama: 'qwen2.5-coder:14b',
    goose: 'claude-3-7-sonnet',
  },
  balanced: {
    description: 'Fast, high-throughput implementation and straightforward coding tasks',
    codex: 'gpt-5.6-luna',
    antigravity: 'gemini-2.5-flash',
    gemini: 'gemini-2.0-flash',
    claude: 'claude-3-5-haiku',
    aider: 'gpt-4o',
    ollama: 'gemma4',
    goose: 'gpt-4o',
  },
  local_offline: {
    description: 'Zero-cost private offline execution on local hardware',
    codex: null, // Codex requires API/network
    antigravity: null,
    gemini: null,
    claude: null,
    aider: 'ollama/qwen2.5-coder',
    ollama: 'gemma4',
    goose: 'ollama/gemma4',
  },
};

/**
 * Resolves the appropriate model string for a given provider and tier/name.
 */
export function resolveModelForProvider(provider = 'codex', requestedModel = null, tier = null) {
  const normProvider = String(provider).toLowerCase().trim();

  // 1. If explicit tier specified, resolve from tier map
  if (tier && MODEL_TIERS[tier]) {
    const tierModel = MODEL_TIERS[tier][normProvider];
    if (tierModel) return tierModel;
  }

  // 2. If requestedModel is itself a tier name
  if (requestedModel && MODEL_TIERS[requestedModel]) {
    const tierModel = MODEL_TIERS[requestedModel][normProvider];
    if (tierModel) return tierModel;
  }

  // 3. If explicit model name provided, use directly
  if (requestedModel) {
    return requestedModel;
  }

  // 4. Default to balanced tier for provider
  return MODEL_TIERS.balanced[normProvider] || null;
}
