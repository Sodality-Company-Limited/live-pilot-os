import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { JevPersistenceConnection } from '../src/persistence/connection.mjs';
import { SuggestionRepository } from '../src/persistence/suggestion-repository.mjs';
import { OutboxRepository } from '../src/persistence/outbox-repository.mjs';

import {
  SuggestionAggregate,
  SUGGESTION_STATUSES,
  OPERATOR_DECISIONS,
  SuggestionStateTransitionError
} from '../src/domain/suggestion-aggregate.mjs';
import {
  SuggestionLifecycleHandler,
  EXTERNAL_TRIGGER_SUBJECTS
} from '../src/handlers/suggestion-lifecycle-handler.mjs';
import { NatsPublisher, NATS_SUBJECTS } from '../src/nats/nats-publisher.mjs';

// ============================================================================
// In-Process Test Infrastructure (Zero-Mock)
// ============================================================================

class TestPostgresEngine {
  constructor() {
    this.tables = {
      suggestions: new Map(),
      receipts: new Map(),
      outbox: new Map(),
      idempotency: new Map()
    };
  }

  createClient() {
    return new TestClient(this);
  }
}

class TestClient {
  constructor(engine) {
    this.engine = engine;
    this.inTransaction = false;
    this.tenantId = null;
    this.transactionSnapshot = null;
  }

  async query(sqlText, params = []) {
    const trimmed = sqlText.trim();

    if (trimmed.startsWith('BEGIN')) {
      this.inTransaction = true;
      this.transactionSnapshot = JSON.stringify({
        suggestions: Array.from(this.engine.tables.suggestions.entries()),
        receipts: Array.from(this.engine.tables.receipts.entries()),
        outbox: Array.from(this.engine.tables.outbox.entries()),
        idempotency: Array.from(this.engine.tables.idempotency.entries())
      });
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('COMMIT')) {
      this.inTransaction = false;
      this.transactionSnapshot = null;
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('ROLLBACK')) {
      if (this.transactionSnapshot) {
        const snap = JSON.parse(this.transactionSnapshot);
        this.engine.tables.suggestions = new Map(snap.suggestions);
        this.engine.tables.receipts = new Map(snap.receipts);
        this.engine.tables.outbox = new Map(snap.outbox);
        this.engine.tables.idempotency = new Map(snap.idempotency);
      }
      this.inTransaction = false;
      this.transactionSnapshot = null;
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.includes("set_config('app.tenant_id'")) {
      this.tenantId = params[0];
      return { rows: [{ set_config: this.tenantId }], rowCount: 1 };
    }

    // Insert Suggestion
    if (trimmed.includes('INSERT INTO jev.jev_suggestions')) {
      const record = {
        suggestion_id: params[0],
        tenant_id: params[1],
        live_session_id: params[2],
        suggestion_type: params[3],
        status: params[4],
        content_payload: JSON.parse(params[5]),
        evidence_refs: JSON.parse(params[6]),
        confidence_basis_points: params[7],
        freshness_expires_at: params[8],
        aggregate_version: params[9],
        created_at: params[10],
        updated_at: params[11]
      };
      const key = `${record.tenant_id}:${record.suggestion_id}`;
      this.engine.tables.suggestions.set(key, record);
      return { rows: [record], rowCount: 1 };
    }

    // Update Suggestion status with optimistic version check
    if (trimmed.includes('UPDATE jev.jev_suggestions')) {
      const [newStatus, nextVersion, updatedAt, tenantId, suggestionId, expectedVersion] = params;
      const key = `${tenantId}:${suggestionId}`;
      const existing = this.engine.tables.suggestions.get(key);
      if (!existing || existing.aggregate_version !== expectedVersion) {
        return { rows: [], rowCount: 0 };
      }
      const updated = {
        ...existing,
        status: newStatus,
        aggregate_version: nextVersion,
        updated_at: updatedAt
      };
      this.engine.tables.suggestions.set(key, updated);
      return { rows: [updated], rowCount: 1 };
    }

    // Insert Outbox
    if (trimmed.includes('INSERT INTO jev.jev_outbox')) {
      const record = {
        outbox_id: params[0],
        tenant_id: params[1],
        live_session_id: params[2],
        event_type: params[3],
        subject: params[4],
        payload: JSON.parse(params[5]),
        headers: JSON.parse(params[6]),
        status: 'pending',
        retry_count: 0,
        occurred_at: params[7],
        created_at: params[8],
        published_at: null
      };
      const key = `${record.tenant_id}:${record.outbox_id}`;
      this.engine.tables.outbox.set(key, record);
      return { rows: [record], rowCount: 1 };
    }

    // Select Suggestion by ID
    if (trimmed.includes('SELECT * FROM jev.jev_suggestions') && trimmed.includes('suggestion_id = $2')) {
      const [tenantId, suggestionId] = params;
      const key = `${tenantId}:${suggestionId}`;
      const rec = this.engine.tables.suggestions.get(key);
      return { rows: rec ? [rec] : [], rowCount: rec ? 1 : 0 };
    }

    // Select Suggestions by Session
    if (trimmed.includes('SELECT * FROM jev.jev_suggestions') && trimmed.includes('live_session_id = $2')) {
      const [tenantId, liveSessionId, status] = params;
      const rows = [];
      for (const rec of this.engine.tables.suggestions.values()) {
        if (rec.tenant_id === tenantId && rec.live_session_id === liveSessionId) {
          if (!status || rec.status === status) {
            rows.push(rec);
          }
        }
      }
      return { rows, rowCount: rows.length };
    }

    // Select pending Outbox
    if (trimmed.includes('SELECT * FROM jev.jev_outbox') && trimmed.includes("status = 'pending'")) {
      const [tenantId, limit] = params;
      const rows = [];
      for (const rec of this.engine.tables.outbox.values()) {
        if (rec.tenant_id === tenantId && rec.status === 'pending') {
          rows.push(rec);
          if (rows.length >= limit) break;
        }
      }
      return { rows, rowCount: rows.length };
    }

    throw new Error(`Unhandled SQL in test: ${sqlText}`);
  }

