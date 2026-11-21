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

function validateApprovalDecision(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');

  const required = [
    'approval_id',
    'session_id',
    'target_type',
    'target_id',
    'decision',
    'decision_state',
    'actor_ref',
    'actor_role',
    'expected_resource_version',
    'decided_at'
  ];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  assert.ok(typeof payload.approval_id === 'string' && payload.approval_id.length >= 8, 'approval_id must be >= 8 chars');
  assert.ok(typeof payload.session_id === 'string' && payload.session_id.length >= 1, 'session_id must be non-empty');
  assert.ok(['promotion', 'product_pin', 'scenario_automation', 'copilot_action'].includes(payload.target_type), 'target_type must be valid enum');
  assert.ok(typeof payload.target_id === 'string' && payload.target_id.length >= 1, 'target_id must be non-empty');
  assert.ok(['approve', 'reject', 'expire', 'revoke'].includes(payload.decision), 'decision must be valid enum');
  assert.ok(['requested', 'approved', 'rejected', 'expired', 'revoked'].includes(payload.decision_state), 'decision_state must be valid enum');
  assert.ok(typeof payload.actor_ref === 'string' && payload.actor_ref.length >= 1, 'actor_ref must be non-empty');
  assert.ok(['host', 'live_ops', 'admin', 'system_policy'].includes(payload.actor_role), 'actor_role must be valid enum');
  assert.ok(Number.isInteger(payload.expected_resource_version) && payload.expected_resource_version >= 1, 'expected_resource_version must be integer >= 1');
  assert.ok(validateISODate(payload.decided_at), 'decided_at must be valid ISO date-time');

  if (payload.decided_at_ms !== undefined) {
    assert.ok(Number.isInteger(payload.decided_at_ms) && payload.decided_at_ms >= 0, 'decided_at_ms must be integer >= 0 (zero-float)');
  }
  if (payload.expires_at !== undefined) {
    assert.ok(validateISODate(payload.expires_at), 'expires_at must be valid ISO date-time');
  }
  if (payload.reason !== undefined) {
    assert.ok(typeof payload.reason === 'string' && payload.reason.length <= 500, 'reason must be string <= 500 chars');
  }
  if (payload.evidence_ids !== undefined) {
    assert.ok(Array.isArray(payload.evidence_ids), 'evidence_ids must be array');
    payload.evidence_ids.forEach(id => assert.ok(typeof id === 'string' && id.length >= 1, 'evidence_id must be string'));
  }

  return true;
}

function validateControlMode(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');

  const required = [
    'session_id',
    'previous_mode',
    'current_mode',
    'control_revision',
    'actor_ref',
    'actor_role',
    'updated_at'
  ];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  assert.ok(typeof payload.session_id === 'string' && payload.session_id.length >= 1, 'session_id must be non-empty');
  assert.ok(['RECOMMEND_ONLY', 'ASSISTED', 'AUTONOMOUS', 'NONE'].includes(payload.previous_mode), 'previous_mode must be valid enum');
  assert.ok(['RECOMMEND_ONLY', 'ASSISTED', 'AUTONOMOUS'].includes(payload.current_mode), 'current_mode must be valid enum');
  assert.ok(Number.isInteger(payload.control_revision) && payload.control_revision >= 1, 'control_revision must be integer >= 1');
  assert.ok(typeof payload.actor_ref === 'string' && payload.actor_ref.length >= 1, 'actor_ref must be non-empty');
  assert.ok(['host', 'live_ops', 'admin'].includes(payload.actor_role), 'actor_role must be valid enum');
  assert.ok(validateISODate(payload.updated_at), 'updated_at must be valid ISO date-time');

  if (payload.updated_at_ms !== undefined) {
    assert.ok(Number.isInteger(payload.updated_at_ms) && payload.updated_at_ms >= 0, 'updated_at_ms must be integer >= 0 (zero-float)');
  }
  if (payload.reason !== undefined) {
    assert.ok(typeof payload.reason === 'string' && payload.reason.length <= 500, 'reason must be string <= 500 chars');
  }

  return true;
}

