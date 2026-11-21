/**
 * Identity and Session Service - PostgreSQL Persistence Repositories
 * Strictly maps domain records to identity_session.* tables.
 * Fails closed on SQL errors, enforces tenant isolation parameters.
 */

import { PrincipalRecord, SessionRecord, Role, Mode, SessionState } from '../domain/authentication.js';
import { PrincipalStore, SessionStore } from '../application/login.js';
import { SessionResolverSessionStore, SessionResolverPrincipalStore } from '../application/session-context.js';
import { LogoutSessionStore, LogoutOutboxStore, OutboxRecord } from '../application/logout.js';

export interface SqlQueryClient {
  query(text: string, values?: any[]): Promise<{ rows: any[] }>;
}

export class PostgresPrincipalRepository implements PrincipalStore, SessionResolverPrincipalStore {
  constructor(private readonly client: SqlQueryClient) {}

  async findByEmail(tenantId: string, email: string): Promise<PrincipalRecord | null> {
    const query = `
      SELECT principal_id, tenant_id, email, password_hash, role, enabled, mode
      FROM identity_session.principals
      WHERE tenant_id = $1 AND email = $2
      LIMIT 1;
    `;
    const res = await this.client.query(query, [tenantId, email]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      principalId: row.principal_id,
      tenantId: row.tenant_id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as Role,
      enabled: row.enabled,
      mode: row.mode as Mode,
    };
  }

  async findById(principalId: string): Promise<PrincipalRecord | null> {
    const query = `
      SELECT principal_id, tenant_id, email, password_hash, role, enabled, mode
      FROM identity_session.principals
      WHERE principal_id = $1
      LIMIT 1;
    `;
    const res = await this.client.query(query, [principalId]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      principalId: row.principal_id,
      tenantId: row.tenant_id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as Role,
      enabled: row.enabled,
      mode: row.mode as Mode,
    };
  }
}

export class PostgresSessionRepository implements SessionStore, SessionResolverSessionStore, LogoutSessionStore {
  constructor(private readonly client: SqlQueryClient) {}

  async createSession(session: SessionRecord): Promise<void> {
    const query = `
      INSERT INTO identity_session.sessions (
        session_id, principal_id, tenant_id, token_hash, state, mode,
        last_seen_at, expires_at, revoked_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
    `;
    await this.client.query(query, [
      session.sessionId,
      session.principalId,
      session.tenantId,
      session.tokenHash,
      session.state,
      session.mode,
      session.lastSeenAt,
      session.expiresAt,
      session.revokedAt,
      session.createdAt,
    ]);
  }

  async findByTokenHash(hash: Buffer): Promise<SessionRecord | null> {
    const query = `
      SELECT session_id, principal_id, tenant_id, token_hash, state, mode,
             last_seen_at, expires_at, revoked_at, created_at
      FROM identity_session.sessions
      WHERE token_hash = $1
      LIMIT 1;
    `;
    const res = await this.client.query(query, [hash]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      sessionId: row.session_id,
      principalId: row.principal_id,
      tenantId: row.tenant_id,
      tokenHash: row.token_hash,
      state: row.state as SessionState,
      mode: row.mode as Mode,
      lastSeenAt: new Date(row.last_seen_at),
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
      createdAt: new Date(row.created_at),
    };
  }

  async touchSession(sessionId: string, lastSeenAt: Date): Promise<void> {
    const query = `
      UPDATE identity_session.sessions
      SET last_seen_at = $1
      WHERE session_id = $2;
    `;
    await this.client.query(query, [lastSeenAt, sessionId]);
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    const query = `
      UPDATE identity_session.sessions
      SET state = 'revoked', revoked_at = $1
      WHERE session_id = $2;
    `;
    await this.client.query(query, [revokedAt, sessionId]);
  }
}

export class PostgresOutboxRepository implements LogoutOutboxStore {
  constructor(private readonly client: SqlQueryClient) {}

  async writeEvent(record: OutboxRecord): Promise<void> {
    const query = `
      INSERT INTO identity_session.outbox (
        outbox_id, aggregate_id, event_type, payload, correlation_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6);
    `;
    await this.client.query(query, [
      record.outboxId,
      record.aggregateId,
      record.eventType,
      JSON.stringify(record.payload),
      record.correlationId,
      record.createdAt,
    ]);
  }
}
