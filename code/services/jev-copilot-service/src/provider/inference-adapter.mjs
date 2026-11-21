import crypto from 'node:crypto';
import {
  INFERENCE_OUTCOMES,
  SUGGESTION_TYPES,
  SUGGESTED_ACTIONS,
  EVIDENCE_KINDS,
  EVIDENCE_STATUSES
} from './provider-interface.mjs';

/**
 * SHA-256 Digest Helper
 * @param {string|Buffer} data
 * @returns {string} 64-char hex string
 */
export function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Provider-Neutral Inference Adapter Engine
 *
 * Orchestrates:
 * - Provider invocation with microsecond/millisecond timeout ceilings
 * - Strict JSON parsing & schema conformance against jev-suggestion-proposed.schema.json
 * - Evidence grounding validation (must contain at least 1 verified evidence ref with valid 64-char hex digest)
 * - Calibrated confidence thresholding (0-10000 bps)
 * - Money Value Object token cost accounting (cost_minor: BigInt, cost_currency: 'USD', cost_scale: 6)
 * - Provider receipt generation with raw digests
 * - Fail-closed degraded mode fallback event generation on timeout, refusal, or network errors
 */
export class InferenceAdapter {
  /**
   * @param {object} options
   * @param {import('./provider-interface.mjs').InferenceProviderInterface} options.provider
   * @param {number} [options.minConfidenceBps] - Minimum confidence required to accept (e.g. 7000 bps = 70%)
   * @param {number} [options.timeoutMs] - Default execution timeout in ms
   * @param {Function} [options.onDegradedState] - Optional callback triggered on degraded fail-closed event
   */
  constructor(options) {
    if (!options?.provider) {
      throw new Error('InferenceAdapter requires a valid provider instance');
    }
    this.provider = options.provider;
    this.minConfidenceBps = options.minConfidenceBps ?? 7000;
    this.defaultTimeoutMs = options.timeoutMs ?? 3000;
    this.onDegradedState = options.onDegradedState || null;
  }

  /**
   * Validate content payload structure.
   */
  validateContentPayload(content) {
    if (!content || typeof content !== 'object') {
      throw new Error('Invalid content_payload: must be an object');
    }
    if (typeof content.headline !== 'string' || content.headline.length < 1 || content.headline.length > 256) {
      throw new Error('Invalid content_payload.headline: must be string length 1-256');
    }
    if (typeof content.cue_text !== 'string' || content.cue_text.length < 1 || content.cue_text.length > 2048) {
      throw new Error('Invalid content_payload.cue_text: must be string length 1-2048');
    }
    if (!SUGGESTED_ACTIONS.includes(content.suggested_action)) {
      throw new Error(`Invalid content_payload.suggested_action: ${content.suggested_action}`);
    }
    if (content.action_parameters !== undefined) {
      if (typeof content.action_parameters !== 'object' || content.action_parameters === null) {
        throw new Error('Invalid action_parameters: must be an object');
      }
      const p = content.action_parameters;
      if (p.product_id !== undefined && (typeof p.product_id !== 'string' || p.product_id.length < 1 || p.product_id.length > 128)) {
        throw new Error('Invalid action_parameters.product_id');
      }
      if (p.sku !== undefined && (typeof p.sku !== 'string' || p.sku.length < 1 || p.sku.length > 128)) {
        throw new Error('Invalid action_parameters.sku');
      }
      if (p.discount_percent !== undefined && (!Number.isInteger(p.discount_percent) || p.discount_percent < 0 || p.discount_percent > 100)) {
        throw new Error('Invalid action_parameters.discount_percent');
      }
      if (p.duration_seconds !== undefined && (!Number.isInteger(p.duration_seconds) || p.duration_seconds < 1 || p.duration_seconds > 3600)) {
        throw new Error('Invalid action_parameters.duration_seconds');
      }
    }
  }

