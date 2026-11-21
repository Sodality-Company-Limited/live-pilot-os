// NATS JetStream Publisher for jev-copilot-service
// Emits domain events onto JetStream streams with ordering key tenant_id:live_session_id.

import { createHash } from 'node:crypto';

export const NATS_SUBJECTS = Object.freeze({
  SUGGESTION_PROPOSED: 'livepilot.v1.copilot.suggestion.proposed',
  SUGGESTION_WITHDRAWN: 'livepilot.v1.copilot.suggestion.withdrawn',
  SUGGESTION_CREATED: 'livepilot.v1.copilot.suggestion.created',
  SUGGESTION_DLQ: 'livepilot.v1.copilot.suggestion.dlq',
  DELIVERY_DEGRADED: 'livepilot.v1.copilot.delivery.degraded'
});

export class NatsPublisher {
  /**
   * @param {object} connection - NATS connection or bus instance
   */
  constructor(connection) {
    if (!connection) {
      throw new Error('NatsPublisher requires a valid connection');
    }
    this.connection = connection;
    this.publishedEvents = [];
  }

  /**
   * Build ordering key and standard envelope headers
   */
  buildHeaders({
    tenantId,
    liveSessionId,
    correlationId,
    causationId,
    messageId,
    traceparent
  }) {
    const orderingKey = `${tenantId}:${liveSessionId}`;
    return {
      'Nats-Msg-Id': messageId || `msg_${createHash('sha256').update(`${orderingKey}:${Date.now()}`).digest('hex').slice(0, 24)}`,
      'X-Ordering-Key': orderingKey,
      'X-Tenant-Id': tenantId,
      'X-Session-Id': liveSessionId,
      'X-Correlation-Id': correlationId || `corr_${createHash('sha256').update(orderingKey).digest('hex').slice(0, 16)}`,
      ...(causationId ? { 'X-Causation-Id': causationId } : {}),
      'X-Traceparent': traceparent || '00-00000000000000000000000000000000-0000000000000000-01',
      'X-Producer': 'jev-copilot-service',
      'X-Schema-Version': '1.0.0'
    };
  }

  /**
   * Publish livepilot.v1.copilot.suggestion.proposed event.
   * Conforms strictly to jev-suggestion-proposed.schema.json.
   * @param {object} suggestion - Suggestion aggregate or DTO
   * @param {object} [metadata]
   * @returns {Promise<object>}
   */
  async publishSuggestionProposed(suggestion, metadata = {}) {
    if (!suggestion || !suggestion.tenant_id || !suggestion.live_session_id) {
      throw new Error('Invalid suggestion: tenant_id and live_session_id are required');
    }

    const subject = NATS_SUBJECTS.SUGGESTION_PROPOSED;
    const headers = this.buildHeaders({
      tenantId: suggestion.tenant_id,
      liveSessionId: suggestion.live_session_id,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      messageId: metadata.messageId,
      traceparent: metadata.traceparent
    });

    const eventPayload = {
      suggestion_id: suggestion.suggestion_id,
      tenant_id: suggestion.tenant_id,
      live_session_id: suggestion.live_session_id,
      suggestion_type: suggestion.suggestion_type,
      status: suggestion.status,
      content_payload: suggestion.content_payload,
      evidence_refs: suggestion.evidence_refs,
      confidence_basis_points: suggestion.confidence_basis_points,
      freshness_expires_at: suggestion.freshness_expires_at,
      aggregate_version: suggestion.aggregate_version,
      provider_receipt: suggestion.provider_receipt,
      created_at: suggestion.created_at || new Date().toISOString()
    };

    const record = {
      subject,
      headers,
      payload: eventPayload,
      published_at: new Date().toISOString()
    };

    if (typeof this.connection.publish === 'function') {
      const encoded = Buffer.from(JSON.stringify(eventPayload), 'utf8');
      await this.connection.publish(subject, encoded, headers);
    }

    this.publishedEvents.push(record);
    return record;
  }

  /**
   * Publish livepilot.v1.copilot.suggestion.withdrawn event.
   * Conforms strictly to jev-suggestion-withdrawn.schema.json.
   * @param {object} params
   * @returns {Promise<object>}
   */
  async publishSuggestionWithdrawn({
    tenantId,
    liveSessionId,
    suggestionId,
    reasonCode,
    reasonMessage,
    causationRef,
    metadata = {}
  }) {
    if (!tenantId || !liveSessionId || !suggestionId || !reasonCode) {
      throw new Error('tenantId, liveSessionId, suggestionId, and reasonCode are required');
    }

    const subject = NATS_SUBJECTS.SUGGESTION_WITHDRAWN;
    const headers = this.buildHeaders({
      tenantId,
      liveSessionId,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      messageId: metadata.messageId,
      traceparent: metadata.traceparent
    });

    const eventPayload = {
      suggestion_id: suggestionId,
      tenant_id: tenantId,
      live_session_id: liveSessionId,
      reason_code: reasonCode,
      reason_message: reasonMessage || `Suggestion withdrawn: ${reasonCode}`,
      causation_ref: causationRef || null,
      withdrawn_at: new Date().toISOString()
    };

    const record = {
      subject,
      headers,
      payload: eventPayload,
      published_at: new Date().toISOString()
    };

    if (typeof this.connection.publish === 'function') {
      const encoded = Buffer.from(JSON.stringify(eventPayload), 'utf8');
      await this.connection.publish(subject, encoded, headers);
    }

    this.publishedEvents.push(record);
    return record;
  }
}
