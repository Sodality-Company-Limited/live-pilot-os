import assert from 'node:assert';
import {
  SessionLifecycleService,
  InMemoryStore,
  CommandEnvelope,
  LifecycleCommandPayload
} from '../../src/application/session-lifecycle.service.js';

console.log('Running G-CORE-053 Lifecycle Transport & Outbox Integration Tests...');

const store: InMemoryStore = {
  sessions: new Map(),
  idempotencyKeys: new Set(),
  outbox: [],
  transitions: []
};

const service = new SessionLifecycleService(store);

async function runTests() {
  const envelope: CommandEnvelope<LifecycleCommandPayload> = {
    eventId: 'cmd-001',
    eventType: 'livepilot.v1.session.command.start',
    occurredAt: new Date().toISOString(),
    tenantId: 'tenant-acme',
    liveSessionId: 'sess-888',
    correlationId: 'corr-001',
    schemaVersion: '1',
    producer: 'portal-bff',
    idempotencyKey: 'idemp-start-888',
    data: {
      command: 'start',
      expectedVersion: 1
    }
  };

  // 1. First execution -> Valid transition & Outbox write
  const res1 = await service.handleCommand(envelope);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.event.data.newState, 'active');
  assert.strictEqual(res1.event.data.version, 2);
  assert.strictEqual(store.outbox.length, 1);
  assert.strictEqual(store.outbox[0].status, 'PENDING');
  assert.strictEqual(store.transitions.length, 1);

  // 2. Duplicate command -> Idempotent replay with zero duplicate outbox writes
  const res2 = await service.handleCommand(envelope);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(store.outbox.length, 1); // Not duplicated
  assert.strictEqual(store.transitions.length, 1); // Not duplicated

  // 3. Stale version command -> Rejection
  const staleCmd: CommandEnvelope<LifecycleCommandPayload> = {
    ...envelope,
    eventId: 'cmd-002',
    idempotencyKey: 'idemp-pause-stale',
    data: {
      command: 'pause',
      expectedVersion: 1 // Actual is 2
    }
  };

  await assert.rejects(async () => {
    await service.handleCommand(staleCmd);
  }, /Version conflict/);

  // 4. Valid next command (pause) -> Success
  const validPauseCmd: CommandEnvelope<LifecycleCommandPayload> = {
    ...envelope,
    eventId: 'cmd-003',
    idempotencyKey: 'idemp-pause-valid',
    data: {
      command: 'pause',
      expectedVersion: 2
    }
  };

  const res3 = await service.handleCommand(validPauseCmd);
  assert.strictEqual(res3.success, true);
  assert.strictEqual(res3.event.data.newState, 'paused');
  assert.strictEqual(res3.event.data.version, 3);
  assert.strictEqual(store.outbox.length, 2);

  console.log('G-CORE-053: All Transport & Outbox Integration Tests PASSED cleanly.');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
