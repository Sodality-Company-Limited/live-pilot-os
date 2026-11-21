import pg from 'pg';
import type { Pool, PoolClient, PoolConfig } from 'pg';

const { Pool: PgPool } = pg;

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DatabasePoolManager {
  private pool: Pool | null = null;
  private readonly config: DatabaseConfig;

  constructor(config?: DatabaseConfig) {
    this.config = config || {
      connectionString: process.env.DATABASE_URL,
    };
  }

  public getPool(): Pool {
    if (!this.pool) {
      const poolConfig: PoolConfig = this.config.connectionString
        ? { connectionString: this.config.connectionString }
        : {
            host: this.config.host || process.env.PGHOST || 'localhost',
            port: this.config.port || (process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432),
            database: this.config.database || process.env.PGDATABASE || 'livepilot',
            user: this.config.user || process.env.PGUSER || 'postgres',
            password: this.config.password || process.env.PGPASSWORD || 'postgres',
            max: this.config.max || 10,
            idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis || 5000,
          };

      this.pool = new PgPool(poolConfig);
    }
    return this.pool;
  }

  public async getClient(): Promise<PoolClient> {
    return this.getPool().connect();
  }

  /**
   * Executes a callback within a transactional scope with Row-Level Security tenant context set.
   * Ensures fail-closed error handling and clean rollback on exception.
   */
  public async withTenantTransaction<T>(
    tenantId: string,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required for tenant-scoped transaction');
    }

    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
