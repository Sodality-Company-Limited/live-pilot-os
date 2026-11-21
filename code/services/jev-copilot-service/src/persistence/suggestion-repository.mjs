// Suggestion repository for jev-copilot-service
// Manages JevSuggestion aggregate persistence with optimistic concurrency control,
// provider receipts, and atomic transactional outbox generation.

import { JevPersistenceConnection } from './connection.mjs';

export class SuggestionRepository {
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
   * Save a new grounded suggestion aggregate along with its optional provider receipt
   * and transactional outbox event inside a single atomic database transaction.
   * @param {object} suggestion
   * @param {object|null} receipt
   * @param {object|null} outboxEvent
   * @returns {Promise<object>}
   */
  async createSuggestionWithOutbox(suggestion, receipt, outboxEvent) {
    this.validateSuggestion(suggestion);

    return this.connection.withTenantTransaction(suggestion.tenant_id, async (client) => {
      // 1. Insert Suggestion Aggregate
      const insertSql = `
        INSERT INTO jev.jev_suggestions (
          suggestion_id, tenant_id, live_session_id, suggestion_type, status,
          content_payload, evidence_refs, confidence_basis_points, freshness_expires_at,
          aggregate_version, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      const createdAt = suggestion.created_at || new Date().toISOString();
      const updatedAt = suggestion.updated_at || createdAt;
      const initialVersion = suggestion.aggregate_version || 1;

      const res = await client.query(insertSql, [
        suggestion.suggestion_id,
        suggestion.tenant_id,
        suggestion.live_session_id,
        suggestion.suggestion_type,
        suggestion.status,
        JSON.stringify(suggestion.content_payload),
        JSON.stringify(suggestion.evidence_refs),
        suggestion.confidence_basis_points,
        suggestion.freshness_expires_at,
        initialVersion,
        createdAt,
        updatedAt
      ]);

      // 2. Insert Provider Receipt if provided
      if (receipt) {
        this.validateReceipt(receipt);
        const receiptSql = `
          INSERT INTO jev.jev_provider_receipts (
            receipt_id, suggestion_id, tenant_id, live_session_id,
            provider_name, model_version, prompt_template_id, prompt_revision,
            outcome, input_tokens, output_tokens, cached_tokens, latency_ms,
            cost_minor, cost_currency, cost_scale, raw_input_digest, raw_output_digest, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);
        `;
        await client.query(receiptSql, [
          receipt.receipt_id,
          suggestion.suggestion_id,
          suggestion.tenant_id,
          suggestion.live_session_id,
          receipt.provider_name,
          receipt.model_version,
          receipt.prompt_template_id,
          receipt.prompt_revision,
          receipt.outcome,
          receipt.input_tokens,
          receipt.output_tokens,
          receipt.cached_tokens,
          receipt.latency_ms,
          receipt.cost_minor.toString(),
          receipt.cost_currency || 'USD',
          receipt.cost_scale ?? 6,
          receipt.raw_input_digest,
          receipt.raw_output_digest,
          receipt.created_at || createdAt
        ]);
      }

      // 3. Insert Outbox Event if provided
      if (outboxEvent) {
        const outboxSql = `
          INSERT INTO jev.jev_outbox (
            outbox_id, tenant_id, live_session_id, event_type, subject,
            payload, headers, status, retry_count, occurred_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, $8, $9);
        `;
        await client.query(outboxSql, [
          outboxEvent.outbox_id,
          suggestion.tenant_id,
          suggestion.live_session_id,
          outboxEvent.event_type,
          outboxEvent.subject,
          JSON.stringify(outboxEvent.payload),
          JSON.stringify(outboxEvent.headers),
          outboxEvent.occurred_at || createdAt,
          createdAt
        ]);
      }

      return res.rows[0];
    });
  }

  /**
   * Update suggestion status with optimistic concurrency control (version lock).
   * Appends an outbox event atomically.
   * @param {string} tenantId
   * @param {string} suggestionId
   * @param {number} expectedVersion
   * @param {string} newStatus
   * @param {object|null} outboxEvent
   * @returns {Promise<object>}
   */
  async updateSuggestionStatusWithOutbox(tenantId, suggestionId, expectedVersion, newStatus, outboxEvent) {
    return this.connection.withTenantTransaction(tenantId, async (client) => {
      const nextVersion = expectedVersion + 1;
      const now = new Date().toISOString();

      const updateSql = `
        UPDATE jev.jev_suggestions
        SET status = $1, aggregate_version = $2, updated_at = $3
        WHERE tenant_id = $4 AND suggestion_id = $5 AND aggregate_version = $6
        RETURNING *;
      `;

      const res = await client.query(updateSql, [
        newStatus,
        nextVersion,
        now,
        tenantId,
        suggestionId,
        expectedVersion
      ]);

      if (res.rowCount === 0) {
        throw new Error(
          `RESOURCE_VERSION_CONFLICT: Optimistic lock conflict for suggestion ${suggestionId} with expected version ${expectedVersion}`
        );
      }

      const updatedRecord = res.rows[0];

      if (outboxEvent) {
        const outboxSql = `
          INSERT INTO jev.jev_outbox (
            outbox_id, tenant_id, live_session_id, event_type, subject,
            payload, headers, status, retry_count, occurred_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, $8, $9);
        `;
        await client.query(outboxSql, [
          outboxEvent.outbox_id,
          tenantId,
          updatedRecord.live_session_id,
          outboxEvent.event_type,
          outboxEvent.subject,
          JSON.stringify(outboxEvent.payload),
          JSON.stringify(outboxEvent.headers),
          outboxEvent.occurred_at || now,
          now
        ]);
      }

      return updatedRecord;
    });
  }

  /**
   * @param {string} tenantId
   * @param {string} suggestionId
   * @returns {Promise<object|null>}
   */
  async findById(tenantId, suggestionId) {
    return this.connection.withTenantTransaction(tenantId, async (client) => {
      const sqlText = `
        SELECT * FROM jev.jev_suggestions
        WHERE tenant_id = $1 AND suggestion_id = $2;
      `;
      const res = await client.query(sqlText, [tenantId, suggestionId]);
      return res.rows.length > 0 ? res.rows[0] : null;
    });
  }

  /**
   * @param {string} tenantId
   * @param {string} liveSessionId
   * @param {string} [status]
   * @returns {Promise<object[]>}
   */
  async findBySession(tenantId, liveSessionId, status) {
    return this.connection.withTenantTransaction(tenantId, async (client) => {
      let sqlText = `
        SELECT * FROM jev.jev_suggestions
        WHERE tenant_id = $1 AND live_session_id = $2
      `;
      const params = [tenantId, liveSessionId];

      if (status) {
        sqlText += ` AND status = $3`;
        params.push(status);
      }

      sqlText += ` ORDER BY created_at DESC;`;
      const res = await client.query(sqlText, params);
      return res.rows;
    });
  }

  validateSuggestion(s) {
    if (!s.suggestion_id || !s.tenant_id || !s.live_session_id) {
      throw new Error('suggestion_id, tenant_id, and live_session_id are required');
    }
    if (typeof s.confidence_basis_points !== 'number' || s.confidence_basis_points < 0 || s.confidence_basis_points > 10000) {
      throw new Error('confidence_basis_points must be an integer between 0 and 10000');
    }
    if (!s.freshness_expires_at) {
      throw new Error('freshness_expires_at is required');
    }
  }

  validateReceipt(r) {
    if (!r.receipt_id || !r.provider_name || !r.model_version) {
      throw new Error('receipt_id, provider_name, and model_version are required');
    }
    if (typeof r.cost_minor !== 'bigint' && typeof r.cost_minor !== 'number') {
      throw new Error('cost_minor must be an integer');
    }
  }
}
