import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabasePoolManager } from '../persistence/database.ts';

export interface IdempotencyRecord {
  idempotency_key: string;
  tenant_id: string;
  session_id: string;
  semantic_fingerprint: string;
  response_payload: Record<string, unknown> | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at_ms: number;
  expires_at_ms: number;
}

export class IdempotencyConflictError extends Error {
  public readonly code = 'LP04003';
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyInProgressError extends Error {
  public readonly code = 'LP04004';
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyInProgressError';
  }
}

export class IdempotencyStore {
  private readonly db: DatabasePoolManager;
  private readonly inMemoryFallback = new Map<string, IdempotencyRecord>();

  constructor(db: DatabasePoolManager) {
    if (!db) {
      throw new Error('DatabasePoolManager is required');
    }
    this.db = db;
  }

  /**
   * Computes a deterministic SHA-256 semantic fingerprint of any JSON payload.
   */
  public static computeFingerprint(payload: unknown): string {
    const normalized = JSON.stringify(payload, Object.keys(payload || {}).sort());
    return createHash('sha256').update(normalized || '').digest('hex');
  }

  /**
   * Acquire or verify an idempotency key.
   * If key already exists:
   *   - If semantic_fingerprint differs -> throws IdempotencyConflictError (LP04003)
   *   - If status === 'COMPLETED' -> returns existing response payload
   *   - If status === 'PENDING' -> throws IdempotencyInProgressError (LP04004)
   * If key does not exist:
   *   - Inserts record with status 'PENDING' and returns null
   */
  async acquire(
    tenant_id: string,
    session_id: string,
    idempotency_key: string,
    semantic_fingerprint: string,
    ttl_ms: number = 86_400_000,
    client?: PoolClient
  ): Promise<{ acquired: boolean; existingRecord?: IdempotencyRecord }> {
    const execute = async (c: PoolClient) => {
      const now = Date.now();
      // Ensure idempotency table exists or fallback gracefully
      try {
        const selectSql = `
          SELECT * FROM approval.idempotency_keys
          WHERE tenant_id = $1 AND idempotency_key = $2
          FOR UPDATE;
        `;
        const res = await c.query(selectSql, [tenant_id, idempotency_key]);

        if (res.rows.length > 0) {
          const row = res.rows[0];
          const record = this.mapRecord(row);

          // Check expiry
          if (now > record.expires_at_ms) {
            // Expired key can be reclaimed
            const updateSql = `
              UPDATE approval.idempotency_keys
              SET session_id = $1, semantic_fingerprint = $2, response_payload = NULL,
                  status = 'PENDING', created_at_ms = $3, expires_at_ms = $4
              WHERE tenant_id = $5 AND idempotency_key = $6
              RETURNING *;
            `;
            await c.query(updateSql, [
              session_id,
              semantic_fingerprint,
              now,
              now + ttl_ms,
              tenant_id,
              idempotency_key,
            ]);
            return { acquired: true };
          }

          if (record.semantic_fingerprint !== semantic_fingerprint) {
            throw new IdempotencyConflictError(
              `IDEMPOTENCY_PAYLOAD_MISMATCH: Key ${idempotency_key} already recorded with different payload`
            );
          }

          return { acquired: false, existingRecord: record };
        }

        // Insert new pending record
        const insertSql = `
          INSERT INTO approval.idempotency_keys (
            idempotency_key, tenant_id, session_id, semantic_fingerprint,
            response_payload, status, created_at_ms, expires_at_ms
          ) VALUES ($1, $2, $3, $4, NULL, 'PENDING', $5, $6)
          RETURNING *;
        `;
        await c.query(insertSql, [
          idempotency_key,
          tenant_id,
          session_id,
          semantic_fingerprint,
          now,
          now + ttl_ms,
        ]);

        return { acquired: true };
      } catch (err: any) {
        // If approval.idempotency_keys table is not yet in the migration, use memory store
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          return this.acquireMemory(
            tenant_id,
            session_id,
            idempotency_key,
            semantic_fingerprint,
            ttl_ms
          );
        }
        throw err;
      }
    };

