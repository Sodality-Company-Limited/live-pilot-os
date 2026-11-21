// Domain Aggregate for JEV Suggestion
// Implements strict state machine, invariant validation, and transition semantics.

import {
  SUGGESTION_TYPES,
  SUGGESTED_ACTIONS,
  EVIDENCE_KINDS,
  EVIDENCE_STATUSES
} from '../provider/provider-interface.mjs';

export const SUGGESTION_STATUSES = Object.freeze({
  PROPOSED: 'proposed',
  GROUNDED: 'grounded',
  DELIVERED: 'delivered',
  USED: 'used',
  EDITED: 'edited',
  DISMISSED: 'dismissed',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn'
});

export const OPERATOR_DECISIONS = Object.freeze({
  USED: 'used',
  EDITED: 'edited',
  DISMISSED: 'dismissed'
});

export class SuggestionStateTransitionError extends Error {
  /**
   * RFC 7807 compliant problem details error for invalid state machine transitions.
   */
  constructor(message, { fromStatus, toStatus, suggestionId, code = 'LP04001', httpStatus = 409 } = {}) {
    super(message);
    this.name = 'SuggestionStateTransitionError';
    this.code = code;
    this.http_status = httpStatus;
    this.type = 'urn:livepilot:problem:resource-version-conflict';
    this.title = 'Resource state conflict';
    this.detail = message;
    this.from_status = fromStatus;
    this.to_status = toStatus;
    this.suggestion_id = suggestionId;
  }

  toProblemDetails(correlationId = null) {
    return {
      type: this.type,
      title: this.title,
      status: this.http_status,
      code: this.code,
      message_key: 'errors.conflict.version',
      detail: this.detail,
      correlation_id: correlationId,
      retryable: false,
      retry_after_seconds: null,
      field_errors: [],
      evidence_id: null
    };
  }
}

const ALLOWED_TRANSITIONS = new Map([
  [SUGGESTION_STATUSES.PROPOSED, new Set([SUGGESTION_STATUSES.GROUNDED, SUGGESTION_STATUSES.WITHDRAWN, SUGGESTION_STATUSES.EXPIRED])],
  [SUGGESTION_STATUSES.GROUNDED, new Set([SUGGESTION_STATUSES.DELIVERED, SUGGESTION_STATUSES.WITHDRAWN, SUGGESTION_STATUSES.EXPIRED])],
  [SUGGESTION_STATUSES.DELIVERED, new Set([SUGGESTION_STATUSES.USED, SUGGESTION_STATUSES.EDITED, SUGGESTION_STATUSES.DISMISSED, SUGGESTION_STATUSES.EXPIRED, SUGGESTION_STATUSES.WITHDRAWN])],
  [SUGGESTION_STATUSES.USED, new Set()],
  [SUGGESTION_STATUSES.EDITED, new Set()],
  [SUGGESTION_STATUSES.DISMISSED, new Set()],
  [SUGGESTION_STATUSES.EXPIRED, new Set()],
  [SUGGESTION_STATUSES.WITHDRAWN, new Set()]
]);

export class SuggestionAggregate {
  /**
   * @param {object} props
   */
  constructor(props) {
    this.suggestion_id = props.suggestion_id;
    this.tenant_id = props.tenant_id;
    this.live_session_id = props.live_session_id;
    this.suggestion_type = props.suggestion_type;
    this.status = props.status;
    this.content_payload = props.content_payload;
    this.evidence_refs = props.evidence_refs;
    this.confidence_basis_points = props.confidence_basis_points;
    this.freshness_expires_at = props.freshness_expires_at;
    this.aggregate_version = props.aggregate_version ?? 1;
    this.provider_receipt = props.provider_receipt ?? null;
    this.operator_decision = props.operator_decision ?? null;
    this.withdrawal_record = props.withdrawal_record ?? null;
    this.delivered_at = props.delivered_at ?? null;
    this.expired_at = props.expired_at ?? null;
    this.created_at = props.created_at ?? new Date().toISOString();
    this.updated_at = props.updated_at ?? this.created_at;

    this.validateInvariants();
  }

  /**
   * Factory method to create a new Suggestion in 'grounded' or 'proposed' state.
   */
  static create(props) {
    return new SuggestionAggregate({
      ...props,
      aggregate_version: 1,
      created_at: props.created_at || new Date().toISOString(),
      updated_at: props.updated_at || props.created_at || new Date().toISOString()
    });
  }

