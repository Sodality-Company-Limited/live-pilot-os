import type { ApprovalRepository, CreateApprovalRequestInput } from '../infrastructure/approvalRepository.ts';
import type { EmergencyPauseRepository } from '../infrastructure/emergencyPauseRepository.ts';
import type { IdempotencyStore } from '../infrastructure/idempotencyStore.ts';
import type { OutboxPublisher } from '../infrastructure/outboxPublisher.ts';
import {
  ApprovalProblemError,
  mapErrorToReply,
  normalizeCorrelationId,
  type NatsReplyError,
} from './errorMapper.ts';
import type { ApprovalActionType, ApprovalRequestRecord } from '../persistence/types.ts';

export const APPROVAL_REQUEST_SUBJECTS = {
  COMMAND_REQUEST: 'livepilot.v1.control.approval.request',
  COMMAND_REQUEST_LEGACY: 'livepilot.v1.control.approval.request.create',
  REPLY: 'livepilot.v1.control.approval.request.reply',
  EVENT_REQUESTED: 'livepilot.v1.control.approval.requested',
  DLQ: 'livepilot.v1.control.approval.request.dlq',
} as const;

const VALID_ACTION_TYPES = new Set<ApprovalActionType>([
  'promotion',
  'product_pin',
  'scenario_automation',
  'copilot_action',
  'price_override',
  'broadcast',
]);

export interface ApprovalRequestMessageEnvelope {
  message_id?: string;
  correlation_id?: string;
  causation_id?: string;
  idempotency_key?: string;
  tenant_id?: string;
  session_id?: string;
  schema_version?: string;
  headers?: Record<string, string | undefined>;
  data?: {
    id?: string;
    approval_id?: string;
    action_type?: ApprovalActionType;
    payload?: Record<string, unknown>;
    proposer_id?: string;
    ttl_seconds?: number;
    deadline_at_ms?: number;
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

export class ApprovalRequestHandler {
  private readonly approvalRepo: ApprovalRepository;
  private readonly pauseRepo: EmergencyPauseRepository;
  private readonly idempotencyStore: IdempotencyStore;
  private readonly outboxPublisher: OutboxPublisher;

  constructor(dependencies: {
    approvalRepo: ApprovalRepository;
    pauseRepo: EmergencyPauseRepository;
    idempotencyStore: IdempotencyStore;
    outboxPublisher: OutboxPublisher;
  }) {
    this.approvalRepo = dependencies.approvalRepo;
    this.pauseRepo = dependencies.pauseRepo;
    this.idempotencyStore = dependencies.idempotencyStore;
    this.outboxPublisher = dependencies.outboxPublisher;
  }

  /**
   * Handle incoming approval request command.
   */
  async handle(msg: NatsMessage): Promise<{
    status: 'accepted' | 'rejected';
    data?: ApprovalRequestRecord;
    error?: NatsReplyError;
  }> {
    let parsed: ApprovalRequestMessageEnvelope;
    try {
      if (typeof msg.data === 'string') {
        parsed = JSON.parse(msg.data);
      } else if (msg.data instanceof Uint8Array) {
        parsed = JSON.parse(Buffer.from(msg.data).toString('utf8'));
      } else if (typeof msg.data === 'object' && msg.data !== null) {
        parsed = msg.data as ApprovalRequestMessageEnvelope;
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
      // 1. Validation checks
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
      const actionType = data.action_type;
      if (!actionType || !VALID_ACTION_TYPES.has(actionType)) {
        throw new ApprovalProblemError('LP03001', {
          detail: `Invalid or missing action_type: '${actionType}'. Allowed: ${Array.from(VALID_ACTION_TYPES).join(', ')}`,
        });
      }

      const proposerId = data.proposer_id;
      if (!proposerId || typeof proposerId !== 'string') {
        throw new ApprovalProblemError('LP03001', {
          detail: 'Missing required proposer_id in request data',
        });
      }

      // Check emergency pause
      const isPaused = await this.pauseRepo.isPaused(tenantId, sessionId);
      if (isPaused) {
        throw new ApprovalProblemError('LP05004', {
          detail: `Cannot request approval: Emergency pause is active for tenant '${tenantId}' / session '${sessionId}'`,
        });
      }

      // 2. Execute with distributed idempotency
      const record = await this.idempotencyStore.executeWithIdempotency<ApprovalRequestRecord>(
        tenantId,
        sessionId,
        idempotencyKey,
        data,
        async () => {
          const now = Date.now();
          const ttlMs = (Number(data.ttl_seconds) || 300) * 1000;
          const deadlineAtMs = Number(data.deadline_at_ms) || now + ttlMs;
          const approvalId = data.approval_id || data.id || `appr_${now}_${Math.random().toString(36).slice(2, 8)}`;

          const input: CreateApprovalRequestInput = {
            id: approvalId,
            tenant_id: tenantId,
            session_id: sessionId,
            action_type: actionType,
            payload: (data.payload as Record<string, unknown>) || {},
            proposer_id: proposerId,
            deadline_at_ms: deadlineAtMs,
            created_at_ms: now,
          };

          const created = await this.approvalRepo.createRequest(input);

          // Enqueue outbox notification event
          await this.outboxPublisher.enqueue({
            id: `evt_req_${created.id}`,
            tenant_id: tenantId,
            event_type: 'approval.requested',
            subject: APPROVAL_REQUEST_SUBJECTS.EVENT_REQUESTED,
            payload: {
              approval_id: created.id,
              tenant_id: created.tenant_id,
              session_id: created.session_id,
              action_type: created.action_type,
              proposer_id: created.proposer_id,
              deadline_at_ms: created.deadline_at_ms,
              created_at_ms: created.created_at_ms,
            },
            created_at_ms: now,
          });

          return created;
        }
      );

      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'accepted' as const,
        schema_version: '1.0.0',
        correlation_id: correlationId,
        data: record,
      };

      this.respond(msg, responsePayload);
      return { status: 'accepted', data: record };
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
