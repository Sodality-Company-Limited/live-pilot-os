import { createHash, randomUUID } from 'node:crypto';
import {
  validatePromotionAuthContext,
  type PromotionAuthContext,
  type PromotionRequestWithAuth,
} from '../adapters/inbound/auth-context.guard';
import { PromotionIdempotencyBoundary, requestFingerprint } from './idempotency';
import type { PromotionRepository } from '../adapters/outbound/promotion-repository';
import { PROMOTION_SCHEMA_VERSION, PROMOTION_SUBJECTS, type PromotionNatsPublisher } from '../adapters/outbound/nats-publisher';

export interface PromotionProposalBody {
  readonly promotion_id?: unknown;
  readonly product_id?: unknown;
  readonly promotion_type?: unknown;
  readonly discount_percent?: unknown;
  readonly claim_limit?: unknown;
  readonly reason?: unknown;
  readonly policy_revision?: unknown;
  readonly expected_resource_version?: unknown;
  readonly causation_id?: unknown;
  readonly mode?: unknown;
}

export interface PromotionProposalRequest extends PromotionRequestWithAuth {
  readonly body?: PromotionProposalBody;
  readonly headers?: Readonly<Record<string, unknown>>;
}

export interface PromotionPendingReceipt {
  readonly statusCode: 202;
  readonly promotionId: string;
  readonly status: 'pending';
  readonly policyRevision: string;
  readonly resourceVersion: number;
  readonly etag: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly idempotencyKey: string;
  readonly mode: 'SIMULATED';
  readonly nextAction: 'policy_evaluation';
}

export interface ProposalRepositoryPort {
  transition(input: Parameters<PromotionRepository['transition']>[0]): ReturnType<PromotionRepository['transition']>;
}

export interface ProposalPublisherPort {
  publish<T extends Record<string, unknown>>(
    envelope: Parameters<PromotionNatsPublisher['publish']>[0] & T,
    options: Parameters<PromotionNatsPublisher['publish']>[1],
  ): Promise<unknown>;
}

export class PromotionProposalValidationError extends Error {
  public constructor(public readonly code: 'REQUEST_INVALID' | 'SESSION_SCOPE_DENIED' | 'DEADLINE_EXPIRED') {
    super(code);
    this.name = 'PromotionProposalValidationError';
  }
}

const BODY_KEYS = new Set(['promotion_id', 'product_id', 'promotion_type', 'discount_percent', 'claim_limit', 'reason', 'policy_revision', 'expected_resource_version', 'causation_id', 'mode']);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PROMOTION_ID = /^[A-Za-z0-9_-]{8,128}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,255}$/;

function stringField(value: unknown, pattern = ID): value is string {
  return typeof value === 'string' && pattern.test(value);
}

function header(request: PromotionProposalRequest, name: string): unknown {
  return request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
}

function readIdempotencyKey(request: PromotionProposalRequest): string {
  const value = header(request, 'Idempotency-Key');
  if (!stringField(value, IDEMPOTENCY_KEY)) throw new PromotionProposalValidationError('REQUEST_INVALID');
  return value;
}

function validateBody(body: PromotionProposalBody): Required<Pick<PromotionProposalBody, 'product_id' | 'discount_percent' | 'claim_limit' | 'policy_revision'>> & PromotionProposalBody {
  if (!body || typeof body !== 'object' || Object.keys(body).some((key) => !BODY_KEYS.has(key))) throw new PromotionProposalValidationError('REQUEST_INVALID');
  if (!stringField(body.product_id) || typeof body.discount_percent !== 'number' || !Number.isFinite(body.discount_percent) || body.discount_percent < 0 || body.discount_percent > 100 || !Number.isSafeInteger(body.claim_limit) || body.claim_limit < 1 || !stringField(body.policy_revision)) {
    throw new PromotionProposalValidationError('REQUEST_INVALID');
  }
  if (body.promotion_id !== undefined && !stringField(body.promotion_id, PROMOTION_ID)) throw new PromotionProposalValidationError('REQUEST_INVALID');
  if (body.promotion_type !== undefined && !stringField(body.promotion_type)) throw new PromotionProposalValidationError('REQUEST_INVALID');
  if (body.reason !== undefined && !stringField(body.reason)) throw new PromotionProposalValidationError('REQUEST_INVALID');
  if (body.causation_id !== undefined && !stringField(body.causation_id)) throw new PromotionProposalValidationError('REQUEST_INVALID');
  if (body.mode !== undefined && body.mode !== 'SIMULATED') throw new PromotionProposalValidationError('REQUEST_INVALID');
  if (body.expected_resource_version !== undefined && (!Number.isSafeInteger(body.expected_resource_version) || body.expected_resource_version < 1)) throw new PromotionProposalValidationError('REQUEST_INVALID');
  return body as Required<Pick<PromotionProposalBody, 'product_id' | 'discount_percent' | 'claim_limit' | 'policy_revision'>> & PromotionProposalBody;
}

