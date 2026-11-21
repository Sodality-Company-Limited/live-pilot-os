// Application Command & Event Handler for JEV Suggestion Lifecycle
// Implements delivery confirmations, operator feedback decisions,
// TTL expirations, and reactive withdrawals (e.g. stock depleted, emergency pause).

import crypto from 'node:crypto';
import {
  SuggestionAggregate,
  SUGGESTION_STATUSES,
  OPERATOR_DECISIONS,
  SuggestionStateTransitionError
} from '../domain/suggestion-aggregate.mjs';
import { NATS_SUBJECTS } from '../nats/nats-publisher.mjs';

export const LIFECYCLE_COMMAND_SUBJECTS = Object.freeze({
  SUGGESTION_DELIVER: 'livepilot.v1.copilot.suggestion.deliver',
  SUGGESTION_DECISION: 'livepilot.v1.copilot.suggestion.decision',
  SUGGESTION_EXPIRE: 'livepilot.v1.copilot.suggestion.expire',
  SUGGESTION_WITHDRAW: 'livepilot.v1.copilot.suggestion.withdraw'
});

export const EXTERNAL_TRIGGER_SUBJECTS = Object.freeze({
  STOCK_DEPLETED: 'livepilot.v1.catalog.stock.depleted',
  STOCK_UPDATED: 'livepilot.v1.inventory.stock.updated',
  CONTROL_PAUSE: 'livepilot.v1.control.pause.request',
  CATALOG_FACT_CHANGED: 'livepilot.v1.catalog.fact.changed'
});

export class SuggestionLifecycleHandler {
  /**
   * @param {object} dependencies
   * @param {import('../persistence/suggestion-repository.mjs').SuggestionRepository} dependencies.suggestionRepository
   * @param {import('../nats/nats-publisher.mjs').NatsPublisher} dependencies.natsPublisher
   */
  constructor(dependencies) {
    if (!dependencies?.suggestionRepository) {
      throw new Error('SuggestionRepository is required');
    }
    if (!dependencies?.natsPublisher) {
      throw new Error('NatsPublisher is required');
    }

    this.suggestionRepository = dependencies.suggestionRepository;
    this.natsPublisher = dependencies.natsPublisher;
  }

  /**
   * Handle 'suggestion.deliver'
   * Transitions suggestion from grounded to delivered when presented on HUD.
   *
   * @param {object} command
   * @param {string} command.tenant_id
   * @param {string} command.live_session_id
   * @param {string} command.suggestion_id
   * @param {string} [command.observed_at]
   * @param {string} [command.correlation_id]
   * @returns {Promise<object>}
   */
  async handleDeliverSuggestion(command) {
    const {
      tenant_id,
      live_session_id,
      suggestion_id,
      observed_at = new Date().toISOString(),
      correlation_id = `corr-${crypto.randomUUID()}`
    } = command;

    if (!tenant_id || !live_session_id || !suggestion_id) {
      throw new Error('tenant_id, live_session_id, and suggestion_id are required');
    }

    const existing = await this.suggestionRepository.findById(tenant_id, suggestion_id);
    if (!existing) {
      const err = new Error(`Suggestion not found: ${suggestion_id}`);
      err.code = 'LP09001';
      err.http_status = 404;
      throw err;
    }

    const aggregate = SuggestionAggregate.fromSnapshot(existing);
    aggregate.deliver({ observedAt: observed_at });

    const outboxId = `out-${crypto.randomUUID()}`;
    const outboxEvent = {
      outbox_id: outboxId,
      event_type: 'copilot.suggestion.delivered',
      subject: 'livepilot.v1.copilot.suggestion.delivered',
      payload: aggregate.toJSON(),
      headers: {
        'Nats-Msg-Id': outboxId,
        'X-Tenant-Id': tenant_id,
        'X-Session-Id': live_session_id,
        'X-Correlation-Id': correlation_id
      },
      occurred_at: aggregate.updated_at
    };

    const updated = await this.suggestionRepository.updateSuggestionStatusWithOutbox(
      tenant_id,
      suggestion_id,
      existing.aggregate_version,
      SUGGESTION_STATUSES.DELIVERED,
      outboxEvent
    );

    return {
      status: 'delivered',
      suggestion: aggregate.toJSON(),
      outbox_id: outboxId
    };
  }

