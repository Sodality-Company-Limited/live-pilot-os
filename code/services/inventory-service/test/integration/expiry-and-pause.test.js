import assert from 'node:assert/strict';
import { InventoryService } from '../../src/service/inventory-service.js';
import { InventoryExpiryWorker } from '../../src/workers/expiry-worker.js';
import { InventoryReservation } from '../../src/domain/inventory-aggregate.js';

class MockWorkerTransaction {
  constructor(db) {
    this.db = db;
  }

  async findExpiredActiveReservations(asOf) {
    const res = [];
    for (const r of this.db.reservations.values()) {
      if (r.status === 'reserved' && new Date(r.expires_at) <= asOf) {
        res.push(r);
      }
    }
    return res;
  }

  async findItemForUpdate(tenant_id, sku) {
    const key = `${tenant_id}:${sku}`;
    const raw = this.db.items.get(key);
    return raw ? { ...raw } : null;
  }

  async updateItem(item) {
    const key = `${item.tenant_id}:${item.sku}`;
    this.db.items.set(key, {
      tenant_id: item.tenant_id,
      sku: item.sku,
      total_stock: item.total_stock,
      reserved_stock: item.reserved_stock,
      version: item.version
    });
  }

  async updateReservation(res) {
    this.db.reservations.set(res.reservation_id, res);
  }

  async writeOutbox(entry) {
    this.db.outbox.push(entry);
  }
}

class MockWorkerRepository {
  constructor() {
    this.items = new Map();
    this.reservations = new Map();
    this.outbox = [];
    this.idempotency = new Map();
    this.isPaused = false;
  }

  async findIdempotency(tenant_id, idempotency_key) {
    return this.idempotency.get(`${tenant_id}:${idempotency_key}`) || null;
  }

  async isEmergencyPaused() {
    return this.isPaused;
  }

  async runInTransaction(fn) {
    const tx = new MockWorkerTransaction(this);
    return await fn(tx);
  }
}

async function runWorkerTests() {
  console.log('🧪 Verifying Inventory Expiry Worker & Emergency Pause Controls...');

  const repo = new MockWorkerRepository();
  repo.items.set('tenant_test:SKU_LIPSTICK', {
    tenant_id: 'tenant_test',
    sku: 'SKU_LIPSTICK',
    total_stock: 10,
    reserved_stock: 4,
    version: 1
  });

  const reservation = new InventoryReservation({
    reservation_id: 'res_001',
    tenant_id: 'tenant_test',
    session_id: 'session_01',
    sku: 'SKU_LIPSTICK',
    quantity: 4,
    expires_at: new Date(Date.now() - 1000).toISOString(), // Already expired
    status: 'reserved'
  });
  repo.reservations.set('res_001', reservation);

  const worker = new InventoryExpiryWorker({ repository: repo });
  const swept = await worker.sweepExpiredReservations();

  assert.equal(swept.length, 1);
  assert.equal(swept[0], 'res_001');

  const updatedItem = repo.items.get('tenant_test:SKU_LIPSTICK');
  assert.equal(updatedItem.reserved_stock, 0);
  assert.equal(updatedItem.total_stock - updatedItem.reserved_stock, 10);
  console.log('  ✅ Expired reservation swept and available stock restored to 10');

  // Test Emergency Pause
  repo.isPaused = true;
  const service = new InventoryService({ repository: repo });
  const req = {
    correlation_id: '11111111-2222-3333-4444-555555555555',
    causation_id: '22222222-3333-4444-5555-666666666666',
    tenant_id: 'tenant_test',
    session_id: 'session_01',
    idempotency_key: 'idem_paused_01',
    sku: 'SKU_LIPSTICK',
    quantity: 1,
    ttl_seconds: 300
  };

  const reply = await service.handleReservationRequest(req);
  assert.equal(reply.success, false);
  assert.equal(reply.status, 'paused');
  assert.equal(reply.error_code, 'LP13005');
  console.log('  ✅ Emergency pause fail-closed reservation lock verified (LP13005)');

  console.log('✨ Inventory Reliability & Expiry Verification Passed 100%!');
}

runWorkerTests();
