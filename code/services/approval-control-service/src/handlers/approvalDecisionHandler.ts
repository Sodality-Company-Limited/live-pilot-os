import type { ApprovalRepository } from '../infrastructure/approvalRepository.ts';
import type { EmergencyPauseRepository } from '../infrastructure/emergencyPauseRepository.ts';
import type { IdempotencyStore } from '../infrastructure/idempotencyStore.ts';
import { AuthorityPolicy } from '../domain/authorityPolicy.ts';
import {
  ApprovalProblemError,
  mapErrorToReply,
  normalizeCorrelationId,
  type NatsReplyError,
} from './errorMapper.ts';
import type {
  DecisionType,
  ApprovalDecisionRecord,
  ApprovalRequestRecord,
} from '../persistence/types.ts';

export const APPROVAL_DECISION_SUBJECTS = {
  COMMAND_DECIDE: 'livepilot.v1.control.approval.decide',
  COMMAND_DECISION_REQUEST: 'livepilot.v1.control.approval.decision.request',
  EVENT_RECORDED: 'livepilot.v1.control.approval.decision.recorded',
  DLQ: 'livepilot.v1.control.approval.decision.dlq',
} as const;

export type DecisionAction = 'approved' | 'rejected' | 'revoked';

export interface ApprovalDecisionMessageEnvelope {
  message_id?: string;
  correlation_id?: string;
  causation_id?: string;
  idempotency_key?: string;
  tenant_id?: string;
  session_id?: string;
  schema_version?: string;
  headers?: Record<string, string | undefined>;
  data?: {
    approval_id?: string;
    approval_request_id?: string;
    decision?: DecisionAction;
    decider_id?: string;
    actor_ref?: string;
    actor_role?: 'host' | 'live_ops' | 'admin' | 'system_policy';
    actor_capabilities?: string[];
    expected_resource_version?: number;
    reason?: string | null;
    [key: string]: unknown;
  };
}

export interface NatsMessage {
  subject: string;
  reply?: string;
  data: string | Uint8Array | Record<string, unknown>;
  headers?: Record<string, string | undefined>;
  respond?(payload: Uint8Array | string, headers?: Record<string, string>): void;
}

export interface DecisionResultPayload {
  updatedRequest: ApprovalRequestRecord;
  decisionRecord: ApprovalDecisionRecord;
  [key: string]: unknown;
}

export class ApprovalDecisionHandler {
  private readonly approvalRepo: ApprovalRepository;
  private readonly pauseRepo: EmergencyPauseRepository;
  private readonly idempotencyStore: IdempotencyStore;

  constructor(dependencies: {
    approvalRepo: ApprovalRepository;
    pauseRepo: EmergencyPauseRepository;
    idempotencyStore: IdempotencyStore;
  }) {
    this.approvalRepo = dependencies.approvalRepo;
    this.pauseRepo = dependencies.pauseRepo;
    this.idempotencyStore = dependencies.idempotencyStore;
  }

