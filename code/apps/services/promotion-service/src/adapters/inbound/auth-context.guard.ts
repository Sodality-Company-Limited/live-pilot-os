import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

export interface PromotionAuthContext {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly actorRef: string;
  readonly capability: string;
  readonly correlationId: string;
  readonly deadlineAt: string;
}

export interface PromotionRequestWithAuth {
  readonly tenantId?: unknown;
  readonly tenant_id?: unknown;
  readonly sessionId?: unknown;
  readonly session_id?: unknown;
  readonly actorRef?: unknown;
  readonly actor_ref?: unknown;
  readonly capability?: unknown;
  readonly correlationId?: unknown;
  readonly correlation_id?: unknown;
  readonly deadlineAt?: unknown;
  readonly deadline_at?: unknown;
  readonly auth?: Partial<PromotionAuthContext> | null;
  promotionAuthContext?: PromotionAuthContext;
}

export class PromotionAuthContextError extends Error {
  public constructor(public readonly reason: 'invalid_context' | 'expired_context') {
    super('Promotion authorization context is invalid');
    this.name = 'PromotionAuthContextError';
  }
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/;
const CAPABILITY = /^promotion\.[a-z][a-z0-9-]{1,63}$/;

function requiredString(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID.test(value);
}

function validDeadline(value: unknown, now: number): value is string {
  if (typeof value !== 'string') return false;
  const deadline = Date.parse(value);
  return Number.isFinite(deadline) && deadline > now;
}

function readContext(request: PromotionRequestWithAuth): Record<string, unknown> {
  const auth = request.auth ?? {};
  return {
    tenantId: auth.tenantId ?? request.tenantId ?? request.tenant_id,
    sessionId: auth.sessionId ?? request.sessionId ?? request.session_id,
    actorRef: auth.actorRef ?? request.actorRef ?? request.actor_ref,
    capability: auth.capability ?? request.capability,
    correlationId: auth.correlationId ?? request.correlationId ?? request.correlation_id,
    deadlineAt: auth.deadlineAt ?? request.deadlineAt ?? request.deadline_at,
  };
}

export function validatePromotionAuthContext(
  request: PromotionRequestWithAuth,
  now = Date.now(),
): PromotionAuthContext {
  const context = readContext(request);
  if (
    !requiredString(context.tenantId) ||
    !requiredString(context.sessionId) ||
    !requiredString(context.actorRef) ||
    typeof context.capability !== 'string' ||
    !CAPABILITY.test(context.capability) ||
    !requiredString(context.correlationId)
  ) {
    throw new PromotionAuthContextError('invalid_context');
  }
  if (!validDeadline(context.deadlineAt, now)) {
    throw new PromotionAuthContextError('expired_context');
  }
  return {
    tenantId: context.tenantId as string,
    sessionId: context.sessionId as string,
    actorRef: context.actorRef as string,
    capability: context.capability as string,
    correlationId: context.correlationId as string,
    deadlineAt: context.deadlineAt as string,
  };
}

@Injectable()
export class PromotionAuthContextGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PromotionRequestWithAuth>();
    try {
      request.promotionAuthContext = validatePromotionAuthContext(request);
      return true;
    } catch {
      // Never expose the failed field, token, or request body in a public error.
      throw new UnauthorizedException('Promotion authorization context is invalid');
    }
  }
}

export const validateAuthContext = validatePromotionAuthContext;
export const AuthContextGuard = PromotionAuthContextGuard;
