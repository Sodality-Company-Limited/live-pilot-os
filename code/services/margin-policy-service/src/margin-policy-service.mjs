/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ LivePilot Margin Policy Service - Core Reliability & Policy Service
 * ════════════════════════════════════════════════════════════════════════════════
 * Invariants:
 * - Subscribes or handles: `livepilot.v1.margin.evaluation.request`
 * - Executes F03.3-FLOW-001 (Calculate contribution margin)
 * - Executes F03.3-FLOW-002 (Approve safe discount)
 * - Executes F03.3-FLOW-003 (Reject loss-making discount)
 * - Executes F03.3-FLOW-004 (Request human approval when in review band)
 * - Executes F03.3-FLOW-005 (Recommend safer discount and bundle alternative)
 * - Executes F03.3-FLOW-006 (Zero float money invariant)
 * - Executes F03.3-FLOW-007 (Preserve margin evidence)
 * - Executes F03.3-FLOW-008 (Re-evaluate changed economics)
 * - Idempotency deduplication guard (cached verdicts without duplicated outbox)
 * - JetStream DLQ error routing on fatal/unretryable processing failures
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID, createHash } from 'node:crypto';
import { MarginCalculator } from './domain/margin-calculator.mjs';
import { AlternativesEngine } from './domain/alternatives-engine.mjs';
import { MarginRepository } from './storage/margin-repository.mjs';
import { StaleEconomicsHandler } from './service/stale-economics-handler.mjs';

export const DLQ_SUBJECT = 'livepilot.v1.margin.verdict.recorded.dlq';

export class MarginPolicyService {
  /**
   * @param {Object} [options]
   * @param {MarginRepository} [options.repository]
   */
  constructor(options = {}) {
    this.repository = options.repository || new MarginRepository();
    this.staleEconomicsHandler = new StaleEconomicsHandler({
      repository: this.repository,
      service: this
    });
  }

  /**
   * Evaluates a margin evaluation request message payload with full reliability safeguards:
   * 1. Idempotency deduplication
   * 2. Fatal error DLQ interceptor
   * 3. Review band / NEEDS_APPROVAL check
   * 4. Safer alternatives & bundle generation on non-approval
   * 5. Evidence preservation
   * 
   * @param {Object} message
   * @returns {Promise<Object>}
   */
  async handleEvaluationRequest(message) {
    try {
      return await this._executeEvaluation(message);
    } catch (err) {
      // DLQ routing for fatal failures or unprocessable entity errors
      return await this._routeToDlq(message, err);
    }
  }

