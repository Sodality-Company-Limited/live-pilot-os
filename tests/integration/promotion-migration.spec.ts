import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { PROMOTION_RETENTION_INDEXES, PROMOTION_TABLES } from '../../code/apps/services/promotion-service/src/persistence/schema.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationPath = resolve(repositoryRoot, 'code/apps/services/promotion-service/db/migrations/001_promotion.sql');

test('Promotion migration defines the authoritative aggregate and durable delivery records', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  for (const table of Object.values(PROMOTION_TABLES)) {
    assert.match(sql, new RegExp(`CREATE TABLE ${table}\\s*\\(`));
  }
  assert.match(sql, /promotion_aggregate[\s\S]*PRIMARY KEY/);
  assert.match(sql, /promotion_transition_history[\s\S]*UNIQUE \(promotion_id, resource_version\)/);
  assert.match(sql, /promotion_inbox[\s\S]*message_id text PRIMARY KEY/);
  assert.match(sql, /promotion_outbox[\s\S]*UNIQUE \(aggregate_id, resource_version, event_type\)/);
  assert.match(sql, /promotion_idempotency_record[\s\S]*PRIMARY KEY \(tenant_id, idempotency_key\)/);
});

test('Promotion migration encodes fail-closed state, lineage, optimistic version, and retention constraints', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  for (const status of ['proposed', 'pending', 'approved', 'issued', 'rejected', 'expired', 'cancelled', 'unknown']) {
    assert.match(sql, new RegExp(status));
  }
  for (const column of ['tenant_id', 'session_id', 'schema_version', 'correlation_id', 'causation_id']) {
    assert.ok(sql.includes(column), `missing lineage column: ${column}`);
  }
  assert.match(sql, /resource_version bigint NOT NULL[^;]*CHECK \(resource_version > 0\)/s);
  assert.match(sql, /request_fingerprint text NOT NULL CHECK \(request_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  for (const index of PROMOTION_RETENTION_INDEXES) assert.match(sql, new RegExp(`CREATE INDEX ${index}`));
  assert.match(sql, /retention_until timestamptz NOT NULL/);
  assert.match(sql, /expires_at timestamptz NOT NULL/);
});

test('Promotion migration is transactional and non-destructive', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const executableSql = sql.replace(/^--.*$/gm, '').trim();

  assert.match(executableSql, /^BEGIN;[\s\S]*COMMIT;$/);
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|ALTER SYSTEM)\b/i);
});
