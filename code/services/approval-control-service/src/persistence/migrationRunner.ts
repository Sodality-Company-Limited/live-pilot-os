import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { Pool, PoolClient } from 'pg';

export interface MigrationResult {
  direction: 'up' | 'down';
  statementsExecuted: number;
  durationMs: number;
}

export class MigrationRunner {
  private readonly pool: Pool;
  private readonly migrationsDir: string;

  constructor(pool: Pool, migrationsDir?: string) {
    this.pool = pool;
    if (migrationsDir) {
      this.migrationsDir = migrationsDir;
    } else {
      const currentDir = typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url));
      this.migrationsDir = resolve(currentDir, '../../migrations');
    }
  }

  /**
   * Applies UP migration script.
   */
  public async runUp(client?: PoolClient): Promise<MigrationResult> {
    const startTime = Date.now();
    const upFilePath = resolve(this.migrationsDir, '001_approval_control_persistence.up.sql');
    const sql = await readFile(upFilePath, 'utf8');

    const exec = async (c: PoolClient) => {
      await c.query(sql);
    };

    if (client) {
      await exec(client);
    } else {
      const c = await this.pool.connect();
      try {
        await c.query('BEGIN');
        await exec(c);
        await c.query('COMMIT');
      } catch (err) {
        await c.query('ROLLBACK');
        throw err;
      } finally {
        c.release();
      }
    }

    return {
      direction: 'up',
      statementsExecuted: 1,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Applies DOWN migration script.
   */
  public async runDown(client?: PoolClient): Promise<MigrationResult> {
    const startTime = Date.now();
    const downFilePath = resolve(this.migrationsDir, '001_approval_control_persistence.down.sql');
    const sql = await readFile(downFilePath, 'utf8');

    const exec = async (c: PoolClient) => {
      await c.query(sql);
    };

    if (client) {
      await exec(client);
    } else {
      const c = await this.pool.connect();
      try {
        await c.query('BEGIN');
        await exec(c);
        await c.query('COMMIT');
      } catch (err) {
        await c.query('ROLLBACK');
        throw err;
      } finally {
        c.release();
      }
    }

    return {
      direction: 'down',
      statementsExecuted: 1,
      durationMs: Date.now() - startTime,
    };
  }
}
