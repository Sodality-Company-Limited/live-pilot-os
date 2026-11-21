import type {
  ExecutionActionRecord,
  ExecutionStatus,
} from '../persistence/executionPersistence.js';
import type { IExecutionRepository, IdempotencyReservation } from '../infra/ExecutionRepository.js';
import { TransactionalBoundary } from '../infra/TransactionalBoundary.js';
import type {
  IPlatformAdapterClient,
  PlatformDispatchCommand,
  PlatformDispatchResult,
} from './PlatformAdapterClient.js';
import { NatsExecutionClient } from '../infra/NatsExecutionClient.js';

export interface DispatchOutcome {
  actionId: string;
  status: ExecutionStatus;
  version: number;
  idempotentReplay: boolean;
  errorCode?: string | null;
  observedAt?: string | null;
}

export class ExecutionDispatchService {
  private readonly repo: IExecutionRepository;
  private readonly boundary: TransactionalBoundary;
  private readonly adapter: IPlatformAdapterClient;
  private readonly natsClient: NatsExecutionClient;

  constructor(
    repo: IExecutionRepository,
    boundary: TransactionalBoundary,
    adapter: IPlatformAdapterClient,
    natsClient: NatsExecutionClient
  ) {
    this.repo = repo;
    this.boundary = boundary;
    this.adapter = adapter;
    this.natsClient = natsClient;
  }

  async executeAction(command: PlatformDispatchCommand): Promise<DispatchOutcome> {
    // 1. Idempotency Reservation
    const payloadHash = Buffer.from(JSON.stringify(command.payload)).toString('base64');
    const reservation: IdempotencyReservation = {
      tenant_id: command.tenantId,
      idempotency_key: command.idempotencyKey,
      action_id: command.actionId,
      session_id: command.sessionId,
      action_type: command.actionType,
      payload_hash: payloadHash,
      status: 'accepted',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    const isNew = await this.repo.reserveIdempotency(reservation);
    if (!isNew) {
      // Fetch existing action record and return replay receipt
      const existing = await this.repo.findById(command.tenantId, command.sessionId, command.actionId);
      if (existing) {
        return {
          actionId: existing.action_id,
          status: existing.status,
          version: existing.version,
          idempotentReplay: true,
          errorCode: existing.error_code,
          observedAt: existing.observed_at,
        };
      }
    }

    // 2. Insert initial action record in 'requested' state
    const now = new Date().toISOString();
    const initialAction: ExecutionActionRecord = {
      tenant_id: command.tenantId,
      session_id: command.sessionId,
      action_id: command.actionId,
      aggregate_id: command.aggregateId,
      action_type: command.actionType,
      status: 'requested',
      mode: command.mode,
      payload_hash: payloadHash,
      idempotency_key: command.idempotencyKey,
      version: 1,
      retry_count: 0,
      max_retries: 3,
      correlation_id: command.correlationId,
      causation_id: command.causationId,
      traceparent: command.traceparent,
      created_at: now,
      updated_at: now,
    };
    await this.repo.createAction(initialAction);

    // 3. Advance to 'accepted'
    let current = await this.boundary.transitionActionState(
      initialAction,
      'accepted',
      {
        actorId: command.actorId,
        reason: 'Action validated and accepted for adapter dispatch',
      }
    );

    // 4. Advance to 'pending' upon dispatching
    current = await this.boundary.transitionActionState(
      current,
      'pending',
      {
        actorId: command.actorId,
        reason: `Dispatched to adapter for ${command.actionType}`,
      }
    );

    // 5. Invoke platform adapter
    const adapterResult: PlatformDispatchResult = await this.adapter.dispatchAction(command);

    // 6. Transition to terminal or deferred state based on adapter outcome
    let terminalStatus: ExecutionStatus = adapterResult.status;
    current = await this.boundary.transitionActionState(
      current,
      terminalStatus,
      {
        actorId: command.actorId,
        reason: adapterResult.success
          ? 'Platform adapter confirmed execution'
          : `Adapter reported ${adapterResult.status}`,
        errorCode: adapterResult.errorCode,
        observedAt: adapterResult.observedAt,
        outboxPayload: {
          action_id: current.action_id,
          aggregate_id: current.aggregate_id,
          status: terminalStatus,
          mode: current.mode,
          error_code: adapterResult.errorCode ?? null,
          observed_at: adapterResult.observedAt ?? null,
        },
      }
    );

    // 7. Publish event to NATS
    await this.natsClient.publishActionUpdated(
      {
        action_id: current.action_id,
        aggregate_id: current.aggregate_id,
        status: terminalStatus,
        mode: current.mode,
        error_code: adapterResult.errorCode ?? null,
        observed_at: adapterResult.observedAt ?? null,
      },
      {
        'Nats-Msg-Id': `msg-${Date.now()}`,
        'X-Correlation-Id': command.correlationId,
        'X-Causation-Id': command.causationId ?? undefined,
        'X-Idempotency-Key': command.idempotencyKey,
        'X-Tenant-Id': command.tenantId,
        'X-Session-Id': command.sessionId,
        'X-Schema-Version': '1.0.0',
        'X-Producer': 'execution-service',
        'X-Traceparent': command.traceparent,
        'X-Mode': command.mode,
      }
    );

    return {
      actionId: current.action_id,
      status: current.status,
      version: current.version,
      idempotentReplay: false,
      errorCode: current.error_code,
      observedAt: current.observed_at,
    };
  }
}
