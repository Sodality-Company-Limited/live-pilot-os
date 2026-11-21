import type { PoolClient } from 'pg';
import { DatabasePoolManager } from '../persistence/database.ts';
import type { EmergencyPauseRecord, EmergencyPauseScope } from '../persistence/types.ts';
import { EmergencyPauseEngine, type PauseCommand } from '../domain/emergencyPauseEngine.ts';

export interface SetPauseInput {
  scope: EmergencyPauseScope;
  tenant_id: string;
  session_id: string;
  is_paused: boolean;
  triggered_by: string;
  reason?: string | null;
  actor_role?: string;
  triggered_at_ms?: number;
}

export class EmergencyPauseRepository {
  private readonly db: DatabasePoolManager;

  constructor(db: DatabasePoolManager) {
    if (!db) {
      throw new Error('DatabasePoolManager is required');
    }
    this.db = db;
  }

  /**
   * Fetch all emergency pause records relevant to a tenant and session,
   * including GLOBAL, TENANT, and SESSION scopes.
   */
  async getPausesForContext(
    tenant_id: string,
    session_id: string,
    client?: PoolClient
  ): Promise<EmergencyPauseRecord[]> {
    const query = async (c: PoolClient) => {
      // Emergency pauses table RLS permits tenant_id = current_setting('app.tenant_id').
      // For GLOBAL or tenant records, we query matching tenant_id.
      const sql = `
        SELECT * FROM approval.emergency_pauses
        WHERE tenant_id = $1 AND (session_id = $2 OR scope IN ('TENANT', 'GLOBAL'));
      `;
      const res = await c.query(sql, [tenant_id, session_id]);
      return res.rows.map((row) => this.mapPauseRow(row));
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(tenant_id, query);
  }

  /**
   * Determine if emergency pause is currently active for context.
   */
  async isPaused(
    tenant_id: string,
    session_id: string,
    client?: PoolClient
  ): Promise<boolean> {
    const records = await this.getPausesForContext(tenant_id, session_id, client);
    return EmergencyPauseEngine.isPaused({ tenantId: tenant_id, sessionId: session_id }, records);
  }

  /**
   * Set emergency pause state (activate or deactivate) with domain invariant verification.
   */
  async setPauseState(
    input: SetPauseInput,
    client?: PoolClient
  ): Promise<EmergencyPauseRecord> {
    const execute = async (c: PoolClient) => {
      const now = input.triggered_at_ms || Date.now();

      // Check domain authorization via EmergencyPauseEngine
      const cmd: PauseCommand = {
        scope: input.scope,
        tenantId: input.tenant_id,
        sessionId: input.session_id,
        isPaused: input.is_paused,
        triggeredBy: input.triggered_by,
        currentTimeMs: now,
        reason: input.reason,
        actorRole: input.actor_role,
      };

      const evaluated = EmergencyPauseEngine.transitionPause(cmd);

      // Upsert emergency_pauses record
      const sql = `
        INSERT INTO approval.emergency_pauses (
          scope, tenant_id, session_id, is_paused, reason,
          triggered_by, triggered_at_ms, updated_at_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tenant_id, session_id, scope)
        DO UPDATE SET
          is_paused = EXCLUDED.is_paused,
          reason = EXCLUDED.reason,
          triggered_by = EXCLUDED.triggered_by,
          updated_at_ms = EXCLUDED.updated_at_ms
        RETURNING *;
      `;

      const res = await c.query(sql, [
        evaluated.scope,
        evaluated.tenant_id,
        evaluated.session_id,
        evaluated.is_paused,
        evaluated.reason ?? null,
        evaluated.triggered_by,
        evaluated.triggered_at_ms,
        evaluated.updated_at_ms,
      ]);

      return this.mapPauseRow(res.rows[0]);
    };

    if (client) {
      return execute(client);
    }
    return this.db.withTenantTransaction(input.tenant_id, execute);
  }

  private mapPauseRow(row: any): EmergencyPauseRecord {
    return {
      scope: row.scope,
      tenant_id: row.tenant_id,
      session_id: row.session_id,
      is_paused: Boolean(row.is_paused),
      reason: row.reason,
      triggered_by: row.triggered_by,
      triggered_at_ms: Number(row.triggered_at_ms),
      updated_at_ms: Number(row.updated_at_ms),
    };
  }
}
