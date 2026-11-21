import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const migrationPath = resolve(new URL('.', import.meta.url).pathname, '../migrations/001_session_state.up.sql');
const migration = await readFile(migrationPath, 'utf8');
if (!migration.includes('CREATE TABLE IF NOT EXISTS session.sessions')) {
  throw new Error('session migration does not define session.sessions');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for real migration verification');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(migration);
  const result = await client.query("SELECT to_regclass('session.sessions') AS table_name");
  if (result.rows[0]?.table_name !== 'session.sessions') {
    throw new Error('session.sessions was not created by the migration');
  }
  await client.query('ROLLBACK');
} finally {
  await client.end();
}

console.log('session migration verified against PostgreSQL');
