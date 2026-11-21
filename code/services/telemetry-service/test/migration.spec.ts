import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  splitSqlStatements,
  verifyMigrationPair,
  runVerification,
} from '../scripts/verify-migrations.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const upPath = resolve(here, '../migrations/001_create_telemetry_signals.up.sql');
const downPath = resolve(here, '../migrations/001_create_telemetry_signals.down.sql');

describe('G-TELM-003: Telemetry Persistence Migration Verification', () => {
  it('validates up and down migrations for SQL syntax, RLS, constraints, and idempotency', async () => {
    const { structuralSummary } = await runVerification();

    assert.equal(structuralSummary.tables.length, 4);
    assert.deepEqual(structuralSummary.tables, [
      'telemetry.telemetry_signals',
      'telemetry.telemetry_lineage',
      'telemetry.telemetry_inbox',
      'telemetry.telemetry_outbox',
    ]);
    assert.equal(structuralSummary.rlsTables.length, 4);
    assert.ok(structuralSummary.upStatementCount >= 25);
    assert.ok(structuralSummary.downStatementCount >= 15);
  });

  it('rejects unbalanced parentheses or unterminated statements fail-closed', () => {
    assert.throws(
      () => splitSqlStatements('CREATE TABLE telemetry.broken (id text;'),
      /Unbalanced parentheses/
    );
    assert.throws(
      () => splitSqlStatements("SELECT 'unterminated;"),
      /Unclosed single-quoted string/
    );
    assert.throws(
      () => splitSqlStatements('CREATE SCHEMA IF NOT EXISTS telemetry'),
      /Unterminated SQL statement/
    );
  });

  it('rejects non-idempotent DDL lacking IF NOT EXISTS or DROP POLICY IF EXISTS', async () => {
    const upSql = await readFile(upPath, 'utf8');
    const downSql = await readFile(downPath, 'utf8');

    const nonIdempotentTable = upSql.replace(
      'CREATE TABLE IF NOT EXISTS telemetry.telemetry_signals',
      'CREATE TABLE telemetry.telemetry_signals'
    );
    assert.throws(
      () => verifyMigrationPair({ upSql: nonIdempotentTable, downSql }),
      /IF NOT EXISTS/
    );

    const nonIdempotentPolicy = upSql.replace(
      'DROP POLICY IF EXISTS telemetry_signals_tenant_isolation ON telemetry.telemetry_signals;\n',
      ''
    );
    assert.throws(
      () => verifyMigrationPair({ upSql: nonIdempotentPolicy, downSql }),
      /DROP POLICY IF EXISTS/
    );
  });

  it('rejects missing FORCE ROW LEVEL SECURITY or floating-point columns fail-closed', async () => {
    const upSql = await readFile(upPath, 'utf8');
    const downSql = await readFile(downPath, 'utf8');

    const missingForceRls = upSql.replace(
      'ALTER TABLE telemetry.telemetry_inbox FORCE ROW LEVEL SECURITY;',
      '-- omitted'
    );
    assert.throws(
      () => verifyMigrationPair({ upSql: missingForceRls, downSql }),
      /FORCE ROW LEVEL SECURITY/
    );

    const floatViolation = upSql.replace(
      'occurred_at_ms bigint NOT NULL CHECK (occurred_at_ms >= 0),',
      'occurred_at_ms double precision NOT NULL,'
    );
    assert.throws(
      () => verifyMigrationPair({ upSql: floatViolation, downSql }),
      /Zero-float violation/
    );
  });

  it('rejects down migrations that drop parent table before child FK table or leak outside telemetry schema', async () => {
    const upSql = await readFile(upPath, 'utf8');
    const downSql = await readFile(downPath, 'utf8');

    const wrongOrderDown = downSql.replace(
      'DROP TABLE IF EXISTS telemetry.telemetry_lineage;',
      '-- moved'
    ) + '\nDROP TABLE IF EXISTS telemetry.telemetry_lineage;';
    assert.throws(
      () => verifyMigrationPair({ upSql, downSql: wrongOrderDown }),
      /FK dependency order/
    );

    const crossServiceLeak = downSql + '\nDROP TABLE IF EXISTS session.sessions;';
    assert.throws(
      () => verifyMigrationPair({ upSql, downSql: crossServiceLeak }),
      /Cross-service table drop forbidden/
    );
  });
});
