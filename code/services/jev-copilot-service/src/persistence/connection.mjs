// Connection and transaction boundary management for PostgreSQL
// Enforces tenant isolation via SET LOCAL app.tenant_id for Row-Level Security (RLS)

export class JevPersistenceConnection {
  /**
   * @param {object} pool
   */
  constructor(pool) {
    if (!pool) {
      throw new Error('Connection pool is required for JevPersistenceConnection');
    }
    this.pool = pool;
  }

  /**
   * Execute callback within a tenant-isolated database transaction boundary
   * @template T
   * @param {string} tenantId
   * @param {(client: any) => Promise<T>} operation
   * @returns {Promise<T>}
   */
  async withTenantTransaction(tenantId, operation) {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new Error('Valid tenantId is required for tenant-scoped transaction');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Set session setting for PostgreSQL Row Level Security (RLS)
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // preserve original error
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async query(sqlText, params) {
    return this.pool.query(sqlText, params);
  }
}