export function validatePromotionProposalRequest(request: PromotionProposalRequest, now = Date.now()): { readonly auth: PromotionAuthContext; readonly body: ReturnType<typeof validateBody>; readonly idempotencyKey: string; readonly fingerprint: string } {
  const auth = validatePromotionAuthContext(request, now);
  if (request.sessionId !== undefined && request.sessionId !== auth.sessionId) throw new PromotionProposalValidationError('SESSION_SCOPE_DENIED');
  if (auth.capability !== 'promotion.propose') throw new PromotionProposalValidationError('SESSION_SCOPE_DENIED');
  const idempotencyKey = readIdempotencyKey(request);
  const body = validateBody(request.body ?? {});
  const fingerprint = requestFingerprint({ tenantId: auth.tenantId, sessionId: auth.sessionId, actorRef: auth.actorRef, operation: 'proposePromotion', body });
  return { auth, body, idempotencyKey, fingerprint };
}

export class ProposePromotion {
  private readonly idempotency: PromotionIdempotencyBoundary<PromotionPendingReceipt>;

  public constructor(
    private readonly repository: ProposalRepositoryPort,
    private readonly publisher: ProposalPublisherPort,
    idempotency = new PromotionIdempotencyBoundary<PromotionPendingReceipt>(),
    private readonly now: () => Date = () => new Date(),
    private readonly idFactory: () => string = randomUUID,
  ) {
    this.idempotency = idempotency;
  }

  public execute(request: PromotionProposalRequest): Promise<PromotionPendingReceipt> {
    const validated = validatePromotionProposalRequest(request, this.now().getTime());
    return this.idempotency.execute(validated.idempotencyKey, { fingerprint: validated.fingerprint }, () => this.executeOnce(validated.auth, validated.body, validated.idempotencyKey, validated.fingerprint));
  }

  private async executeOnce(auth: PromotionAuthContext, body: ReturnType<typeof validateBody>, idempotencyKey: string, fingerprint: string): Promise<PromotionPendingReceipt> {
    const promotionId = body.promotion_id ?? this.idFactory();
    const causationId = body.causation_id ?? auth.correlationId;
    const deadlineAt = auth.deadlineAt;
    const expectedVersion = body.expected_resource_version ?? 1;
    const now = this.now();
    const eventPayload: Record<string, unknown> = {
      schema_version: PROMOTION_SCHEMA_VERSION,
      message_kind: 'event',
      event_type: 'promotion.proposed',
      promotion_id: promotionId,
      session_id: auth.sessionId,
      product_id: body.product_id,
      discount_percent: body.discount_percent,
      claim_limit: body.claim_limit,
      policy_revision: body.policy_revision,
      expected_resource_version: expectedVersion,
      resource_version: expectedVersion + 1,
      actor_ref: auth.actorRef,
      capability: auth.capability,
      idempotency_key: idempotencyKey,
      idempotency_fingerprint: fingerprint,
      correlation_id: auth.correlationId,
      causation_id: causationId,
      lifecycle_state: 'pending',
    };
    const result = await this.repository.transition({
      promotionId,
      tenantId: auth.tenantId,
      sessionId: auth.sessionId,
      aggregateData: { product_id: body.product_id, promotion_type: body.promotion_type, discount_percent: body.discount_percent, claim_limit: body.claim_limit, reason: body.reason, policy_revision: body.policy_revision },
      eventType: 'promotion.proposed',
      eventPayload,
      correlationId: auth.correlationId,
      causationId,
      retentionUntil: new Date(Date.parse(deadlineAt)),
      command: { to: 'pending', expectedVersion, idempotencyKey, fingerprint, actor: { id: auth.actorRef, tenantId: auth.tenantId, capabilities: ['promotion:submit'] }, preconditions: { submissionValid: true } },
      inbox: { messageId: createHash('sha256').update(`request:${idempotencyKey}`).digest('hex'), consumerName: 'promotion-service', subject: PROMOTION_SUBJECTS.proposalRequest, payload: eventPayload },
    });
    const messageId = createHash('sha256').update(`event:${idempotencyKey}`).digest('hex');
    await this.publisher.publish({ message_id: messageId, message_kind: 'event', subject: PROMOTION_SUBJECTS.proposed, schema_version: PROMOTION_SCHEMA_VERSION, occurred_at: now.toISOString(), producer: 'promotion-service', tenant_id: auth.tenantId, session_id: auth.sessionId, aggregate_type: 'promotion', aggregate_id: promotionId, correlation_id: auth.correlationId, causation_id: causationId, idempotency_key: idempotencyKey, priority: 'normal', deadline_at: deadlineAt, mode: 'SIMULATED', authorization: { actor_ref: auth.actorRef, capability: auth.capability, policy_revision: body.policy_revision as string }, data: { ...eventPayload, resource_version: result.version } }, { tenantId: auth.tenantId, sessionId: auth.sessionId, producer: 'promotion-service', traceparent: `00-${auth.correlationId}-0000000000000001-01`, orderingKey: promotionId, mode: 'SIMULATED', authorization: { actor_ref: auth.actorRef, capability: auth.capability, policy_revision: body.policy_revision as string } });
    return { statusCode: 202, promotionId, status: 'pending', policyRevision: body.policy_revision as string, resourceVersion: result.version, etag: `W/\"${result.version}\"`, correlationId: auth.correlationId, causationId, idempotencyKey, mode: 'SIMULATED', nextAction: 'policy_evaluation' };
  }
}

export const ProposePromotionUseCase = ProposePromotion;
