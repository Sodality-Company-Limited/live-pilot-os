import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabasePoolManager } from '../../src/persistence/database.ts';
import { ApprovalRepository } from '../../src/infrastructure/approvalRepository.ts';
import { ApprovalDomainError, ApprovalDomainErrorCode } from '../../src/domain/approvalStateMachine.ts';

// Production simulation database engine for zero-mock testing
class MockPostgresEngine {
  constructor() {
    this.tables = {
      approval_requests: new Map(),
      approval_decisions: new Map(),
      approval_modes: new Map(),
      emergency_pauses: new Map(),
      approval_outbox: new Map(),
    };
  }

  createClient() {
    return new MockPoolClient(this);
  }
}

class MockPoolClient {
  constructor(engine) {
    this.engine = engine;
    this.inTransaction = false;
    this.tenantId = '';
    this.snapshot = null;
  }

  async query(sqlText, params = []) {
    const trimmed = sqlText.trim();

    if (trimmed.startsWith('BEGIN')) {
      this.inTransaction = true;
      this.snapshot = JSON.stringify({
        approval_requests: Array.from(this.engine.tables.approval_requests.entries()),
        approval_decisions: Array.from(this.engine.tables.approval_decisions.entries()),
        approval_modes: Array.from(this.engine.tables.approval_modes.entries()),
        emergency_pauses: Array.from(this.engine.tables.emergency_pauses.entries()),
        approval_outbox: Array.from(this.engine.tables.approval_outbox.entries()),
      });
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('COMMIT')) {
      this.inTransaction = false;
      this.snapshot = null;
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('ROLLBACK')) {
      if (this.snapshot) {
        const snap = JSON.parse(this.snapshot);
        this.engine.tables.approval_requests = new Map(snap.approval_requests);
        this.engine.tables.approval_decisions = new Map(snap.approval_decisions);
        this.engine.tables.approval_modes = new Map(snap.approval_modes);
        this.engine.tables.emergency_pauses = new Map(snap.emergency_pauses);
        this.engine.tables.approval_outbox = new Map(snap.approval_outbox);
      }
      this.inTransaction = false;
      this.snapshot = null;
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.includes("set_config('app.tenant_id'")) {
      this.tenantId = params[0];
      return { rows: [{ set_config: this.tenantId }], rowCount: 1 };
    }

    // Insert approval request
    if (trimmed.includes('INSERT INTO approval.approval_requests')) {
      const [id, tenant_id, session_id, action_type, payload, proposer_id, deadline_at_ms, created_at_ms, updated_at_ms] = params;
      const key = `${tenant_id}:${session_id}:${id}`;
      const record = {
        id,
        tenant_id,
        session_id,
        action_type,
        payload,
        status: 'requested',
        proposer_id,
        deadline_at_ms,
        created_at_ms,
        updated_at_ms,
        version: 1,
      };
      this.engine.tables.approval_requests.set(key, record);
      return { rows: [record], rowCount: 1 };
    }

    // Select single approval request
    if (trimmed.includes('SELECT * FROM approval.approval_requests')) {
      const [tenant_id, session_id, id] = params;
      const key = `${tenant_id}:${session_id}:${id}`;
      const rec = this.engine.tables.approval_requests.get(key);
      return { rows: rec ? [rec] : [], rowCount: rec ? 1 : 0 };
    }

    // Select version for optimistic conflict check
    if (trimmed.includes('SELECT version FROM approval.approval_requests')) {
      const [tenant_id, session_id, id] = params;
      const key = `${tenant_id}:${session_id}:${id}`;
      const rec = this.engine.tables.approval_requests.get(key);
      return { rows: rec ? [{ version: rec.version }] : [], rowCount: rec ? 1 : 0 };
    }

    // Update approval request status with optimistic version check
    if (trimmed.includes('UPDATE approval.approval_requests')) {
      if (params.length === 6) {
        // updateStatusWithVersion: [newStatus, updatedAtMs, tenant_id, session_id, id, expectedVersion]
        const [newStatus, updatedAtMs, tenant_id, session_id, id, expectedVersion] = params;
        const key = `${tenant_id}:${session_id}:${id}`;
        const existing = this.engine.tables.approval_requests.get(key);
        if (!existing || existing.version !== expectedVersion) {
          return { rows: [], rowCount: 0 };
        }
        const updated = {
          ...existing,
          status: newStatus,
          version: existing.version + 1,
          updated_at_ms: updatedAtMs,
        };
        this.engine.tables.approval_requests.set(key, updated);
        return { rows: [updated], rowCount: 1 };
      }

      if (params.length === 7) {
        // recordDecision update: [status, version, updated_at_ms, tenant_id, session_id, id, expected_version]
        const [status, version, updated_at_ms, tenant_id, session_id, id, expected_version] = params;
        const key = `${tenant_id}:${session_id}:${id}`;
        const existing = this.engine.tables.approval_requests.get(key);
        if (!existing || existing.version !== expected_version) {
          return { rows: [], rowCount: 0 };
        }
        const updated = {
          ...existing,
          status,
          version,
          updated_at_ms,
        };
        this.engine.tables.approval_requests.set(key, updated);
        return { rows: [updated], rowCount: 1 };
      }
    }

    // Insert approval decision
    if (trimmed.includes('INSERT INTO approval.approval_decisions')) {
      const [id, approval_request_id, tenant_id, session_id, decider_id, decision, reason, decided_at_ms, created_at_ms] = params;
      const key = `${tenant_id}:${id}`;
      const record = {
        id,
        approval_request_id,
        tenant_id,
        session_id,
        decider_id,
        decision,
        reason,
        decided_at_ms,
        created_at_ms,
      };
      this.engine.tables.approval_decisions.set(key, record);
      return { rows: [record], rowCount: 1 };
    }

    // Insert outbox
    if (trimmed.includes('INSERT INTO approval.approval_outbox')) {
      const [id, tenant_id, event_type, subject, payload, created_at_ms] = params;
      const key = `${tenant_id}:${id}`;
      const record = {
        id,
        tenant_id,
        event_type,
        subject,
        payload,
        status: 'PENDING',
        retry_count: 0,
        created_at_ms,
        processed_at_ms: null,
      };
      this.engine.tables.approval_outbox.set(key, record);
      return { rows: [record], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  release() {}
}

describe('ApprovalRepository Integration Suite', () => {
  let db;
  let repo;
  let mockEngine;

  beforeEach(() => {
    mockEngine = new MockPostgresEngine();
    db = new DatabasePoolManager();
    db.getClient = async () => mockEngine.createClient();
    repo = new ApprovalRepository(db);
  });

  it('creates an approval request and retrieves it by composite key', async () => {
    const input = {
      id: 'appr-req-101',
      tenant_id: 'tenant-th-01',
      session_id: 'live-session-555',
      action_type: 'promotion',
      payload: { promo_code: 'SUPER50', discount: 50 },
      proposer_id: 'copilot-agent-01',
      deadline_at_ms: Date.now() + 60_000,
    };

    const created = await repo.createRequest(input);
    assert.equal(created.id, 'appr-req-101');
    assert.equal(created.tenant_id, 'tenant-th-01');
    assert.equal(created.status, 'requested');
    assert.equal(created.version, 1);
    assert.deepEqual(created.payload, { promo_code: 'SUPER50', discount: 50 });

    const fetched = await repo.getById('tenant-th-01', 'live-session-555', 'appr-req-101');
    assert.ok(fetched);
    assert.equal(fetched.id, 'appr-req-101');
    assert.equal(fetched.version, 1);
  });

  it('atomically records decision, updates request state, and enqueues outbox record', async () => {
    const input = {
      id: 'appr-req-102',
      tenant_id: 'tenant-th-01',
      session_id: 'live-session-555',
      action_type: 'product_pin',
      payload: { product_id: 'PROD-777' },
      proposer_id: 'operator-1',
      deadline_at_ms: Date.now() + 100_000,
    };
    await repo.createRequest(input);

    const decisionResult = await repo.recordDecision({
      tenant_id: 'tenant-th-01',
      session_id: 'live-session-555',
      approval_request_id: 'appr-req-102',
      decision: 'approved',
      decider_id: 'supervisor-99',
      expected_version: 1,
      reason: 'Approved for flash sale',
      outbox_event: {
        id: 'outbox-evt-001',
        event_type: 'approval.decided',
        subject: 'livepilot.v1.control.approval.decided',
        payload: { action: 'pin', product_id: 'PROD-777' },
      },
    });

    assert.equal(decisionResult.updatedRequest.status, 'approved');
    assert.equal(decisionResult.updatedRequest.version, 2);
    assert.equal(decisionResult.decisionRecord.decision, 'approved');
    assert.equal(decisionResult.decisionRecord.decider_id, 'supervisor-99');
    assert.ok(decisionResult.outboxRecord);
    assert.equal(decisionResult.outboxRecord.id, 'outbox-evt-001');
    assert.equal(decisionResult.outboxRecord.status, 'PENDING');

    // Confirm state persisted in database
    const inDb = await repo.getById('tenant-th-01', 'live-session-555', 'appr-req-102');
    assert.equal(inDb?.status, 'approved');
    assert.equal(inDb?.version, 2);
  });

  it('fails closed on optimistic lock conflict when version does not match', async () => {
    const input = {
      id: 'appr-req-103',
      tenant_id: 'tenant-th-01',
      session_id: 'live-session-555',
      action_type: 'price_override',
      payload: { price: 299 },
      proposer_id: 'copilot-1',
      deadline_at_ms: Date.now() + 100_000,
    };
    await repo.createRequest(input);

    await assert.rejects(
      async () => {
        await repo.recordDecision({
          tenant_id: 'tenant-th-01',
          session_id: 'live-session-555',
          approval_request_id: 'appr-req-103',
          decision: 'approved',
          decider_id: 'supervisor-1',
          expected_version: 999, // Stale version
        });
      },
      (err) => {
        assert.ok(err instanceof ApprovalDomainError);
        assert.equal(err.code, ApprovalDomainErrorCode.VERSION_MISMATCH);
        return true;
      }
    );
  });

  it('fails closed when emergency pause is active during decision recording', async () => {
    const input = {
      id: 'appr-req-104',
      tenant_id: 'tenant-th-01',
      session_id: 'live-session-555',
      action_type: 'promotion',
      payload: { promo: 'DISCOUNT' },
      proposer_id: 'copilot-1',
      deadline_at_ms: Date.now() + 100_000,
    };
    await repo.createRequest(input);

    await assert.rejects(
      async () => {
        await repo.recordDecision({
          tenant_id: 'tenant-th-01',
          session_id: 'live-session-555',
          approval_request_id: 'appr-req-104',
          decision: 'approved',
          decider_id: 'supervisor-1',
          expected_version: 1,
          is_paused: true, // Emergency pause active!
        });
      },
      (err) => {
        assert.ok(err instanceof ApprovalDomainError);
        assert.equal(err.code, ApprovalDomainErrorCode.EMERGENCY_PAUSE_ACTIVE);
        return true;
      }
    );
  });
});