function validateEmergencyPause(payload) {
  assert.ok(payload, 'Payload must exist');
  assert.equal(typeof payload, 'object', 'Payload must be an object');

  const required = [
    'session_id',
    'operation',
    'pause_state',
    'reason',
    'control_revision',
    'actor_ref',
    'actor_role',
    'occurred_at'
  ];
  for (const field of required) {
    assert.ok(field in payload, `Missing required field: ${field}`);
  }

  assert.ok(typeof payload.session_id === 'string' && payload.session_id.length >= 1, 'session_id must be non-empty');
  assert.ok(['pause', 'resume'].includes(payload.operation), 'operation must be pause/resume');
  assert.ok(['active', 'inactive'].includes(payload.pause_state), 'pause_state must be active/inactive');
  assert.ok(typeof payload.reason === 'string' && payload.reason.length >= 1 && payload.reason.length <= 500, 'reason must be 1-500 chars');
  assert.ok(Number.isInteger(payload.control_revision) && payload.control_revision >= 1, 'control_revision must be integer >= 1');
  assert.ok(typeof payload.actor_ref === 'string' && payload.actor_ref.length >= 1, 'actor_ref must be non-empty');
  assert.ok(['host', 'live_ops', 'admin', 'automated_risk_system'].includes(payload.actor_role), 'actor_role must be valid enum');
  assert.ok(validateISODate(payload.occurred_at), 'occurred_at must be valid ISO date-time');

  if (payload.occurred_at_ms !== undefined) {
    assert.ok(Number.isInteger(payload.occurred_at_ms) && payload.occurred_at_ms >= 0, 'occurred_at_ms must be integer >= 0 (zero-float)');
  }
  if (payload.incident_ref !== undefined) {
    assert.ok(typeof payload.incident_ref === 'string' && payload.incident_ref.length <= 128, 'incident_ref must be string <= 128 chars');
  }

  return true;
}

async function runTests() {
  console.log('Testing Approval & Control Contracts (G-APPR-001)...');

  // 1. Schemas exist and are loadable
  const approvalSchema = loadSchema('approval-decision.schema.json');
  assert.equal(approvalSchema.title, 'ApprovalDecision');
  const modeSchema = loadSchema('control-mode.schema.json');
  assert.equal(modeSchema.title, 'ControlMode');
  const pauseSchema = loadSchema('emergency-pause.schema.json');
  assert.equal(pauseSchema.title, 'EmergencyPause');
  console.log('✓ All 3 JSON schemas load successfully');

  // 2. Validate valid ApprovalDecision
  const validApproval = {
    approval_id: 'appr-req-20261121-0001',
    session_id: 'session-live-01',
    target_type: 'promotion',
    target_id: 'promo-flash-99',
    decision: 'approve',
    decision_state: 'approved',
    actor_ref: 'operator-alice',
    actor_role: 'live_ops',
    expected_resource_version: 1,
    decided_at: '2026-11-21T08:30:00.000Z',
    decided_at_ms: 1795257000000,
    evidence_ids: ['evid-margin-pass-01', 'evid-risk-clear-02']
  };
  assert.ok(validateApprovalDecision(validApproval));
  console.log('✓ Valid ApprovalDecision passes validation');

  // 3. Fail-closed on missing approval_id or invalid state
  assert.throws(() => {
    const invalid = { ...validApproval };
    delete invalid.approval_id;
    validateApprovalDecision(invalid);
  }, /Missing required field: approval_id/);
  console.log('✓ Fail-closed on missing approval_id');

  assert.throws(() => {
    const invalid = { ...validApproval, decision_state: 'fabricated_state' };
    validateApprovalDecision(invalid);
  }, /decision_state must be valid enum/);
  console.log('✓ Fail-closed on invalid decision_state');

  // 4. Validate valid ControlMode
  const validMode = {
    session_id: 'session-live-01',
    previous_mode: 'RECOMMEND_ONLY',
    current_mode: 'ASSISTED',
    control_revision: 2,
    actor_ref: 'operator-bob',
    actor_role: 'admin',
    updated_at: '2026-11-21T08:35:00.000Z',
    updated_at_ms: 1795257300000,
    reason: 'Elevating to ASSISTED mode after stable stream warmup'
  };
  assert.ok(validateControlMode(validMode));
  console.log('✓ Valid ControlMode passes validation');

  // 5. Fail-closed on invalid mode
  assert.throws(() => {
    const invalid = { ...validMode, current_mode: 'UNRESTRICTED_AUTO' };
    validateControlMode(invalid);
  }, /current_mode must be valid enum/);
  console.log('✓ Fail-closed on invalid current_mode');

  // 6. Validate valid EmergencyPause
  const validPause = {
    session_id: 'session-live-01',
    operation: 'pause',
    pause_state: 'active',
    reason: 'Critical margin breach detected; halting all discounts',
    control_revision: 3,
    actor_ref: 'risk-sentinel-01',
    actor_role: 'automated_risk_system',
    occurred_at: '2026-11-21T08:40:00.000Z',
    occurred_at_ms: 1795257600000,
    incident_ref: 'INC-20261121-004'
  };
  assert.ok(validateEmergencyPause(validPause));
  console.log('✓ Valid EmergencyPause passes validation');

  // 7. Fail-closed on empty reason for emergency pause
  assert.throws(() => {
    const invalid = { ...validPause, reason: '' };
    validateEmergencyPause(invalid);
  }, /reason must be 1-500 chars/);
  console.log('✓ Fail-closed on empty emergency pause reason');

  console.log('\nAll Approval & Control contract tests passed green (7/7 assertions verified).');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
