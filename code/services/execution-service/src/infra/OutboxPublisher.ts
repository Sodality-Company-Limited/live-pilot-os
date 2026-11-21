import type { IExecutionRepository, OutboxMessage } from './ExecutionRepository.js';

export interface INatsTransport {
  publish(subject: string, data: Uint8Array, headers?: Record<string, string>): Promise<void>;
}

export class OutboxPublisher {
  private readonly repo: IExecutionRepository;
  private readonly nats: INatsTransport;

  constructor(
    repo: IExecutionRepository,
    nats: INatsTransport
  ) {
    this.repo = repo;
    this.nats = nats;
  }

  async drainOutbox(tenantId: string, batchSize: number = 20): Promise<number> {
    const messages = await this.repo.getPendingOutboxMessages(tenantId, batchSize);
    let dispatchedCount = 0;

    for (const msg of messages) {
      try {
        const payloadBytes = Buffer.from(JSON.stringify(msg.payload), 'utf8');
        await this.nats.publish(msg.event_type, payloadBytes, msg.headers);
        await this.repo.markOutboxDispatched(tenantId, msg.message_id);
        dispatchedCount++;
      } catch (err) {
        // Stop batch on transport failure to preserve ordering
        break;
      }
    }

    return dispatchedCount;
  }
}
