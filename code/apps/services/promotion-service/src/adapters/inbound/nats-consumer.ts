import { StringCodec, type JsMsg, type MsgHdrs } from 'nats';
import { decodePromotionEnvelope, PromotionNatsContractError, PROMOTION_SCHEMA_VERSION, type PromotionEnvelope } from '../outbound/nats-publisher';

export interface PromotionNatsDlqRecord {
  readonly original_subject: string;
  readonly original_message_id: string;
  readonly attempt: number;
  readonly reason_code: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly aggregate_id: string;
}

export interface PromotionNatsConsumerOptions {
  readonly dlq: (record: PromotionNatsDlqRecord, headers?: MsgHdrs) => Promise<void>;
  readonly maxAttempts?: number;
  readonly retryDelayMs?: (attempt: number) => number;
}

export type PromotionNatsHandler = (envelope: PromotionEnvelope<Record<string, unknown>>) => Promise<void>;

export class RetryablePromotionNatsError extends Error {
  public readonly retryable = true;
  public constructor(message: string) {
    super(message);
    this.name = 'RetryablePromotionNatsError';
  }
}

const text = StringCodec();

function header(message: JsMsg, name: string): string {
  return message.headers?.get(name) ?? '';
}

function validateTransportHeaders(message: JsMsg, envelope: PromotionEnvelope<Record<string, unknown>>): void {
  const expected: Record<string, string> = {
    'Nats-Msg-Id': envelope.message_id,
    'X-Correlation-Id': envelope.correlation_id,
    'X-Idempotency-Key': envelope.idempotency_key,
    'X-Tenant-Id': envelope.tenant_id,
    'X-Session-Id': envelope.session_id,
    'X-Schema-Version': PROMOTION_SCHEMA_VERSION,
    'X-Producer': envelope.producer,
    'X-Traceparent': header(message, 'X-Traceparent'),
    'X-Mode': envelope.mode,
    'X-Ordering-Key': envelope.aggregate_id,
  };
  for (const [name, value] of Object.entries(expected)) {
    if (!value || header(message, name) !== value) throw new Error(`invalid transport header: ${name}`);
  }
  if (header(message, 'X-Causation-Id') !== (envelope.causation_id ?? '')) throw new Error('invalid transport header: X-Causation-Id');
  if (message.subject !== envelope.subject) throw new Error('message subject does not match envelope subject');
}

export class PromotionNatsConsumer {
  private readonly maxAttempts: number;
  private readonly retryDelayMs: (attempt: number) => number;

  public constructor(
    private readonly handler: PromotionNatsHandler,
    private readonly options: PromotionNatsConsumerOptions,
  ) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? ((attempt) => Math.min(30_000, 250 * 2 ** (attempt - 1)));
    if (!Number.isInteger(this.maxAttempts) || this.maxAttempts < 1 || this.maxAttempts > 3) throw new Error('maxAttempts must be 1..3');
  }

  public async process(message: JsMsg): Promise<void> {
    try {
      const envelope = decodePromotionEnvelope(message.data);
      validateTransportHeaders(message, envelope);
      await this.handler(envelope);
      message.ack();
    } catch (error) {
      const attempt = message.info.deliveryCount || 1;
      const retryable = !(error instanceof PromotionNatsContractError);
      if (retryable && attempt < this.maxAttempts) {
        message.nak(this.retryDelayMs(attempt));
        return;
      }
      let envelope: PromotionEnvelope<Record<string, unknown>> | undefined;
      try { envelope = decodePromotionEnvelope(message.data); } catch { /* DLQ metadata is still bounded below. */ }
      await this.options.dlq({
        original_subject: message.subject,
        original_message_id: envelope?.message_id ?? header(message, 'Nats-Msg-Id'),
        attempt,
        reason_code: retryable ? 'RETRY_EXHAUSTED' : 'INVALID_OR_NON_RETRYABLE',
        correlation_id: envelope?.correlation_id ?? header(message, 'X-Correlation-Id'),
        causation_id: envelope?.causation_id ?? (header(message, 'X-Causation-Id') || null),
        tenant_id: envelope?.tenant_id ?? header(message, 'X-Tenant-Id'),
        session_id: envelope?.session_id ?? header(message, 'X-Session-Id'),
        aggregate_id: envelope?.aggregate_id ?? '',
      }, message.headers);
      message.term('promotion message moved to DLQ');
    }
  }
}

export function decodeMessageText(message: JsMsg): string {
  return text.decode(message.data);
}