    if (client) {
      return execute(client);
    }
    return this.db.withTenantTransaction(tenant_id, execute);
  }

  /**
   * Complete an idempotent execution by storing the final response payload.
   */
  async complete(
    tenant_id: string,
    idempotency_key: string,
    response_payload: Record<string, unknown>,
    client?: PoolClient
  ): Promise<void> {
    const execute = async (c: PoolClient) => {
      try {
        const sql = `
          UPDATE approval.idempotency_keys
          SET status = 'COMPLETED', response_payload = $1
          WHERE tenant_id = $2 AND idempotency_key = $3;
        `;
        await c.query(sql, [JSON.stringify(response_payload), tenant_id, idempotency_key]);
      } catch (err: any) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          this.completeMemory(tenant_id, idempotency_key, response_payload);
          return;
        }
        throw err;
      }
    };

    if (client) {
      return execute(client);
    }
    return this.db.withTenantTransaction(tenant_id, execute);
  }

  /**
   * Helper function to execute any business operation with idempotency guarantees.
   */
  async executeWithIdempotency<T extends Record<string, unknown>>(
    tenant_id: string,
    session_id: string,
    idempotency_key: string,
    payload: unknown,
    operation: () => Promise<T>,
    ttl_ms: number = 86_400_000
  ): Promise<T> {
    const fingerprint = IdempotencyStore.computeFingerprint(payload);
    const { acquired, existingRecord } = await this.acquire(
      tenant_id,
      session_id,
      idempotency_key,
      fingerprint,
      ttl_ms
    );

    if (!acquired && existingRecord) {
      if (existingRecord.status === 'COMPLETED' && existingRecord.response_payload) {
        return existingRecord.response_payload as T;
      }
      if (existingRecord.status === 'PENDING') {
        throw new IdempotencyInProgressError(
          `Request with idempotency key ${idempotency_key} is currently in progress`
        );
      }
    }

    try {
      const result = await operation();
      await this.complete(tenant_id, idempotency_key, result);
      return result;
    } catch (error) {
      // On failure, remove or mark failed so caller can retry
      await this.markFailed(tenant_id, idempotency_key);
      throw error;
    }
  }

  private async markFailed(tenant_id: string, idempotency_key: string): Promise<void> {
    try {
      await this.db.withTenantTransaction(tenant_id, async (c) => {
        const sql = `
          UPDATE approval.idempotency_keys
          SET status = 'FAILED'
          WHERE tenant_id = $1 AND idempotency_key = $2;
        `;
        await c.query(sql, [tenant_id, idempotency_key]);
      });
    } catch {
      const key = `${tenant_id}:${idempotency_key}`;
      const rec = this.inMemoryFallback.get(key);
      if (rec) {
        rec.status = 'FAILED';
      }
    }
  }

  private acquireMemory(
    tenant_id: string,
    session_id: string,
    idempotency_key: string,
    semantic_fingerprint: string,
    ttl_ms: number
  ): { acquired: boolean; existingRecord?: IdempotencyRecord } {
    const key = `${tenant_id}:${idempotency_key}`;
    const now = Date.now();
    const existing = this.inMemoryFallback.get(key);

    if (existing) {
      if (now > existing.expires_at_ms) {
        this.inMemoryFallback.delete(key);
      } else {
        if (existing.semantic_fingerprint !== semantic_fingerprint) {
          throw new IdempotencyConflictError(
            `IDEMPOTENCY_PAYLOAD_MISMATCH: Key ${idempotency_key} already recorded with different payload`
          );
        }
        return { acquired: false, existingRecord: existing };
      }
    }

    const newRecord: IdempotencyRecord = {
      idempotency_key,
      tenant_id,
      session_id,
      semantic_fingerprint,
      response_payload: null,
      status: 'PENDING',
      created_at_ms: now,
      expires_at_ms: now + ttl_ms,
    };
    this.inMemoryFallback.set(key, newRecord);
    return { acquired: true };
  }

  private completeMemory(
    tenant_id: string,
    idempotency_key: string,
    response_payload: Record<string, unknown>
  ): void {
    const key = `${tenant_id}:${idempotency_key}`;
    const existing = this.inMemoryFallback.get(key);
    if (existing) {
      existing.status = 'COMPLETED';
      existing.response_payload = response_payload;
    }
  }

  private mapRecord(row: any): IdempotencyRecord {
    return {
      idempotency_key: row.idempotency_key,
      tenant_id: row.tenant_id,
      session_id: row.session_id,
      semantic_fingerprint: row.semantic_fingerprint,
      response_payload:
        typeof row.response_payload === 'string'
          ? JSON.parse(row.response_payload)
          : row.response_payload,
      status: row.status,
      created_at_ms: Number(row.created_at_ms),
      expires_at_ms: Number(row.expires_at_ms),
    };
  }
}
