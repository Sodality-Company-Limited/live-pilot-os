import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InventoryBoundaryError,
  isInventoryReservationUsable,
  validateInventoryReservationResult,
  type InventoryReservationResult,
} from '../../code/apps/services/promotion-service/src/adapters/outbound/inventory.port';
import { InventoryResultConsumer } from '../../code/apps/services/promotion-service/src/adapters/inbound/inventory-result.consumer';

const base: InventoryReservationResult = {
  schemaVersion: '1.0.0', reservationId: 'reservation-1', promotionId: 'promotion-1',
  tenantId: 'tenant-1', sessionId: 'session-1', sku: 'sku-1', quantity: 1,
  outcome: 'accepted', revision: 3, expiresAt: '2099-01-01T00:00:00.000Z',
  idempotencyKey: 'reserve:reservation-1', idempotencyFingerprint: 'a'.repeat(64),
  correlationId: 'correlation-1', causationId: 'command-1', observedAt: '2026-11-21T00:00:00.000Z',
  reconciliationRequired: false,
};

test('accepts a current reservation and rejects expired acceptance', () => {
  validateInventoryReservationResult(base);
  assert.equal(isInventoryReservationUsable(base, '2026-11-21T00:00:01.000Z'), true);
  assert.throws(() => validateInventoryReservationResult({ ...base, expiresAt: '2020-01-01T00:00:00.000Z' }), InventoryBoundaryError);
});

test('requires explicit reconciliation for unknown and preserves released/insufficient outcomes', () => {
  assert.throws(() => validateInventoryReservationResult({ ...base, outcome: 'unknown' }), /reconciliation/);
  for (const outcome of ['released', 'insufficient'] as const) {
    validateInventoryReservationResult({ ...base, outcome });
  }
});

test('deduplicates the same fact, rejects revision regression, and reconciles unknown once', async () => {
  const observations: string[] = [];
  let reconciliations = 0;
  const consumer = new InventoryResultConsumer({
    onResult: async ({ action, duplicate }) => { observations.push(`${action}:${duplicate}`); },
    reconcile: async () => { reconciliations += 1; },
  });
  const event = { ...base, messageId: 'event-1' };
  assert.equal((await consumer.consume(event)).duplicate, false);
  assert.equal((await consumer.consume(event)).duplicate, true);
  await assert.rejects(() => consumer.consume({ ...event, messageId: 'event-2', revision: 2 }), /regressed/);
  await assert.rejects(() => consumer.consume({ ...event, messageId: 'event-conflict', outcome: 'released' }), /conflicting evidence/);
  const unknown = { ...base, messageId: 'event-3', revision: 4, outcome: 'unknown' as const, reconciliationRequired: true };
  await consumer.consume(unknown);
  await consumer.consume(unknown);
  assert.deepEqual(observations, ['accepted:false', 'accepted:true', 'reconciliation_required:false', 'reconciliation_required:true']);
  assert.equal(reconciliations, 1);
});
