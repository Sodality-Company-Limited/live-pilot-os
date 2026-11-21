import type { PoolClient } from 'pg';
import { DatabasePoolManager } from '../persistence/database.ts';
import type { ApprovalModeRecord, ControlMode } from '../persistence/types.ts';
import {
  ApprovalModeEngine,
  type ModeTransitionCommand,
} from '../domain/approvalModeEngine.ts';

export interface SetModeInput {
  tenant_id: string;
  session_id: string;
  target_mode: ControlMode;
  updated_by: string;
  actor_roles: readonly string[];
  actor_capabilities: readonly string[];
  updated_at_ms?: number;
}

export class ApprovalModeRepository {
  private readonly db: DatabasePoolManager;

  constructor(db: DatabasePoolManager) {
    if (!db) {
      throw new Error('DatabasePoolManager is required');
    }
    this.db = db;
  }

  /**
   * Get current approval mode for a tenant and session.
   * If record does not exist, returns default RECOMMEND_ONLY.
   */
  async getMode(
    tenant_id: string,
    session_id: string,
    client?: PoolClient
  ): Promise<ApprovalModeRecord> {
    const query = async (c: PoolClient) => {
      const sql = `
        SELECT * FROM approval.approval_modes
        WHERE tenant_id = $1 AND session_id = $2;
      `;
      const res = await c.query(sql, [tenant_id, session_id]);
      if (res.rows.length === 0) {
        return ApprovalModeEngine.createDefaultMode(tenant_id, session_id, 'system', Date.now());
      }
      return this.mapModeRow(res.rows[0]);
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(tenant_id, query);
  }

  /**
   * Update approval mode with domain authorization checks.
   */
  async updateMode(
    input: SetModeInput,
    client?: PoolClient
  ): Promise<ApprovalModeRecord> {
    const execute = async (c: PoolClient) => {
      const now = input.updated_at_ms || Date.now();

      // 1. Fetch current mode for optimistic/domain validation
      const current = await this.getMode(input.tenant_id, input.session_id, c);

      // 2. Validate domain transition
      const cmd: ModeTransitionCommand = {
        tenantId: input.tenant_id,
        sessionId: input.session_id,
        targetMode: input.target_mode,
        updatedBy: input.updated_by,
        currentTimeMs: now,
        actorRoles: input.actor_roles,
        actorCapabilities: input.actor_capabilities,
      };

      const updated = ApprovalModeEngine.transitionMode(current, cmd);

      // 3. Upsert mode in database
      const sql = `
        INSERT INTO approval.approval_modes (
          tenant_id, session_id, mode, updated_by, updated_at_ms
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, session_id)
        DO UPDATE SET
          mode = EXCLUDED.mode,
          updated_by = EXCLUDED.updated_by,
          updated_at_ms = EXCLUDED.updated_at_ms
        RETURNING *;
      `;

      const res = await c.query(sql, [
        updated.tenant_id,
        updated.session_id,
        updated.mode,
        updated.updated_by,
        updated.updated_at_ms,
      ]);

      return this.mapModeRow(res.rows[0]);
    };

    if (client) {
      return execute(client);
    }
    return this.db.withTenantTransaction(input.tenant_id, execute);
  }

  private mapModeRow(row: any): ApprovalModeRecord {
    return {
      tenant_id: row.tenant_id,
      session_id: row.session_id,
      mode: row.mode,
      updated_by: row.updated_by,
      updated_at_ms: Number(row.updated_at_ms),
    };
  }
}
