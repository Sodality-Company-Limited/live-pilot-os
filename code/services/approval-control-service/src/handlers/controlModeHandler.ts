import type { ApprovalModeRepository } from '../infrastructure/approvalModeRepository.ts';
import type { OutboxPublisher } from '../infrastructure/outboxPublisher.ts';
import {
  ApprovalProblemError,
  mapErrorToReply,
  normalizeCorrelationId,
  type NatsReplyError,
} from './errorMapper.ts';
import type { ApprovalModeRecord, ControlMode } from '../persistence/types.ts';

export const CONTROL_MODE_SUBJECTS = {
  COMMAND_UPDATE: 'livepilot.v1.control.mode.update',
  COMMAND_UPDATE_REQUEST: 'livepilot.v1.control.mode.update.request',
  QUERY: 'livepilot.v1.control.mode.query',
  EVENT_UPDATED: 'livepilot.v1.control.mode.updated',
  DLQ: 'livepilot.v1.control.mode.dlq',
} as const;

export interface ControlModeMessageEnvelope {
  message_id?: string;
  correlation_id?: string;
  causation_id?: string;
  idempotency_key?: string;
  tenant_id?: string;
  session_id?: string;
  schema_version?: string;
  headers?: Record<string, string | undefined>;
  data?: {
    session_id?: string;
    current_mode?: ControlMode;
    target_mode?: ControlMode;
    updated_by?: string;
    actor_ref?: string;
    actor_role?: 'host' | 'live_ops' | 'admin';
    actor_capabilities?: string[];
    reason?: string;
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

export class ControlModeHandler {
  private readonly modeRepo: ApprovalModeRepository;
  private readonly outboxPublisher: OutboxPublisher;

  constructor(dependencies: {
    modeRepo: ApprovalModeRepository;
    outboxPublisher: OutboxPublisher;
  }) {
    this.modeRepo = dependencies.modeRepo;
    this.outboxPublisher = dependencies.outboxPublisher;
  }

  /**
   * Handle incoming mode update command.
   */
  async handleUpdate(msg: NatsMessage): Promise<{
    status: 'accepted' | 'rejected';
    data?: ApprovalModeRecord;
    error?: NatsReplyError;
  }> {
    let parsed: ControlModeMessageEnvelope;
    try {
      if (typeof msg.data === 'string') {
        parsed = JSON.parse(msg.data);
      } else if (msg.data instanceof Uint8Array) {
        parsed = JSON.parse(Buffer.from(msg.data).toString('utf8'));
      } else if (typeof msg.data === 'object' && msg.data !== null) {
        parsed = msg.data as ControlModeMessageEnvelope;
      } else {
        throw new Error('Invalid message payload type');
      }
    } catch {
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
    const sessionId = headers['X-Session-Id'] || parsed.session_id || parsed.data?.session_id;

    try {
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

      const data = parsed.data || {};
      const targetMode = data.target_mode || data.current_mode;
      if (!targetMode || !['RECOMMEND_ONLY', 'ASSISTED', 'AUTONOMOUS'].includes(targetMode)) {
        throw new ApprovalProblemError('LP05003', {
          detail: `Invalid or missing target_mode: '${targetMode}'. Must be one of RECOMMEND_ONLY, ASSISTED, AUTONOMOUS.`,
        });
      }

      const actorRef = data.actor_ref || data.updated_by || 'operator';
      const actorRole = data.actor_role || 'live_ops';
      const actorCapabilities = Array.isArray(data.actor_capabilities) ? data.actor_capabilities : [];

      const now = Date.now();
      const current = await this.modeRepo.getMode(tenantId, sessionId);

      const updated = await this.modeRepo.updateMode({
        tenant_id: tenantId,
        session_id: sessionId,
        target_mode: targetMode,
        updated_by: actorRef,
        actor_roles: [actorRole],
        actor_capabilities: actorCapabilities,
        updated_at_ms: now,
      });

      // Transactional outbox event
      await this.outboxPublisher.enqueue({
        id: `evt_mode_${sessionId}_${now}`,
        tenant_id: tenantId,
        event_type: 'control.mode.updated',
        subject: CONTROL_MODE_SUBJECTS.EVENT_UPDATED,
        payload: {
          session_id: sessionId,
          previous_mode: current.mode,
          current_mode: updated.mode,
          control_revision: 1,
          actor_ref: actorRef,
          actor_role: actorRole,
          updated_at: new Date(now).toISOString(),
          updated_at_ms: now,
          reason: data.reason || null,
        },
        created_at_ms: now,
      });

      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'accepted' as const,
        schema_version: '1.0.0',
        correlation_id: correlationId,
        data: updated,
      };

      this.respond(msg, responsePayload);
      return { status: 'accepted', data: updated };
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

  /**
   * Handle mode query.
   */
  async handleQuery(msg: NatsMessage): Promise<{
    status: 'accepted' | 'rejected';
    data?: ApprovalModeRecord;
    error?: NatsReplyError;
  }> {
    let parsed: ControlModeMessageEnvelope;
    try {
      if (typeof msg.data === 'string') {
        parsed = JSON.parse(msg.data);
      } else if (msg.data instanceof Uint8Array) {
        parsed = JSON.parse(Buffer.from(msg.data).toString('utf8'));
      } else if (typeof msg.data === 'object' && msg.data !== null) {
        parsed = msg.data as ControlModeMessageEnvelope;
      } else {
        parsed = {};
      }
    } catch {
      parsed = {};
    }

    const headers = msg.headers || parsed.headers || {};
    const correlationId = normalizeCorrelationId(
      headers['X-Correlation-Id'] || parsed.correlation_id
    );
    const tenantId = headers['X-Tenant-Id'] || parsed.tenant_id;
    const sessionId = headers['X-Session-Id'] || parsed.session_id || parsed.data?.session_id;

    try {
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

      const modeRecord = await this.modeRepo.getMode(tenantId, sessionId);

      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'accepted' as const,
        schema_version: '1.0.0',
        correlation_id: correlationId,
        data: modeRecord,
      };

      this.respond(msg, responsePayload);
      return { status: 'accepted', data: modeRecord };
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
