/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ LivePilot Margin Policy Service - Storage Repository & Outbox Boundary
 * ════════════════════════════════════════════════════════════════════════════════
 * Supports dual-mode: Real PostgreSQL client or in-memory ACID simulation
 * for deterministic zero-mock execution and verification.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'node:crypto';

export class MarginRepository {
  /**
   * @param {Object} [options]
   * @param {any} [options.pgPool] - Optional real pg Pool / Client
   */
  constructor(options = {}) {
    this.pgPool = options.pgPool || null;

    // In-memory relational tables for deterministic verification
    this.policies = new Map();
    this.verdicts = new Map();
    this.outbox = [];
    this.inbox = new Map();
    this.idempotencyRecords = new Map();
  }

  /**
   * Seeds or saves a policy
   */
  async savePolicy(policy) {
    if (this.pgPool) {
      const res = await this.pgPool.query(
        `INSERT INTO margin_policies (
          policy_id, tenant_id, policy_name, version, floor_bps, auto_approve_threshold_minor, currency, scale, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, policy_name, version) DO UPDATE SET
          floor_bps = EXCLUDED.floor_bps,
          auto_approve_threshold_minor = EXCLUDED.auto_approve_threshold_minor,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          policy.policy_id || randomUUID(),
          policy.tenant_id,
          policy.policy_name,
          policy.version || 1,
          policy.floor_bps,
          policy.auto_approve_threshold_minor,
          policy.currency || 'THB',
          policy.scale ?? 2,
          policy.is_active ?? true
        ]
      );
      return res.rows[0];
    }

    const key = `${policy.tenant_id}:${policy.policy_name}:${policy.version || 1}`;
    const record = {
      policy_id: policy.policy_id || randomUUID(),
      tenant_id: policy.tenant_id,
      policy_name: policy.policy_name,
      version: policy.version || 1,
      floor_bps: policy.floor_bps,
      review_band_bps: policy.review_band_bps !== undefined ? policy.review_band_bps : null,
      auto_approve_threshold_minor: BigInt(policy.auto_approve_threshold_minor),
      currency: policy.currency || 'THB',
      scale: policy.scale ?? 2,
      is_active: policy.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.policies.set(key, record);
    return record;
  }

  /**
   * Finds active policy by tenant and name
   */
  async findActivePolicy(tenant_id, policy_name = 'default_margin_policy') {
    if (this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT * FROM margin_policies 
         WHERE tenant_id = $1 AND policy_name = $2 AND is_active = TRUE 
         ORDER BY version DESC LIMIT 1`,
        [tenant_id, policy_name]
      );
      return res.rows[0] || null;
    }

    let found = null;
    for (const p of this.policies.values()) {
      if (p.tenant_id === tenant_id && p.policy_name === policy_name && p.is_active) {
        if (!found || p.version > found.version) {
          found = p;
        }
      }
    }
    return found;
  }

  /**
   * Check idempotency record
   */
  async getIdempotencyRecord(tenant_id, idempotency_key) {
    if (this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT * FROM margin_idempotency_records WHERE tenant_id = $1 AND idempotency_key = $2`,
        [tenant_id, idempotency_key]
      );
      return res.rows[0] || null;
    }
    const key = `${tenant_id}:${idempotency_key}`;
    return this.idempotencyRecords.get(key) || null;
  }

  /**
   * Atomically saves verdict and outbox event in the same transaction
   */
  async recordVerdictWithOutbox(verdict, outboxEvent, idempotencyRecord = null) {
    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL app.tenant_id = '${verdict.tenant_id}'`);

        // Insert Verdict
        const vRes = await client.query(
          `INSERT INTO margin_verdicts (
            verdict_id, tenant_id, live_session_id, product_id, sku,
            policy_id, policy_version, status,
            price_minor, candidate_discount_minor, cogs_minor, platform_fee_minor, shipping_fee_minor,
            net_margin_minor, margin_bps, floor_bps,
            safer_alternative_discount_minor, safer_alternative_margin_bps,
            currency, scale, idempotency_key, correlation_id, causation_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
          ) RETURNING *`,
          [
            verdict.verdict_id || randomUUID(),
            verdict.tenant_id,
            verdict.live_session_id,
            verdict.product_id,
            verdict.sku,
            verdict.policy_id,
            verdict.policy_version,
            verdict.status,
            verdict.price_minor,
            verdict.candidate_discount_minor,
            verdict.cogs_minor,
            verdict.platform_fee_minor,
            verdict.shipping_fee_minor,
            verdict.net_margin_minor,
            verdict.margin_bps,
            verdict.floor_bps,
            verdict.safer_alternative_discount_minor,
            verdict.safer_alternative_margin_bps,
            verdict.currency,
            verdict.scale,
            verdict.idempotency_key,
            verdict.correlation_id,
            verdict.causation_id
          ]
        );

        // Insert Outbox
        const oRes = await client.query(
          `INSERT INTO margin_outbox (
            event_id, tenant_id, subject, payload, headers, status
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [
            outboxEvent.event_id || randomUUID(),
            verdict.tenant_id,
            outboxEvent.subject,
            JSON.stringify(outboxEvent.payload),
            JSON.stringify(outboxEvent.headers || {}),
            'PENDING'
          ]
        );

        // Insert Idempotency if provided
        if (idempotencyRecord) {
          await client.query(
            `INSERT INTO margin_idempotency_records (
              idempotency_key, tenant_id, request_hash, response_payload, status_code
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              idempotencyRecord.idempotency_key,
              idempotencyRecord.tenant_id,
              idempotencyRecord.request_hash,
              JSON.stringify(idempotencyRecord.response_payload),
              idempotencyRecord.status_code || 200
            ]
          );
        }

