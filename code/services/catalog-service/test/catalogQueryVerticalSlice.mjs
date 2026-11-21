import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CatalogProblemError,
  buildProblemDetailsFromReplyError,
  redactSensitiveData,
  redactSensitiveText,
} from '../src/query/catalogErrors.ts';
import {
  InMemoryCatalogProductRepository,
  PostgresCatalogProductRepository,
  readCandidateFactsBySelectorSql,
} from '../src/query/catalogProductRepository.ts';
import {
  CatalogProductQueryService,
  InMemoryCatalogTelemetry,
} from '../src/query/catalogProductQueryService.ts';
import {
  CATALOG_PRODUCT_READ_REPLY_SUBJECT,
  CATALOG_PRODUCT_READ_REQUEST_SUBJECT,
  InProcessNatsBus,
  NatsCatalogReadHandler,
} from '../src/transport/natsCatalogReadHandler.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');

const replySchema = JSON.parse(
  readFileSync(
    resolve(repoRoot, 'docs/03-architecture/api/schemas/nats/catalog-product-read-reply.schema.json'),
    'utf8',
  ),
);
const problemSchema = JSON.parse(
  readFileSync(
    resolve(repoRoot, 'docs/03-architecture/api/schemas/problem-details.schema.json'),
    'utf8',
  ),
);

