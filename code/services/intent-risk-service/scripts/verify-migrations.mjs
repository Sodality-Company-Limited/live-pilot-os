import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const upPath = resolve(new URL('.', import.meta.url).pathname, '../migrations/001_create_intent_risk_schema.up.sql');
const downPath = resolve(new URL('.', import.meta.url).pathname, '../migrations/001_create_intent_risk_schema.down.sql');

const upSql = await readFile(upPath, 'utf8');
const downSql = await readFile(downPath, 'utf8');

const requiredTables = [
  'intent_risk.intent_facts',
  'intent_risk.risk_facts',
  'intent_risk.outbox',
  'intent_risk.idempotency_keys'
];

for (const table of requiredTables) {
  if (!upSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
    throw new Error(`Migration missing table declaration: ${table}`);
  }
}

if (!upSql.includes('ROW LEVEL SECURITY') || !upSql.includes('app.tenant_id')) {
  throw new Error('Migration missing Row-Level Security tenant isolation policies');
}

if (!downSql.includes('DROP SCHEMA IF EXISTS intent_risk')) {
  throw new Error('Down migration must safely drop schema');
}

console.log('G-CORE-067: Intent/Risk Persistence and RLS Migration Verification PASSED');