  /**
   * Reconstitute aggregate from storage.
   */
  static fromSnapshot(row) {
    return new SuggestionAggregate({
      suggestion_id: row.suggestion_id,
      tenant_id: row.tenant_id,
      live_session_id: row.live_session_id,
      suggestion_type: row.suggestion_type,
      status: row.status,
      content_payload: typeof row.content_payload === 'string' ? JSON.parse(row.content_payload) : row.content_payload,
      evidence_refs: typeof row.evidence_refs === 'string' ? JSON.parse(row.evidence_refs) : row.evidence_refs,
      confidence_basis_points: row.confidence_basis_points,
      freshness_expires_at: row.freshness_expires_at,
      aggregate_version: row.aggregate_version,
      provider_receipt: row.provider_receipt ?? null,
      operator_decision: typeof row.operator_decision === 'string' ? JSON.parse(row.operator_decision) : (row.operator_decision ?? null),
      withdrawal_record: typeof row.withdrawal_record === 'string' ? JSON.parse(row.withdrawal_record) : (row.withdrawal_record ?? null),
      delivered_at: row.delivered_at ?? null,
      expired_at: row.expired_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  /**
   * Validate all domain invariants.
   */
  validateInvariants() {
    if (!this.suggestion_id || typeof this.suggestion_id !== 'string' || this.suggestion_id.length < 8 || this.suggestion_id.length > 128) {
      throw new Error('suggestion_id must be string between 8 and 128 chars');
    }
    if (!this.tenant_id || typeof this.tenant_id !== 'string' || this.tenant_id.length < 1 || this.tenant_id.length > 128) {
      throw new Error('tenant_id must be string between 1 and 128 chars');
    }
    if (!this.live_session_id || typeof this.live_session_id !== 'string' || this.live_session_id.length < 1 || this.live_session_id.length > 128) {
      throw new Error('live_session_id must be string between 1 and 128 chars');
    }
    if (!SUGGESTION_TYPES.includes(this.suggestion_type)) {
      throw new Error(`Invalid suggestion_type: ${this.suggestion_type}`);
    }
    if (!Object.values(SUGGESTION_STATUSES).includes(this.status)) {
      throw new Error(`Invalid suggestion status: ${this.status}`);
    }
    if (!Number.isInteger(this.confidence_basis_points) || this.confidence_basis_points < 0 || this.confidence_basis_points > 10000) {
      throw new Error(`confidence_basis_points must be integer 0-10000, got ${this.confidence_basis_points}`);
    }
    if (!this.freshness_expires_at || Number.isNaN(Date.parse(this.freshness_expires_at))) {
      throw new Error('freshness_expires_at must be valid ISO date-time string');
    }
    if (!Number.isInteger(this.aggregate_version) || this.aggregate_version < 1) {
      throw new Error('aggregate_version must be integer >= 1');
    }

    // Validate content payload
    this.validateContentPayload(this.content_payload);

    // Validate evidence refs
    this.validateEvidenceRefs(this.evidence_refs);
  }

  validateContentPayload(content) {
    if (!content || typeof content !== 'object') {
      throw new Error('content_payload must be an object');
    }
    if (typeof content.headline !== 'string' || content.headline.length < 1 || content.headline.length > 256) {
      throw new Error('content_payload.headline must be string length 1-256');
    }
    if (typeof content.cue_text !== 'string' || content.cue_text.length < 1 || content.cue_text.length > 2048) {
      throw new Error('content_payload.cue_text must be string length 1-2048');
    }
    if (!SUGGESTED_ACTIONS.includes(content.suggested_action)) {
      throw new Error(`Invalid suggested_action: ${content.suggested_action}`);
    }
    if (content.action_parameters !== undefined) {
      if (typeof content.action_parameters !== 'object' || content.action_parameters === null) {
        throw new Error('action_parameters must be an object');
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

  validateEvidenceRefs(evidenceRefs) {
    if (!Array.isArray(evidenceRefs) || evidenceRefs.length < 1 || evidenceRefs.length > 32) {
      throw new Error('evidence_refs must be array with 1 to 32 items');
    }
    const hexRegex = /^[0-9a-f]{64}$/;
    for (const ref of evidenceRefs) {
      if (!ref || typeof ref !== 'object') {
        throw new Error('evidence_ref must be an object');
      }
      if (typeof ref.evidence_id !== 'string' || ref.evidence_id.length < 1 || ref.evidence_id.length > 128) {
        throw new Error('evidence_id in ref must be string length 1-128');
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
   * Transition state with optimistic version bump and invariant checks.
   */
  transitionTo(newStatus) {
    const allowed = ALLOWED_TRANSITIONS.get(this.status);
    if (!allowed || !allowed.has(newStatus)) {
      throw new SuggestionStateTransitionError(
        `INVALID_STATE_TRANSITION: Cannot transition suggestion from '${this.status}' to '${newStatus}'`,
        {
          fromStatus: this.status,
          toStatus: newStatus,
          suggestionId: this.suggestion_id,
          code: 'LP04001',
          httpStatus: 409
        }
      );
    }

    this.status = newStatus;
    this.aggregate_version += 1;
    this.updated_at = new Date().toISOString();
    return this;
  }

  /**
   * Mark suggestion as delivered to live session HUD.
   * Guard: Can only transition from 'grounded' (or 'proposed'), and freshness must not be expired.
   */
  deliver({ observedAt = new Date().toISOString() } = {}) {
    const nowMs = Date.parse(observedAt);
    const expMs = Date.parse(this.freshness_expires_at);
    if (!Number.isNaN(expMs) && nowMs >= expMs) {
      // If already expired at delivery time, fail transition or transition to expired
      throw new SuggestionStateTransitionError(
        `CANNOT_DELIVER_EXPIRED_SUGGESTION: Suggestion freshness expired at ${this.freshness_expires_at}, observed at ${observedAt}`,
        {
          fromStatus: this.status,
          toStatus: SUGGESTION_STATUSES.DELIVERED,
          suggestionId: this.suggestion_id,
          code: 'LP04001',
          httpStatus: 409
        }
      );
    }

    this.transitionTo(SUGGESTION_STATUSES.DELIVERED);
    this.delivered_at = observedAt;
    return this;
  }

  /**
   * Record operator decision feedback ('used' | 'edited' | 'dismissed').
   * @param {object} params
   * @param {'used'|'edited'|'dismissed'} params.decision
   * @param {string} params.actorId
   * @param {object} [params.edits]
   * @param {string} [params.recordedAt]
   */
  recordDecision({ decision, actorId, edits = null, recordedAt = new Date().toISOString() }) {
    if (!actorId || typeof actorId !== 'string') {
      throw new Error('actorId is required to record operator decision');
    }
    if (!Object.values(OPERATOR_DECISIONS).includes(decision)) {
      throw new Error(`Invalid operator decision: ${decision}. Must be 'used', 'edited', or 'dismissed'`);
    }

    let targetStatus;
    if (decision === OPERATOR_DECISIONS.USED) {
      targetStatus = SUGGESTION_STATUSES.USED;
    } else if (decision === OPERATOR_DECISIONS.EDITED) {
      targetStatus = SUGGESTION_STATUSES.EDITED;
      if (edits && typeof edits === 'object') {
        // Optionally capture updated cue or headline
        if (edits.headline) this.content_payload.headline = edits.headline;
        if (edits.cue_text) this.content_payload.cue_text = edits.cue_text;
        if (edits.suggested_action) this.content_payload.suggested_action = edits.suggested_action;
        if (edits.action_parameters) {
          this.content_payload.action_parameters = {
            ...this.content_payload.action_parameters,
            ...edits.action_parameters
          };
        }
      }
    } else if (decision === OPERATOR_DECISIONS.DISMISSED) {
      targetStatus = SUGGESTION_STATUSES.DISMISSED;
    }

    this.transitionTo(targetStatus);
    this.operator_decision = {
      decision,
      actor_id: actorId,
      edits,
      recorded_at: recordedAt
    };
    return this;
  }

  /**
   * Host used suggestion as recommended.
   */
  recordUsed(actorId = 'operator') {
    return this.recordDecision({ decision: OPERATOR_DECISIONS.USED, actorId });
  }

  /**
   * Host edited suggestion before applying.
   */
  recordEdited(actorId = 'operator', edits = null) {
    return this.recordDecision({ decision: OPERATOR_DECISIONS.EDITED, actorId, edits });
  }

  /**
   * Host dismissed suggestion.
   */
  recordDismissed(actorId = 'operator') {
    return this.recordDecision({ decision: OPERATOR_DECISIONS.DISMISSED, actorId });
  }

  /**
   * Expired due to freshness timeout.
   */
  expire({ observedAt = new Date().toISOString() } = {}) {
    this.transitionTo(SUGGESTION_STATUSES.EXPIRED);
    this.expired_at = observedAt;
    return this;
  }

  /**
   * Retracted due to emergency pause, fact staleness, inventory depletion, or operator withdrawal.
   * @param {object} [params]
   * @param {string} [params.reason]
   * @param {string} [params.actorId]
   * @param {object} [params.causationRef]
   */
  withdraw(params = {}) {
    const reason = typeof params === 'string' ? params : (params.reason || 'MANUAL_OPERATOR_WITHDRAWAL');
    const actorId = typeof params === 'object' ? (params.actorId || 'system') : 'system';
    const causationRef = typeof params === 'object' ? params.causationRef : null;

    this.transitionTo(SUGGESTION_STATUSES.WITHDRAWN);
    this.withdrawal_record = {
      reason,
      actor_id: actorId,
      causation_ref: causationRef,
      withdrawn_at: this.updated_at
    };
    return this;
  }

  /**
   * Export JSON representation matching schema.
   */
  toJSON() {
    let receiptJson = null;
    if (this.provider_receipt) {
      receiptJson = {
        ...this.provider_receipt,
        cost_minor: typeof this.provider_receipt.cost_minor === 'bigint'
          ? Number(this.provider_receipt.cost_minor)
          : this.provider_receipt.cost_minor
      };
    }

    return {
      suggestion_id: this.suggestion_id,
      tenant_id: this.tenant_id,
      live_session_id: this.live_session_id,
      suggestion_type: this.suggestion_type,
      status: this.status,
      content_payload: this.content_payload,
      evidence_refs: this.evidence_refs,
      confidence_basis_points: this.confidence_basis_points,
      freshness_expires_at: this.freshness_expires_at,
      aggregate_version: this.aggregate_version,
      provider_receipt: receiptJson,
      operator_decision: this.operator_decision,
      withdrawal_record: this.withdrawal_record,
      delivered_at: this.delivered_at,
      expired_at: this.expired_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
