import assert from 'node:assert/strict';
import { InventoryService } from '../../src/service/inventory-service.js';

class MockDatabaseTransaction {
  constructor(db) {
    this.db = db;
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

  async createReservation(res) {
    this.db.reservations.set(res.reservation_id, res);
  }

  async writeOutbox(entry) {
    this.db.outbox.push(entry);
  }

  async saveIdempotency(record) {
    const key = `${record.tenant_id}:${record.idempotency_key}`;
    this.db.idempotency.set(key, record);
  }
}

class MockInventoryRepository {
  constructor() {
    this.items = new Map();
    this.reservations = new Map();
    this.outbox = [];
    this.idempotency = new Map();
    this.isPaused = false;
  }

  async findIdempotency(tenant_id, idempotency_key) {
    const key = `${tenant_id}:${idempotency_key}`;
    return this.idempotency.get(key) || null;
  }

  async isEmergencyPaused() {
    return this.isPaused;
  }

  async runInTransaction(fn) {
    const tx = new MockDatabaseTransaction(this);
    return await fn(tx);
  }
}

async function runIntegrationTest() {
  console.log('🧪 Verifying Inventory Service Vertical Slice: Reservation Flow...');

  const repo = new MockInventoryRepository();
  repo.items.set('tenant_test:SKU_LIPSTICK', {
    tenant_id: 'tenant_test',
    sku: 'SKU_LIPSTICK',
    total_stock: 5,
    reserved_stock: 0,
    version: 1
  });

  const service = new InventoryService({ repository: repo });

  // 1. Successful Reservation Flow
  const req1 = {
    correlation_id: '11111111-1111-1111-1111-111111111111',
    causation_id: '22222222-2222-2222-2222-222222222222',
    tenant_id: 'tenant_test',
    session_id: 'session_01',
    idempotency_key: 'idem_key_001',
    sku: 'SKU_LIPSTICK',
    quantity: 2,
    ttl_seconds: 300
  };

  const reply1 = await service.handleReservationRequest(req1);
  assert.equal(reply1.success, true);
  assert.equal(reply1.status, 'reserved');
  assert.equal(reply1.quantity_reserved, 2);
  assert.equal(reply1.available_stock, 3);
  assert.equal(repo.outbox.length, 1);
  assert.equal(repo.outbox[0].payload.available_stock, 3);
  console.log('  ✅ End-to-end reservation and outbox commit passed');

  // 2. Idempotent Retry Test
  const reply1Duplicate = await service.handleReservationRequest(req1);
  assert.deepEqual(reply1Duplicate, reply1);
  assert.equal(repo.outbox.length, 1, 'Outbox must NOT duplicate on idempotent retry');
  console.log('  ✅ Idempotent retry returned cached receipt with zero duplicate mutations');

  // 3. Insufficient Stock Conflict
  const req2 = {
    ...req1,
    idempotency_key: 'idem_key_002',
    quantity: 4 // Only 3 left
  };
  const reply2 = await service.handleReservationRequest(req2);
  assert.equal(reply2.success, false);
  assert.equal(reply2.status, 'conflict');
  assert.equal(reply2.error_code, 'LP13001');
  console.log('  ✅ Insufficient stock correctly returned LP13001 conflict');

  console.log('✨ Inventory Vertical Slice Integration Test Passed 100%!');
}

runIntegrationTest();
