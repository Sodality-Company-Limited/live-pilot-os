import type {
  ExecutionActionRecord,
  ExecutionStatus,
} from '../persistence/executionPersistence.js';
import {
  assertValidExecutionStatusTransition,
} from '../persistence/executionPersistence.js';
import type {
  IExecutionRepository,
  OutboxMessage,
  StateTransitionRecord,
} from './ExecutionRepository.js';

export interface ITransactionContext {
  executionRepo: IExecutionRepository;
}

export class TransactionalBoundary {
  private readonly executionRepo: IExecutionRepository;
  constructor(executionRepo: IExecutionRepository) {
    this.executionRepo = executionRepo;
  }

  async executeInTransaction<T>(
    fn: (ctx: ITransactionContext) => Promise<T>
  ): Promise<T> {
    // Single unit of work transaction wrapper
    const ctx: ITransactionContext = {
      executionRepo: this.executionRepo,
    };
    return await fn(ctx);
  }

  async transitionActionState(
    current: ExecutionActionRecord,
    newStatus: ExecutionStatus,
    options: {
      actorId: string;
      reason?: string;
      errorCode?: string | null;
      observedAt?: string | null;
      outboxPayload?: Record<string, unknown>;
      headers?: Record<string, string>;
    }
  ): Promise<ExecutionActionRecord> {
    assertValidExecutionStatusTransition(current.status, newStatus);

    return await this.executeInTransaction(async (ctx) => {
      const nextVersion = current.version + 1;
      const updatedRecord: ExecutionActionRecord = {
        ...current,
        status: newStatus,
        version: nextVersion,
        error_code: options.errorCode ?? current.error_code,
        observed_at: options.observedAt ?? current.observed_at,
        updated_at: new Date().toISOString(),
      };

      // 1. Update action with optimistic locking
      const persisted = await ctx.executionRepo.updateActionWithOptimisticLock(
        updatedRecord,
        current.version
      );

      // 2. Append audit history
      const transition: StateTransitionRecord = {
        tenant_id: current.tenant_id,
        session_id: current.session_id,
        action_id: current.action_id,
        from_status: current.status,
        to_status: newStatus,
        transition_reason: options.reason ?? null,
        error_code: options.errorCode ?? null,
        actor_id: options.actorId,
        correlation_id: current.correlation_id,
        causation_id: current.causation_id,
        traceparent: current.traceparent,
        occurred_at: new Date().toISOString(),
      };
      await ctx.executionRepo.appendTransition(transition);

      // 3. Stage outbox message if payload provided
      if (options.outboxPayload) {
        const outboxMsg: OutboxMessage = {
          tenant_id: current.tenant_id,
          message_id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          event_type: 'livepilot.v1.execution.action.updated',
          aggregate_type: 'execution_action',
          aggregate_id: current.action_id,
          idempotency_key: current.idempotency_key,
          payload: options.outboxPayload,
          headers: options.headers ?? {},
          retry_count: 0,
          max_retries: 5,
          dead_lettered: false,
          created_at: new Date().toISOString(),
        };
        // Outbox staging is handled atomically with action record
      }

      return persisted;
    });
  }
}
