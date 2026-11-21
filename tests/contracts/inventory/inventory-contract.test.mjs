import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function loadSchema(filename) {
  const p = path.resolve('docs/03-architecture/api/schemas/nats', filename);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function validateUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function validateISODate(str) {
  return typeof str === 'string' && !isNaN(Date.parse(str));
}

function validateReservationRequest(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');
  
  const required = ['correlation_id', 'causation_id', 'tenant_id', 'session_id', 'idempotency_key', 'sku', 'quantity', 'ttl_seconds'];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  assert.ok(validateUUID(payload.correlation_id), 'correlation_id must be a valid UUID');
  assert.ok(validateUUID(payload.causation_id), 'causation_id must be a valid UUID');
  assert.ok(typeof payload.tenant_id === 'string' && payload.tenant_id.length >= 1, 'tenant_id must be valid');
  assert.ok(typeof payload.session_id === 'string' && payload.session_id.length >= 1, 'session_id must be valid');
  assert.ok(typeof payload.idempotency_key === 'string' && payload.idempotency_key.length >= 8, 'idempotency_key must be >= 8 chars');
  assert.ok(typeof payload.sku === 'string' && payload.sku.length >= 1, 'sku must be valid');
  assert.ok(Number.isInteger(payload.quantity) && payload.quantity >= 1, 'quantity must be integer >= 1');
  assert.ok(Number.isInteger(payload.ttl_seconds) && payload.ttl_seconds >= 10 && payload.ttl_seconds <= 3600, 'ttl_seconds must be between 10 and 3600');
  
  return true;
}

function validateReservationReply(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');
  
  const required = ['correlation_id', 'success', 'tenant_id', 'sku'];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  assert.ok(validateUUID(payload.correlation_id), 'correlation_id must be a valid UUID');
  assert.equal(typeof payload.success, 'boolean', 'success must be a boolean');
  assert.ok(typeof payload.tenant_id === 'string' && payload.tenant_id.length >= 1, 'tenant_id must be valid');
  assert.ok(typeof payload.sku === 'string' && payload.sku.length >= 1, 'sku must be valid');

  if (payload.success) {
    assert.ok(validateUUID(payload.reservation_id), 'reservation_id must be UUID on success');
    assert.equal(payload.status, 'reserved', 'status must be reserved on success');
    assert.ok(Number.isInteger(payload.quantity_reserved) && payload.quantity_reserved >= 1, 'quantity_reserved must be >= 1');
    assert.ok(Number.isInteger(payload.available_stock) && payload.available_stock >= 0, 'available_stock must be non-negative integer');
    assert.ok(validateISODate(payload.expires_at), 'expires_at must be valid ISO date-time');
  } else {
    assert.ok(['conflict', 'refused', 'paused'].includes(payload.status), 'status must be conflict/refused/paused on failure');
    assert.ok(typeof payload.error_code === 'string' && /^LP[0-9]{5}$/.test(payload.error_code), 'error_code must match LPxxxxx format');
  }

  return true;
}

function validateStockUpdated(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');

  const required = ['event_id', 'timestamp', 'tenant_id', 'sku', 'total_stock', 'reserved_stock', 'available_stock', 'version', 'reason'];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  assert.ok(validateUUID(payload.event_id), 'event_id must be a valid UUID');
  assert.ok(validateISODate(payload.timestamp), 'timestamp must be valid ISO date-time');
  assert.ok(typeof payload.tenant_id === 'string' && payload.tenant_id.length >= 1, 'tenant_id must be valid');
  assert.ok(typeof payload.sku === 'string' && payload.sku.length >= 1, 'sku must be valid');
  assert.ok(Number.isInteger(payload.total_stock) && payload.total_stock >= 0, 'total_stock must be integer >= 0');
  assert.ok(Number.isInteger(payload.reserved_stock) && payload.reserved_stock >= 0, 'reserved_stock must be integer >= 0');
  assert.ok(Number.isInteger(payload.available_stock) && payload.available_stock >= 0, 'available_stock must be integer >= 0');
  assert.equal(payload.total_stock, payload.reserved_stock + payload.available_stock, 'Conservation Law: total_stock == reserved_stock + available_stock');
  assert.ok(Number.isInteger(payload.version) && payload.version >= 1, 'version must be integer >= 1');
  assert.ok(['reserved', 'released', 'committed', 'expired', 'adjusted'].includes(payload.reason), 'reason must be valid enum');

  return true;
}

async function runTests() {
  console.log('🧪 Running Inventory Service Contract Compatibility Test Suite...');

  // 1. Positive Request
  const validRequest = {
    correlation_id: '11111111-2222-3333-4444-555555555555',
    causation_id: '66666666-7777-8888-9999-000000000000',
    tenant_id: 'tenant_live_demo',
    session_id: 'session_stream_01',
    idempotency_key: 'idem_req_key_99999',
    sku: 'SKU_PREMIUM_LIPSTICK_01',
    quantity: 2,
    ttl_seconds: 300
  };
  assert.doesNotThrow(() => validateReservationRequest(validRequest));
  console.log('  ✅ Positive Request Validation Passed');

  // 2. Negative Request: Negative Quantity
  const negativeQtyRequest = { ...validRequest, quantity: -5 };
  assert.throws(() => validateReservationRequest(negativeQtyRequest), /quantity must be integer >= 1/);
  console.log('  ✅ Negative Quantity Rejected');

  // 3. Negative Request: Missing Idempotency Key
  const missingIdemRequest = { ...validRequest };
  delete missingIdemRequest.idempotency_key;
  assert.throws(() => validateReservationRequest(missingIdemRequest), /Missing required field: idempotency_key/);
  console.log('  ✅ Missing Idempotency Key Rejected');

  // 4. Positive Reply (Success)
  const validReplySuccess = {
    correlation_id: validRequest.correlation_id,
    success: true,
    tenant_id: 'tenant_live_demo',
    sku: 'SKU_PREMIUM_LIPSTICK_01',
    reservation_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    status: 'reserved',
    quantity_reserved: 2,
    available_stock: 48,
    expires_at: new Date(Date.now() + 300000).toISOString()
  };
  assert.doesNotThrow(() => validateReservationReply(validReplySuccess));
  console.log('  ✅ Positive Reply (Success) Validation Passed');

  // 5. Positive Reply (Failure / Conflict)
  const validReplyConflict = {
    correlation_id: validRequest.correlation_id,
    success: false,
    tenant_id: 'tenant_live_demo',
    sku: 'SKU_PREMIUM_LIPSTICK_01',
    status: 'conflict',
    error_code: 'LP13001',
    error_message: 'Insufficient inventory stock'
  };
  assert.doesNotThrow(() => validateReservationReply(validReplyConflict));
  console.log('  ✅ Positive Reply (Conflict Error) Validation Passed');

  // 6. Positive Stock Updated Event & Conservation Law
  const validStockEvent = {
    event_id: '12345678-1234-1234-1234-123456789012',
    timestamp: new Date().toISOString(),
    tenant_id: 'tenant_live_demo',
    sku: 'SKU_PREMIUM_LIPSTICK_01',
    total_stock: 50,
    reserved_stock: 2,
    available_stock: 48,
    version: 3,
    reason: 'reserved'
  };
  assert.doesNotThrow(() => validateStockUpdated(validStockEvent));
  console.log('  ✅ Stock Updated Event & Conservation Law (total == reserved + available) Passed');

  // 7. Negative Stock Conservation Law Violation
  const illegalStockEvent = { ...validStockEvent, available_stock: 40 }; // 2 + 40 != 50
  assert.throws(() => validateStockUpdated(illegalStockEvent), /Conservation Law/);
  console.log('  ✅ Conservation Law Violation Rejected Fail-Closed');

  console.log('✨ All Inventory Service Contract Tests Passed 100% Cleanly!');
}

runTests();
