// Transactional Outbox repository for jev-copilot-service
// Manages at-least-once message dispatch, pending polling, and status transitions

import { JevPersistenceConnection } from './connection.mjs';

export class OutboxRepository {
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
   * Fetch pending outbox messages ordered by created_at.
   * @param {string} tenantId
   * @param {number} [limit=50]
   * @returns {Promise<object[]>}
   */
  async fetchPending(tenantId, limit = 50) {
    return this.connection.withTenantTransaction(tenantId, async (client) => {
      const sqlText = `
        SELECT * FROM jev.jev_outbox
        WHERE tenant_id = $1 AND status = 'pending'
        ORDER BY created_at ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED;
      `;
      const res = await client.query(sqlText, [tenantId, limit]);
      return res.rows;
    });
  }

  /**
   * Mark an outbox message as published atomically.
   * @param {string} tenantId
   * @param {string} outboxId
   * @returns {Promise<void>}
   */
  async markPublished(tenantId, outboxId) {
    return this.connection.withTenantTransaction(tenantId, async (client) => {
      const now = new Date().toISOString();
      const sqlText = `
        UPDATE jev.jev_outbox
        SET status = 'published', published_at = $1
        WHERE tenant_id = $2 AND outbox_id = $3;
      `;
      const res = await client.query(sqlText, [now, tenantId, outboxId]);
      if (res.rowCount === 0) {
        throw new Error(`Outbox message not found: ${outboxId}`);
      }
    });
  }

  /**
   * Record a publication retry failure.
   * @param {string} tenantId
   * @param {string} outboxId
   * @param {number} [maxRetries=5]
   * @returns {Promise<void>}
   */
  async markFailed(tenantId, outboxId, maxRetries = 5) {
    return this.connection.withTenantTransaction(tenantId, async (client) => {
      const sqlText = `
        UPDATE jev.jev_outbox
        SET retry_count = retry_count + 1,
            status = CASE WHEN retry_count + 1 >= $1 THEN 'failed' ELSE 'pending' END
        WHERE tenant_id = $2 AND outbox_id = $3;
      `;
      const res = await client.query(sqlText, [maxRetries, tenantId, outboxId]);
      if (res.rowCount === 0) {
        throw new Error(`Outbox message not found: ${outboxId}`);
      }
    });
  }
}