  release() {
    this.inTransaction = false;
  }
}

class TestPool {
  constructor(engine) {
    this.engine = engine;
  }
  async connect() {
    return this.engine.createClient();
  }
}

class InProcessNatsBus {
  constructor() {
    this.published = [];
  }
  async publish(subject, payload, headers) {
    this.published.push({ subject, payload, headers });
  }
}

function createSampleSuggestion(status = SUGGESTION_STATUSES.GROUNDED, expiresAt = null) {
  return SuggestionAggregate.create({
    suggestion_id: `sug-${crypto.randomUUID()}`,
    tenant_id: '00000000-0000-0000-0000-000000000001',
    live_session_id: '11111111-1111-1111-1111-111111111111',
    suggestion_type: 'product_highlight',
    status,
    confidence_basis_points: 9200,
    freshness_expires_at: expiresAt || new Date(Date.now() + 60000).toISOString(),
    content_payload: {
      headline: 'Highlight Ceramide Barrier',
      cue_text: 'Viewer asking about skin type — emphasize 72h moisture barrier lock',
      suggested_action: 'speak_cue',
      action_parameters: {
        product_id: 'prod-skin-01',
        sku: 'SKU-HYDRATE-01',
        discount_percent: 15,
        duration_seconds: 120
      }
    },
    evidence_refs: [
      {
        evidence_id: 'ev-fact-001',
        kind: 'catalog_fact',
        digest: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        status: 'APPROVED',
        summary: 'Clinical moisture lock verified'
      }
    ]
  });
}

// ============================================================================
// Test Suite: Lifecycle FSM & Handler Tests
// ============================================================================

