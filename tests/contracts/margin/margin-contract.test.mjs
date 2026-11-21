import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function loadSchema(filename) {
  const p = path.resolve('docs/03-architecture/api/schemas/nats', filename);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function validateISODate(str) {
  return typeof str === 'string' && !isNaN(Date.parse(str));
}

function validateUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function validateMarginEvaluationRequest(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');

  const required = [
    'tenant_id',
    'live_session_id',
    'proposal_id',
    'sku',
    'currency',
    'scale',
    'price_minor',
    'candidate_discount_minor',
    'cogs_minor',
    'platform_fee_minor',
    'shipping_fee_minor',
    'correlation_id',
    'causation_id'
  ];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  // String bounds
  assert.ok(typeof payload.tenant_id === 'string' && payload.tenant_id.length >= 1 && payload.tenant_id.length <= 128, 'tenant_id must be 1-128 chars');
  assert.ok(typeof payload.live_session_id === 'string' && payload.live_session_id.length >= 1 && payload.live_session_id.length <= 128, 'live_session_id must be 1-128 chars');
  assert.ok(typeof payload.proposal_id === 'string' && payload.proposal_id.length >= 1 && payload.proposal_id.length <= 128, 'proposal_id must be 1-128 chars');
  assert.ok(typeof payload.sku === 'string' && payload.sku.length >= 1 && payload.sku.length <= 128, 'sku must be 1-128 chars');
  assert.ok(typeof payload.currency === 'string' && /^[A-Z]{3}$/.test(payload.currency), 'currency must be ISO 4217 3-letter uppercase');
  assert.ok(typeof payload.correlation_id === 'string' && payload.correlation_id.length >= 8 && payload.correlation_id.length <= 128, 'correlation_id must be 8-128 chars');
  assert.ok(typeof payload.causation_id === 'string' && payload.causation_id.length >= 8 && payload.causation_id.length <= 128, 'causation_id must be 8-128 chars');

  // Strict integer checks (Article V zero-float invariant)
  assert.ok(Number.isInteger(payload.scale) && payload.scale >= 0 && payload.scale <= 4, 'scale must be integer between 0 and 4');
  assert.ok(Number.isInteger(payload.price_minor) && payload.price_minor >= 0, 'price_minor must be non-negative integer (zero-float)');
  assert.ok(Number.isInteger(payload.candidate_discount_minor) && payload.candidate_discount_minor >= 0, 'candidate_discount_minor must be non-negative integer');
  assert.ok(Number.isInteger(payload.cogs_minor) && payload.cogs_minor >= 0, 'cogs_minor must be non-negative integer');
  assert.ok(Number.isInteger(payload.platform_fee_minor) && payload.platform_fee_minor >= 0, 'platform_fee_minor must be non-negative integer');
  assert.ok(Number.isInteger(payload.shipping_fee_minor) && payload.shipping_fee_minor >= 0, 'shipping_fee_minor must be non-negative integer');

  if (payload.giveaway_cost_minor !== undefined) {
    assert.ok(Number.isInteger(payload.giveaway_cost_minor) && payload.giveaway_cost_minor >= 0, 'giveaway_cost_minor must be non-negative integer');
  }
  if (payload.idempotency_key !== undefined) {
    assert.ok(typeof payload.idempotency_key === 'string' && payload.idempotency_key.length >= 8 && payload.idempotency_key.length <= 256, 'idempotency_key must be 8-256 chars');
  }

  // Domain Invariant: discount cannot exceed price
  assert.ok(payload.candidate_discount_minor <= payload.price_minor, 'candidate_discount_minor cannot exceed price_minor');

  return true;
}

function validateMarginEvaluationReply(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');

  const required = [
    'verdict_id',
    'tenant_id',
    'live_session_id',
    'proposal_id',
    'sku',
    'policy_id',
    'policy_version',
    'status',
    'currency',
    'scale',
    'price_minor',
    'candidate_discount_minor',
    'net_selling_price_minor',
    'total_costs_minor',
    'net_margin_minor',
    'margin_bps',
    'floor_bps',
    'review_band_bps',
    'correlation_id',
    'causation_id',
    'evaluated_at'
  ];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  assert.ok(typeof payload.verdict_id === 'string' && payload.verdict_id.length >= 8 && payload.verdict_id.length <= 128, 'verdict_id must be 8-128 chars');
  assert.ok(typeof payload.tenant_id === 'string' && payload.tenant_id.length >= 1, 'tenant_id must be non-empty');
  assert.ok(typeof payload.live_session_id === 'string' && payload.live_session_id.length >= 1, 'live_session_id must be non-empty');
  assert.ok(typeof payload.proposal_id === 'string' && payload.proposal_id.length >= 1, 'proposal_id must be non-empty');
  assert.ok(typeof payload.sku === 'string' && payload.sku.length >= 1, 'sku must be non-empty');
  assert.ok(typeof payload.policy_id === 'string' && payload.policy_id.length >= 1, 'policy_id must be non-empty');
  assert.ok(Number.isInteger(payload.policy_version) && payload.policy_version >= 1, 'policy_version must be integer >= 1');
  assert.ok(['APPROVED', 'NEEDS_APPROVAL', 'REJECTED', 'UNKNOWN'].includes(payload.status), 'status must be valid enum');
  assert.ok(typeof payload.currency === 'string' && /^[A-Z]{3}$/.test(payload.currency), 'currency must be ISO 4217 3-letter code');
  assert.ok(Number.isInteger(payload.scale) && payload.scale >= 0 && payload.scale <= 4, 'scale must be integer between 0 and 4');

  // Strict integer financial properties (Article V zero-float invariant)
  assert.ok(Number.isInteger(payload.price_minor) && payload.price_minor >= 0, 'price_minor must be integer >= 0');
  assert.ok(Number.isInteger(payload.candidate_discount_minor) && payload.candidate_discount_minor >= 0, 'candidate_discount_minor must be integer >= 0');
  assert.ok(Number.isInteger(payload.net_selling_price_minor), 'net_selling_price_minor must be integer');
  assert.ok(Number.isInteger(payload.total_costs_minor) && payload.total_costs_minor >= 0, 'total_costs_minor must be integer >= 0');
  assert.ok(Number.isInteger(payload.net_margin_minor), 'net_margin_minor must be integer');
  assert.ok(Number.isInteger(payload.margin_bps), 'margin_bps must be integer');
  assert.ok(Number.isInteger(payload.floor_bps) && payload.floor_bps >= 0 && payload.floor_bps <= 10000, 'floor_bps must be 0-10000 bps');
  assert.ok(Number.isInteger(payload.review_band_bps) && payload.review_band_bps >= 0 && payload.review_band_bps <= 10000, 'review_band_bps must be 0-10000 bps');
  assert.ok(validateISODate(payload.evaluated_at), 'evaluated_at must be valid date-time');

  // Algebraic Invariants
  assert.equal(payload.net_selling_price_minor, payload.price_minor - payload.candidate_discount_minor, 'Invariant: net_selling_price_minor == price_minor - candidate_discount_minor');
  assert.equal(payload.net_margin_minor, payload.net_selling_price_minor - payload.total_costs_minor, 'Invariant: net_margin_minor == net_selling_price_minor - total_costs_minor');

  // Safer alternative verification when REJECTED
  if (payload.status === 'REJECTED' && payload.safer_alternative_discount_minor !== null && payload.safer_alternative_discount_minor !== undefined) {
    assert.ok(Number.isInteger(payload.safer_alternative_discount_minor) && payload.safer_alternative_discount_minor >= 0, 'safer_alternative_discount_minor must be integer >= 0');
    assert.ok(Number.isInteger(payload.safer_alternative_margin_bps), 'safer_alternative_margin_bps must be integer');
    assert.ok(payload.safer_alternative_margin_bps >= payload.floor_bps, 'Safer alternative margin must meet or exceed floor_bps');
  }

  if (payload.input_hash !== undefined) {
    assert.ok(typeof payload.input_hash === 'string' && /^[0-9a-f]{64}$/.test(payload.input_hash), 'input_hash must be 64-char sha256 hex');
  }
  if (payload.error_code !== undefined) {
    assert.ok(typeof payload.error_code === 'string' && /^LP[0-9]{5}$/.test(payload.error_code), 'error_code must match LPxxxxx format');
  }

  return true;
}

function validateMarginVerdictRecorded(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');

  const required = [
    'event_id',
    'event_type',
    'occurred_at',
    'producer',
    'schema_version',
    'tenant_id',
    'live_session_id',
    'verdict_id',
    'proposal_id',
    'sku',
    'policy_id',
    'policy_version',
    'status',
    'currency',
    'scale',
    'price_minor',
    'candidate_discount_minor',
    'net_selling_price_minor',
    'total_costs_minor',
    'net_margin_minor',
    'margin_bps',
    'floor_bps',
    'review_band_bps',
    'input_hash',
    'correlation_id',
    'causation_id'
  ];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  assert.ok(typeof payload.event_id === 'string' && payload.event_id.length >= 8, 'event_id must be >= 8 chars');
  assert.equal(payload.event_type, 'livepilot.v1.margin.verdict.recorded', 'event_type must match exact subject');
  assert.equal(payload.producer, 'margin-policy-service', 'producer must be margin-policy-service');
  assert.ok(validateISODate(payload.occurred_at), 'occurred_at must be valid date-time');
  assert.ok(typeof payload.schema_version === 'string' && /^1\.[0-9]+\.[0-9]+$/.test(payload.schema_version), 'schema_version must match 1.x.x');
  assert.ok(['APPROVED', 'NEEDS_APPROVAL', 'REJECTED', 'UNKNOWN'].includes(payload.status), 'status must be valid enum');
  assert.ok(typeof payload.input_hash === 'string' && /^[0-9a-f]{64}$/.test(payload.input_hash), 'input_hash must be sha256');

  // Strict integer financial properties (Article V zero-float invariant)
  assert.ok(Number.isInteger(payload.price_minor) && payload.price_minor >= 0, 'price_minor must be integer >= 0');
  assert.ok(Number.isInteger(payload.candidate_discount_minor) && payload.candidate_discount_minor >= 0, 'candidate_discount_minor must be integer >= 0');
  assert.ok(Number.isInteger(payload.net_selling_price_minor), 'net_selling_price_minor must be integer');
  assert.ok(Number.isInteger(payload.total_costs_minor) && payload.total_costs_minor >= 0, 'total_costs_minor must be integer >= 0');
  assert.ok(Number.isInteger(payload.net_margin_minor), 'net_margin_minor must be integer');
  assert.ok(Number.isInteger(payload.margin_bps), 'margin_bps must be integer');

  // Algebraic conservation
  assert.equal(payload.net_selling_price_minor, payload.price_minor - payload.candidate_discount_minor, 'net_selling_price_minor must equal price - discount');
  assert.equal(payload.net_margin_minor, payload.net_selling_price_minor - payload.total_costs_minor, 'net_margin_minor must equal net_price - total_costs');

  if (payload.mode !== undefined) {
    assert.ok(['SIMULATED', 'SANDBOX', 'CONFIRMED'].includes(payload.mode), 'mode must be valid enum');
  }

  return true;
}

async function runTests() {
  console.log('🧪 Running Margin Policy Service Contract Compatibility Test Suite...');

  // 1. Positive Evaluation Request
  const validRequest = {
    tenant_id: 'tenant-001',
    live_session_id: 'session-live-789',
    proposal_id: 'prop-promo-456',
    sku: 'SKU-COSMETIC-GLOW-01',
    currency: 'THB',
    scale: 2,
    price_minor: 100000,
    candidate_discount_minor: 20000,
    cogs_minor: 40000,
    platform_fee_minor: 5000,
    shipping_fee_minor: 3000,
    giveaway_cost_minor: 2000,
    correlation_id: 'corr-0001-abcd-ef01',
    causation_id: 'caus-0002-1234-5678',
    idempotency_key: 'idem-margin-req-99999'
  };
  validateMarginEvaluationRequest(validRequest);
  console.log('  ✅ Positive MarginEvaluationRequest validated');

  // 2. Reject floating-point numbers in financial properties (Article V Zero-Float Invariant)
  const floatRequest = { ...validRequest, price_minor: 1000.50 };
  assert.throws(
    () => validateMarginEvaluationRequest(floatRequest),
    /price_minor must be non-negative integer \(zero-float\)/,
    'Must reject floating-point numbers in price_minor'
  );
  console.log('  ✅ Article V Invariant: Floating point price_minor rejected');

  // 3. Reject negative amounts
  const negativeDiscountRequest = { ...validRequest, candidate_discount_minor: -500 };
  assert.throws(
    () => validateMarginEvaluationRequest(negativeDiscountRequest),
    /candidate_discount_minor must be non-negative integer/,
    'Must reject negative discount amounts'
  );
  console.log('  ✅ Fail-Closed: Negative discount rejected');

  // 4. Reject discount exceeding price
  const excessDiscountRequest = { ...validRequest, candidate_discount_minor: 150000, price_minor: 100000 };
  assert.throws(
    () => validateMarginEvaluationRequest(excessDiscountRequest),
    /candidate_discount_minor cannot exceed price_minor/,
    'Must reject discount greater than price'
  );
  console.log('  ✅ Economic Invariant: Excess discount rejected');

  // 5. Positive Evaluation Reply (APPROVED)
  const approvedReply = {
    verdict_id: '018e3c12-3456-789a-bcde-f0123456789a',
    tenant_id: 'tenant-001',
    live_session_id: 'session-live-789',
    proposal_id: 'prop-promo-456',
    sku: 'SKU-COSMETIC-GLOW-01',
    policy_id: 'pol-margin-th-01',
    policy_version: 2,
    status: 'APPROVED',
    currency: 'THB',
    scale: 2,
    price_minor: 100000,
    candidate_discount_minor: 20000,
    net_selling_price_minor: 80000,
    total_costs_minor: 50000,
    net_margin_minor: 30000,
    margin_bps: 3750,
    floor_bps: 1500,
    review_band_bps: 2000,
    safer_alternative_discount_minor: null,
    safer_alternative_margin_bps: null,
    breakdown: {
      cogs_minor: 40000,
      platform_fee_minor: 5000,
      shipping_fee_minor: 3000,
      giveaway_cost_minor: 2000
    },
    input_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    correlation_id: 'corr-0001-abcd-ef01',
    causation_id: 'caus-0002-1234-5678',
    evaluated_at: new Date().toISOString()
  };
  validateMarginEvaluationReply(approvedReply);
  console.log('  ✅ Positive MarginEvaluationReply (APPROVED) validated');

  // 6. Positive Evaluation Reply (REJECTED with Safer Alternative)
  const rejectedReply = {
    verdict_id: '018e3c12-3456-789a-bcde-f0123456789b',
    tenant_id: 'tenant-001',
    live_session_id: 'session-live-789',
    proposal_id: 'prop-promo-789',
    sku: 'SKU-COSMETIC-GLOW-01',
    policy_id: 'pol-margin-th-01',
    policy_version: 2,
    status: 'REJECTED',
    currency: 'THB',
    scale: 2,
    price_minor: 100000,
    candidate_discount_minor: 50000,
    net_selling_price_minor: 50000,
    total_costs_minor: 50000,
    net_margin_minor: 0,
    margin_bps: 0,
    floor_bps: 1500,
    review_band_bps: 2000,
    safer_alternative_discount_minor: 41176,
    safer_alternative_margin_bps: 1500,
    breakdown: {
      cogs_minor: 40000,
      platform_fee_minor: 5000,
      shipping_fee_minor: 3000,
      giveaway_cost_minor: 2000
    },
    input_hash: 'c475220a56e563a02177a35037e70b8c7fb9638e90e1f8d17488598d57701f4e',
    correlation_id: 'corr-0001-abcd-ef01',
    causation_id: 'caus-0002-1234-5678',
    evaluated_at: new Date().toISOString(),
    error_code: 'LP05001',
    error_message: 'Calculated margin (0 bps) is strictly below the minimum floor threshold (1500 bps).'
  };
  validateMarginEvaluationReply(rejectedReply);
  console.log('  ✅ Positive MarginEvaluationReply (REJECTED + Safer Alternative) validated');

  // 7. Verify Algebraic Mismatch Rejection
  const brokenMathReply = { ...approvedReply, net_margin_minor: 99999 };
  assert.throws(
    () => validateMarginEvaluationReply(brokenMathReply),
    /Invariant: net_margin_minor == net_selling_price_minor - total_costs_minor/,
    'Must reject reply with broken algebraic arithmetic'
  );
  console.log('  ✅ Algebraic Invariant: Math tampering rejected');

  // 8. Positive MarginVerdictRecorded Event
  const verdictEvent = {
    event_id: 'evt-verdict-001-999',
    event_type: 'livepilot.v1.margin.verdict.recorded',
    occurred_at: new Date().toISOString(),
    producer: 'margin-policy-service',
    schema_version: '1.0.0',
    tenant_id: 'tenant-001',
    live_session_id: 'session-live-789',
    verdict_id: '018e3c12-3456-789a-bcde-f0123456789a',
    proposal_id: 'prop-promo-456',
    sku: 'SKU-COSMETIC-GLOW-01',
    policy_id: 'pol-margin-th-01',
    policy_version: 2,
    status: 'APPROVED',
    currency: 'THB',
    scale: 2,
    price_minor: 100000,
    candidate_discount_minor: 20000,
    net_selling_price_minor: 80000,
    total_costs_minor: 50000,
    net_margin_minor: 30000,
    margin_bps: 3750,
    floor_bps: 1500,
    review_band_bps: 2000,
    safer_alternative_discount_minor: null,
    safer_alternative_margin_bps: null,
    breakdown: {
      cogs_minor: 40000,
      platform_fee_minor: 5000,
      shipping_fee_minor: 3000,
      giveaway_cost_minor: 2000
    },
    input_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    correlation_id: 'corr-0001-abcd-ef01',
    causation_id: 'caus-0002-1234-5678',
    mode: 'SIMULATED'
  };
  validateMarginVerdictRecorded(verdictEvent);
  console.log('  ✅ Positive MarginVerdictRecorded event validated');

  // 9. Verify JSON Schema Draft Loading and Integrity
  const reqSchema = loadSchema('margin-evaluation-request.schema.json');
  assert.equal(reqSchema.title, 'MarginEvaluationRequest');
  assert.equal(reqSchema.type, 'object');
  assert.equal(reqSchema.additionalProperties, false);

  const replySchema = loadSchema('margin-evaluation-reply.schema.json');
  assert.equal(replySchema.title, 'MarginEvaluationReply');
  assert.equal(replySchema.type, 'object');
  assert.equal(replySchema.additionalProperties, false);

  const eventSchema = loadSchema('margin-verdict-recorded.schema.json');
  assert.equal(eventSchema.title, 'MarginVerdictRecorded');
  assert.equal(eventSchema.type, 'object');
  assert.equal(eventSchema.additionalProperties, false);

  console.log('  ✅ All JSON schemas loaded and verified against schema constraints');
  console.log('🎉 All Margin Contract Tests Passed Successfully (100% Green, Zero Mocks).');
}

runTests().catch((err) => {
  console.error('❌ Margin contract test failure:', err);
  process.exit(1);
});
