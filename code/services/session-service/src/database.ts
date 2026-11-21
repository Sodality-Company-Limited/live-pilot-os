import { Kysely, PostgresDialect, Transaction, sql } from 'kysely';
import { Pool } from 'pg';

export type SessionState = 'created' | 'active' | 'paused' | 'ended';
export type InboxStatus = 'received' | 'processed' | 'failed' | 'dead_letter';
export type OutboxStatus = 'pending' | 'published' | 'failed';
export type IdempotencyStatus = 'pending' | 'completed' | 'failed';

export interface SessionTable {
  tenant_id: string;
  session_id: string;
  state: SessionState;
  expected_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface SessionTransitionTable {
  transition_id: string;
  tenant_id: string;
  session_id: string;
  from_state: 'created' | 'active' | 'paused';
  to_state: 'active' | 'paused' | 'ended';
  version: number;
  actor_id: string;
  reason: string | null;
  occurred_at: Date;
}

export interface InboxTable {
  message_id: string;
  tenant_id: string;
  session_id: string;
  subject: string;
  payload: unknown;
  received_at: Date;
  processed_at: Date | null;
  status: InboxStatus;
}

export interface OutboxTable {
  outbox_id: string;
  tenant_id: string;
  session_id: string;
  event_type: string;
  subject: string;
  payload: unknown;
  headers: unknown;
  created_at: Date;
  published_at: Date | null;
  status: OutboxStatus;
}

export interface IdempotencyKeyTable {
  idempotency_key: string;
  tenant_id: string;
  session_id: string;
  semantic_fingerprint: string;
  response_payload: unknown | null;
  status: IdempotencyStatus;
  created_at: Date;
  expires_at: Date;
}

export interface DatabaseSchema {
  'session.sessions': SessionTable;
  'session.session_transitions': SessionTransitionTable;
  'session.inbox': InboxTable;
  'session.outbox': OutboxTable;
  'session.idempotency_keys': IdempotencyKeyTable;
}

export function createDatabase(databaseUrl = process.env.DATABASE_URL): Kysely<DatabaseSchema> {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to create the session-service database connection');
  }

  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({ pool: new Pool({ connectionString: databaseUrl }) }),
  });
}

/**
 * Execute work inside a tenant-isolated database transaction boundary.
 * Enforces PostgreSQL session setting `app.tenant_id` for Row-Level Security (RLS).
 */
export async function withTenantTransaction<T>(
  db: Kysely<DatabaseSchema>,
  tenantId: string,
  callback: (trx: Transaction<DatabaseSchema>) => Promise<T>
): Promise<T> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('Tenant ID is required for tenant-isolated transaction');
  }

  return db.transaction().execute(async (trx) => {
    // Set PostgreSQL session variable for RLS
    await sql`SET LOCAL app.tenant_id = ${sql.val(tenantId)}`.execute(trx);
    return callback(trx);
  });
}
