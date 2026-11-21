import {
  TELEMETRY_INGEST_SUBJECT,
  TelemetryIngestService,
} from './telemetry-ingest.service.ts';
import type {
  NatsJetStreamMessage,
  TelemetryIngestResult,
} from './telemetry-ingest.service.ts';

export interface NatsSubscription {
  unsubscribe(): void | Promise<void>;
}

export interface NatsSubscriberConnection {
  subscribe(
    subject: string,
    handler: (msg: NatsJetStreamMessage) => Promise<void> | void
  ): NatsSubscription;
}

export interface TelemetryIngestControllerOptions {
  readonly subject?: string;
  readonly onError?: (error: unknown, message: NatsJetStreamMessage) => void;
}

/**
 * Inbound NATS JetStream controller wiring `livepilot.v1.telemetry.signal.ingest`
 * deliveries directly into `TelemetryIngestService`.
 */
export class TelemetryIngestController {
  private readonly ingestService: TelemetryIngestService;
  private readonly subject: string;
  private readonly onError: ((error: unknown, message: NatsJetStreamMessage) => void) | undefined;
  private subscription: NatsSubscription | null = null;

  constructor(
    ingestService: TelemetryIngestService,
    options: TelemetryIngestControllerOptions = {}
  ) {
    if (!ingestService) {
      throw new Error('TelemetryIngestController requires a TelemetryIngestService');
    }
    this.ingestService = ingestService;
    this.subject = options.subject ?? TELEMETRY_INGEST_SUBJECT;
    this.onError = options.onError;
  }

  /**
   * Starts subscribing to the configured JetStream ingest subject.
   */
  start(connection: NatsSubscriberConnection): this {
    if (!connection || typeof connection.subscribe !== 'function') {
      throw new Error('TelemetryIngestController requires a connection with subscribe()');
    }
    if (this.subscription) {
      return this;
    }

    this.subscription = connection.subscribe(this.subject, async (msg) => {
      try {
        await this.handleMessage(msg);
      } catch (error) {
        this.onError?.(error, msg);
      }
    });
    return this;
  }

  /**
   * Processes a single inbound NATS JetStream message through the ingest vertical slice.
   */
  async handleMessage(message: NatsJetStreamMessage): Promise<TelemetryIngestResult> {
    return this.ingestService.ingestMessage(message);
  }

  /**
   * Stops the active JetStream subscription cleanly.
   */
  async stop(): Promise<void> {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}
