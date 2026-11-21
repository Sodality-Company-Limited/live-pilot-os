import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schemaDir = path.join(root, 'docs/03-architecture/api/schemas/nats');
const schemaFiles = [
  'intent-risk-intent-detected.schema.json',
  'intent-risk-intent-deferred.schema.json',
  'intent-risk-risk-detected.schema.json',
  'intent-risk-severity-ranked.schema.json',
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validate(schema, value, location = '$') {
  const errors = [];
  const type = schema.type;
  if (type === 'object' && !isObject(value)) errors.push(`${location}: expected object`);
  if (type === 'array' && !Array.isArray(value)) errors.push(`${location}: expected array`);
  if (type === 'string' && typeof value !== 'string') errors.push(`${location}: expected string`);
  if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) errors.push(`${location}: expected finite number`);
  if (type === 'integer' && (!Number.isInteger(value))) errors.push(`${location}: expected integer`);
  if (errors.length) return errors;

  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push(`${location}: const mismatch`);
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${location}: enum mismatch`);
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${location}: below minLength`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${location}: above maxLength`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) errors.push(`${location}: pattern mismatch`);
    if (schema.format === 'date-time' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) errors.push(`${location}: date-time mismatch`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${location}: below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${location}: above maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${location}: below minItems`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${location}: above maxItems`);
    if (schema.items) value.forEach((item, index) => errors.push(...validate(schema.items, item, `${location}[${index}]`)));
  }
  if (isObject(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${location}: missing ${key}`);
    }
    const properties = schema.properties ?? {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) errors.push(`${location}: unexpected ${key}`);
      }
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) errors.push(...validate(propertySchema, value[key], `${location}.${key}`));
    }
  }
  return errors;
}

function readSchema(file) {
  return JSON.parse(fs.readFileSync(path.join(schemaDir, file), 'utf8'));
}

function fixture(schema) {
  const base = {
    event_id: 'evt_12345678',
    event_type: schema.properties.event_type.const,
    occurred_at: '2026-11-21T07:30:00Z',
    live_session_id: 'session_123',
    tenant_id: 'tenant_123',
    correlation_id: 'corr_12345678',
    causation_id: 'cause_12345678',
    schema_version: '1',
    producer: 'intent-risk-service',
    idempotency_key: 'idem_12345678',
    policy_version: schema.properties.policy_version.const ?? 'risk-policy-pilot-v1',
    model_revision: 'model-pilot-v1',
    evidence: [{ evidence_id: 'evidence_1', kind: 'message_hash', redacted: true }],
    redacted_evidence_ids: ['evidence_1'],
    propagation: { traceparent: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01' },
    mode: 'SIMULATED',
    outcome: schema.properties.outcome.const,
  };
  if (schema.properties.category) base.category = 'SPAM';
  if (schema.properties.confidence) base.confidence = 0.8;
  if (schema.properties.severity) base.severity = 'LOW';
  if (schema.properties.score) base.score = 0.2;
  if (schema.properties.handling) base.handling = 'ignore';
  if (schema.properties.reason) base.reason = 'AMBIGUOUS_EVIDENCE';
  return base;
}

for (const file of schemaFiles) {
  const schema = readSchema(file);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', `${file}: draft version`);
  assert.equal(validate(schema, fixture(schema)).length, 0, `${file}: valid fixture`);

  const missingEvidence = fixture(schema);
  delete missingEvidence.evidence;
  assert.notEqual(validate(schema, missingEvidence).length, 0, `${file}: missing evidence rejected`);

  const wrongVersion = fixture(schema);
  wrongVersion.schema_version = '2';
  assert.notEqual(validate(schema, wrongVersion).length, 0, `${file}: unknown version rejected`);

  const oversized = fixture(schema);
  oversized.evidence = Array.from({ length: 33 }, (_, index) => ({ evidence_id: `evidence_${index}`, kind: 'message_hash', redacted: true }));
  assert.notEqual(validate(schema, oversized).length, 0, `${file}: oversized evidence rejected`);

  const unsafeRawText = fixture(schema);
  unsafeRawText.evidence[0].raw_text = 'unredacted message';
  assert.notEqual(validate(schema, unsafeRawText).length, 0, `${file}: unsafe raw text rejected`);
}

const riskSchema = readSchema('intent-risk-risk-detected.schema.json');
const outOfRange = fixture(riskSchema);
outOfRange.score = 1.01;
assert.notEqual(validate(riskSchema, outOfRange).length, 0, 'risk score above 1 rejected');

console.log(`G-CORE-065 contract validation: PASS (${schemaFiles.length} schemas, positive and fail-closed negative cases)`);
