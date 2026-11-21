import type { JsMsg } from 'nats';
import {
  MARGIN_VERDICT_SCHEMA_HASH,
  MARGIN_VERDICT_SCHEMA_VERSION,
  MARGIN_VERDICT_SUBJECT,
  MarginPolicyIntegrationError,
  type MarginPolicyRequest,
  type MarginPolicyVerdict,
  validateMarginPolicyVerdict,
} from '../outbound/margin-policy.port';

export interface MarginVerdictConsumerOptions {
  readonly onVerdict: (verdict: MarginPolicyVerdict) => Promise<void>;
  readonly onUnknown: (context: { readonly request: MarginPolicyRequest; readonly reasonCode: 'TIMEOUT' | 'UNKNOWN' }) => Promise<void>;
}

const text = new TextDecoder();

export function decodeMarginVerdict(data: Uint8Array): MarginPolicyVerdict {
  let value: unknown;
  try { value = JSON.parse(text.decode(data)); } catch { throw new MarginPolicyIntegrationError('invalid margin verdict JSON', 'INVALID_CONTRACT'); }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new MarginPolicyIntegrationError('margin verdict must be an object', 'INVALID_CONTRACT');
  const raw = value as Record<string, unknown>;
  const verdict: MarginPolicyVerdict = {
    eventId: String(raw.event_id ?? ''), eventType: raw.event_type as MarginPolicyVerdict['eventType'], occurredAt: String(raw.occurred_at ?? ''), deadlineAt: String(raw.deadline_at ?? ''), producer: raw.producer as MarginPolicyVerdict['producer'],
    tenantId: String(raw.tenant_id ?? ''), sessionId: String(raw.session_id ?? ''), promotionId: String(raw.promotion_id ?? ''), aggregateId: String(raw.aggregate_id ?? ''), schemaVersion: raw.schema_version as MarginPolicyVerdict['schemaVersion'], schemaHash: raw.schema_hash as MarginPolicyVerdict['schemaHash'], policyRevision: String(raw.policy_revision ?? ''), resourceVersion: raw.resource_version as number, correlationId: String(raw.correlation_id ?? ''), causationId: String(raw.causation_id ?? ''), idempotencyKey: String(raw.idempotency_key ?? ''), verdict: raw.verdict as MarginPolicyVerdict['verdict'], evidenceIds: raw.evidence_ids as string[], mode: raw.mode as MarginPolicyVerdict['mode'], reasonCode: typeof raw.reason_code === 'string' ? raw.reason_code : undefined,
  };
  validateMarginPolicyVerdict(verdict);
  return verdict;
}

export class MarginVerdictConsumer {
  private readonly options: MarginVerdictConsumerOptions;

  public constructor(options: MarginVerdictConsumerOptions) {
    this.options = options;
  }

  public async process(message: JsMsg, request: MarginPolicyRequest): Promise<void> {
    if (message.subject !== MARGIN_VERDICT_SUBJECT) throw new MarginPolicyIntegrationError('unexpected margin verdict subject', 'INVALID_CONTRACT');
    try {
      const verdict = decodeMarginVerdict(message.data);
      validateMarginPolicyVerdict(verdict, request);
      await this.options.onVerdict(verdict);
      message.ack();
    } catch (error) {
      if (error instanceof MarginPolicyIntegrationError && (error.code === 'TIMEOUT' || error.code === 'UNKNOWN')) {
        await this.options.onUnknown({ request, reasonCode: error.code });
        message.ack();
        return;
      }
      message.term('invalid margin verdict contract');
      throw error;
    }
  }
}

export { MARGIN_VERDICT_SCHEMA_HASH, MARGIN_VERDICT_SCHEMA_VERSION };