function resolveJsonPointer(rootSchema, ref) {
  const parts = ref
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current = rootSchema;
  for (const part of parts) {
    assert.ok(current && typeof current === 'object' && part in current, `Unresolved $ref: ${ref}`);
    current = current[part];
  }
  return current;
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
    errors.push(`${path}: expected ${JSON.stringify(target.type)}, got ${typeof value}`);
    return errors;
  }
  if ('const' in target && value !== target.const) {
    errors.push(`${path}: expected const ${JSON.stringify(target.const)}, got ${JSON.stringify(value)}`);
  }
  if (Array.isArray(target.enum) && !target.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in ${JSON.stringify(target.enum)}`);
  }
  if (typeof value === 'string') {
    if (target.minLength !== undefined && value.length < target.minLength) {
      errors.push(`${path}: minLength ${target.minLength}`);
    }
    if (target.maxLength !== undefined && value.length > target.maxLength) {
      errors.push(`${path}: maxLength ${target.maxLength}`);
    }
    if (target.pattern !== undefined && !new RegExp(target.pattern).test(value)) {
      errors.push(`${path}: failed pattern ${target.pattern}`);
    }
    if (target.format === 'date-time' && Number.isNaN(Date.parse(value))) {
      errors.push(`${path}: invalid date-time ${value}`);
    }
    if (target.format === 'uri' && !/^[a-z][a-z0-9+.-]*:[^\s]+$/i.test(value)) {
      errors.push(`${path}: invalid uri ${value}`);
    }
  }
  if (typeof value === 'number') {
    if (target.minimum !== undefined && value < target.minimum) {
      errors.push(`${path}: < minimum ${target.minimum}`);
    }
    if (target.maximum !== undefined && value > target.maximum) {
      errors.push(`${path}: > maximum ${target.maximum}`);
    }
  }
  if (Array.isArray(value)) {
    if (target.uniqueItems && new Set(value.map((x) => JSON.stringify(x))).size !== value.length) {
      errors.push(`${path}: duplicate array items`);
    }
    if (target.items) {
      value.forEach((item, idx) => {
        errors.push(...validateSchema(item, target.items, rootSchema, `${path}[${idx}]`));
      });
    }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (Array.isArray(target.required)) {
      for (const req of target.required) {
        if (!(req in value) || value[req] === undefined) {
          errors.push(`${path}: missing required '${req}'`);
        }
      }
    }
    const props = target.properties || {};
    for (const [key, propVal] of Object.entries(value)) {
      if (key in props) {
        errors.push(...validateSchema(propVal, props[key], rootSchema, `${path}.${key}`));
      } else if (target.additionalProperties === false) {
        errors.push(`${path}: unexpected property '${key}'`);
      }
    }
  }
  if (Array.isArray(target.oneOf)) {
    const matches = target.oneOf.filter((branch) => validateSchema(value, branch, rootSchema, path).length === 0).length;
    if (matches !== 1) {
      errors.push(`${path}: expected exactly 1 oneOf match, got ${matches}`);
    }
  }
  return errors;
}

function assertValidReply(reply, label) {
  const errors = validateSchema(reply, replySchema, replySchema);
  assert.equal(errors.length, 0, `${label} failed reply schema:\n${errors.join('\n')}`);
  if (reply.status === 'rejected' && reply.error) {
    const pd = buildProblemDetailsFromReplyError(reply.error);
    const pdErrors = validateSchema(pd, problemSchema, problemSchema);
    assert.equal(pdErrors.length, 0, `${label} failed ProblemDetails schema:\n${pdErrors.join('\n')}`);
  }
}

const fixedNowIso = '2026-11-21T08:00:00.000Z';
const fixedClock = { now: () => new Date(fixedNowIso) };
const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

function buildRequestEnvelope(overrides = {}) {
  const messageId = overrides.message_id ?? 'msg_01JCA200000000000001';
  const tenantId = overrides.tenant_id ?? 'tenant_01';
  const sessionId = 'session_id' in overrides ? overrides.session_id : 'session_01';
  const correlationId = overrides.correlation_id ?? 'corr_01JCA200000000000001';
  const causationId = 'causation_id' in overrides ? overrides.causation_id : 'cmd_01JCA200000000000001';
  const schemaVersion = overrides.schema_version ?? '1.0.0';
  const producer = overrides.producer ?? 'core-bff';
  const mode = overrides.mode ?? 'SIMULATED';

  const baseHeaders = {
    'Nats-Msg-Id': messageId,
    'X-Correlation-Id': correlationId,
    ...(causationId ? { 'X-Causation-Id': causationId } : {}),
    'X-Tenant-Id': tenantId,
    ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
    'X-Schema-Version': schemaVersion,
    'X-Producer': producer,
    'X-Traceparent': traceparent,
    'X-Mode': mode,
    ...(overrides.headers ?? {}),
  };

  const envelope = {
    message_id: messageId,
    message_kind: 'query',
    subject: CATALOG_PRODUCT_READ_REQUEST_SUBJECT,
    schema_version: schemaVersion,
    occurred_at: '2026-11-21T08:00:00.000Z',
    producer,
    tenant_id: tenantId,
    ...(sessionId ? { session_id: sessionId } : {}),
    correlation_id: correlationId,
    ...(causationId ? { causation_id: causationId } : {}),
    mode,
    headers: baseHeaders,
    data: {
      product_id: 'prod_01',
      ...(overrides.data ?? {}),
    },
    ...overrides,
  };
  if (overrides.headers) {
    envelope.headers = baseHeaders;
  }
  return envelope;
}

const seedFacts = [
  // prod_01: revision 1 (draft) -> revision 2 (approved, fresh, THB) at v1
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_01',
    sku: 'SKU-SERUM-30',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'draft',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Hydrating Serum 30ml',
    size: '30ml',
    selling_points: ['Dermatologist tested'],
    usage: 'Apply 2 drops after cleansing.',
    price_minor: 59000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 40,
    approved_claims: ['Dermatologist tested'],
    evidence_ids: ['ev_01'],
    mode: 'SIMULATED',
    actor_id: 'catalog-editor-1',
    correlation_id: 'corr_seed_1',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:00:00.000Z',
  },
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_01',
    sku: 'SKU-SERUM-30',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 2,
    version: 2,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Hydrating Serum 30ml',
    size: '30ml',
    selling_points: ['Dermatologist tested', 'Fragrance free'],
    usage: 'Apply 2 drops after cleansing.',
    price_minor: 59900,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 42,
    approved_claims: ['Dermatologist tested', 'Alcohol free'],
    evidence_ids: ['ev_01', 'ev_02'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_seed_2',
    causation_id: 'corr_seed_1',
    traceparent,
    occurred_at: '2026-11-21T07:30:00.000Z',
  },
  // prod_jpy: zero-decimal JPY currency scale 0
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_jpy',
    sku: 'SKU-JPY-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Matcha Cleanser',
    size: '100g',
    selling_points: ['Gentle foam'],
    usage: 'Lather with warm water.',
    price_minor: 1500,
    currency: 'JPY',
    currency_scale: 0,
    stock_display: 12,
    approved_claims: ['pH balanced'],
    evidence_ids: ['ev_jpy_01'],
    mode: 'SANDBOX',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_seed_jpy',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:30:00.000Z',
  },
  // prod_bhd: 3-decimal BHD currency scale 3
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_bhd',
    sku: 'SKU-BHD-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Oud Mist',
    size: '50ml',
    selling_points: ['Long-lasting'],
    usage: 'Spray lightly.',
    price_minor: 1250,
    currency: 'BHD',
    currency_scale: 3,
    stock_display: 8,
    approved_claims: ['IFRA compliant'],
    evidence_ids: ['ev_bhd_01'],
    mode: 'CONFIRMED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_seed_bhd',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:30:00.000Z',
  },
  // prod_draft: only draft revision
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_draft',
    sku: 'SKU-DRAFT-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'draft',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Unapproved Cream',
    size: '50ml',
    selling_points: ['Pending review'],
    usage: 'Apply nightly.',
    price_minor: 45000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 5,
    approved_claims: [],
    evidence_ids: [],
    mode: 'SIMULATED',
    actor_id: 'catalog-editor-1',
    correlation_id: 'corr_seed_draft',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:30:00.000Z',
  },
  // prod_withdrawn: revision 1 approved -> revision 2 withdrawn (terminal; must never fall back to rev 1)
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_withdrawn',
    sku: 'SKU-WITHDRAWN-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Recalled Balm',
    size: '15g',
    selling_points: ['Soothing'],
    usage: 'Apply as needed.',
    price_minor: 29900,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 10,
    approved_claims: ['Soothing'],
    evidence_ids: ['ev_w_01'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_seed_w1',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:00:00.000Z',
  },
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_withdrawn',
    sku: 'SKU-WITHDRAWN-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 2,
    version: 2,
    status: 'withdrawn',
    freshness_state: 'stale',
    freshness_expires_at: '2026-11-21T07:45:00.000Z',
    name: 'Recalled Balm',
    size: '15g',
    selling_points: ['Soothing'],
    usage: 'Apply as needed.',
    price_minor: 29900,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 0,
    approved_claims: [],
    evidence_ids: ['ev_w_02'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_seed_w2',
    causation_id: 'corr_seed_w1',
    traceparent,
    occurred_at: '2026-11-21T07:45:00.000Z',
  },
  // prod_stale_ttl: approved, but freshness_expires_at already passed at 08:00:00Z
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_stale_ttl',
    sku: 'SKU-STALE-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T07:59:59.000Z',
    name: 'Expired Window Toner',
    size: '150ml',
    selling_points: ['Refreshing'],
    usage: 'Pat onto skin.',
    price_minor: 35000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 25,
    approved_claims: ['Refreshing'],
    evidence_ids: ['ev_stale_01'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_seed_stale',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:00:00.000Z',
  },
  // prod_unknown: freshness_state is 'unknown'
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_unknown',
    sku: 'SKU-UNKNOWN-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'unknown',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Unreconciled Mist',
    size: '60ml',
    selling_points: ['Hydrating'],
    usage: 'Mist evenly.',
    price_minor: 21000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 3,
    approved_claims: ['Hydrating'],
    evidence_ids: ['ev_unk_01'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_seed_unk',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:00:00.000Z',
  },
  // Ambiguous SKU shared by two distinct product_ids
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_ambig_a',
    sku: 'SKU-SHARED-AMBIG',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Variant A',
    size: '30ml',
    selling_points: ['A'],
    usage: 'Use A.',
    price_minor: 10000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 5,
    approved_claims: ['Claim A'],
    evidence_ids: ['ev_a'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_ambig_a',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:00:00.000Z',
  },
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_ambig_b',
    sku: 'SKU-SHARED-AMBIG',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Variant B',
    size: '50ml',
    selling_points: ['B'],
    usage: 'Use B.',
    price_minor: 15000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 5,
    approved_claims: ['Claim B'],
    evidence_ids: ['ev_b'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_ambig_b',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:00:00.000Z',
  },
  // Multi-version product: v1 and authoritative v2
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_versioned',
    sku: 'SKU-VER-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Old Formula Gel',
    size: '50ml',
    selling_points: ['Classic'],
    usage: 'Apply daily.',
    price_minor: 40000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 15,
    approved_claims: ['Classic'],
    evidence_ids: ['ev_v1'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_ver_1',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:00:00.000Z',
  },
  {
    tenant_id: 'tenant_01',
    product_id: 'prod_versioned',
    sku: 'SKU-VER-01',
    catalog_version: 'cat_2026_11_v2',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'New Formula Gel',
    size: '50ml',
    selling_points: ['Updated peptide complex'],
    usage: 'Apply daily.',
    price_minor: 42000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 20,
    approved_claims: ['Updated peptide complex'],
    evidence_ids: ['ev_v2'],
    mode: 'SIMULATED',
    actor_id: 'catalog-approver-1',
    correlation_id: 'corr_ver_2',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:50:00.000Z',
  },
  // Tenant 02 isolated product (must never be disclosed to tenant 01)
  {
    tenant_id: 'tenant_02',
    product_id: 'prod_tenant_02_only',
    sku: 'SKU-T2-01',
    catalog_version: 'cat_2026_11_v1',
    fact_revision: 1,
    version: 1,
    status: 'approved',
    freshness_state: 'fresh',
    freshness_expires_at: '2026-11-21T09:00:00.000Z',
    name: 'Tenant 2 Exclusive',
    size: '30ml',
    selling_points: ['Private'],
    usage: 'Apply.',
    price_minor: 99000,
    currency: 'THB',
    currency_scale: 2,
    stock_display: 9,
    approved_claims: ['Private'],
    evidence_ids: ['ev_t2'],
    mode: 'CONFIRMED',
    actor_id: 'catalog-approver-2',
    correlation_id: 'corr_t2',
    causation_id: null,
    traceparent,
    occurred_at: '2026-11-21T07:00:00.000Z',
  },
];

const repository = new InMemoryCatalogProductRepository(seedFacts);
const telemetry = new InMemoryCatalogTelemetry();
const queryService = new CatalogProductQueryService({
  repository,
  telemetry,
  clock: fixedClock,
  defaultTimeoutMs: 500,
});
const handler = new NatsCatalogReadHandler(queryService, { clock: fixedClock });
const bus = new InProcessNatsBus();
const subscription = handler.register(bus);

const validAuth = {
  authenticated: true,
  actorId: 'svc_core_bff',
  tenantId: 'tenant_01',
  sessionId: 'session_01',
};

// 1. Positive end-to-end NATS request/reply tests (product_id, sku, multi-currency, claims/evidence)
{
  const req = buildRequestEnvelope({
    message_id: 'msg_read_ok_0001',
    data: {
      product_id: 'prod_01',
      catalog_version: 'cat_2026_11_v1',
      freshness_requirement: 'fresh',
      include_claims: true,
      include_evidence: true,
    },
  });
  const res = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, JSON.stringify(req), {
    headers: req.headers,
    authContext: validAuth,
  });
  const reply = res.data;
  assertValidReply(reply, 'positive product_id read');
  assert.equal(reply.subject, CATALOG_PRODUCT_READ_REPLY_SUBJECT);
  assert.equal(reply.status, 'accepted');
  assert.equal(reply.resolution_status, 'resolved');
  assert.equal(reply.in_reply_to, req.message_id);
  assert.equal(reply.causation_id, req.message_id);
  assert.equal(reply.correlation_id, req.correlation_id);
  assert.equal(reply.headers['X-Producer'], 'catalog-service');
  assert.equal(reply.headers['X-Traceparent'], traceparent);
  assert.equal(reply.data.product_id, 'prod_01');
  assert.equal(reply.data.sku, 'SKU-SERUM-30');
  assert.equal(reply.data.fact_revision, 2);
  assert.equal(reply.data.price_minor, 59900);
  assert.equal(Number.isInteger(reply.data.price_minor), true);
  assert.equal(reply.data.currency, 'THB');
  assert.equal(reply.data.currency_scale, 2);
  assert.equal(reply.data.freshness_state, 'fresh');
  assert.equal(reply.data.status, 'approved');
  assert.deepEqual(reply.data.approved_claims, ['Dermatologist tested', 'Alcohol free']);
  assert.deepEqual(reply.data.evidence_ids, ['ev_01', 'ev_02']);
}

// Read by SKU + include_claims=false, include_evidence=false + multi-currency JPY/BHD
{
  const reqJpy = buildRequestEnvelope({
    message_id: 'msg_read_jpy_0001',
    mode: 'SANDBOX',
    data: {
      sku: 'SKU-JPY-01',
      include_claims: false,
      include_evidence: false,
    },
  });
  const resJpy = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqJpy, {
    authContext: validAuth,
  });
  assertValidReply(resJpy.data, 'JPY SKU read');
  assert.equal(resJpy.data.status, 'accepted');
  assert.equal(resJpy.data.data.price_minor, 1500);
  assert.equal(resJpy.data.data.currency, 'JPY');
  assert.equal(resJpy.data.data.currency_scale, 0);
  assert.equal('approved_claims' in resJpy.data.data, false);
  assert.equal('evidence_ids' in resJpy.data.data, false);

  const reqBhd = buildRequestEnvelope({
    message_id: 'msg_read_bhd_0001',
    mode: 'CONFIRMED',
    data: { product_id: 'prod_bhd' },
  });
  const resBhd = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqBhd, {
    authContext: validAuth,
  });
  assertValidReply(resBhd.data, 'BHD product read');
  assert.equal(resBhd.data.status, 'accepted');
  assert.equal(resBhd.data.data.price_minor, 1250);
  assert.equal(resBhd.data.data.currency, 'BHD');
  assert.equal(resBhd.data.data.currency_scale, 3);
}

// Additive minor version 1.1.0 request + unknown extra field tolerated
{
  const reqMinor = buildRequestEnvelope({
    message_id: 'msg_read_minor_110',
    schema_version: '1.1.0',
    data: { product_id: 'prod_01', locale_preference: 'th-TH' },
  });
  const resMinor = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqMinor, {
    authContext: validAuth,
  });
  assertValidReply(resMinor.data, 'additive minor 1.1.0 request');
  assert.equal(resMinor.data.status, 'accepted');
}

// Point-in-time as_of before v2 was published resolves v1 on prod_versioned
{
  const reqAsOf = buildRequestEnvelope({
    message_id: 'msg_read_as_of_001',
    data: {
      product_id: 'prod_versioned',
      catalog_version: 'cat_2026_11_v1',
      as_of: '2026-11-21T07:10:00.000Z',
    },
  });
  const resAsOf = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqAsOf, {
    authContext: validAuth,
  });
  assertValidReply(resAsOf.data, 'as_of historical point-in-time read');
  assert.equal(resAsOf.data.status, 'accepted');
  assert.equal(resAsOf.data.data.catalog_version, 'cat_2026_11_v1');
  assert.equal(resAsOf.data.data.as_of, '2026-11-21T07:10:00.000Z');
}

// 2. Refusal on unapproved status (draft and withdrawn)
{
  const reqDraft = buildRequestEnvelope({
    message_id: 'msg_refuse_draft_01',
    data: { product_id: 'prod_draft' },
  });
  const resDraft = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqDraft, {
    authContext: validAuth,
  });
  assertValidReply(resDraft.data, 'refusal on draft fact');
  assert.equal(resDraft.data.status, 'rejected');
  assert.equal(resDraft.data.resolution_status, 'unresolved');
  assert.equal(resDraft.data.error.code, 'LP11001');
  assert.equal(resDraft.data.error.symbol, 'CATALOG_FACT_NOT_APPROVED');
  assert.equal(resDraft.data.error.http_status, 422);
  assert.equal(resDraft.data.data, undefined);

  const reqWithdrawn = buildRequestEnvelope({
    message_id: 'msg_refuse_withdrawn_01',
    data: { product_id: 'prod_withdrawn' },
  });
  const resWithdrawn = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqWithdrawn, {
    authContext: validAuth,
  });
  assertValidReply(resWithdrawn.data, 'refusal on withdrawn fact');
  assert.equal(resWithdrawn.data.status, 'rejected');
  assert.equal(resWithdrawn.data.error.code, 'LP11001');
  assert.equal(resWithdrawn.data.error.symbol, 'CATALOG_FACT_NOT_APPROVED');
}

// 3. Refusal on stale fact when strict freshness required, vs explicit stale when freshness_requirement='any'
{
  const reqStaleStrict = buildRequestEnvelope({
    message_id: 'msg_refuse_stale_01',
    data: { product_id: 'prod_stale_ttl', freshness_requirement: 'fresh' },
  });
  const resStaleStrict = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqStaleStrict, {
    authContext: validAuth,
  });
  assertValidReply(resStaleStrict.data, 'refusal on stale fact (strict)');
  assert.equal(resStaleStrict.data.status, 'rejected');
  assert.equal(resStaleStrict.data.resolution_status, 'unresolved');
  assert.equal(resStaleStrict.data.error.code, 'LP11002');
  assert.equal(resStaleStrict.data.error.symbol, 'CATALOG_FACT_STALE');
  assert.equal(resStaleStrict.data.error.http_status, 409);
  assert.equal(resStaleStrict.data.error.retry_policy, 'reconcile');

  const reqStaleAny = buildRequestEnvelope({
    message_id: 'msg_allow_stale_any_01',
    data: { product_id: 'prod_stale_ttl', freshness_requirement: 'any' },
  });
  const resStaleAny = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqStaleAny, {
    authContext: validAuth,
  });
  assertValidReply(resStaleAny.data, 'explicit stale return when freshness_requirement=any');
  assert.equal(resStaleAny.data.status, 'accepted');
  assert.equal(resStaleAny.data.data.freshness_state, 'stale');
}

// 4. Refusal on AMBIGUOUS_ENTITY (LP11004) and CATALOG_VERSION_MISMATCH (LP11005) and RESOURCE_NOT_FOUND (LP10001)
{
  const reqAmbig = buildRequestEnvelope({
    message_id: 'msg_refuse_ambig_01',
    data: { sku: 'SKU-SHARED-AMBIG' },
  });
  const resAmbig = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqAmbig, {
    authContext: validAuth,
  });
  assertValidReply(resAmbig.data, 'refusal on ambiguous SKU');
  assert.equal(resAmbig.data.status, 'rejected');
  assert.equal(resAmbig.data.resolution_status, 'ambiguous');
  assert.equal(resAmbig.data.error.code, 'LP11004');
  assert.equal(resAmbig.data.error.symbol, 'AMBIGUOUS_ENTITY');
  assert.equal(resAmbig.data.error.http_status, 422);

  const reqVerMismatch = buildRequestEnvelope({
    message_id: 'msg_refuse_ver_01',
    data: { product_id: 'prod_versioned', catalog_version: 'cat_2026_11_v1' },
  });
  const resVerMismatch = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqVerMismatch, {
    authContext: validAuth,
  });
  assertValidReply(resVerMismatch.data, 'refusal on catalog version mismatch');
  assert.equal(resVerMismatch.data.status, 'rejected');
  assert.equal(resVerMismatch.data.error.code, 'LP11005');
  assert.equal(resVerMismatch.data.error.symbol, 'CATALOG_VERSION_MISMATCH');
  assert.equal(resVerMismatch.data.error.http_status, 409);

  const reqNotFound = buildRequestEnvelope({
    message_id: 'msg_refuse_notfound_01',
    data: { product_id: 'prod_does_not_exist' },
  });
  const resNotFound = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqNotFound, {
    authContext: validAuth,
  });
  assertValidReply(resNotFound.data, 'refusal on missing product');
  assert.equal(resNotFound.data.status, 'rejected');
  assert.equal(resNotFound.data.error.code, 'LP10001');
  assert.equal(resNotFound.data.error.symbol, 'RESOURCE_NOT_FOUND');
  assert.equal(resNotFound.data.error.http_status, 404);
}

// 5. Refusal on missing auth context (401), unauthorized tenant (403), unauthorized session (403), invalid request (400)
{
  const reqNoAuth = buildRequestEnvelope({
    message_id: 'msg_refuse_noauth_01',
    data: { product_id: 'prod_01' },
  });
  const resNoAuth = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqNoAuth, {
    authContext: null,
  });
  assertValidReply(resNoAuth.data, 'refusal on missing auth context');
  assert.equal(resNoAuth.data.status, 'rejected');
  assert.equal(resNoAuth.data.error.code, 'LP01001');
  assert.equal(resNoAuth.data.error.symbol, 'AUTHENTICATION_REQUIRED');
  assert.equal(resNoAuth.data.error.http_status, 401);

  // Cross-tenant attempt against a real product in tenant_02 -> TENANT_SCOPE_DENIED with zero existence disclosure
  const reqWrongTenant = buildRequestEnvelope({
    message_id: 'msg_refuse_tenant_01',
    tenant_id: 'tenant_02',
    data: { product_id: 'prod_tenant_02_only' },
  });
  const resWrongTenant = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqWrongTenant, {
    authContext: validAuth,
  });
  assertValidReply(resWrongTenant.data, 'refusal on unauthorized tenant');
  assert.equal(resWrongTenant.data.status, 'rejected');
  assert.equal(resWrongTenant.data.error.code, 'LP02001');
  assert.equal(resWrongTenant.data.error.symbol, 'TENANT_SCOPE_DENIED');
  assert.equal(resWrongTenant.data.error.http_status, 403);
  assert.equal(JSON.stringify(resWrongTenant.data).includes('Tenant 2 Exclusive'), false);

  // Same tenant querying tenant_02 product directly -> RESOURCE_NOT_FOUND (no existence disclosure)
  const reqCrossRead = buildRequestEnvelope({
    message_id: 'msg_refuse_cross_01',
    tenant_id: 'tenant_01',
    data: { product_id: 'prod_tenant_02_only' },
  });
  const resCrossRead = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqCrossRead, {
    authContext: validAuth,
  });
  assertValidReply(resCrossRead.data, 'tenant isolation on cross-tenant product lookup');
  assert.equal(resCrossRead.data.error.code, 'LP10001');

  // Session scope mismatch -> SESSION_SCOPE_DENIED (LP02002, 403)
  const reqWrongSession = buildRequestEnvelope({
    message_id: 'msg_refuse_session_01',
    session_id: 'session_99',
    data: { product_id: 'prod_01' },
  });
  const resWrongSession = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqWrongSession, {
    authContext: validAuth,
  });
  assertValidReply(resWrongSession.data, 'refusal on unauthorized session');
  assert.equal(resWrongSession.data.error.code, 'LP02002');
  assert.equal(resWrongSession.data.error.symbol, 'SESSION_SCOPE_DENIED');
  assert.equal(resWrongSession.data.error.http_status, 403);

  // Invalid envelope (missing selector) -> REQUEST_INVALID (LP03001, 400)
  const reqInvalidSelector = buildRequestEnvelope({
    message_id: 'msg_refuse_invalid_01',
    data: { freshness_requirement: 'fresh' },
  });
  const resInvalidSelector = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqInvalidSelector, {
    authContext: validAuth,
  });
  assertValidReply(resInvalidSelector.data, 'refusal on missing selector');
  assert.equal(resInvalidSelector.data.error.code, 'LP03001');
  assert.equal(resInvalidSelector.data.error.symbol, 'REQUEST_INVALID');
  assert.equal(resInvalidSelector.data.error.http_status, 400);

  // Unsupported major version 2.0.0 -> REQUEST_INVALID (LP03001, 400)
  const reqMajor2 = buildRequestEnvelope({
    message_id: 'msg_refuse_major2_01',
    schema_version: '2.0.0',
    data: { product_id: 'prod_01' },
  });
  const resMajor2 = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqMajor2, {
    authContext: validAuth,
  });
  assertValidReply(resMajor2.data, 'refusal on unsupported major version 2.0.0');
  assert.equal(resMajor2.data.error.code, 'LP03001');

  // Malformed JSON payload -> REQUEST_INVALID (LP03001, 400)
  const resMalformed = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, '{bad json', {
    authContext: validAuth,
  });
  assertValidReply(resMalformed.data, 'refusal on malformed JSON');
  assert.equal(resMalformed.data.error.code, 'LP03001');
}

// 6. Unknown freshness, timeout, repository unavailable, deduplication, and redaction
{
  // Unknown freshness state -> ACTION_UNKNOWN (LP08002, 202, never converted to success)
  const reqUnknown = buildRequestEnvelope({
    message_id: 'msg_refuse_unknown_01',
    data: { product_id: 'prod_unknown' },
  });
  const resUnknown = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqUnknown, {
    authContext: validAuth,
  });
  assertValidReply(resUnknown.data, 'refusal on unknown freshness');
  assert.equal(resUnknown.data.status, 'rejected');
  assert.equal(resUnknown.data.error.code, 'LP08002');
  assert.equal(resUnknown.data.error.symbol, 'ACTION_UNKNOWN');
  assert.equal(resUnknown.data.error.http_status, 202);
  assert.equal(resUnknown.data.error.retry_policy, 'reconcile');

  // Expired deadline_at -> DEPENDENCY_TIMEOUT (LP07002, 504)
  const reqExpiredDeadline = buildRequestEnvelope({
    message_id: 'msg_refuse_deadline_01',
    deadline_at: '2026-11-21T07:59:59.000Z',
    data: { product_id: 'prod_01' },
  });
  const resExpiredDeadline = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, reqExpiredDeadline, {
    authContext: validAuth,
  });
  assertValidReply(resExpiredDeadline.data, 'refusal on expired deadline_at');
  assert.equal(resExpiredDeadline.data.error.code, 'LP07002');
  assert.equal(resExpiredDeadline.data.error.symbol, 'DEPENDENCY_TIMEOUT');
  assert.equal(resExpiredDeadline.data.error.http_status, 504);

  // Slow repository exceeding timeout budget -> DEPENDENCY_TIMEOUT (LP07002, 504)
  const slowRepo = {
    async findCandidateProductFacts(_query, signal) {
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('should have timed out')), 500);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('aborted'));
        });
      });
    },
  };
  const slowService = new CatalogProductQueryService({
    repository: slowRepo,
    clock: fixedClock,
    defaultTimeoutMs: 25,
  });
  const slowHandler = new NatsCatalogReadHandler(slowService, { clock: fixedClock });
  const slowReply = await slowHandler.handleRequest(
    buildRequestEnvelope({ message_id: 'msg_timeout_slow_01', data: { product_id: 'prod_01' } }),
    { authContext: validAuth },
  );
  assertValidReply(slowReply, 'slow repository timeout');
  assert.equal(slowReply.status, 'rejected');
  assert.equal(slowReply.error.code, 'LP07002');
  assert.equal(slowReply.error.details.freshness_state, 'unknown');
  assert.equal(slowReply.error.details.reconciliation_required, true);

  // Unavailable repository -> CATALOG_UNAVAILABLE (LP11003, 503, retryable=true)
  const failingRepo = {
    async findCandidateProductFacts() {
      throw new Error('ECONNREFUSED postgresql');
    },
  };
  const failingHandler = new NatsCatalogReadHandler(
    new CatalogProductQueryService({ repository: failingRepo, clock: fixedClock }),
    { clock: fixedClock },
  );
  const unavailableReply = await failingHandler.handleRequest(
    buildRequestEnvelope({ message_id: 'msg_unavail_01', data: { product_id: 'prod_01' } }),
    { authContext: validAuth },
  );
  assertValidReply(unavailableReply, 'unavailable repository');
  assert.equal(unavailableReply.error.code, 'LP11003');
  assert.equal(unavailableReply.error.http_status, 503);
  assert.equal(unavailableReply.error.retryable, true);

  // Deterministic message_id deduplication and payload mismatch conflict (LP04003)
  const dupReq = buildRequestEnvelope({
    message_id: 'msg_read_ok_0001',
    data: {
      product_id: 'prod_01',
      catalog_version: 'cat_2026_11_v1',
      freshness_requirement: 'fresh',
      include_claims: true,
      include_evidence: true,
    },
  });
  const dupRes = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, dupReq, {
    authContext: validAuth,
  });
  assert.equal(dupRes.data.status, 'accepted');
  assert.equal(dupRes.data.data.price_minor, 59900);

  const conflictReq = buildRequestEnvelope({
    message_id: 'msg_read_ok_0001',
    data: { product_id: 'prod_jpy' },
  });
  const conflictRes = await bus.request(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, conflictReq, {
    authContext: validAuth,
  });
  assertValidReply(conflictRes.data, 'idempotency payload mismatch on duplicate message_id');
  assert.equal(conflictRes.data.status, 'rejected');
  assert.equal(conflictRes.data.error.code, 'LP04003');

  // Redaction checks on sensitive credentials/tokens/PII
  const redactedObj = redactSensitiveData({
    token: 'secret-token-value',
    authorization: 'Bearer abcdef123456',
    nested: {
      message: 'Failed with Bearer supersecret.jwt.token and eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3OCJ9.signature123',
      email: 'host@example.com',
    },
  });
  assert.equal(redactedObj.token, '[REDACTED]');
  assert.equal(redactedObj.authorization, '[REDACTED]');
  assert.equal(redactedObj.nested.email, '[REDACTED]');
  assert.equal(redactedObj.nested.message.includes('supersecret'), false);
  assert.equal(redactedObj.nested.message.includes('eyJhbGci'), false);
  assert.equal(
    redactSensitiveText('Authorization Bearer my_secret_token_999').includes('my_secret_token_999'),
    false,
  );
  const errWithSecret = new CatalogProblemError('LP03001', {
    detail: 'Header Bearer leaked_secret_token_12345 is not allowed',
    details: { authorization: 'Bearer leaked_secret_token_12345' },
  }).toReplyError('corr_redaction_1');
  assert.equal(JSON.stringify(errWithSecret).includes('leaked_secret_token_12345'), false);
}

// 7. PostgresCatalogProductRepository SQL & RLS session-setting execution verification
{
  const executedQueries = [];
  let released = false;
  const fakePool = {
    async connect() {
      return {
        async query(sql, params) {
          executedQueries.push({ sql, params });
          if (sql === readCandidateFactsBySelectorSql) {
            return { rows: [seedFacts[1]], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        },
        release() {
          released = true;
        },
      };
    },
  };
  const pgRepo = new PostgresCatalogProductRepository(fakePool);
  const rows = await pgRepo.findCandidateProductFacts({
    tenantId: 'tenant_01',
    productId: 'prod_01',
    asOf: fixedNowIso,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].price_minor, 59900);
  assert.equal(released, true);
  assert.equal(executedQueries[0].sql, 'BEGIN READ ONLY');
  assert.equal(executedQueries[1].sql, "SELECT set_config('app.tenant_id', $1, true)");
  assert.deepEqual(executedQueries[1].params, ['tenant_01']);
  assert.equal(executedQueries[2].sql, readCandidateFactsBySelectorSql);
  assert.equal(executedQueries[3].sql, 'COMMIT');
}

// Telemetry lineage check
assert.ok(telemetry.events.length > 0);
assert.ok(
  telemetry.events.every((evt) => evt.correlationId && evt.traceparent && evt.tenantId),
  'every telemetry event must preserve tenant, correlation, and traceparent lineage',
);

await subscription.unsubscribe();
console.log(
  'catalog-query-vertical-slice: PASS (NATS request/reply, auth/tenant/session scope, approved minor-unit facts, draft/withdrawn/stale/unknown/ambiguous/version-mismatch refusals, timeout, redaction, dedup, and Postgres RLS adapter verified)',
);