  /**
   * Handle 'suggestion.decision.record'
   * Records host operator feedback ('used' | 'edited' | 'dismissed').
   *
   * @param {object} command
   * @param {string} command.tenant_id
   * @param {string} command.live_session_id
   * @param {string} command.suggestion_id
   * @param {'used'|'edited'|'dismissed'} command.decision
   * @param {string} command.actor_id
   * @param {object} [command.edits]
   * @param {string} [command.recorded_at]
   * @param {string} [command.correlation_id]
   * @returns {Promise<object>}
   */
  async handleRecordDecision(command) {
    const {
      tenant_id,
      live_session_id,
      suggestion_id,
      decision,
      actor_id,
      edits = null,
      recorded_at = new Date().toISOString(),
      correlation_id = `corr-${crypto.randomUUID()}`
    } = command;

    if (!tenant_id || !live_session_id || !suggestion_id || !decision || !actor_id) {
      throw new Error('tenant_id, live_session_id, suggestion_id, decision, and actor_id are required');
    }

    const existing = await this.suggestionRepository.findById(tenant_id, suggestion_id);
    if (!existing) {
      const err = new Error(`Suggestion not found: ${suggestion_id}`);
      err.code = 'LP09001';
      err.http_status = 404;
      throw err;
    }

    const aggregate = SuggestionAggregate.fromSnapshot(existing);
    aggregate.recordDecision({ decision, actorId: actor_id, edits, recordedAt: recorded_at });

    const outboxId = `out-${crypto.randomUUID()}`;
    const outboxEvent = {
      outbox_id: outboxId,
      event_type: `copilot.suggestion.${decision}`,
      subject: `livepilot.v1.copilot.suggestion.${decision}`,
      payload: {
        suggestion_id,
        tenant_id,
        live_session_id,
        decision,
        actor_id,
        edits,
        recorded_at
      },
      headers: {
        'Nats-Msg-Id': outboxId,
        'X-Tenant-Id': tenant_id,
        'X-Session-Id': live_session_id,
        'X-Correlation-Id': correlation_id
      },
      occurred_at: aggregate.updated_at
    };

    const updated = await this.suggestionRepository.updateSuggestionStatusWithOutbox(
      tenant_id,
      suggestion_id,
      existing.aggregate_version,
      aggregate.status,
      outboxEvent
    );

    return {
      status: aggregate.status,
      suggestion: aggregate.toJSON(),
      outbox_id: outboxId
    };
  }

  /**
   * Handle 'suggestion.expire'
   * Automatic transition when TTL is reached without host decision.
   *
   * @param {object} command
   * @param {string} command.tenant_id
   * @param {string} command.live_session_id
   * @param {string} command.suggestion_id
   * @param {string} [command.observed_at]
   * @param {string} [command.correlation_id]
   * @returns {Promise<object>}
   */
  async handleExpireSuggestion(command) {
    const {
      tenant_id,
      live_session_id,
      suggestion_id,
      observed_at = new Date().toISOString(),
      correlation_id = `corr-${crypto.randomUUID()}`
    } = command;

    if (!tenant_id || !live_session_id || !suggestion_id) {
      throw new Error('tenant_id, live_session_id, and suggestion_id are required');
    }

    const existing = await this.suggestionRepository.findById(tenant_id, suggestion_id);
    if (!existing) {
      const err = new Error(`Suggestion not found: ${suggestion_id}`);
      err.code = 'LP09001';
      err.http_status = 404;
      throw err;
    }

    const aggregate = SuggestionAggregate.fromSnapshot(existing);
    aggregate.expire({ observedAt: observed_at });

    const outboxId = `out-${crypto.randomUUID()}`;
    const outboxEvent = {
      outbox_id: outboxId,
      event_type: 'copilot.suggestion.expired',
      subject: 'livepilot.v1.copilot.suggestion.expired',
      payload: {
        suggestion_id,
        tenant_id,
        live_session_id,
        expired_at: observed_at
      },
      headers: {
        'Nats-Msg-Id': outboxId,
        'X-Tenant-Id': tenant_id,
        'X-Session-Id': live_session_id,
        'X-Correlation-Id': correlation_id
      },
      occurred_at: aggregate.updated_at
    };

    const updated = await this.suggestionRepository.updateSuggestionStatusWithOutbox(
      tenant_id,
      suggestion_id,
      existing.aggregate_version,
      SUGGESTION_STATUSES.EXPIRED,
      outboxEvent
    );

    return {
      status: 'expired',
      suggestion: aggregate.toJSON(),
      outbox_id: outboxId
    };
  }

