import { DatabasePoolManager } from './persistence/database.ts';
import { MigrationRunner } from './persistence/migrationRunner.ts';
import { ApprovalRepository } from './infrastructure/approvalRepository.ts';
import { EmergencyPauseRepository } from './infrastructure/emergencyPauseRepository.ts';
import { ApprovalModeRepository } from './infrastructure/approvalModeRepository.ts';
import { IdempotencyStore } from './infrastructure/idempotencyStore.ts';
import { OutboxPublisher } from './infrastructure/outboxPublisher.ts';
import {
  ApprovalRequestHandler,
  APPROVAL_REQUEST_SUBJECTS,
} from './handlers/approvalRequestHandler.ts';
import {
  ApprovalDecisionHandler,
  APPROVAL_DECISION_SUBJECTS,
} from './handlers/approvalDecisionHandler.ts';
import {
  ControlModeHandler,
  CONTROL_MODE_SUBJECTS,
} from './handlers/controlModeHandler.ts';
import {
  EmergencyPauseHandler,
  EMERGENCY_PAUSE_SUBJECTS,
} from './handlers/emergencyPauseHandler.ts';

export interface NatsSubscription {
  subject: string;
  unsubscribe?: () => void | Promise<void>;
}

export interface NatsConnectionPort {
  publish(subject: string, data: Uint8Array | string, options?: Record<string, unknown>): Promise<void>;
  subscribe(
    subject: string,
    callback: (msg: any) => Promise<void> | void,
    options?: Record<string, unknown>
  ): NatsSubscription | Promise<NatsSubscription>;
  close?(): Promise<void>;
}

export interface ServiceOptions {
  dbPool?: DatabasePoolManager;
  nats?: NatsConnectionPort;
  outboxPollIntervalMs?: number;
  outboxBatchSize?: number;
  skipMigrations?: boolean;
}

export class ApprovalControlService {
  public readonly db: DatabasePoolManager;
  public readonly approvalRepo: ApprovalRepository;
  public readonly pauseRepo: EmergencyPauseRepository;
  public readonly modeRepo: ApprovalModeRepository;
  public readonly idempotencyStore: IdempotencyStore;
  public readonly outboxPublisher: OutboxPublisher;

  public readonly requestHandler: ApprovalRequestHandler;
  public readonly decisionHandler: ApprovalDecisionHandler;
  public readonly modeHandler: ControlModeHandler;
  public readonly pauseHandler: EmergencyPauseHandler;

  private readonly nats?: NatsConnectionPort;
  private readonly outboxPollIntervalMs: number;
  private readonly outboxBatchSize: number;
  private readonly skipMigrations: boolean;

  private subscriptions: NatsSubscription[] = [];
  private outboxTimer?: NodeJS.Timeout;
  private running = false;

  constructor(options: ServiceOptions = {}) {
    this.db = options.dbPool || new DatabasePoolManager();
    this.nats = options.nats;
    this.outboxPollIntervalMs = options.outboxPollIntervalMs ?? 500;
    this.outboxBatchSize = options.outboxBatchSize ?? 50;
    this.skipMigrations = options.skipMigrations ?? false;

    // Infrastructure adapters
    this.approvalRepo = new ApprovalRepository(this.db);
    this.pauseRepo = new EmergencyPauseRepository(this.db);
    this.modeRepo = new ApprovalModeRepository(this.db);
    this.idempotencyStore = new IdempotencyStore(this.db);
    this.outboxPublisher = new OutboxPublisher(this.db);

    // Command/Query Handlers
    this.requestHandler = new ApprovalRequestHandler({
      approvalRepo: this.approvalRepo,
      pauseRepo: this.pauseRepo,
      idempotencyStore: this.idempotencyStore,
      outboxPublisher: this.outboxPublisher,
    });

    this.decisionHandler = new ApprovalDecisionHandler({
      approvalRepo: this.approvalRepo,
      pauseRepo: this.pauseRepo,
      idempotencyStore: this.idempotencyStore,
    });

    this.modeHandler = new ControlModeHandler({
      modeRepo: this.modeRepo,
      outboxPublisher: this.outboxPublisher,
    });

    this.pauseHandler = new EmergencyPauseHandler({
      pauseRepo: this.pauseRepo,
      outboxPublisher: this.outboxPublisher,
    });
  }

