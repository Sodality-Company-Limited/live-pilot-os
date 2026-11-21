export interface TransactionResult<Row = Record<string, unknown>> {
  readonly rows: readonly Row[];
  readonly rowCount: number;
}

export interface TransactionClient {
  query<Row = Record<string, unknown>>(sql: string, parameters?: readonly unknown[]): Promise<TransactionResult<Row>>;
}

export interface TransactionPool extends TransactionClient {
  connect?(): Promise<TransactionClient & { release?: () => void }>;
}

export type TransactionWork<T> = (client: TransactionClient) => Promise<T>;

export class TransactionManager {
  public constructor(private readonly pool: TransactionPool) {}

  public async execute<T>(work: TransactionWork<T>): Promise<T> {
    const client: TransactionClient & { release?: () => void } = this.pool.connect ? await this.pool.connect() : this.pool;
    await client.query('BEGIN');
    try {
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        throw new TransactionBoundaryError('ROLLBACK_FAILED', 'Transaction rollback failed', rollbackError);
      }
      throw error;
    } finally {
      client.release?.();
    }
  }

  public withTransaction<T>(work: TransactionWork<T>): Promise<T> {
    return this.execute(work);
  }
}

export class TransactionBoundaryError extends Error {
  public constructor(
    public readonly code: 'ROLLBACK_FAILED',
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'TransactionBoundaryError';
  }
}
