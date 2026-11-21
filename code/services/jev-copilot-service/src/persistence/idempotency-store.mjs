// Idempotency store for jev-copilot-service
// Provides distributed command deduplication, semantic fingerprint matching,
// and conflict detection (LP04003)

import { JevPersistenceConnection } from './connection.mjs';

export class IdempotencyStore {
  /**
   * @param {JevPersistenceConnection} connection
   */
  constructor(connection) {
    if (!connection) {
      throw new Error('JevPersistenceConnection is required');
    }
    this.connection = connection;
  }

  /**
   * Acquire or verify an idempotency key.
   * If the key exists:
   *   - If semantic_fingerprint differs, throws IDEMPOTENCY_PAYLOAD_MISMATCH (LP04003).
   *   - If completed, returns existing record.
   *   - If pending, indicates execution in progress.
   * If key does not exist, registers key with status 'pending'.
   * @param {string} tenantId
   * @param {string} liveSessionId
   * @param {string} idempotencyKey
   * @param {string} semanticFingerprint
   * @param {number} [ttlSeconds=86400]
   * @returns {Promise<{ acquired: boolean, existingRecord?: object }>}
   */
  async acquire(tenantId, liveSessionId, idempotencyKey, semanticFingerprint, ttlSeconds = 86400) {
    if (!tenantId || !idempotencyKey || !semanticFingerprint) {
      throw new Error('tenantId, idempotencyKey, and semanticFingerprint are required');
    }

    return this.connection.withTenantTransaction(tenantId, async (client) => {
      // Check existing record
      const checkSql = `
        SELECT * FROM jev.jev_idempotency
        WHERE tenant_id = $1 AND idempotency_key = $2
        FOR UPDATE;
      `;
      const res = await client.query(checkSql, [tenantId, idempotencyKey]);

      if (res.rows.length > 0) {
        const existing = res.rows[0];
        if (existing.semantic_fingerprint !== semanticFingerprint) {
          throw new Error(
            `IDEMPOTENCY_PAYLOAD_MISMATCH: Key ${idempotencyKey} already registered with different semantic fingerprint`
          );
        }
        return {
          acquired: false,
          existingRecord: existing
        };
      }

      // Insert new pending record
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

      const insertSql = `
        INSERT INTO jev.jev_idempotency (
          idempotency_key, tenant_id, live_session_id, semantic_fingerprint,
          status, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
        RETURNING *;
      `;

      await client.query(insertSql, [
        idempotencyKey,
        tenantId,
        liveSessionId,
        semanticFingerprint,
        now.toISOString(),
        expiresAt
      ]);

      return { acquired: true };
    });
  }

  /**
   * Complete an idempotent execution by storing the final response payload.
   * @param {string} tenantId
   * @param {string} idempotencyKey
   * @param {object} responsePayload
   * @returns {Promise<void>}
   */
  async complete(tenantId, idempotencyKey, responsePayload) {
    return this.connection.withTenantTransaction(tenantId, async (client) => {
      const sqlText = `
        UPDATE jev.jev_idempotency
        SET status = 'completed', response_payload = $1
        WHERE tenant_id = $2 AND idempotency_key = $3;
      `;
      const serializedPayload = JSON.stringify(responsePayload, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      );
      const res = await client.query(sqlText, [
        serializedPayload,
        tenantId,
        idempotencyKey
      ]);

      if (res.rowCount === 0) {
        throw new Error(`Idempotency record not found: ${idempotencyKey}`);
      }
    });
  }
}
