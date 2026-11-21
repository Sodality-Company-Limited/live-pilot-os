import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PromotionRepository } from '../../code/apps/services/promotion-service/src/adapters/outbound/promotion-repository';
import { TransactionManager } from '../../code/apps/services/promotion-service/src/application/transaction-manager';

const connectionString = process.env.PROMOTION_DATABASE_URL;

test('promotion transition commits aggregate, history, inbox, outbox, and idempotency atomically', { skip: !connectionString }, async () => {
  const { Pool } = await import('../../code/apps/services/promotion-service/node_modules/pg/index.js');
  const bootstrap = new Pool({ connectionString });
  const schema = `promotion_test_${randomUUID().replaceAll('-', '')}`;
  await bootstrap.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  try {
    const migration = await readFile(new URL('../../code/apps/services/promotion-service/db/migrations/001_promotion.sql', import.meta.url), 'utf8');
    await pool.query(migration);
    const repository = new PromotionRepository(new TransactionManager(pool), { idFactory: () => randomUUID() });
    const retentionUntil = new Date(Date.now() + 60_000);
    const result = await repository.transition({
      promotionId: 'promotion-integration-1',
      tenantId: 'tenant-integration-1',
      sessionId: 'session-integration-1',
      correlationId: 'correlation-integration-1',
      causationId: 'causation-integration-1',
      retentionUntil,
      eventType: 'promotion.proposed',
      eventPayload: { promotion_id: 'promotion-integration-1', lifecycle_state: 'pending' },
      inbox: {
        messageId: 'message-integration-1',
        consumerName: 'promotion-service',
        subject: 'livepilot.v1.promotion.proposal.request',
        payload: { promotion_id: 'promotion-integration-1' },
      },
      command: {
        to: 'pending',
        expectedVersion: 1,
        idempotencyKey: 'proposal:session-integration-1:promotion-integration-1:1',
        fingerprint: 'a'.repeat(64),
        actor: { id: 'actor-integration-1', tenantId: 'tenant-integration-1', capabilities: ['promotion:submit'] },
        preconditions: { submissionValid: true },
      },
    });
    assert.equal(result.state, 'pending');
    assert.equal(result.version, 2);
    const counts = await pool.query<{ table_name: string; count: string }>(
      `SELECT 'aggregate' AS table_name, count(*)::text FROM promotion_aggregate
       UNION ALL SELECT 'history', count(*)::text FROM promotion_transition_history
       UNION ALL SELECT 'inbox', count(*)::text FROM promotion_inbox
       UNION ALL SELECT 'outbox', count(*)::text FROM promotion_outbox
       UNION ALL SELECT 'idempotency', count(*)::text FROM promotion_idempotency_record`,
    );
    assert.deepEqual(Object.fromEntries(counts.rows.map((row) => [row.table_name, row.count])), {
      aggregate: '1', history: '1', inbox: '1', outbox: '1', idempotency: '1',
    });
    const replay = await repository.transition({
      promotionId: 'promotion-integration-1', tenantId: 'tenant-integration-1', sessionId: 'session-integration-1',
      correlationId: 'correlation-integration-1', causationId: 'causation-integration-1', retentionUntil,
      eventType: 'promotion.proposed', eventPayload: { promotion_id: 'promotion-integration-1', lifecycle_state: 'pending' },
      command: {
        to: 'pending', expectedVersion: 1, idempotencyKey: 'proposal:session-integration-1:promotion-integration-1:1', fingerprint: 'a'.repeat(64),
        actor: { id: 'actor-integration-1', tenantId: 'tenant-integration-1', capabilities: ['promotion:submit'] }, preconditions: { submissionValid: true },
      },
    });
    assert.equal(replay.idempotent, true);
  } finally {
    await pool.end();
    await bootstrap.query(`DROP SCHEMA ${schema} CASCADE`);
    await bootstrap.end();
  }
});
