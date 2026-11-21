import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const upPath = resolve(new URL('.', import.meta.url).pathname, '../migrations/001_session_state.up.sql');
const downPath = resolve(new URL('.', import.meta.url).pathname, '../migrations/001_session_state.down.sql');

const upSql = await readFile(upPath, 'utf8');
const downSql = await readFile(downPath, 'utf8');

const requiredTables = [
  'session.sessions',
  'session.session_transitions',
  'session.inbox',
  'session.outbox',
  'session.idempotency_keys'
];

for (const table of requiredTables) {
  if (!upSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
    throw new Error(`Migration missing table declaration: ${table}`);
  }
}

if (!upSql.includes('ROW LEVEL SECURITY') || !upSql.includes('app.tenant_id')) {
  throw new Error('Migration missing Row-Level Security tenant isolation policies');
}

if (!downSql.includes('DROP SCHEMA IF EXISTS session')) {
  throw new Error('Down migration must drop schema');
}

console.log('G-CORE-051: Session Service Persistence & RLS Schema Verification PASSED');
