import { createHash } from 'node:crypto';

export interface IdempotencyRecord<T> {
  readonly key: string;
  readonly fingerprint: string;
  readonly outcome: T;
  readonly expiresAt: number;
}

export class IdempotencyConflictError extends Error {
  public constructor() {
    super('Idempotency key has already been used for a different request');
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyKeyError extends Error {
  public constructor() {
    super('Idempotency key is invalid');
    this.name = 'IdempotencyKeyError';
  }
}

type Pending<T> = { readonly fingerprint: string; readonly promise: Promise<T> };

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !/(token|password|secret|credential|cookie|raw_provider_payload)/i.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(',')}}`;
}

export function requestFingerprint(request: unknown): string {
  return createHash('sha256').update(canonicalize(request)).digest('hex');
}

export const computeRequestFingerprint = requestFingerprint;

export class PromotionIdempotencyBoundary<T> {
  private readonly completed = new Map<string, IdempotencyRecord<T>>();
  private readonly pending = new Map<string, Pending<T>>();

  public constructor(
    private readonly ttlMs = 5 * 60_000,
    private readonly maxEntries = 10_000,
    private readonly clock: () => number = Date.now,
  ) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || !Number.isSafeInteger(maxEntries) || maxEntries <= 0) {
      throw new RangeError('Invalid idempotency boundary limits');
    }
  }

  public async execute(key: string, request: unknown, operation: () => Promise<T> | T): Promise<T> {
    this.assertKey(key);
    this.prune();
    const fingerprint = requestFingerprint(request);
    const existing = this.completed.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new IdempotencyConflictError();
      return existing.outcome;
    }
    const inFlight = this.pending.get(key);
    if (inFlight) {
      if (inFlight.fingerprint !== fingerprint) throw new IdempotencyConflictError();
      return inFlight.promise;
    }
    if (this.completed.size >= this.maxEntries) throw new Error('Idempotency boundary capacity unavailable');

    const promise = Promise.resolve().then(operation);
    this.pending.set(key, { fingerprint, promise });
    try {
      const outcome = await promise;
      this.pending.delete(key);
      this.completed.set(key, { key, fingerprint, outcome, expiresAt: this.clock() + this.ttlMs });
      return outcome;
    } catch (error) {
      this.pending.delete(key);
      throw error;
    }
  }

  public size(): number {
    this.prune();
    return this.completed.size + this.pending.size;
  }

  private assertKey(key: string): void {
    if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$/.test(key)) throw new IdempotencyKeyError();
  }

  private prune(): void {
    const now = this.clock();
    for (const [key, record] of this.completed) if (record.expiresAt <= now) this.completed.delete(key);
  }
}

export const IdempotencyStore = PromotionIdempotencyBoundary;
