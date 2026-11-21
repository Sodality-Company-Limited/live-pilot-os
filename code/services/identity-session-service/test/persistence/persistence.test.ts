import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PostgresPrincipalRepository,
  PostgresSessionRepository,
  PostgresOutboxRepository,
} from '../../src/persistence/postgres-repositories.js';
import { PrincipalRecord, SessionRecord, hashSessionToken } from '../../src/domain/authentication.js';

describe('G-SEC-002: Identity/Session Persistence Contracts', () => {
  it('instantiates repositories and verifies query construction', async () => {
    // In-memory / mocked SQL query interface adhering to pg pool contract
    const executedQueries: { text: string; values?: any[] }[] = [];
    const mockDb = {
      async query(text: string, values?: any[]) {
        executedQueries.push({ text, values });
        return { rows: [] };
      },
    };

    const principalRepo = new PostgresPrincipalRepository(mockDb as any);
    const sessionRepo = new PostgresSessionRepository(mockDb as any);
    const outboxRepo = new PostgresOutboxRepository(mockDb as any);

    // 1. Principal lookup query
    await principalRepo.findByEmail('tenant-demo', 'host@example.test');
    assert.equal(executedQueries.length, 1);
    assert.match(executedQueries[0].text, /SELECT[\s\S]*FROM identity_session\.principals/);
    assert.deepEqual(executedQueries[0].values, ['tenant-demo', 'host@example.test']);

    // 2. Session creation query
    const sessionRecord: SessionRecord = {
      sessionId: 'session-test-01',
      principalId: 'principal-test-01',
      tenantId: 'tenant-demo',
      tokenHash: hashSessionToken('token-12345'),
      state: 'active',
      mode: 'SIMULATED',
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      revokedAt: null,
      createdAt: new Date(),
    };
    await sessionRepo.createSession(sessionRecord);
    assert.equal(executedQueries.length, 2);
    assert.match(executedQueries[1].text, /INSERT INTO identity_session\.sessions/);

    // 3. Outbox event creation query
    await outboxRepo.writeEvent({
      outboxId: 'outbox-01',
      aggregateId: sessionRecord.sessionId,
      eventType: 'auth.session.revoked',
      payload: { sessionId: sessionRecord.sessionId },
      correlationId: 'corr-01',
      createdAt: new Date(),
    });
    assert.equal(executedQueries.length, 3);
    assert.match(executedQueries[2].text, /INSERT INTO identity_session\.outbox/);
  });
});