  /**
   * Validate evidence refs array according to schema invariants.
   */
  validateEvidenceRefs(evidenceRefs) {
    if (!Array.isArray(evidenceRefs) || evidenceRefs.length < 1 || evidenceRefs.length > 32) {
      throw new Error('Invalid evidence_refs: must be array with 1 to 32 items');
    }
    const hexRegex = /^[0-9a-f]{64}$/;
    for (const ref of evidenceRefs) {
      if (!ref || typeof ref !== 'object') {
        throw new Error('Invalid evidence ref: must be an object');
      }
      if (typeof ref.evidence_id !== 'string' || ref.evidence_id.length < 1 || ref.evidence_id.length > 128) {
        throw new Error('Invalid evidence_id in ref');
      }
      if (!EVIDENCE_KINDS.includes(ref.kind)) {
        throw new Error(`Invalid evidence kind: ${ref.kind}`);
      }
      if (typeof ref.digest !== 'string' || !hexRegex.test(ref.digest)) {
        throw new Error(`Invalid evidence digest (must be 64-char lowercase hex): ${ref.digest}`);
      }
      if (!EVIDENCE_STATUSES.includes(ref.status)) {
        throw new Error(`Invalid evidence status: ${ref.status}`);
      }
    }
  }

  /**
   * Create degraded alert event payload.
   */
  createDegradedAlert({ tenantId, liveSessionId, reason, errorDetail }) {
    const event = {
      alertId: `alert-${crypto.randomUUID()}`,
      tenantId,
      liveSessionId,
      state: 'degraded',
      reason,
      errorDetail: String(errorDetail || ''),
      occurredAt: new Date().toISOString()
    };
    if (this.onDegradedState) {
      try {
        this.onDegradedState(event);
      } catch (err) {
        // Observer fail-safe
        console.error('onDegradedState listener failed:', err);
      }
    }
    return event;
  }

