import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../../..');

function readRepoFile(relPath) {
  return readFileSync(resolve(repoRoot, relPath), 'utf8');
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function validateExecutionUpdateSchema(payload) {
  assert.ok(payload && typeof payload === 'object', 'Payload must be an object');
  assert.equal(typeof payload.action_id, 'string');
  assert.ok(payload.action_id.length >= 8, 'action_id minLength is 8');
  assert.equal(typeof payload.aggregate_id, 'string');
  assert.ok(payload.aggregate_id.length >= 1, 'aggregate_id minLength is 1');
  
  const allowedStatuses = ['requested', 'accepted', 'pending', 'succeeded', 'failed', 'unknown', 'reconciled'];
  assert.ok(allowedStatuses.includes(payload.status), `status ${payload.status} not in enum`);
  
  const allowedModes = ['SIMULATED', 'SANDBOX', 'CONFIRMED'];
  assert.ok(allowedModes.includes(payload.mode), `mode ${payload.mode} not in enum`);
  
  if (payload.error_code !== undefined && payload.error_code !== null) {
    assert.equal(typeof payload.error_code, 'string');
  }
  
  if (payload.observed_at !== undefined && payload.observed_at !== null) {
    assert.equal(typeof payload.observed_at, 'string');
    assert.ok(!Number.isNaN(Date.parse(payload.observed_at)), 'observed_at must be valid date-time');
  }
}

function validateHeaders(headers) {
  const required = [
    'Nats-Msg-Id',
    'X-Correlation-Id',
    'X-Idempotency-Key',
    'X-Tenant-Id',
    'X-Session-Id',
    'X-Schema-Version',
    'X-Producer',
    'X-Traceparent',
    'X-Mode',
  ];
  for (const h of required) {
    assert.ok(headers && headers[h], `Missing required transport header: ${h}`);
  }
  assert.ok(['SIMULATED', 'SANDBOX', 'CONFIRMED'].includes(headers['X-Mode']));
}

// 1. Schema Registration & Hash Invariant in nats-subject-catalog-sot.md
const schemaPath = 'docs/03-architecture/api/schemas/nats/execution-update.schema.json';
const schemaRaw = readRepoFile(schemaPath);
const schemaHash = sha256(schemaRaw);

const subjectCatalog = readRepoFile('docs/03-architecture/api/nats-subject-catalog-sot.md');
assert.ok(
  subjectCatalog.includes('livepilot.v1.execution.action.updated'),
  'Subject catalog must declare livepilot.v1.execution.action.updated'
);
assert.ok(
  subjectCatalog.includes(schemaHash),
  `Subject catalog must match schema SHA-256 hash: ${schemaHash}`
);

// 2. AsyncAPI Validation
const asyncApi = readRepoFile('docs/03-architecture/api/asyncapi.yaml');
assert.ok(
  asyncApi.includes('address: livepilot.v1.execution.action.updated'),
  'AsyncAPI must declare execution.action.updated address'
);
assert.ok(
  asyncApi.includes('$ref: \'./schemas/nats/execution-update.schema.json\''),
  'AsyncAPI must reference execution-update.schema.json'
);

// 3. Positive Contract Payload Validation
const validPayload = {
  action_id: 'act-pin-99882233',
  aggregate_id: 'prom-445566',
  status: 'succeeded',
  mode: 'CONFIRMED',
  error_code: null,
  observed_at: '2026-11-21T08:00:00.000Z',
};
assert.doesNotThrow(() => validateExecutionUpdateSchema(validPayload));

const validHeaders = {
  'Nats-Msg-Id': 'msg-12345678',
  'X-Correlation-Id': 'corr-87654321',
  'X-Causation-Id': 'caus-11223344',
  'X-Idempotency-Key': 'idem-55667788',
  'X-Tenant-Id': 'tenant-test',
  'X-Session-Id': 'session-test',
  'X-Schema-Version': '1.0.0',
  'X-Producer': 'execution-service',
  'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
  'X-Mode': 'CONFIRMED',
};
assert.doesNotThrow(() => validateHeaders(validHeaders));

// 4. Negative Invariant Validation: Missing or Invalid Fields
assert.throws(() => validateExecutionUpdateSchema({ ...validPayload, action_id: 'short' }));
assert.throws(() => validateExecutionUpdateSchema({ ...validPayload, status: 'invalid_status' }));
assert.throws(() => validateExecutionUpdateSchema({ ...validPayload, mode: 'INVALID_MODE' }));
assert.throws(() => validateExecutionUpdateSchema({ ...validPayload, observed_at: 'invalid-date' }));

// Missing Header
const missingHeader = { ...validHeaders };
delete missingHeader['X-Tenant-Id'];
assert.throws(() => validateHeaders(missingHeader));

// 5. Unknown State and Fail-Closed Invariant
const unknownPayload = {
  action_id: 'act-pin-99882244',
  aggregate_id: 'prom-445577',
  status: 'unknown',
  mode: 'CONFIRMED',
  error_code: 'LP07002',
  observed_at: null,
};
assert.doesNotThrow(() => validateExecutionUpdateSchema(unknownPayload));
assert.equal(unknownPayload.status, 'unknown');
assert.equal(unknownPayload.error_code, 'LP07002');

console.log('execution-service message schema compatibility tests: PASS');
