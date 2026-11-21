#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../migrations');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Verification failed: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Verifying audit-service PostgreSQL 16 migrations...');

const upSqlPath = path.join(migrationsDir, '001_create_audit_ledger.up.sql');
const downSqlPath = path.join(migrationsDir, '001_create_audit_ledger.down.sql');

assert(fs.existsSync(upSqlPath), `Missing up migration: ${upSqlPath}`);
assert(fs.existsSync(downSqlPath), `Missing down migration: ${downSqlPath}`);

const upSql = fs.readFileSync(upSqlPath, 'utf8');
const downSql = fs.readFileSync(downSqlPath, 'utf8');

// 1. Verify Schema Creation
assert(upSql.includes('CREATE SCHEMA IF NOT EXISTS audit;'), 'Up migration must create schema audit');
assert(downSql.includes('DROP SCHEMA IF EXISTS audit CASCADE;'), 'Down migration must drop schema audit');

// 2. Verify audit.audit_records invariants
console.log('Checking audit.audit_records invariants...');
assert(upSql.includes('CREATE TABLE IF NOT EXISTS audit.audit_records'), 'Must create audit.audit_records');
assert(upSql.includes('receipt_id text NOT NULL CHECK (length(receipt_id) BETWEEN 8 AND 128)'), 'receipt_id check invariant missing');
assert(upSql.includes('tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128)'), 'tenant_id check invariant missing');
assert(upSql.includes('session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128)'), 'session_id check invariant missing');
assert(upSql.includes('aggregate_id text NOT NULL CHECK (length(aggregate_id) BETWEEN 1 AND 128)'), 'aggregate_id check invariant missing');
assert(upSql.includes('result text NOT NULL CHECK (result IN (\'accepted\', \'rejected\', \'failed\', \'unknown\', \'reconciled\'))'), 'result enum check missing');
assert(upSql.includes('policy_revision text NOT NULL CHECK (length(policy_revision) BETWEEN 1 AND 64)'), 'policy_revision check missing');
assert(upSql.includes('record_hash text NOT NULL CHECK (record_hash ~ \'^[a-f0-9]{64}$\')'), 'record_hash SHA-256 regex check missing');
assert(upSql.includes('prev_record_hash text NOT NULL CHECK (prev_record_hash ~ \'^[a-f0-9]{64}$\')'), 'prev_record_hash SHA-256 regex check missing');
assert(upSql.includes('sequence_num bigint NOT NULL CHECK (sequence_num >= 0)'), 'sequence_num check missing');
assert(upSql.includes('occurred_at_ms bigint NOT NULL CHECK (occurred_at_ms >= 0)'), 'occurred_at_ms check missing');
assert(upSql.includes('PRIMARY KEY (tenant_id, receipt_id)'), 'Composite primary key (tenant_id, receipt_id) missing');
assert(upSql.includes('UNIQUE (tenant_id, sequence_num)'), 'Unique constraint (tenant_id, sequence_num) missing');
assert(upSql.includes('UNIQUE (tenant_id, record_hash)'), 'Unique constraint (tenant_id, record_hash) missing');

// 3. Verify audit.audit_inbox invariants
console.log('Checking audit.audit_inbox invariants...');
assert(upSql.includes('CREATE TABLE IF NOT EXISTS audit.audit_inbox'), 'Must create audit.audit_inbox');
assert(upSql.includes('PRIMARY KEY (tenant_id, message_id)'), 'audit_inbox primary key missing');
assert(upSql.includes('UNIQUE (tenant_id, idempotency_key)'), 'audit_inbox idempotency key missing');

// 4. Verify audit.audit_outbox invariants
console.log('Checking audit.audit_outbox invariants...');
assert(upSql.includes('CREATE TABLE IF NOT EXISTS audit.audit_outbox'), 'Must create audit.audit_outbox');
assert(upSql.includes('PRIMARY KEY (tenant_id, id)'), 'audit_outbox primary key missing');

// 5. Verify RLS and Security on all tables
console.log('Checking Row-Level Security policies...');
for (const table of ['audit_records', 'audit_inbox', 'audit_outbox']) {
  assert(upSql.includes(`ALTER TABLE audit.${table} ENABLE ROW LEVEL SECURITY;`), `RLS not enabled on ${table}`);
  assert(upSql.includes(`ALTER TABLE audit.${table} FORCE ROW LEVEL SECURITY;`), `RLS not forced on ${table}`);
  assert(upSql.includes(`CREATE POLICY tenant_isolation_${table} ON audit.${table}`), `Policy tenant_isolation_${table} missing`);
}
assert(upSql.includes("current_setting('app.tenant_id', true)"), 'Tenant isolation must use current_setting');

// 6. Verify Down Migration reversibility
console.log('Checking teardown completeness...');
for (const table of ['audit_outbox', 'audit_inbox', 'audit_records']) {
  assert(downSql.includes(`DROP POLICY IF EXISTS tenant_isolation_${table} ON audit.${table};`), `Down script missing policy drop for ${table}`);
  assert(downSql.includes(`DROP TABLE IF EXISTS audit.${table} CASCADE;`), `Down script missing table drop for ${table}`);
}

console.log('✅ All PostgreSQL 16 migration invariants and RLS policies verified successfully.');