  /**
   * Handle 'suggestion.withdraw'
   * Immediate revocation due to changed facts or manual operator recall.
   *
   * @param {object} command
   * @param {string} command.tenant_id
   * @param {string} command.live_session_id
   * @param {string} command.suggestion_id
   * @param {string} command.reason_code
   * @param {string} [command.reason_message]
   * @param {string} [command.actor_id]
   * @param {object} [command.causation_ref]
   * @param {string} [command.correlation_id]
   * @returns {Promise<object>}
   */
  async handleWithdrawSuggestion(command) {
    const {
      tenant_id,
      live_session_id,
      suggestion_id,
      reason_code,
      reason_message,
      actor_id = 'operator',
      causation_ref = null,
      correlation_id = `corr-${crypto.randomUUID()}`
    } = command;

    if (!tenant_id || !live_session_id || !suggestion_id || !reason_code) {
      throw new Error('tenant_id, live_session_id, suggestion_id, and reason_code are required');
    }

    const existing = await this.suggestionRepository.findById(tenant_id, suggestion_id);
    if (!existing) {
      const err = new Error(`Suggestion not found: ${suggestion_id}`);
      err.code = 'LP09001';
      err.http_status = 404;
      throw err;
    }

    const aggregate = SuggestionAggregate.fromSnapshot(existing);
    aggregate.withdraw({
      reason: reason_code,
      actorId: actor_id,
      causationRef: causation_ref
    });

    const outboxId = `out-${crypto.randomUUID()}`;
    const outboxEvent = {
      outbox_id: outboxId,
      event_type: 'copilot.suggestion.withdrawn',
      subject: NATS_SUBJECTS.SUGGESTION_WITHDRAWN,
      payload: {
        suggestion_id,
        tenant_id,
        live_session_id,
        reason_code,
        reason_message: reason_message || reason_code,
        actor_id,
        causation_ref
      },
      headers: {
        'Nats-Msg-Id': outboxId,
        'X-Tenant-Id': tenant_id,
        'X-Session-Id': live_session_id,
        'X-Correlation-Id': correlation_id
      },
      occurred_at: aggregate.updated_at
    };

    const updated = await this.suggestionRepository.updateSuggestionStatusWithOutbox(
      tenant_id,
      suggestion_id,
      existing.aggregate_version,
      SUGGESTION_STATUSES.WITHDRAWN,
      outboxEvent
    );

    await this.natsPublisher.publishSuggestionWithdrawn({
      tenantId: tenant_id,
      liveSessionId: live_session_id,
      suggestionId: suggestion_id,
      reasonCode: reason_code,
      reasonMessage: reason_message,
      causationRef: causation_ref,
      metadata: { correlationId: correlation_id }
    });

    return {
      status: 'withdrawn',
      suggestion: aggregate.toJSON(),
      outbox_id: outboxId
    };
  }

