import assert from 'node:assert/strict';
import { InventoryItem, InventoryReservation } from '../../src/domain/inventory-aggregate.js';

function runUnitTests() {
  console.log('🧪 Verifying Inventory State Machine & Domain Invariants...');

  // 1. Initial State & Conservation Law
  const item = new InventoryItem({
    tenant_id: 'tenant_live_demo',
    sku: 'SKU_LIPSTICK_RED',
    total_stock: 10,
    reserved_stock: 0
  });
  assert.equal(item.available_stock, 10);
  console.log('  ✅ Initial available stock verified');

  // 2. State Transition: Reserve Stock
  item.reserve(3);
  assert.equal(item.reserved_stock, 3);
  assert.equal(item.available_stock, 7);
  assert.equal(item.version, 2);
  console.log('  ✅ Reservation state transition and version increment verified');

  // 3. Overselling Prevention Fail-Closed
  assert.throws(() => item.reserve(8), (err) => {
    assert.equal(err.code, 'LP13001');
    return true;
  });
  assert.equal(item.reserved_stock, 3, 'Reserved stock must not change on failed reservation');
  assert.equal(item.available_stock, 7, 'Available stock must remain intact');
  console.log('  ✅ Overselling prevented fail-closed with LP13001 error');

  // 4. Release Stock (e.g. Voucher Cancelled or Expired)
  item.release(1);
  assert.equal(item.reserved_stock, 2);
  assert.equal(item.available_stock, 8);
  console.log('  ✅ Release stock restored available capacity');

  // 5. Commit Stock (e.g. Order Paid)
  item.commit(2);
  assert.equal(item.total_stock, 8);
  assert.equal(item.reserved_stock, 0);
  assert.equal(item.available_stock, 8);
  console.log('  ✅ Commit stock permanently consumed items');

  // 6. Reservation FSM Transitions
  const res = new InventoryReservation({
    reservation_id: '11111111-2222-3333-4444-555555555555',
    tenant_id: 'tenant_live_demo',
    session_id: 'session_01',
    sku: 'SKU_LIPSTICK_RED',
    quantity: 2,
    expires_at: new Date(Date.now() + 60000).toISOString()
  });
  assert.equal(res.status, 'requested');

  res.markReserved();
  assert.equal(res.status, 'reserved');

  res.markCommitted();
  assert.equal(res.status, 'committed');

  // 7. Reject Illegal Transition from committed -> expired
  assert.throws(() => res.markExpired(), /Invalid transition from committed to expired/);
  console.log('  ✅ Illegal FSM transition rejected fail-closed');

  console.log('✨ Inventory State Machine & Domain Invariants Passed 100%!');
}

runUnitTests();
