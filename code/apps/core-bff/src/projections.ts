/**
 * Core BFF Projection and Redis Adapter
 * Reads reconstructable projections from Redis/Cache with TTL validation, staleness checks, and safe degradation.
 */

export interface ProjectionRecord<T = unknown> {
  key: string;
  version: number;
  updatedAt: string;
  ttlSeconds: number;
  data: T;
}

export interface ReadProjectionResult<T = unknown> {
  found: boolean;
  isStale: boolean;
  data?: T;
  version?: number;
  ageMs?: number;
  degradedReason?: string;
}

export interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class InMemoryRedisClient implements RedisClientInterface {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  public async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class CoreBffProjectionAdapter {
  private redis: RedisClientInterface;
  private maxStalenessMs: number;

  constructor(redis: RedisClientInterface, maxStalenessMs = 60000) {
    this.redis = redis;
    this.maxStalenessMs = maxStalenessMs;
  }

  public async readProjection<T>(key: string): Promise<ReadProjectionResult<T>> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) {
        return {
          found: false,
          isStale: false,
          degradedReason: 'KEY_NOT_FOUND',
        };
      }

      const parsed: ProjectionRecord<T> = JSON.parse(raw);
      const updatedTimestamp = new Date(parsed.updatedAt).getTime();
      const ageMs = Date.now() - updatedTimestamp;
      const isStale = ageMs > this.maxStalenessMs;

      return {
        found: true,
        isStale,
        data: parsed.data,
        version: parsed.version,
        ageMs,
        ...(isStale ? { degradedReason: 'PROJECTION_STALE' } : {}),
      };
    } catch (err) {
      return {
        found: false,
        isStale: true,
        degradedReason: (err as Error).message || 'REDIS_ERROR',
      };
    }
  }

  public async writeProjection<T>(key: string, data: T, version: number, ttlSeconds = 300): Promise<void> {
    const record: ProjectionRecord<T> = {
      key,
      version,
      updatedAt: new Date().toISOString(),
      ttlSeconds,
      data,
    };
    await this.redis.set(key, JSON.stringify(record), ttlSeconds);
  }
}