  /**
   * Internal execution pipeline
   * @private
   */
  async _executeEvaluation(message) {
    if (!message || typeof message !== 'object') {
      throw new TypeError('Evaluation request message must be an object.');
    }

    const {
      tenant_id,
      live_session_id,
      product_id,
      sku,
      price_minor,
      candidate_discount_minor,
      cogs_minor,
      platform_fee_minor,
      shipping_fee_minor,
      currency = 'THB',
      scale = 2
    } = message;

    if (!tenant_id || !live_session_id || !product_id || !sku) {
      throw new Error('Missing required fields: tenant_id, live_session_id, product_id, sku.');
    }

    const correlation_id = message.correlation_id || randomUUID();
    const causation_id = message.causation_id || correlation_id;
    const idempotency_key = message.idempotency_key || randomUUID();

    // 1. Check idempotency deduplication guard
    const existing = await this.repository.getIdempotencyRecord(tenant_id, idempotency_key);
    if (existing) {
      return {
        ...existing.response_payload,
        is_idempotent_replay: true
      };
    }

    // 2. Fetch active policy for tenant
    let policy = await this.repository.findActivePolicy(tenant_id);
    if (!policy) {
      // Seed default tenant policy: 1000 bps (10.00% floor), review band up to 1500 bps (15.00%)
      policy = await this.repository.savePolicy({
        tenant_id,
        policy_name: 'default_margin_policy',
        version: 1,
        floor_bps: 1000,
        review_band_bps: 1500, // 1000 - 1500 bps requires human approval (NEEDS_APPROVAL)
        auto_approve_threshold_minor: 50000n, // 500.00 THB
        currency,
        scale,
        is_active: true
      });
    }

    // 3. Domain evaluation with exact integer arithmetic
    const calcResult = MarginCalculator.evaluate({
      price_minor,
      candidate_discount_minor,
      cogs_minor,
      platform_fee_minor,
      shipping_fee_minor,
      floor_bps: policy.floor_bps,
      currency,
      scale
    });

    // 4. Status determination: APPROVED, NEEDS_APPROVAL, or REJECTED
    // If calculated margin is below floor_bps -> REJECTED
    // If review_band_bps is set and margin_bps is between floor_bps and review_band_bps -> NEEDS_APPROVAL (F03.3-FLOW-004)
    // If margin_bps >= review_band_bps (or floor if no review band) -> APPROVED
    let status = calcResult.status;
    const review_band_bps = policy.review_band_bps !== undefined ? Number(policy.review_band_bps) : null;
    if (status === 'APPROVED' && review_band_bps !== null && calcResult.margin_bps < review_band_bps) {
      status = 'NEEDS_APPROVAL';
    }

    // 5. Alternatives Engine (F03.3-FLOW-005):
    // If not APPROVED (either REJECTED or NEEDS_APPROVAL), calculate safer discount alternative and bundle recommendations
    let alternatives = null;
    if (status !== 'APPROVED') {
      alternatives = AlternativesEngine.generateAlternatives({
        price_minor,
        candidate_discount_minor,
        cogs_minor,
        platform_fee_minor,
        shipping_fee_minor,
        floor_bps: review_band_bps || policy.floor_bps,
        currency,
        scale
      });
    }

    // 6. Evidence preservation (F03.3-FLOW-007)
    const requestHash = createHash('sha256')
      .update(JSON.stringify({
        tenant_id,
        live_session_id,
        product_id,
        sku,
        price_minor: price_minor.toString(),
        candidate_discount_minor: candidate_discount_minor.toString(),
        cogs_minor: cogs_minor.toString(),
        platform_fee_minor: platform_fee_minor.toString(),
        shipping_fee_minor: shipping_fee_minor.toString()
      }))
      .digest('hex');

    const evidence = {
      flow_id: status === 'APPROVED' ? 'F03.3-FLOW-002' : status === 'NEEDS_APPROVAL' ? 'F03.3-FLOW-004' : 'F03.3-FLOW-003',
      request_hash: requestHash,
      policy_id: policy.policy_id,
      policy_version: policy.version,
      floor_bps: policy.floor_bps,
      review_band_bps: review_band_bps,
      calculated_margin_bps: calcResult.margin_bps,
      effective_price_minor: calcResult.effective_price_minor.toString(),
      net_margin_minor: calcResult.net_margin_minor.toString(),
      currency,
      scale,
      correlation_id,
      causation_id,
      evaluated_at: new Date().toISOString()
    };

    const verdictId = randomUUID();
    const verdictPayload = {
      verdict_id: verdictId,
      tenant_id,
      live_session_id,
      product_id,
      sku,
      policy_id: policy.policy_id,
      policy_version: policy.version,
      status,
      price_minor: calcResult.price_minor,
      candidate_discount_minor: calcResult.candidate_discount_minor,
      cogs_minor: calcResult.cogs_minor,
      platform_fee_minor: calcResult.platform_fee_minor,
      shipping_fee_minor: calcResult.shipping_fee_minor,
      net_margin_minor: calcResult.net_margin_minor,
      margin_bps: calcResult.margin_bps,
      floor_bps: calcResult.floor_bps,
      safer_alternative_discount_minor: alternatives ? BigInt(alternatives.safer_discount.max_allowable_discount_minor) : null,
      safer_alternative_margin_bps: alternatives ? alternatives.safer_discount.expected_margin_bps : null,
      currency: calcResult.currency,
      scale: calcResult.scale,
      idempotency_key,
      correlation_id,
      causation_id,
      evidence
    };

    // 7. Transactional Outbox Event
    const outboxEvent = {
      event_id: randomUUID(),
      subject: `livepilot.v1.margin.verdict.${status.toLowerCase()}`,
      headers: {
        'x-tenant-id': tenant_id,
        'x-correlation-id': correlation_id,
        'x-causation-id': causation_id
      },
      payload: {
        verdict_id: verdictId,
        tenant_id,
        live_session_id,
        product_id,
        sku,
        status,
        net_margin_minor: calcResult.net_margin_minor.toString(),
        margin_bps: calcResult.margin_bps,
        floor_bps: calcResult.floor_bps,
        currency: calcResult.currency,
        scale: calcResult.scale,
        safer_alternatives: alternatives,
        evidence,
        timestamp: new Date().toISOString()
      }
    };

    const responsePayload = {
      verdict_id: verdictId,
      status,
      price_minor: calcResult.price_minor.toString(),
      candidate_discount_minor: calcResult.candidate_discount_minor.toString(),
      effective_price_minor: calcResult.effective_price_minor.toString(),
      cogs_minor: calcResult.cogs_minor.toString(),
      platform_fee_minor: calcResult.platform_fee_minor.toString(),
      shipping_fee_minor: calcResult.shipping_fee_minor.toString(),
      net_margin_minor: calcResult.net_margin_minor.toString(),
      margin_bps: calcResult.margin_bps,
      floor_bps: calcResult.floor_bps,
      currency: calcResult.currency,
      scale: calcResult.scale,
      safer_alternatives: alternatives,
      evidence,
      is_idempotent_replay: false
    };

    const idempotencyRecord = {
      idempotency_key,
      tenant_id,
      request_hash: requestHash,
      response_payload: responsePayload,
      status_code: 200
    };

    // 8. Atomic persistence: verdict + outbox + idempotency
    const recordResult = await this.repository.recordVerdictWithOutbox(
      verdictPayload,
      outboxEvent,
      idempotencyRecord
    );

    // Register pending proposal if NEEDS_APPROVAL for possible stale economics re-evaluation
    if (status === 'NEEDS_APPROVAL') {
      this.staleEconomicsHandler.registerPendingEvaluation({
        ...message,
        verdict_id: verdictId,
        idempotency_key
      });
    }

    return {
      ...responsePayload,
      outbox_id: recordResult.outbox.id,
      outbox_event_id: recordResult.outbox.event_id
    };
  }

  /**
   * Routes unprocessable or fatal errors to Dead Letter Queue (DLQ)
   * Subject: livepilot.v1.margin.verdict.recorded.dlq
   * @private
   */
  async _routeToDlq(message, error) {
    const correlation_id = message?.correlation_id || randomUUID();
    const tenant_id = message?.tenant_id || 'system_unknown';

    const dlqEvent = {
      event_id: randomUUID(),
      subject: DLQ_SUBJECT,
      headers: {
        'x-tenant-id': tenant_id,
        'x-correlation-id': correlation_id
      },
      payload: {
        dlq_reason: error.message,
        error_name: error.name,
        stack: error.stack,
        original_message: message,
        timestamp: new Date().toISOString()
      }
    };

    // Store in outbox as DLQ event
    await this.repository.recordDlqEvent(dlqEvent);

    return {
      status: 'DLQ_ROUTED',
      dlq_subject: DLQ_SUBJECT,
      error_message: error.message,
      correlation_id
    };
  }
}