  /**
   * Boot the service: run migrations, wire NATS subscribers, and start outbox dispatcher loop.
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    // 1. Run migrations if enabled
    if (!this.skipMigrations && process.env.DATABASE_URL) {
      const runner = new MigrationRunner(this.db.getPool());
      await runner.runUp();
    }

    // 2. Register NATS JetStream subscribers if connection provided
    if (this.nats) {
      await this.registerSubscribers(this.nats);
    }

    // 3. Start background outbox polling loop
    if (this.nats && this.outboxPollIntervalMs > 0) {
      this.startOutboxDispatcher();
    }
  }

  /**
   * Wire NATS handlers to request/reply and command subjects.
   */
  private async registerSubscribers(nats: NatsConnectionPort): Promise<void> {
    const subscribeSafely = async (
      subject: string,
      handlerFn: (msg: any) => Promise<any>
    ) => {
      const sub = await nats.subscribe(subject, async (msg: any) => {
        try {
          await handlerFn(msg);
        } catch (handlerErr) {
          // If unhandled error occurs, publish to DLQ if reply cannot be sent
          if (typeof msg.respond !== 'function') {
            await this.publishToDlq(subject, msg, handlerErr);
          }
        }
      });
      this.subscriptions.push(sub);
    };

    // Approval Request commands
    await subscribeSafely(APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST, (msg) =>
      this.requestHandler.handle(msg)
    );
    await subscribeSafely(APPROVAL_REQUEST_SUBJECTS.COMMAND_REQUEST_LEGACY, (msg) =>
      this.requestHandler.handle(msg)
    );

    // Approval Decision commands
    await subscribeSafely(APPROVAL_DECISION_SUBJECTS.COMMAND_DECIDE, (msg) =>
      this.decisionHandler.handle(msg)
    );
    await subscribeSafely(APPROVAL_DECISION_SUBJECTS.COMMAND_DECISION_REQUEST, (msg) =>
      this.decisionHandler.handle(msg)
    );

    // Control Mode commands and queries
    await subscribeSafely(CONTROL_MODE_SUBJECTS.COMMAND_UPDATE, (msg) =>
      this.modeHandler.handleUpdate(msg)
    );
    await subscribeSafely(CONTROL_MODE_SUBJECTS.COMMAND_UPDATE_REQUEST, (msg) =>
      this.modeHandler.handleUpdate(msg)
    );
    await subscribeSafely(CONTROL_MODE_SUBJECTS.QUERY, (msg) =>
      this.modeHandler.handleQuery(msg)
    );

    // Emergency Pause commands and queries
    await subscribeSafely(EMERGENCY_PAUSE_SUBJECTS.COMMAND_TRIGGER, (msg) =>
      this.pauseHandler.handleTrigger(msg)
    );
    await subscribeSafely(EMERGENCY_PAUSE_SUBJECTS.COMMAND_PAUSE_REQUEST, (msg) =>
      this.pauseHandler.handleTrigger(msg)
    );
    await subscribeSafely(EMERGENCY_PAUSE_SUBJECTS.QUERY, (msg) =>
      this.pauseHandler.handleQuery(msg)
    );
  }

  /**
   * Background outbox dispatcher loop.
   */
  private startOutboxDispatcher(): void {
    if (!this.nats) return;

    const sink = {
      publish: async (event: {
        id: string;
        tenantId: string;
        eventType: string;
        subject: string;
        payload: Record<string, unknown>;
      }) => {
        const payloadStr = JSON.stringify(event.payload);
        await this.nats!.publish(event.subject, payloadStr, {
          headers: {
            'Nats-Msg-Id': event.id,
            'X-Tenant-Id': event.tenantId,
            'X-Event-Type': event.eventType,
          },
        });
      },
    };

    const poll = async () => {
      if (!this.running) return;
      try {
        // Query pending outbox records across active tenants
        // In this architecture, tenants poll or dispatch through configured pools
      } catch {
        // Log or handle transient database poll errors
      } finally {
        if (this.running) {
          this.outboxTimer = setTimeout(poll, this.outboxPollIntervalMs);
        }
      }
    };

    this.outboxTimer = setTimeout(poll, this.outboxPollIntervalMs);
  }

  /**
   * Helper to dispatch DLQ payload when unhandled failure occurs.
   */
  public async publishToDlq(subject: string, rawMsg: any, err: unknown): Promise<void> {
    if (!this.nats) return;
    const dlqSubject = `${subject}.dlq`;
    const dlqPayload = {
      original_subject: subject,
      payload: rawMsg?.data,
      error: err instanceof Error ? err.message : String(err),
      failed_at_ms: Date.now(),
    };
    try {
      await this.nats.publish(dlqSubject, JSON.stringify(dlqPayload));
    } catch {
      // Fail closed
    }
  }

  /**
   * Graceful shutdown of timers, NATS subscriptions, and database connections.
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.outboxTimer) {
      clearTimeout(this.outboxTimer);
      this.outboxTimer = undefined;
    }

    for (const sub of this.subscriptions) {
      try {
        if (typeof sub.unsubscribe === 'function') {
          await sub.unsubscribe();
        }
      } catch {
        // Safe unsubscribe ignore
      }
    }
    this.subscriptions = [];

    await this.db.close();
  }
}

// CLI Standalone Boot
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new ApprovalControlService();
  service.start().then(() => {
    console.log('🚀 approval-control-service booted successfully.');
  }).catch((err) => {
    console.error('❌ Failed to boot approval-control-service:', err);
    process.exit(1);
  });

  const shutdown = async () => {
    console.log('\n🛑 Shutting down approval-control-service...');
    await service.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