        await client.query('COMMIT');
        return {
          verdict: vRes.rows[0],
          outbox: oRes.rows[0]
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory atomic write
    const verdict_id = verdict.verdict_id || randomUUID();
    const verdictRecord = {
      ...verdict,
      verdict_id,
      created_at: new Date()
    };

    const event_id = outboxEvent.event_id || randomUUID();
    const outboxRecord = {
      id: this.outbox.length + 1,
      event_id,
      tenant_id: verdict.tenant_id,
      subject: outboxEvent.subject,
      payload: outboxEvent.payload,
      headers: outboxEvent.headers || {},
      status: 'PENDING',
      retry_count: 0,
      created_at: new Date(),
      published_at: null
    };

    this.verdicts.set(verdict_id, verdictRecord);
    this.outbox.push(outboxRecord);

    if (idempotencyRecord) {
      const key = `${idempotencyRecord.tenant_id}:${idempotencyRecord.idempotency_key}`;
      this.idempotencyRecords.set(key, {
        ...idempotencyRecord,
        created_at: new Date()
      });
    }

    return {
      verdict: verdictRecord,
      outbox: outboxRecord
    };
  }

  /**
   * Returns pending outbox events
   */
  async getPendingOutbox(tenant_id) {
    if (this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT * FROM margin_outbox WHERE tenant_id = $1 AND status = 'PENDING' ORDER BY created_at ASC`,
        [tenant_id]
      );
      return res.rows;
    }
    return this.outbox.filter(item => item.tenant_id === tenant_id && item.status === 'PENDING');
  }

  /**
   * Mark outbox event published
   */
  async markOutboxPublished(event_id) {
    if (this.pgPool) {
      await this.pgPool.query(
        `UPDATE margin_outbox SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP WHERE event_id = $1`,
        [event_id]
      );
      return;
    }
    const item = this.outbox.find(o => o.event_id === event_id);
    if (item) {
      item.status = 'PUBLISHED';
      item.published_at = new Date();
    }
  }

  /**
   * Records a Dead Letter Queue event in the outbox
   */
  async recordDlqEvent(dlqEvent) {
    if (this.pgPool) {
      const res = await this.pgPool.query(
        `INSERT INTO margin_outbox (
          event_id, tenant_id, subject, payload, headers, status
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          dlqEvent.event_id || randomUUID(),
          dlqEvent.headers?.['x-tenant-id'] || 'system_unknown',
          dlqEvent.subject,
          JSON.stringify(dlqEvent.payload),
          JSON.stringify(dlqEvent.headers || {}),
          'DEAD_LETTER'
        ]
      );
      return res.rows[0];
    }

    const outboxRecord = {
      id: this.outbox.length + 1,
      event_id: dlqEvent.event_id || randomUUID(),
      tenant_id: dlqEvent.headers?.['x-tenant-id'] || 'system_unknown',
      subject: dlqEvent.subject,
      payload: dlqEvent.payload,
      headers: dlqEvent.headers || {},
      status: 'DEAD_LETTER',
      retry_count: 0,
      created_at: new Date(),
      published_at: null
    };

    this.outbox.push(outboxRecord);
    return outboxRecord;
  }
}
