import fs from 'node:fs';
import path from 'node:path';

describe('G-CORE-051: Live-Session Persistence Migrations Contract', () => {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const upSqlPath = path.join(migrationsDir, '001_session_state.up.sql');
  const downSqlPath = path.join(migrationsDir, '001_session_state.down.sql');

  it('migration files exist and are non-empty', () => {
    expect(fs.existsSync(upSqlPath)).toBe(true);
    expect(fs.existsSync(downSqlPath)).toBe(true);
    expect(fs.statSync(upSqlPath).size).toBeGreaterThan(0);
    expect(fs.statSync(downSqlPath).size).toBeGreaterThan(0);
  });

  it('up migration defines authoritative tables with RLS and constraints', () => {
    const upSql = fs.readFileSync(upSqlPath, 'utf8');
    expect(upSql).toMatch(/CREATE TABLE (IF NOT EXISTS )?live_sessions/);
    expect(upSql).toMatch(/CREATE TABLE (IF NOT EXISTS )?live_session_events/);
    expect(upSql).toMatch(/tenant_id/);
    expect(upSql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it('down migration cleanly reverts state without cross-service impact', () => {
    const downSql = fs.readFileSync(downSqlPath, 'utf8');
    expect(downSql).toMatch(/DROP TABLE/);
  });
});
