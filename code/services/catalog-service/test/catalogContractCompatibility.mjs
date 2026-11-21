import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertExpectedVersion,
  assertMinorUnitPrice,
  assertTenantScope,
  assertTraceLineage,
  assertValidStatusTransition,
} from '../src/persistence/catalogProductFacts.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');

function readRepoFile(relPath) {
  return readFileSync(resolve(repoRoot, relPath), 'utf8');
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function resolveJsonPointer(rootSchema, ref) {
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported $ref outside root document: ${ref}`);
  }
  const parts = ref.slice(2).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current = rootSchema;
  for (const part of parts) {
    assert.ok(current && typeof current === 'object' && part in current, `Unresolved $ref segment '${part}' in ${ref}`);
    current = current[part];
  }
  return current;
}

function matchesFormat(value, format) {
  if (typeof value !== 'string') return true;
  if (format === 'date-time') {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
      return false;
    }
    return !Number.isNaN(Date.parse(value));
  }
  if (format === 'uri') {
    return /^[a-z][a-z0-9+.-]*:[^\s]+$/i.test(value);
  }
  return true;
}

function matchesType(value, expectedType) {
  if (Array.isArray(expectedType)) {
    return expectedType.some((t) => matchesType(value, t));
  }
  switch (expectedType) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      throw new Error(`Unsupported schema type: ${expectedType}`);
  }
}

function validateSchema(value, schema, rootSchema = schema, path = '$') {
  const errors = [];
  const target = schema.$ref ? resolveJsonPointer(rootSchema, schema.$ref) : schema;

  if (target.type !== undefined && !matchesType(value, target.type)) {
    errors.push(`${path}: expected type ${JSON.stringify(target.type)}, got ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`);
    return errors;
  }

  if ('const' in target && value !== target.const) {
    errors.push(`${path}: expected const ${JSON.stringify(target.const)}, got ${JSON.stringify(value)}`);
  }

  if (Array.isArray(target.enum) && !target.enum.includes(value)) {
    errors.push(`${path}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(target.enum)}`);
  }

  if (typeof value === 'string') {
    if (target.minLength !== undefined && value.length < target.minLength) {
      errors.push(`${path}: string length ${value.length} < minLength ${target.minLength}`);
    }
    if (target.maxLength !== undefined && value.length > target.maxLength) {
      errors.push(`${path}: string length ${value.length} > maxLength ${target.maxLength}`);
    }
    if (target.pattern !== undefined && !(new RegExp(target.pattern)).test(value)) {
      errors.push(`${path}: value '${value}' failed pattern ${target.pattern}`);
    }
    if (target.format !== undefined && !matchesFormat(value, target.format)) {
      errors.push(`${path}: value '${value}' failed format ${target.format}`);
    }
  }

  if (typeof value === 'number') {
    if (target.minimum !== undefined && value < target.minimum) {
      errors.push(`${path}: value ${value} < minimum ${target.minimum}`);
    }
    if (target.maximum !== undefined && value > target.maximum) {
      errors.push(`${path}: value ${value} > maximum ${target.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (target.minItems !== undefined && value.length < target.minItems) {
      errors.push(`${path}: array length ${value.length} < minItems ${target.minItems}`);
    }
    if (target.maxItems !== undefined && value.length > target.maxItems) {
      errors.push(`${path}: array length ${value.length} > maxItems ${target.maxItems}`);
    }
    if (target.uniqueItems) {
      const seen = new Set(value.map((item) => JSON.stringify(item)));
      if (seen.size !== value.length) {
        errors.push(`${path}: array items must be unique`);
      }
    }
    if (target.items) {
      value.forEach((item, idx) => {
        errors.push(...validateSchema(item, target.items, rootSchema, `${path}[${idx}]`));
      });
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (Array.isArray(target.required)) {
      for (const key of target.required) {
        if (!(key in value) || value[key] === undefined) {
          errors.push(`${path}: missing required property '${key}'`);
        }
      }
    }

    const props = target.properties || {};
    for (const [key, propValue] of Object.entries(value)) {
      if (key in props) {
        errors.push(...validateSchema(propValue, props[key], rootSchema, `${path}.${key}`));
      } else if (target.additionalProperties === false) {
        errors.push(`${path}: unexpected additional property '${key}'`);
      }
    }
  }

  if (Array.isArray(target.anyOf)) {
    const matched = target.anyOf.some((branch) => validateSchema(value, branch, rootSchema, path).length === 0);
    if (!matched) {
      errors.push(`${path}: failed anyOf constraint`);
    }
  }

  if (Array.isArray(target.oneOf)) {
    const matches = target.oneOf.filter((branch) => validateSchema(value, branch, rootSchema, path).length === 0).length;
    if (matches !== 1) {
      errors.push(`${path}: expected exactly 1 oneOf branch match, got ${matches}`);
    }
  }

  if (Array.isArray(target.allOf)) {
    for (const branch of target.allOf) {
      errors.push(...validateSchema(value, branch, rootSchema, path));
    }
  }

  if (target.if && target.then) {
    const condOk = validateSchema(value, target.if, rootSchema, path).length === 0;
    if (condOk) {
      errors.push(...validateSchema(value, target.then, rootSchema, path));
    }
  }

  return errors;
}

function assertSchemaValid(value, schema, label) {
  const errors = validateSchema(value, schema, schema);
  assert.equal(errors.length, 0, `${label} failed schema validation:\n${errors.join('\n')}`);
}

function assertSchemaInvalid(value, schema, label) {
  const errors = validateSchema(value, schema, schema);
  assert.ok(errors.length > 0, `${label} unexpectedly passed schema validation`);
}

// 1. Load schemas & verify SHA-256 registry parity across NATS SOT, service contract, and coverage registry.
const schemaFiles = {
  fact: 'docs/03-architecture/api/schemas/catalog-product-read.schema.json',
  request: 'docs/03-architecture/api/schemas/nats/catalog-product-read-request.schema.json',
  reply: 'docs/03-architecture/api/schemas/nats/catalog-product-read-reply.schema.json',
  updated: 'docs/03-architecture/api/schemas/nats/catalog-product-updated.schema.json',
  problem: 'docs/03-architecture/api/schemas/problem-details.schema.json',
};

const schemas = {};
const hashes = {};
for (const [key, relPath] of Object.entries(schemaFiles)) {
  const raw = readRepoFile(relPath);
  schemas[key] = JSON.parse(raw);
  hashes[key] = sha256(raw);
}

const natsSot = readRepoFile('docs/03-architecture/api/nats-subject-catalog-sot.md');
const catalogServiceDoc = readRepoFile('docs/03-architecture/api/services/catalog-service.md');
const coverageYaml = readRepoFile('docs/03-architecture/contracts/flows/coverage.yaml');
const asyncapiRaw = readRepoFile('docs/03-architecture/api/asyncapi.yaml');
const errorRegistry = JSON.parse(readRepoFile('docs/03-architecture/api/error-codes.yaml'));

for (const subject of [
  'livepilot.v1.catalog.product.read.request',
  'livepilot.v1.catalog.product.read.reply',
  'livepilot.v1.catalog.product.updated',
  'livepilot.v1.catalog.product.updated.dlq',
]) {
  assert.ok(natsSot.includes(`\`${subject}\``), `NATS SOT missing subject ${subject}`);
  assert.ok(asyncapiRaw.includes(`address: ${subject}`), `asyncapi.yaml missing channel address ${subject}`);
}

for (const key of ['fact', 'request', 'reply', 'updated']) {
  assert.ok(natsSot.includes(hashes[key]), `NATS SOT missing exact SHA-256 ${hashes[key]} for ${schemaFiles[key]}`);
}

assert.ok(catalogServiceDoc.includes(hashes.fact), 'catalog-service.md SHA-256 mismatch for catalog-product-read.schema.json');
assert.ok(coverageYaml.includes(hashes.fact), 'coverage.yaml SHA-256 mismatch for catalog-product-read.schema.json');

// Verify AsyncAPI message bindings and CatalogMessageHeaders
for (const messageRef of [
  'CatalogProductReadRequest',
  'CatalogProductReadReply',
  'CatalogProductUpdated',
  'CatalogProductUpdatedDlq',
  './schemas/nats/catalog-product-read-request.schema.json',
  './schemas/nats/catalog-product-read-reply.schema.json',
  './schemas/nats/catalog-product-updated.schema.json',
  'CatalogMessageHeaders',
]) {
  assert.ok(asyncapiRaw.includes(messageRef), `asyncapi.yaml missing binding ${messageRef}`);
}

for (const requiredSotTerm of ['tenant_id:product_id|sku', 'tenant_id:product_id', '7 days or 10 GiB', 'five times', 'operator']) {
  assert.ok(natsSot.includes(requiredSotTerm), `NATS SOT missing registration requirement: ${requiredSotTerm}`);
}

// 2. Canonical fixtures aligned with catalogProductFacts.ts and nats-subject-message-template.md
const baseHeaders = {
  'Nats-Msg-Id': 'msg_01JCA100000000000001',
  'X-Correlation-Id': 'corr_01JCA100000000000001',
  'X-Causation-Id': 'cmd_01JCA100000000000001',
  'X-Idempotency-Key': 'catalog:tenant_01:prod_01:rev_1',
  'X-Tenant-Id': 'tenant_01',
  'X-Session-Id': 'session_01',
  'X-Schema-Version': '1.0.0',
  'X-Producer': 'core-bff',
  'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
  'X-Mode': 'SIMULATED',
};

const catalogHeaders = {
  ...baseHeaders,
  'X-Producer': 'catalog-service',
};

const validFactPayload = {
  tenant_id: 'tenant_01',
  correlation_id: 'corr_01JCA100000000000001',
  causation_id: 'cmd_01JCA100000000000001',
  schema_version: '1.0.0',
  producer: 'catalog-service',
  occurred_at: '2026-11-21T08:00:00Z',
  product_id: 'prod_01',
  sku: 'SKU-001',
  name: 'Hydrating Serum 30ml',
  size: '30ml',
  selling_points: ['Dermatologist tested', 'Fragrance free'],
  usage: 'Apply 2 drops after cleansing.',
  price_minor: 59900,
  currency: 'THB',
  stock_display: 42,
  catalog_version: 'cat_2026_11_v1',
  fact_revision: 1,
  freshness_expires_at: '2026-11-21T09:00:00Z',
  freshness_state: 'fresh',
  status: 'approved',
  mode: 'SIMULATED',
};

// Verify catalogProductFacts.ts emits the exact same payload and header keys
const persistenceTs = readRepoFile('code/services/catalog-service/src/persistence/catalogProductFacts.ts');
for (const key of Object.keys(validFactPayload)) {
  assert.ok(persistenceTs.includes(`${key}:`), `catalogProductFacts.ts missing eventPayload field ${key}`);
}
for (const hdr of ['Nats-Msg-Id', 'X-Tenant-Id', 'X-Correlation-Id', 'X-Traceparent', 'X-Producer', 'X-Schema-Version', 'X-Idempotency-Key', 'X-Mode']) {
  assert.ok(persistenceTs.includes(`'${hdr}'`), `catalogProductFacts.ts missing outbox header ${hdr}`);
}

assertSchemaValid(validFactPayload, schemas.fact, 'catalog-product-read.schema.json v1.0.0');

// 3. Request contract compatibility
const validReadByProductId = {
  message_id: 'msg_01JCA100000000000001',
  message_kind: 'query',
  subject: 'livepilot.v1.catalog.product.read.request',
  schema_version: '1.0.0',
  occurred_at: '2026-11-21T08:00:00Z',
  producer: 'core-bff',
  tenant_id: 'tenant_01',
  session_id: 'session_01',
  correlation_id: 'corr_01JCA100000000000001',
  causation_id: 'cmd_01JCA100000000000001',
  deadline_at: '2026-11-21T08:00:02Z',
  mode: 'SIMULATED',
  headers: baseHeaders,
  data: {
    product_id: 'prod_01',
    freshness_requirement: 'fresh',
    include_claims: true,
    include_evidence: true,
  },
};
assertSchemaValid(validReadByProductId, schemas.request, 'valid read request by product_id');

const validReadBySku = {
  ...validReadByProductId,
  data: { sku: 'SKU-001' },
};
assertSchemaValid(validReadBySku, schemas.request, 'valid read request by sku');

// Negative request checks
assertSchemaInvalid({ ...validReadByProductId, data: { freshness_requirement: 'fresh' } }, schemas.request, 'request missing product_id and sku');
for (const requiredField of ['tenant_id', 'correlation_id', 'schema_version', 'producer', 'occurred_at', 'mode']) {
  const broken = { ...validReadByProductId };
  delete broken[requiredField];
  assertSchemaInvalid(broken, schemas.request, `request missing ${requiredField}`);
}
assertSchemaInvalid(
  { ...validReadByProductId, headers: { ...baseHeaders, 'X-Traceparent': 'invalid-traceparent' } },
  schemas.request,
  'request with malformed X-Traceparent',
);

// 4. Reply contract compatibility (accepted + rejected error)
const validAcceptedReply = {
  message_id: 'reply_01JCA100000000000001',
  in_reply_to: validReadByProductId.message_id,
  message_kind: 'reply',
  subject: 'livepilot.v1.catalog.product.read.reply',
  status: 'accepted',
  resolution_status: 'resolved',
  schema_version: '1.0.0',
  occurred_at: '2026-11-21T08:00:00.050Z',
  producer: 'catalog-service',
  tenant_id: 'tenant_01',
  session_id: 'session_01',
  correlation_id: 'corr_01JCA100000000000001',
  causation_id: validReadByProductId.message_id,
  mode: 'SIMULATED',
  headers: catalogHeaders,
  data: {
    ...validFactPayload,
    as_of: '2026-11-21T08:00:00Z',
    approved_claims: ['Dermatologist tested'],
    evidence_ids: ['ev_01JCA100000000000001'],
  },
};
assertSchemaValid(validAcceptedReply, schemas.reply, 'valid accepted/resolved reply');

// Invalid reply combinations
assertSchemaInvalid(
  { ...validAcceptedReply, status: 'rejected', resolution_status: 'unresolved' },
  schemas.reply,
  'rejected reply missing error object',
);
assertSchemaInvalid(
  (() => {
    const broken = { ...validAcceptedReply };
    delete broken.data;
    return broken;
  })(),
  schemas.reply,
  'accepted reply missing data object',
);

// 5. Product updated event + DLQ contract compatibility
const validUpdatedEvent = {
  message_id: 'evt_01JCA100000000000001',
  message_kind: 'event',
  subject: 'livepilot.v1.catalog.product.updated',
  event_type: 'catalog.product.updated',
  schema_version: '1.0.0',
  occurred_at: '2026-11-21T08:00:01Z',
  producer: 'catalog-service',
  tenant_id: 'tenant_01',
  aggregate_type: 'catalog_product_fact',
  aggregate_id: 'prod_01:SKU-001:cat_2026_11_v1',
  ordering_key: 'tenant_01:prod_01',
  correlation_id: 'corr_01JCA100000000000001',
  causation_id: 'cmd_01JCA100000000000001',
  idempotency_key: 'catalog:tenant_01:prod_01:rev_1',
  mode: 'SIMULATED',
  headers: catalogHeaders,
  data: validFactPayload,
};
assertSchemaValid(validUpdatedEvent, schemas.updated, 'valid catalog.product.updated event');

const validUpdatedDlq = {
  ...validUpdatedEvent,
  message_kind: 'dlq',
  subject: 'livepilot.v1.catalog.product.updated.dlq',
  dlq_metadata: {
    original_subject: 'livepilot.v1.catalog.product.updated',
    attempts: 5,
    failure_code: 'LP11003',
    failed_at: '2026-11-21T08:05:00Z',
    replay_owner: 'catalog-service',
    replay_authorized: false,
  },
};
assertSchemaValid(validUpdatedDlq, schemas.updated, 'valid catalog.product.updated.dlq envelope');

// Negative updated/DLQ checks
assertSchemaInvalid(
  { ...validUpdatedEvent, message_kind: 'dlq', subject: 'livepilot.v1.catalog.product.updated.dlq' },
  schemas.updated,
  'DLQ message missing dlq_metadata',
);
assertSchemaInvalid(
  { ...validUpdatedEvent, ordering_key: 'invalid_key_without_colon' },
  schemas.updated,
  'updated event with invalid ordering_key',
);

// 6. Zero-float and multi-currency minor-unit invariants
assertSchemaInvalid(
  { ...validFactPayload, price_minor: 599.5 },
  schemas.fact,
  'float price_minor in fact schema',
);
assertSchemaInvalid(
  { ...validUpdatedEvent, data: { ...validFactPayload, price_minor: 599.5 } },
  schemas.updated,
  'float price_minor in updated event',
);
assertSchemaValid(
  { ...validUpdatedEvent, data: { ...validFactPayload, price_minor: 1500, currency: 'JPY', currency_scale: 0 } },
  schemas.updated,
  'JPY zero-decimal minor units in updated event',
);
assertSchemaValid(
  { ...validUpdatedEvent, data: { ...validFactPayload, price_minor: 1250, currency: 'BHD', currency_scale: 3 } },
  schemas.updated,
  'BHD three-decimal minor units in updated event',
);

// 7. Additive minor version compatibility vs major version mismatch rejection
const additiveRequest = {
  ...validReadByProductId,
  schema_version: '1.1.0',
  headers: { ...baseHeaders, 'X-Schema-Version': '1.1.0' },
  data: { ...validReadByProductId.data, locale_preference: 'th-TH' },
};
assertSchemaValid(additiveRequest, schemas.request, 'additive minor 1.1.0 request');

const additiveReply = {
  ...validAcceptedReply,
  schema_version: '1.1.0',
  headers: { ...catalogHeaders, 'X-Schema-Version': '1.1.0' },
  data: { ...validAcceptedReply.data, currency_scale: 2, locale_label: 'TH-th' },
};
assertSchemaValid(additiveReply, schemas.reply, 'additive minor 1.1.0 reply');

const additiveUpdated = {
  ...validUpdatedEvent,
  schema_version: '1.1.0',
  headers: { ...catalogHeaders, 'X-Schema-Version': '1.1.0' },
  data: { ...validFactPayload, currency_scale: 2, locale_label: 'TH-th' },
};
assertSchemaValid(additiveUpdated, schemas.updated, 'additive minor 1.1.0 updated event');

assertSchemaInvalid(
  { ...validReadByProductId, schema_version: '2.0.0', headers: { ...baseHeaders, 'X-Schema-Version': '2.0.0' } },
  schemas.request,
  'unsupported major 2.0.0 request',
);
assertSchemaInvalid(
  { ...validAcceptedReply, schema_version: '2.0.0', headers: { ...catalogHeaders, 'X-Schema-Version': '2.0.0' } },
  schemas.reply,
  'unsupported major 2.0.0 reply',
);
assertSchemaInvalid(
  { ...validUpdatedEvent, schema_version: '2.0.0', headers: { ...catalogHeaders, 'X-Schema-Version': '2.0.0' } },
  schemas.updated,
  'unsupported major 2.0.0 updated event',
);

// 8. Error registry (LP11001-LP11005 + shared catalog-service codes) and ProblemDetails compatibility
const errorsByCode = new Map(errorRegistry.errors.map((entry) => [entry.code, entry]));

const expectedCatalogCodes = [
  ['LP11001', 'CATALOG_FACT_NOT_APPROVED', 422, 'never', 'unresolved'],
  ['LP11002', 'CATALOG_FACT_STALE', 409, 'reconcile', 'unresolved'],
  ['LP11003', 'CATALOG_UNAVAILABLE', 503, 'retry', 'unresolved'],
  ['LP11004', 'AMBIGUOUS_ENTITY', 422, 'never', 'ambiguous'],
  ['LP11005', 'CATALOG_VERSION_MISMATCH', 409, 'never', 'unresolved'],
];

for (const [code, symbol, httpStatus, retryPolicy, resolutionStatus] of expectedCatalogCodes) {
  const entry = errorsByCode.get(code);
  assert.ok(entry, `Missing ${code} in error-codes.yaml`);
  assert.equal(entry.domain, 'catalog', `${code} domain must be catalog`);
  assert.equal(entry.symbol, symbol, `${code} symbol mismatch`);
  assert.equal(entry.http_status, httpStatus, `${code} http_status mismatch`);
  assert.equal(entry.retry_policy, retryPolicy, `${code} retry_policy mismatch`);
  assert.equal(entry.exposure, 'public', `${code} exposure must be public`);
  assert.equal(entry.lifecycle, 'active', `${code} lifecycle must be active`);
  assert.ok(catalogServiceDoc.includes(code), `catalog-service.md missing ${code}`);

  const problemDetails = {
    type: entry.type,
    title: entry.title,
    status: entry.http_status,
    code: entry.code,
    message_key: entry.message_key,
    detail: entry.detail,
    correlation_id: 'corr_01JCA100000000000001',
    retryable: entry.retry_policy === 'retry' || entry.retry_policy === 'retry_after',
    retry_after_seconds: null,
    field_errors: [],
    evidence_id: null,
  };
  assertSchemaValid(problemDetails, schemas.problem, `ProblemDetails for ${code}`);

  const errorReply = {
    message_id: `reply_${code}_0001`,
    in_reply_to: validReadByProductId.message_id,
    message_kind: 'reply',
    subject: 'livepilot.v1.catalog.product.read.reply',
    status: 'rejected',
    resolution_status: resolutionStatus,
    schema_version: '1.0.0',
    occurred_at: '2026-11-21T08:00:00.050Z',
    producer: 'catalog-service',
    tenant_id: 'tenant_01',
    correlation_id: 'corr_01JCA100000000000001',
    causation_id: validReadByProductId.message_id,
    mode: 'SIMULATED',
    headers: catalogHeaders,
    error: {
      code: entry.code,
      symbol: entry.symbol,
      http_status: entry.http_status,
      type: entry.type,
      title: entry.title,
      message_key: entry.message_key,
      detail: entry.detail,
      retry_policy: entry.retry_policy,
      retryable: entry.retry_policy === 'retry' || entry.retry_policy === 'retry_after',
      retry_after_seconds: null,
      correlation_id: 'corr_01JCA100000000000001',
      details: { selector: 'prod_01' },
    },
  };
  assertSchemaValid(errorReply, schemas.reply, `NATS error reply for ${code}`);
}

for (const sharedCode of ['LP01001', 'LP02001', 'LP02002', 'LP03001', 'LP04001', 'LP07001', 'LP07002', 'LP08002', 'LP10001']) {
  const entry = errorsByCode.get(sharedCode);
  assert.ok(entry, `Missing shared code ${sharedCode} in error-codes.yaml`);
  assert.ok(catalogServiceDoc.includes(sharedCode), `catalog-service.md missing shared code ${sharedCode}`);
}

// 9. Duplicate message_id deduplication & lifecycle/persistence invariants
const processedMessageIds = new Set();
function consumeUpdatedEventOnce(envelope) {
  assertSchemaValid(envelope, schemas.updated, 'consumer validation before dedup');
  if (processedMessageIds.has(envelope.message_id)) {
    return { deduplicated: true, applied: false };
  }
  assertTenantScope(envelope.tenant_id);
  assertMinorUnitPrice(envelope.data.price_minor, envelope.data.currency, envelope.data.currency_scale ?? 2);
  assertExpectedVersion(envelope.data.fact_revision);
  assertTraceLineage({
    actorId: envelope.producer,
    correlationId: envelope.correlation_id,
    causationId: envelope.causation_id,
    traceparent: envelope.headers['X-Traceparent'],
    idempotencyKey: envelope.idempotency_key,
  });
  processedMessageIds.add(envelope.message_id);
  return { deduplicated: false, applied: true };
}

assert.deepEqual(consumeUpdatedEventOnce(validUpdatedEvent), { deduplicated: false, applied: true });
assert.deepEqual(consumeUpdatedEventOnce(validUpdatedEvent), { deduplicated: true, applied: false });
assert.throws(() => assertValidStatusTransition('withdrawn', 'approved'), /invalid catalog status transition/);

console.log(
  `catalog-contract-compatibility: PASS (4 catalog schemas verified, 4 AsyncAPI subjects registered, LP11001-LP11005 ProblemDetails + NATS error parity, additive 1.1.0 + major 2.0.0 + dedup + DLQ gates passed)`,
);
