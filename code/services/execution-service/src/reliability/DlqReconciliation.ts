import type {
  ExecutionActionRecord,
  ExecutionStatus,
} from '../persistence/executionPersistence.js';
import type { IExecutionRepository } from '../infra/ExecutionRepository.js';
import { TransactionalBoundary } from '../infra/TransactionalBoundary.js';
import type { INatsTransport } from '../infra/OutboxPublisher.js';
import type {
  IPlatformAdapterClient,
  PlatformDispatchCommand,
} from '../domain/PlatformAdapterClient.js';

export interface DlqEnvelope {
  originalSubject: string;
  actionId: string;
  tenantId: string;
  sessionId: string;
  attempts: number;
  failureCode: string;
  failureDetail?: string | null;
  failedAt: string;
  replayOwner: string;
}

export class DlqPublisher {
  private readonly nats: INatsTransport;

  constructor(nats: INatsTransport) {
    this.nats = nats;
  }

  async routeToDlq(envelope: DlqEnvelope): Promise<void> {
    const subject = 'livepilot.v1.execution.action.dlq';
    const payloadBytes = Buffer.from(JSON.stringify(envelope), 'utf8');
    const headers = {
      'X-Tenant-Id': envelope.tenantId,
      'X-Session-Id': envelope.sessionId,
      'X-Schema-Version': '1.0.0',
      'X-Producer': 'execution-service',
      'X-Mode': 'CONFIRMED',
    };
    await this.nats.publish(subject, payloadBytes, headers);
  }
}

export class ReconciliationWorker {
  private readonly repo: IExecutionRepository;
  private readonly boundary: TransactionalBoundary;
  private readonly adapter: IPlatformAdapterClient;
  private readonly dlq: DlqPublisher;

  constructor(
    repo: IExecutionRepository,
    boundary: TransactionalBoundary,
    adapter: IPlatformAdapterClient,
    dlq: DlqPublisher
  ) {
    this.repo = repo;
    this.boundary = boundary;
    this.adapter = adapter;
    this.dlq = dlq;
  }

  async reconcileAction(
    action: ExecutionActionRecord,
    reconciliationProbeResult: { status: 'succeeded' | 'failed' | 'unknown'; errorCode?: string }
  ): Promise<ExecutionActionRecord> {
    if (action.status !== 'unknown') {
      return action;
    }

    // 1. Advance to 'reconciled'
    let current = await this.boundary.transitionActionState(
      action,
      'reconciled',
      {
        actorId: 'reconciliation-worker',
        reason: 'Active observed platform state probe initiated',
      }
    );

    // 2. Terminal resolution
    if (reconciliationProbeResult.status === 'succeeded') {
      current = await this.boundary.transitionActionState(
        current,
        'succeeded',
        {
          actorId: 'reconciliation-worker',
          reason: 'Platform confirmed execution via reconciliation probe',
          observedAt: new Date().toISOString(),
        }
      );
    } else if (reconciliationProbeResult.status === 'failed') {
      current = await this.boundary.transitionActionState(
        current,
        'failed',
        {
          actorId: 'reconciliation-worker',
          reason: 'Platform confirmed action was rejected or never applied',
          errorCode: reconciliationProbeResult.errorCode ?? 'LP08002',
        }
      );
    } else {
      // Still unknown after retries exhausted -> Route to DLQ
      await this.dlq.routeToDlq({
        originalSubject: 'livepilot.v1.execution.action.updated',
        actionId: current.action_id,
        tenantId: current.tenant_id,
        sessionId: current.session_id,
        attempts: current.retry_count + 1,
        failureCode: 'LP08002',
        failureDetail: 'Reconciliation failed to observe terminal state',
        failedAt: new Date().toISOString(),
        replayOwner: 'execution-service',
      });
    }

    return current;
  }
}