async function runLifecycleTests() {
  console.log('--- Starting G-JEVC-006 Suggestion Lifecycle & FSM Tests ---');

  // 1. Direct Domain Aggregate FSM Transitions
  console.log('1. Testing Aggregate transitions (grounded -> delivered -> used)...');
  {
    const agg = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    assert.equal(agg.status, SUGGESTION_STATUSES.GROUNDED);
    assert.equal(agg.aggregate_version, 1);

    // Deliver
    agg.deliver();
    assert.equal(agg.status, SUGGESTION_STATUSES.DELIVERED);
    assert.equal(agg.aggregate_version, 2);
    assert.notEqual(agg.delivered_at, null);

    // Record decision: used
    agg.recordDecision({ decision: OPERATOR_DECISIONS.USED, actorId: 'host-user-1' });
    assert.equal(agg.status, SUGGESTION_STATUSES.USED);
    assert.equal(agg.aggregate_version, 3);
    assert.equal(agg.operator_decision.decision, 'used');
    assert.equal(agg.operator_decision.actor_id, 'host-user-1');

    // Terminal state invariant: Cannot transition out of used
    assert.throws(
      () => agg.deliver(),
      (err) => err instanceof SuggestionStateTransitionError && err.code === 'LP04001',
      'Should throw SuggestionStateTransitionError when transitioning out of terminal used state'
    );
  }

  console.log('2. Testing Aggregate decision: edited with payload parameter updates...');
  {
    const agg = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    agg.deliver();
    agg.recordDecision({
      decision: OPERATOR_DECISIONS.EDITED,
      actorId: 'host-user-2',
      edits: {
        headline: 'Custom Edited Headline',
        cue_text: 'Host custom remarks',
        action_parameters: { discount_percent: 20 }
      }
    });

    assert.equal(agg.status, SUGGESTION_STATUSES.EDITED);
    assert.equal(agg.content_payload.headline, 'Custom Edited Headline');
    assert.equal(agg.content_payload.cue_text, 'Host custom remarks');
    assert.equal(agg.content_payload.action_parameters.discount_percent, 20);
    assert.equal(agg.operator_decision.decision, 'edited');

    // Terminal state check
    assert.throws(
      () => agg.recordDismissed('host-user-2'),
      SuggestionStateTransitionError
    );
  }

  console.log('3. Testing Aggregate decision: dismissed...');
  {
    const agg = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    agg.deliver();
    agg.recordDecision({ decision: OPERATOR_DECISIONS.DISMISSED, actorId: 'host-user-3' });
    assert.equal(agg.status, SUGGESTION_STATUSES.DISMISSED);
    assert.equal(agg.operator_decision.decision, 'dismissed');

    assert.throws(
      () => agg.expire(),
      SuggestionStateTransitionError
    );
  }

  console.log('4. Testing Expiration TTL guard & transition...');
  {
    const pastTime = new Date(Date.now() - 5000).toISOString();
    const aggExpired = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED, pastTime);

    // Attempting to deliver an already expired suggestion must fail closed
    assert.throws(
      () => aggExpired.deliver(),
      (err) => err instanceof SuggestionStateTransitionError && err.code === 'LP04001'
    );

    // Can transition directly to expired
    aggExpired.expire();
    assert.equal(aggExpired.status, SUGGESTION_STATUSES.EXPIRED);
    assert.notEqual(aggExpired.expired_at, null);

    // Terminal state check
    assert.throws(
      () => aggExpired.withdraw({ reason: 'TOO_LATE' }),
      SuggestionStateTransitionError
    );
  }

  console.log('5. Testing Withdrawal from grounded and delivered states...');
  {
    // Grounded -> Withdrawn
    const agg1 = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    agg1.withdraw({ reason: 'CATALOG_FACT_CHANGED', actorId: 'catalog-service' });
    assert.equal(agg1.status, SUGGESTION_STATUSES.WITHDRAWN);
    assert.equal(agg1.withdrawal_record.reason, 'CATALOG_FACT_CHANGED');
    assert.equal(agg1.withdrawal_record.actor_id, 'catalog-service');

    // Delivered -> Withdrawn
    const agg2 = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    agg2.deliver();
    agg2.withdraw({ reason: 'INVENTORY_STOCK_DEPLETED', actorId: 'inventory-service' });
    assert.equal(agg2.status, SUGGESTION_STATUSES.WITHDRAWN);
    assert.equal(agg2.withdrawal_record.reason, 'INVENTORY_STOCK_DEPLETED');

    // Terminal state check
    assert.throws(
      () => agg2.recordUsed(),
      SuggestionStateTransitionError
    );
  }

  console.log('6. Testing SuggestionLifecycleHandler with PostgreSQL Persistence & Outbox...');
  {
    const engine = new TestPostgresEngine();
    const pool = new TestPool(engine);
    const connection = new JevPersistenceConnection(pool);
    const suggestionRepo = new SuggestionRepository(connection);
    const outboxRepo = new OutboxRepository(connection);
    const natsBus = new InProcessNatsBus();
    const natsPublisher = new NatsPublisher(natsBus);

    const handler = new SuggestionLifecycleHandler({
      suggestionRepository: suggestionRepo,
      natsPublisher
    });

    const tenantId = '00000000-0000-0000-0000-000000000001';
    const liveSessionId = '11111111-1111-1111-1111-111111111111';

    // Seed aggregate in grounded state
    const agg = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    await suggestionRepo.createSuggestionWithOutbox(agg.toJSON(), null, null);

    // 6a. Deliver Suggestion
    const deliverRes = await handler.handleDeliverSuggestion({
      tenant_id: tenantId,
      live_session_id: liveSessionId,
      suggestion_id: agg.suggestion_id
    });
    assert.equal(deliverRes.status, 'delivered');
    assert.equal(deliverRes.suggestion.status, 'delivered');
    assert.equal(deliverRes.suggestion.aggregate_version, 2);

    const dbDelivered = await suggestionRepo.findById(tenantId, agg.suggestion_id);
    assert.equal(dbDelivered.status, 'delivered');
    assert.equal(dbDelivered.aggregate_version, 2);

    // Check outbox
    const outboxDelivered = await outboxRepo.fetchPending(tenantId, 10);
    assert.equal(outboxDelivered.length, 1);
    assert.equal(outboxDelivered[0].event_type, 'copilot.suggestion.delivered');

    // 6b. Record Decision: Used
    const decisionRes = await handler.handleRecordDecision({
      tenant_id: tenantId,
      live_session_id: liveSessionId,
      suggestion_id: agg.suggestion_id,
      decision: OPERATOR_DECISIONS.USED,
      actor_id: 'host-user-alpha'
    });
    assert.equal(decisionRes.status, 'used');
    assert.equal(decisionRes.suggestion.status, 'used');
    assert.equal(decisionRes.suggestion.aggregate_version, 3);

    const dbUsed = await suggestionRepo.findById(tenantId, agg.suggestion_id);
    assert.equal(dbUsed.status, 'used');
    assert.equal(dbUsed.aggregate_version, 3);

    // 6c. Attempting illegal transition on terminal suggestion via handler fails closed
    await assert.rejects(
      async () => {
        await handler.handleExpireSuggestion({
          tenant_id: tenantId,
          live_session_id: liveSessionId,
          suggestion_id: agg.suggestion_id
        });
      },
      (err) => err instanceof SuggestionStateTransitionError && err.code === 'LP04001'
    );
  }

  console.log('7. Testing Reactive External Triggers (Stock Depleted & Emergency Pause)...');
  {
    const engine = new TestPostgresEngine();
    const pool = new TestPool(engine);
    const connection = new JevPersistenceConnection(pool);
    const suggestionRepo = new SuggestionRepository(connection);
    const natsBus = new InProcessNatsBus();
    const natsPublisher = new NatsPublisher(natsBus);

    const handler = new SuggestionLifecycleHandler({
      suggestionRepository: suggestionRepo,
      natsPublisher
    });

    const tenantId = '00000000-0000-0000-0000-000000000001';
    const liveSessionId = '11111111-1111-1111-1111-111111111111';

    // Seed two suggestions for SKU-HYDRATE-01 and one for SKU-DIFF-02
    const agg1 = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    const agg2 = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    const agg3 = createSampleSuggestion(SUGGESTION_STATUSES.GROUNDED);
    agg3.content_payload.action_parameters.sku = 'SKU-DIFF-02';
    agg3.content_payload.action_parameters.product_id = 'prod-diff-02';

    await suggestionRepo.createSuggestionWithOutbox(agg1.toJSON(), null, null);
    await suggestionRepo.createSuggestionWithOutbox(agg2.toJSON(), null, null);
    await suggestionRepo.createSuggestionWithOutbox(agg3.toJSON(), null, null);

    // Mark agg1 delivered, agg2 grounded
    await handler.handleDeliverSuggestion({
      tenant_id: tenantId,
      live_session_id: liveSessionId,
      suggestion_id: agg1.suggestion_id
    });

    // 7a. Trigger Stock Depleted for SKU-HYDRATE-01
    const withdrawnByStock = await handler.handleStockDepletedTrigger({
      tenant_id: tenantId,
      live_session_id: liveSessionId,
      sku: 'SKU-HYDRATE-01',
      available_stock: 0
    });

    assert.equal(withdrawnByStock.length, 2, 'Should withdraw both active suggestions matching SKU');
    const withdrawnIds = withdrawnByStock.map(r => r.suggestion.suggestion_id);
    assert.ok(withdrawnIds.includes(agg1.suggestion_id));
    assert.ok(withdrawnIds.includes(agg2.suggestion_id));

    // Confirm DB status
    const dbAgg1 = await suggestionRepo.findById(tenantId, agg1.suggestion_id);
    const dbAgg2 = await suggestionRepo.findById(tenantId, agg2.suggestion_id);
    const dbAgg3 = await suggestionRepo.findById(tenantId, agg3.suggestion_id);
    assert.equal(dbAgg1.status, 'withdrawn');
    assert.equal(dbAgg2.status, 'withdrawn');
    assert.equal(dbAgg3.status, 'grounded', 'Unrelated product suggestion should remain unaffected');

    // Confirm NATS publication of withdrawal
    const withdrawalEvents = natsBus.published.filter(
      e => e.subject === NATS_SUBJECTS.SUGGESTION_WITHDRAWN
    );
    assert.equal(withdrawalEvents.length, 2);

    // 7b. Trigger Emergency Pause
    const withdrawnByPause = await handler.handleEmergencyPauseTrigger({
      tenant_id: tenantId,
      live_session_id: liveSessionId,
      reason: 'HOST_TRIGGERED_EMERGENCY_STOP'
    });

    assert.equal(withdrawnByPause.length, 1, 'Should withdraw remaining active suggestion agg3');
    assert.equal(withdrawnByPause[0].suggestion.suggestion_id, agg3.suggestion_id);

    const dbAgg3After = await suggestionRepo.findById(tenantId, agg3.suggestion_id);
    assert.equal(dbAgg3After.status, 'withdrawn');
  }

  console.log('\n--- G-JEVC-006 Suggestion Lifecycle & FSM Tests: ALL PASS GREEN ---');
}

runLifecycleTests().catch((err) => {
  console.error('Lifecycle Test Failed:', err);
  process.exit(1);
});
