export type PromotionFailureKind = 'transient' | 'poison' | 'unknown';
export type RetryAction = 'retry' | 'quarantine';

export interface PromotionRetryMessage<T> {
  readonly messageId: string;
  readonly attempt: number;
  readonly deadlineAt: string;
  readonly payload: T;
}

export interface PromotionFailure {
  readonly kind?: PromotionFailureKind;
  readonly code?: string;
  readonly transient?: boolean;
  readonly retryable?: boolean;
}

export interface PromotionRetryDecision {
  readonly action: RetryAction;
  readonly attempt: number;
  readonly delayMs: number;
  readonly reasonCode: string;
}

export interface PromotionRetryWorkerOptions {
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterRatio?: number;
  readonly now?: () => number;
  readonly random?: () => number;
  readonly sleep?: (delayMs: number) => Promise<void>;
  readonly scheduleRetry: <T>(message: PromotionRetryMessage<T>, delayMs: number) => Promise<void>;
  readonly quarantine: <T>(message: PromotionRetryMessage<T>, reasonCode: string, error: unknown) => Promise<void>;
}

export class PromotionRetryBoundaryError extends Error {
  public constructor(public readonly reasonCode: string, message: string) {
    super(message);
    this.name = 'PromotionRetryBoundaryError';
  }
}

function failureKind(error: unknown): PromotionFailureKind {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as PromotionFailure;
    if (candidate.kind) return candidate.kind;
    if (candidate.transient === true || candidate.retryable === true) return 'transient';
  }
  return 'poison';
}

function boundedDelay(attempt: number, options: Required<Pick<PromotionRetryWorkerOptions, 'baseDelayMs' | 'maxDelayMs' | 'jitterRatio' | 'random'>>): number {
  const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = exponential * options.jitterRatio * (options.random() * 2 - 1);
  return Math.max(0, Math.min(options.maxDelayMs, Math.round(exponential + jitter)));
}

export class PromotionRetryWorker {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly jitterRatio: number;
  private readonly now: () => number;
  private readonly random: () => number;

  public constructor(private readonly options: PromotionRetryWorkerOptions) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 250;
    this.maxDelayMs = options.maxDelayMs ?? 30_000;
    this.jitterRatio = options.jitterRatio ?? 0.2;
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
    if (!Number.isSafeInteger(this.maxAttempts) || this.maxAttempts < 1 || this.maxAttempts > 3) throw new RangeError('maxAttempts must be 1..3');
    if (!Number.isSafeInteger(this.baseDelayMs) || this.baseDelayMs < 0 || !Number.isSafeInteger(this.maxDelayMs) || this.maxDelayMs < this.baseDelayMs) throw new RangeError('invalid retry delay bounds');
    if (!Number.isFinite(this.jitterRatio) || this.jitterRatio < 0 || this.jitterRatio > 1) throw new RangeError('jitterRatio must be 0..1');
  }

  public decide<T>(message: PromotionRetryMessage<T>, error: unknown): PromotionRetryDecision {
    if (!message.messageId || !Number.isSafeInteger(message.attempt) || message.attempt < 1) throw new PromotionRetryBoundaryError('INVALID_ATTEMPT', 'retry message identity or attempt is invalid');
    const deadline = Date.parse(message.deadlineAt);
    if (!Number.isFinite(deadline)) throw new PromotionRetryBoundaryError('INVALID_DEADLINE', 'retry deadline is invalid');
    const kind = failureKind(error);
    if (kind !== 'transient') return { action: 'quarantine', attempt: message.attempt, delayMs: 0, reasonCode: kind === 'unknown' ? 'UNKNOWN_OUTCOME' : 'POISON_MESSAGE' };
    if (this.now() >= deadline) return { action: 'quarantine', attempt: message.attempt, delayMs: 0, reasonCode: 'DEADLINE_EXCEEDED' };
    if (message.attempt >= this.maxAttempts) return { action: 'quarantine', attempt: message.attempt, delayMs: 0, reasonCode: 'RETRY_EXHAUSTED' };
    const delayMs = boundedDelay(message.attempt, { baseDelayMs: this.baseDelayMs, maxDelayMs: this.maxDelayMs, jitterRatio: this.jitterRatio, random: this.random });
    if (this.now() + delayMs >= deadline) return { action: 'quarantine', attempt: message.attempt, delayMs: 0, reasonCode: 'RETRY_DEADLINE_EXCEEDED' };
    return { action: 'retry', attempt: message.attempt, delayMs, reasonCode: 'TRANSIENT_FAILURE' };
  }

  public async handle<T>(message: PromotionRetryMessage<T>, error: unknown): Promise<PromotionRetryDecision> {
    const decision = this.decide(message, error);
    if (decision.action === 'retry') {
      await this.options.scheduleRetry({ ...message, attempt: message.attempt + 1 }, decision.delayMs);
    } else {
      await this.options.quarantine(message, decision.reasonCode, error);
    }
    return decision;
  }

  public process<T>(message: PromotionRetryMessage<T>, error: unknown): Promise<PromotionRetryDecision> {
    return this.handle(message, error);
  }
}

export const classifyPromotionFailure = failureKind;
