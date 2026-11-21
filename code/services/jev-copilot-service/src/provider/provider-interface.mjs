/**
 * Provider-neutral Inference Adapter Core Interface & Types
 * G-JEVC-004: Implement provider-neutral JEV inference adapter
 *
 * Enforces Zero-Float arithmetic, strict typing, and fail-closed outcome mappings.
 */

export const INFERENCE_OUTCOMES = Object.freeze({
  ACCEPTED: 'accepted',
  DEFERRED: 'deferred',
  REFUSED: 'refused',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown',
  CONFLICT: 'conflict'
});

export const SUGGESTION_TYPES = Object.freeze([
  'product_highlight',
  'chat_response_cue',
  'promotion_recommendation',
  'urgency_cue',
  'objection_handling',
  'retention_prompt'
]);

export const SUGGESTED_ACTIONS = Object.freeze([
  'speak_cue',
  'pin_product',
  'propose_promotion',
  'answer_faq',
  'acknowledge_viewer'
]);

export const EVIDENCE_KINDS = Object.freeze([
  'catalog_fact',
  'telemetry_signal',
  'chat_aggregate',
  'margin_policy'
]);

export const EVIDENCE_STATUSES = Object.freeze([
  'APPROVED',
  'FRESH',
  'VERIFIED'
]);

/**
 * Interface contract for model provider backends (Gemini, OpenAI, Anthropic, etc.)
 */
export class InferenceProviderInterface {
  /**
   * Provider identifier (e.g. 'gemini', 'openai', 'anthropic')
   * @returns {string}
   */
  get name() {
    throw new Error('InferenceProviderInterface.name must be implemented');
  }

  /**
   * Execute raw inference against the provider API.
   * @param {object} params
   * @param {string} params.promptTemplateId
   * @param {string} params.promptRevision
   * @param {string} params.systemInstruction
   * @param {string} params.userPrompt
   * @param {number} params.timeoutMs
   * @param {number} params.maxOutputTokens
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<ProviderRawResult>}
   */
  async executeInference(params) {
    throw new Error('InferenceProviderInterface.executeInference must be implemented');
  }
}
