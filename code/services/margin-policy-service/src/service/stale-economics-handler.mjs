/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ LivePilot Margin Policy Service - Stale Economics & Re-evaluation Handler
 * ════════════════════════════════════════════════════════════════════════════════
 * Invariants:
 * - Detects price/COGS changes from catalog events (`catalog.product.updated`)
 * - Invalidates existing pending/stale approvals
 * - Re-evaluates proposals/verdicts against new economics
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'node:crypto';
import { MarginCalculator } from '../domain/margin-calculator.mjs';

export class StaleEconomicsHandler {
  /**
   * @param {Object} options
   * @param {import('../storage/margin-repository.mjs').MarginRepository} options.repository
   * @param {import('../margin-policy-service.mjs').MarginPolicyService} options.service
   */
  constructor({ repository, service }) {
    if (!repository) throw new TypeError('repository is required.');
    this.repository = repository;
    this.service = service;
    // Map of active pending proposals awaiting execution or human approval
    // key: `${tenant_id}:${product_id}:${sku}` -> Set of pending evaluation requests
    this.pendingEvaluations = new Map();
  }

  /**
   * Registers a pending evaluation record that may require re-evaluation if economics change
   * @param {Object} evaluationRequest
   */
  registerPendingEvaluation(evaluationRequest) {
    const key = `${evaluationRequest.tenant_id}:${evaluationRequest.product_id}:${evaluationRequest.sku}`;
    if (!this.pendingEvaluations.has(key)) {
      this.pendingEvaluations.set(key, new Map());
    }
    const map = this.pendingEvaluations.get(key);
    map.set(evaluationRequest.idempotency_key || evaluationRequest.verdict_id || randomUUID(), evaluationRequest);
  }

  /**
   * Clears a pending evaluation (e.g. after execution completes or decision finalized)
   */
  clearPendingEvaluation(tenant_id, product_id, sku, key) {
    const groupKey = `${tenant_id}:${product_id}:${sku}`;
    const map = this.pendingEvaluations.get(groupKey);
    if (map) {
      map.delete(key);
      if (map.size === 0) {
        this.pendingEvaluations.delete(groupKey);
      }
    }
  }

  /**
   * Handles catalog product updated event:
   * Subject: livepilot.v1.catalog.product.updated
   * 
   * @param {Object} event
   * @param {string} event.tenant_id
   * @param {string} event.product_id
   * @param {string} event.sku
   * @param {string|bigint|number} event.new_price_minor
   * @param {string|bigint|number} event.new_cogs_minor
   * @param {string} [event.currency='THB']
   * @param {number} [event.scale=2]
   * @param {string} [event.correlation_id]
   * @returns {Promise<Array<Object>>} List of re-evaluated verdict results
   */
  async handleCatalogProductUpdated(event) {
    if (!event || typeof event !== 'object') {
      throw new TypeError('Event must be an object.');
    }

    const {
      tenant_id,
      product_id,
      sku,
      new_price_minor,
      new_cogs_minor,
      currency = 'THB',
      scale = 2,
      correlation_id = randomUUID()
    } = event;

    if (!tenant_id || !product_id || !sku) {
      throw new Error('Missing required catalog event fields: tenant_id, product_id, sku.');
    }

    const groupKey = `${tenant_id}:${product_id}:${sku}`;
    const pendingMap = this.pendingEvaluations.get(groupKey);

    const reevaluatedVerdicts = [];

    // Find any pending proposals for this SKU
    if (pendingMap && pendingMap.size > 0) {
      for (const [idKey, originalReq] of pendingMap.entries()) {
        // Re-evaluate with updated economics
        const updatedRequest = {
          ...originalReq,
          price_minor: new_price_minor !== undefined ? new_price_minor : originalReq.price_minor,
          cogs_minor: new_cogs_minor !== undefined ? new_cogs_minor : originalReq.cogs_minor,
          correlation_id,
          causation_id: event.event_id || correlation_id,
          idempotency_key: `${originalReq.idempotency_key || idKey}:reeval:${Date.now()}`
        };

        // Invalidate prior approval in repository outbox
        const invalidationOutbox = {
          event_id: randomUUID(),
          subject: 'livepilot.v1.margin.verdict.invalidated',
          headers: {
            'x-tenant-id': tenant_id,
            'x-correlation-id': correlation_id
          },
          payload: {
            tenant_id,
            product_id,
            sku,
            reason: 'ECONOMICS_CHANGED',
            stale_verdict_id: originalReq.verdict_id || null,
            timestamp: new Date().toISOString()
          }
        };

        // If service is available, process new evaluation
        if (this.service) {
          const reevalResult = await this.service.handleEvaluationRequest(updatedRequest);
          reevaluatedVerdicts.push({
            action: 'RE_EVALUATED',
            prior_key: idKey,
            result: reevalResult
          });
        }
      }
    }

    return reevaluatedVerdicts;
  }
}