  /**
   * Handle reactive external trigger: Stock Depleted / Inventory Drop.
   * Auto-withdraws active suggestions referencing the depleted product/SKU.
   *
   * @param {object} event
   * @param {string} event.tenant_id
   * @param {string} event.live_session_id
   * @param {string} [event.product_id]
   * @param {string} [event.sku]
   * @param {number} [event.available_stock]
   * @param {string} [event.correlation_id]
   * @returns {Promise<Array<object>>} List of withdrawn suggestions
   */
  async handleStockDepletedTrigger(event) {
    const {
      tenant_id,
      live_session_id,
      product_id,
      sku,
      available_stock = 0,
      correlation_id = `corr-${crypto.randomUUID()}`
    } = event;

    if (!tenant_id || !live_session_id) {
      throw new Error('tenant_id and live_session_id are required');
    }

    if (available_stock > 0) {
      return []; // Not depleted
    }

    // Find active suggestions for this session
    const activeSuggestions = [];
    const delivered = await this.suggestionRepository.findBySession(
      tenant_id,
      live_session_id,
      SUGGESTION_STATUSES.DELIVERED
    );
    const grounded = await this.suggestionRepository.findBySession(
      tenant_id,
      live_session_id,
      SUGGESTION_STATUSES.GROUNDED
    );

    const candidates = [...delivered, ...grounded];
    const withdrawnList = [];

    for (const record of candidates) {
      const content = typeof record.content_payload === 'string'
        ? JSON.parse(record.content_payload)
        : record.content_payload;

      const pId = content?.action_parameters?.product_id;
      const sSku = content?.action_parameters?.sku;

      const matchesProduct = product_id && pId === product_id;
      const matchesSku = sku && sSku === sku;

      if (matchesProduct || matchesSku) {
        const result = await this.handleWithdrawSuggestion({
          tenant_id,
          live_session_id,
          suggestion_id: record.suggestion_id,
          reason_code: 'INVENTORY_STOCK_DEPLETED',
          reason_message: `Automatic withdrawal: item ${sku || product_id} stock depleted to ${available_stock}`,
          actor_id: 'system_reactive_inventory',
          causation_ref: { product_id, sku, available_stock },
          correlation_id
        });
        withdrawnList.push(result);
      }
    }

    return withdrawnList;
  }

  /**
   * Handle reactive external trigger: Emergency Pause.
   * Auto-withdraws ALL active/delivered suggestions for the live session.
   *
   * @param {object} event
   * @param {string} event.tenant_id
   * @param {string} event.live_session_id
   * @param {string} [event.reason]
   * @param {string} [event.correlation_id]
   * @returns {Promise<Array<object>>} List of withdrawn suggestions
   */
  async handleEmergencyPauseTrigger(event) {
    const {
      tenant_id,
      live_session_id,
      reason = 'CONTROL_EMERGENCY_PAUSE',
      correlation_id = `corr-${crypto.randomUUID()}`
    } = event;

    if (!tenant_id || !live_session_id) {
      throw new Error('tenant_id and live_session_id are required');
    }

    const delivered = await this.suggestionRepository.findBySession(
      tenant_id,
      live_session_id,
      SUGGESTION_STATUSES.DELIVERED
    );
    const grounded = await this.suggestionRepository.findBySession(
      tenant_id,
      live_session_id,
      SUGGESTION_STATUSES.GROUNDED
    );

    const candidates = [...delivered, ...grounded];
    const withdrawnList = [];

    for (const record of candidates) {
      const result = await this.handleWithdrawSuggestion({
        tenant_id,
        live_session_id,
        suggestion_id: record.suggestion_id,
        reason_code: 'CONTROL_EMERGENCY_PAUSE',
        reason_message: `Emergency pause active: ${reason}`,
        actor_id: 'system_emergency_pause',
        causation_ref: { reason },
        correlation_id
      });
      withdrawnList.push(result);
    }

    return withdrawnList;
  }
}