  /**
   * Generate suggestion with full grounding, provider receipt, and fail-closed bounds.
   *
   * @param {object} params
   * @param {string} params.tenantId
   * @param {string} params.liveSessionId
   * @param {string} params.promptTemplateId
   * @param {string} params.promptRevision
   * @param {string} params.systemInstruction
   * @param {string} params.userPrompt
   * @param {number} [params.timeoutMs]
   * @param {number} [params.minConfidenceBps]
   * @param {Array<object>} [params.contextEvidence] - Grounding evidence provided by context pipeline
   * @returns {Promise<InferenceExecutionResult>}
   */
  async generateSuggestion({
    tenantId,
    liveSessionId,
    promptTemplateId,
    promptRevision,
    systemInstruction,
    userPrompt,
    timeoutMs,
    minConfidenceBps,
    contextEvidence = []
  }) {
    if (!tenantId || !liveSessionId) {
      throw new Error('InferenceAdapter: tenantId and liveSessionId are required');
    }

    const effectiveTimeout = timeoutMs ?? this.defaultTimeoutMs;
    const requiredConfidence = minConfidenceBps ?? this.minConfidenceBps;
    const receiptId = `rec-${crypto.randomUUID()}`;
    const startTime = Date.now();

    try {
      const rawResult = await this.provider.executeInference({
        promptTemplateId,
        promptRevision,
        systemInstruction,
        userPrompt,
        timeoutMs: effectiveTimeout
      });

      const latencyMs = rawResult.latencyMs ?? (Date.now() - startTime);
      const rawInputDigest = sha256Hex(rawResult.rawInput || userPrompt);
      const rawOutputDigest = sha256Hex(rawResult.rawOutput || '');

      // Parse structured JSON response
      let parsed;
      try {
        parsed = JSON.parse(rawResult.rawOutput);
      } catch (parseErr) {
        // Output not valid JSON -> refuse fail-closed
        const degradedAlert = this.createDegradedAlert({
          tenantId,
          liveSessionId,
          reason: 'JSON_PARSE_FAILURE',
          errorDetail: parseErr.message
        });

        return {
          status: INFERENCE_OUTCOMES.REFUSED,
          reason: 'PROVIDER_OUTPUT_MALFORMED_JSON',
          receipt: {
            receipt_id: receiptId,
            provider_name: this.provider.name,
            model_version: rawResult.modelVersion,
            prompt_template_id: promptTemplateId,
            outcome: INFERENCE_OUTCOMES.REFUSED,
            input_tokens: rawResult.inputTokens,
            output_tokens: rawResult.outputTokens,
            latency_ms: latencyMs,
            cost_minor: rawResult.costMinor,
            cost_currency: rawResult.costCurrency,
            cost_scale: rawResult.costScale,
            raw_input_digest: rawInputDigest,
            raw_output_digest: rawOutputDigest
          },
          degradedAlert
        };
      }

      // Extract fields from model output
      const suggestionType = parsed.suggestion_type;
      if (!SUGGESTION_TYPES.includes(suggestionType)) {
        const degradedAlert = this.createDegradedAlert({
          tenantId,
          liveSessionId,
          reason: 'INVALID_SUGGESTION_TYPE',
          errorDetail: `Unknown suggestion_type: ${suggestionType}`
        });

        return {
          status: INFERENCE_OUTCOMES.REFUSED,
          reason: `INVALID_SUGGESTION_TYPE: ${suggestionType}`,
          receipt: {
            receipt_id: receiptId,
            provider_name: this.provider.name,
            model_version: rawResult.modelVersion,
            prompt_template_id: promptTemplateId,
            outcome: INFERENCE_OUTCOMES.REFUSED,
            input_tokens: rawResult.inputTokens,
            output_tokens: rawResult.outputTokens,
            latency_ms: latencyMs,
            cost_minor: rawResult.costMinor,
            cost_currency: rawResult.costCurrency,
            cost_scale: rawResult.costScale,
            raw_input_digest: rawInputDigest,
            raw_output_digest: rawOutputDigest
          },
          degradedAlert
        };
      }

      // Validate content payload
      try {
        this.validateContentPayload(parsed.content_payload);
      } catch (validationErr) {
        const degradedAlert = this.createDegradedAlert({
          tenantId,
          liveSessionId,
          reason: 'INVALID_CONTENT_PAYLOAD',
          errorDetail: validationErr.message
        });

        return {
          status: INFERENCE_OUTCOMES.REFUSED,
          reason: validationErr.message,
          receipt: {
            receipt_id: receiptId,
            provider_name: this.provider.name,
            model_version: rawResult.modelVersion,
            prompt_template_id: promptTemplateId,
            outcome: INFERENCE_OUTCOMES.REFUSED,
            input_tokens: rawResult.inputTokens,
            output_tokens: rawResult.outputTokens,
            latency_ms: latencyMs,
            cost_minor: rawResult.costMinor,
            cost_currency: rawResult.costCurrency,
            cost_scale: rawResult.costScale,
            raw_input_digest: rawInputDigest,
            raw_output_digest: rawOutputDigest
          },
          degradedAlert
        };
      }

      // Evidence refs: model can output refs or inherit verified contextEvidence
      const evidenceRefs = parsed.evidence_refs || contextEvidence;
      try {
        this.validateEvidenceRefs(evidenceRefs);
      } catch (evidenceErr) {
        const degradedAlert = this.createDegradedAlert({
          tenantId,
          liveSessionId,
          reason: 'EVIDENCE_GROUNDING_VIOLATION',
          errorDetail: evidenceErr.message
        });

        return {
          status: INFERENCE_OUTCOMES.REFUSED,
          reason: `UNGROUNDED_SUGGESTION: ${evidenceErr.message}`,
          receipt: {
            receipt_id: receiptId,
            provider_name: this.provider.name,
            model_version: rawResult.modelVersion,
            prompt_template_id: promptTemplateId,
            outcome: INFERENCE_OUTCOMES.REFUSED,
            input_tokens: rawResult.inputTokens,
            output_tokens: rawResult.outputTokens,
            latency_ms: latencyMs,
            cost_minor: rawResult.costMinor,
            cost_currency: rawResult.costCurrency,
            cost_scale: rawResult.costScale,
            raw_input_digest: rawInputDigest,
            raw_output_digest: rawOutputDigest
          },
          degradedAlert
        };
      }

      // Confidence score checking
      const confidenceBps = Number(parsed.confidence_basis_points);
      if (!Number.isInteger(confidenceBps) || confidenceBps < 0 || confidenceBps > 10000) {
        return {
          status: INFERENCE_OUTCOMES.REFUSED,
          reason: `INVALID_CONFIDENCE_BPS: ${parsed.confidence_basis_points}`,
          receipt: {
            receipt_id: receiptId,
            provider_name: this.provider.name,
            model_version: rawResult.modelVersion,
            prompt_template_id: promptTemplateId,
            outcome: INFERENCE_OUTCOMES.REFUSED,
            input_tokens: rawResult.inputTokens,
            output_tokens: rawResult.outputTokens,
            latency_ms: latencyMs,
            cost_minor: rawResult.costMinor,
            cost_currency: rawResult.costCurrency,
            cost_scale: rawResult.costScale,
            raw_input_digest: rawInputDigest,
            raw_output_digest: rawOutputDigest
          }
        };
      }

      // Threshold check: if confidence is below calibrated threshold -> DEFERRED
      if (confidenceBps < requiredConfidence) {
        return {
          status: INFERENCE_OUTCOMES.DEFERRED,
          reason: `CONFIDENCE_BELOW_THRESHOLD: ${confidenceBps} bps < ${requiredConfidence} bps required`,
          confidenceBps,
          receipt: {
            receipt_id: receiptId,
            provider_name: this.provider.name,
            model_version: rawResult.modelVersion,
            prompt_template_id: promptTemplateId,
            outcome: INFERENCE_OUTCOMES.DEFERRED,
            input_tokens: rawResult.inputTokens,
            output_tokens: rawResult.outputTokens,
            latency_ms: latencyMs,
            cost_minor: rawResult.costMinor,
            cost_currency: rawResult.costCurrency,
            cost_scale: rawResult.costScale,
            raw_input_digest: rawInputDigest,
            raw_output_digest: rawOutputDigest
          }
        };
      }

      // Valid grounded proposal
      const suggestionId = parsed.suggestion_id || `sug-${crypto.randomUUID()}`;
      const freshnessMs = parsed.freshness_duration_ms || 45000;
      const freshnessExpiresAt = new Date(Date.now() + freshnessMs).toISOString();

      const receipt = {
        receipt_id: receiptId,
        provider_name: this.provider.name,
        model_version: rawResult.modelVersion,
        prompt_template_id: promptTemplateId,
        outcome: INFERENCE_OUTCOMES.ACCEPTED,
        input_tokens: rawResult.inputTokens,
        output_tokens: rawResult.outputTokens,
        latency_ms: latencyMs,
        cost_minor: rawResult.costMinor,
        cost_currency: rawResult.costCurrency,
        cost_scale: rawResult.costScale,
        raw_input_digest: rawInputDigest,
        raw_output_digest: rawOutputDigest
      };

      const suggestion = {
        suggestion_id: suggestionId,
        tenant_id: tenantId,
        live_session_id: liveSessionId,
        suggestion_type: suggestionType,
        status: 'grounded',
        content_payload: parsed.content_payload,
        evidence_refs: evidenceRefs,
        confidence_basis_points: confidenceBps,
        freshness_expires_at: freshnessExpiresAt,
        aggregate_version: 1,
        provider_receipt: receipt,
        created_at: new Date().toISOString()
      };

      return {
        status: INFERENCE_OUTCOMES.ACCEPTED,
        suggestion,
        receipt
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('TIMEOUT');
      const outcome = isTimeout ? INFERENCE_OUTCOMES.TIMEOUT : INFERENCE_OUTCOMES.UNKNOWN;

      const degradedAlert = this.createDegradedAlert({
        tenantId,
        liveSessionId,
        reason: isTimeout ? 'INFERENCE_TIMEOUT' : 'PROVIDER_EXECUTION_FAILURE',
        errorDetail: err.message
      });

      return {
        status: outcome,
        reason: err.message,
        receipt: {
          receipt_id: receiptId,
          provider_name: this.provider.name,
          model_version: this.provider.modelVersion || 'unknown',
          prompt_template_id: promptTemplateId,
          outcome,
          input_tokens: 0,
          output_tokens: 0,
          latency_ms: latencyMs,
          cost_minor: 0n,
          cost_currency: 'USD',
          cost_scale: 6,
          raw_input_digest: sha256Hex(userPrompt),
          raw_output_digest: sha256Hex(err.message || 'error')
        },
        degradedAlert
      };
    }
  }
}
