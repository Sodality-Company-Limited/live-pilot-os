import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const up = await readFile(join(root, 'migrations/001_session_state.up.sql'), 'utf8');
const down = await readFile(join(root, 'migrations/001_session_state.down.sql'), 'utf8');
const databaseTs = await readFile(join(root, 'src/database.ts'), 'utf8');

// Invariant 1: Up migration schema & tables
const requiredTables = [
  'session.sessions',
  'session.session_transitions',
  'session.inbox',
  'session.outbox',
  'session.idempotency_keys'
];

for (const tbl of requiredTables) {
  assert.match(up, new RegExp(`CREATE TABLE IF NOT EXISTS ${tbl.replace('.', '\\.')}`), `missing table: ${tbl}`);
  assert.match(up, new RegExp(`ALTER TABLE ${tbl.replace('.', '\\.')} ENABLE ROW LEVEL SECURITY`), `missing ENABLE RLS on: ${tbl}`);
  assert.match(up, new RegExp(`ALTER TABLE ${tbl.replace('.', '\\.')} FORCE ROW LEVEL SECURITY`), `missing FORCE RLS on: ${tbl}`);
  assert.match(up, new RegExp(`REVOKE ALL ON ${tbl.replace('.', '\\.')} FROM PUBLIC`), `missing REVOKE ALL on: ${tbl}`);
}

// Invariant 2: Multi-tenancy RLS policy logic
assert.match(up, /current_setting\('app\.tenant_id', true\)/, 'missing app.tenant_id current_setting reference');

// Invariant 3: Down migration cleans up completely
for (const tbl of requiredTables) {
  assert.match(down, new RegExp(`DROP TABLE IF EXISTS ${tbl.replace('.', '\\.')}`), `missing DROP TABLE: ${tbl}`);
}
assert.match(down, /DROP SCHEMA IF EXISTS session/, 'missing DROP SCHEMA in down migration');

// Invariant 4: Kysely TypeScript interfaces in database.ts
assert.match(databaseTs, /export interface SessionTable/, 'missing SessionTable interface');
assert.match(databaseTs, /export interface SessionTransitionTable/, 'missing SessionTransitionTable interface');
assert.match(databaseTs, /export interface InboxTable/, 'missing InboxTable interface');
assert.match(databaseTs, /export interface OutboxTable/, 'missing OutboxTable interface');
assert.match(databaseTs, /export interface IdempotencyKeyTable/, 'missing IdempotencyKeyTable interface');
assert.match(databaseTs, /export interface DatabaseSchema/, 'missing DatabaseSchema interface');
assert.match(databaseTs, /withTenantTransaction/, 'missing withTenantTransaction helper');

console.log('session-service persistence invariants: PASS');