  /**
   * Handle incoming approval decision command.
   */
  async handle(msg: NatsMessage): Promise<{
    status: 'accepted' | 'rejected';
    data?: DecisionResultPayload;
    error?: NatsReplyError;
  }> {
    let parsed: ApprovalDecisionMessageEnvelope;
    try {
      if (typeof msg.data === 'string') {
        parsed = JSON.parse(msg.data);
      } else if (msg.data instanceof Uint8Array) {
        parsed = JSON.parse(Buffer.from(msg.data).toString('utf8'));
      } else if (typeof msg.data === 'object' && msg.data !== null) {
        parsed = msg.data as ApprovalDecisionMessageEnvelope;
      } else {
        throw new Error('Invalid message payload type');
      }
    } catch (parseErr) {
      const replyErr = mapErrorToReply(
        new ApprovalProblemError('LP03001', { detail: 'Unparseable message payload JSON' }),
        'corr_00000000'
      );
      this.respond(msg, { status: 'rejected', error: replyErr });
      return { status: 'rejected', error: replyErr };
    }

    const headers = msg.headers || parsed.headers || {};
    const correlationId = normalizeCorrelationId(
      headers['X-Correlation-Id'] || parsed.correlation_id
    );
    const tenantId = headers['X-Tenant-Id'] || parsed.tenant_id;
    const sessionId = headers['X-Session-Id'] || parsed.session_id;
    const idempotencyKey =
      headers['X-Idempotency-Key'] || parsed.idempotency_key;

    try {
      // 1. Validate envelope headers
      if (!tenantId) {
        throw new ApprovalProblemError('LP02001', {
          detail: 'Missing required tenant context (X-Tenant-Id)',
        });
      }
      if (!sessionId) {
        throw new ApprovalProblemError('LP02002', {
          detail: 'Missing required session context (X-Session-Id)',
        });
      }
      if (!idempotencyKey) {
        throw new ApprovalProblemError('LP03001', {
          detail: 'Missing required idempotency key (X-Idempotency-Key)',
        });
      }

      const data = parsed.data || {};
      const approvalId = data.approval_id || data.approval_request_id;
      if (!approvalId) {
        throw new ApprovalProblemError('LP03001', {
          detail: 'Missing required approval_id in decision data',
        });
      }

      const decision = data.decision;
      if (!decision || !(['approved', 'rejected', 'revoked'] as const).includes(decision as DecisionAction)) {
        throw new ApprovalProblemError('LP03001', {
          detail: `Invalid decision: '${decision}'. Must be one of 'approved', 'rejected', 'revoked'.`,
        });
      }
      const validDecision = decision as DecisionAction;

      const deciderId = data.decider_id || data.actor_ref;
      if (!deciderId) {
        throw new ApprovalProblemError('LP03001', {
          detail: 'Missing decider_id or actor_ref in decision data',
        });
      }

      const expectedVersion = Number(data.expected_resource_version);
      if (isNaN(expectedVersion) || expectedVersion < 1) {
        throw new ApprovalProblemError('LP03001', {
          detail: 'Missing or invalid expected_resource_version (must be integer >= 1)',
        });
      }

      // Check emergency pause
      const isPaused = await this.pauseRepo.isPaused(tenantId, sessionId);
      if (isPaused) {
        throw new ApprovalProblemError('LP05004', {
          detail: `Cannot record decision '${decision}': Emergency pause is active for tenant '${tenantId}' / session '${sessionId}'`,
        });
      }

      // Pre-check request existence & authority policy
      const existing = await this.approvalRepo.getById(tenantId, sessionId, approvalId);
      if (!existing) {
        throw new ApprovalProblemError('LP05006', {
          detail: `Approval request not found: ${approvalId}`,
        });
      }

      const actorRole = data.actor_role || 'live_ops';
      const actorCaps = Array.isArray(data.actor_capabilities) ? data.actor_capabilities : [];
      AuthorityPolicy.verifyAuthority(
        existing,
        {
          actorId: deciderId,
          roles: [actorRole],
          capabilities: actorCaps,
        },
        validDecision
      );

      // 2. Execute decision with idempotency
      const result = await this.idempotencyStore.executeWithIdempotency<DecisionResultPayload>(
        tenantId,
        sessionId,
        idempotencyKey,
        data,
        async () => {
          const now = Date.now();
          const outboxEvent = {
            id: `evt_dec_${approvalId}_${now}`,
            event_type: 'approval.decision.recorded',
            subject: APPROVAL_DECISION_SUBJECTS.EVENT_RECORDED,
            payload: {
              approval_id: approvalId,
              session_id: sessionId,
              target_type: existing.action_type,
              target_id: (existing.payload as any)?.target_id || existing.id,
              decision: validDecision,
              decision_state: validDecision,
              actor_ref: deciderId,
              actor_role: actorRole,
              expected_resource_version: expectedVersion,
              decided_at: new Date(now).toISOString(),
              decided_at_ms: now,
              reason: data.reason || null,
            },
          };

          const recordResult = await this.approvalRepo.recordDecision({
            tenant_id: tenantId,
            session_id: sessionId,
            approval_request_id: approvalId,
            decision: validDecision,
            decider_id: deciderId,
            decided_at_ms: now,
            reason: data.reason || null,
            expected_version: expectedVersion,
            is_paused: isPaused,
            outbox_event: outboxEvent,
          });

          return {
            updatedRequest: recordResult.updatedRequest,
            decisionRecord: recordResult.decisionRecord,
          };
        }
      );

      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'accepted' as const,
        schema_version: '1.0.0',
        correlation_id: correlationId,
        data: result,
      };

      this.respond(msg, responsePayload);
      return { status: 'accepted', data: result };
    } catch (err) {
      const replyError = mapErrorToReply(err, correlationId);
      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'rejected' as const,
        error: replyError,
        correlation_id: correlationId,
      };

      this.respond(msg, responsePayload);
      return { status: 'rejected', error: replyError };
    }
  }

  private respond(msg: NatsMessage, responsePayload: Record<string, unknown>): void {
    if (typeof msg.respond === 'function') {
      msg.respond(JSON.stringify(responsePayload));
    }
  }
}
