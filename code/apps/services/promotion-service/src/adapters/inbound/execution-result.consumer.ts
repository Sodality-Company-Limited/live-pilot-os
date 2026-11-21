import {
  assertIssuanceEvidence,
  validateExecutionSafetyAuthorization,
  type ExecutionSafetyAuthorization,
  type ExecutionSafetyPort,
  type ExecutionSafetyRequest,
  type IssuanceEvidence,
} from '../outbound/execution-safety.port';

export interface ExecutionResultEvent {
  readonly messageId: string;
  readonly actionId: string;
  readonly evidence: IssuanceEvidence;
  readonly result: 'issued' | 'rejected' | 'unknown';
}

export interface ExecutionResultObservation {
  readonly action: ExecutionResultEvent['result'];
  readonly authorization: ExecutionSafetyAuthorization;
  readonly duplicate: boolean;
}

export interface ExecutionResultConsumerOptions {
  readonly onDispatch: (request: ExecutionSafetyRequest) => Promise<void>;
  readonly onResult: (observation: ExecutionResultObservation) => Promise<void>;
  readonly reconcile?: (event: ExecutionResultEvent) => Promise<void>;
}

/**
 * Promotion owns the issuance gate and result inbox only. Platform protocol and
 * provider payloads stay behind ExecutionSafetyPort/onDispatch.
 */
export class ExecutionResultConsumer {
  private readonly seen = new Map<string, string>();

  public constructor(
    private readonly safety: ExecutionSafetyPort,
    private readonly options: ExecutionResultConsumerOptions,
  ) {}

  public async dispatch(request: ExecutionSafetyRequest): Promise<ExecutionSafetyAuthorization> {
    assertIssuanceEvidence(request.evidence);
    const authorization = await this.safety.authorize(request);
    validateExecutionSafetyAuthorization(authorization, request.evidence);
    await this.options.onDispatch(request);
    return authorization;
  }

  public async consume(event: ExecutionResultEvent): Promise<ExecutionResultObservation> {
    if (typeof event.messageId !== 'string' || event.messageId.trim().length === 0 || typeof event.actionId !== 'string' || event.actionId.trim().length === 0) {
      throw new Error('execution result message and action identifiers are required');
    }
    assertIssuanceEvidence(event.evidence);
    const identity = `${event.evidence.tenantId}:${event.actionId}`;
    const fingerprint = `${event.messageId}:${event.result}:${event.evidence.executionSafety.authorizationId}:${event.evidence.executionSafety.fencingToken}`;
    const prior = this.seen.get(identity);
    if (prior === fingerprint) {
      const duplicate = { action: event.result, authorization: event.evidence.executionSafety, duplicate: true } as const;
      await this.options.onResult(duplicate);
      return duplicate;
    }
    if (prior) throw new Error('conflicting or replayed execution result fails closed');
    this.seen.set(identity, fingerprint);
    const observation = { action: event.result, authorization: event.evidence.executionSafety, duplicate: false } as const;
    await this.options.onResult(observation);
    if (event.result === 'unknown') await this.options.reconcile?.(event);
    return observation;
  }

  public async handle(event: ExecutionResultEvent): Promise<ExecutionResultObservation> {
    return this.consume(event);
  }
}

export const ExecutionResultMessageConsumer = ExecutionResultConsumer;

