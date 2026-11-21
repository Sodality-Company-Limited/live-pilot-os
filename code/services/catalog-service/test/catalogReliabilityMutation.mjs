import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CatalogProblemError,
  redactSensitiveData,
} from '../src/query/catalogErrors.ts';
import {
  CatalogProductQueryService,
  InMemoryCatalogTelemetry,
} from '../src/query/catalogProductQueryService.ts';
import { InMemoryCatalogProductRepository } from '../src/query/catalogProductRepository.ts';
import { InProcessNatsBus } from '../src/transport/natsCatalogReadHandler.ts';
import {
  CATALOG_PRODUCT_MUTATE_REQUEST_SUBJECT,
  CATALOG_PRODUCT_DLQ_REPLAY_REQUEST_SUBJECT,
  CatalogUpdatedEventConsumer,
  NatsCatalogMutationHandler,
} from '../src/transport/natsCatalogMutationHandler.ts';
import {
  CATALOG_PRODUCT_UPDATED_DLQ_SUBJECT,
  CATALOG_PRODUCT_UPDATED_SUBJECT,
  InMemoryCatalogMutationStore,
  PostgresCatalogMutationStore,
} from '../src/mutation/catalogMutationStore.ts';
import { CatalogMutationService } from '../src/mutation/catalogMutationService.ts';
import { CatalogOutboxProcessor } from '../src/reliability/catalogOutboxProcessor.ts';
import {
  AUDIT_RECEIPT_APPEND_SUBJECT,
  CONTROL_EMERGENCY_PAUSE_SUBJECT,
  EmergencyPauseController,
  InMemoryAuditReceiptSink,
  NatsAuditReceiptPublisher,
} from '../src/reliability/catalogAuditAndRedaction.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');

const updatedEventSchema = JSON.parse(
  readFileSync(
    resolve(repoRoot, 'docs/03-architecture/api/schemas/nats/catalog-product-updated.schema.json'),
    'utf8',
  ),
);
const auditReceiptSchema = JSON.parse(
  readFileSync(
    resolve(repoRoot, 'docs/03-architecture/api/schemas/nats/audit-receipt.schema.json'),
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
      throw new Error(`Unsupported type ${expectedType}`);
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
      errors.push(`${path}: pattern ${target.pattern} failed for ${value}`);
    }
    if (target.format === 'date-time' && Number.isNaN(Date.parse(value))) {
      errors.push(`${path}: invalid date-time ${value}`);
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
    if (target.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) {
      errors.push(`${path}: uniqueItems violated`);
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
  if (Array.isArray(target.anyOf)) {
    if (!target.anyOf.some((branch) => validateSchema(value, branch, rootSchema, path).length === 0)) {
      errors.push(`${path}: failed anyOf`);
    }
  }
  if (target.if && target.then) {
    if (validateSchema(value, target.if, rootSchema, path).length === 0) {
      errors.push(...validateSchema(value, target.then, rootSchema, path));
    }
  }
  return errors;
}

function assertSchemaValid(value, schema, label) {
  const errors = validateSchema(value, schema, schema);
  assert.equal(errors.length, 0, `${label} failed schema validation:\n${errors.join('\n')}`);
}

const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

function createClock(startIso = '2026-11-21T08:00:00.000Z') {
  let currentMs = Date.parse(startIso);
  return {
    now: () => new Date(currentMs),
    advanceMs: (ms) => {
      currentMs += ms;
    },
  };
}

function createHarness() {
  const clock = createClock();
  const natsBus = new InProcessNatsBus();
  const readRepository = new InMemoryCatalogProductRepository();
  const store = new InMemoryCatalogMutationStore({ readRepository });
  const pauseController = new EmergencyPauseController();
  const auditSink = new InMemoryAuditReceiptSink();
  const auditPublisher = new NatsAuditReceiptPublisher(natsBus, auditSink);
  const telemetry = new InMemoryCatalogTelemetry();
  const mutationService = new CatalogMutationService({
    store,
    pauseController,
    auditSink: auditPublisher,
    telemetry,
    clock,
  });
  const queryService = new CatalogProductQueryService({
    repository: readRepository,
    telemetry,
    clock,
  });
  const outboxProcessor = new CatalogOutboxProcessor({
    store,
    natsConnection: natsBus,
    pauseController,
    auditSink: auditPublisher,
    telemetry,
    clock,
    maxAttempts: 5,
    baseBackoffMs: 250,
    maxBackoffMs: 5000,
  });

  return {
    clock,
    natsBus,
    readRepository,
    store,
    pauseController,
    auditSink,
    telemetry,
    mutationService,
    queryService,
    outboxProcessor,
  };
}

const writerAuth = {
  authenticated: true,
  actorId: 'catalog-editor-01',
  tenantId: 'tenant_01',
  capabilities: ['catalog:write'],
  credentials: { token: 'Bearer raw_secret_credential_should_redact' },
};

const operatorAuth = {
  authenticated: true,
  actorId: 'catalog-operator-01',
  tenantId: 'tenant_01',
  capabilities: ['catalog:owner', 'audit:write'],
  credentials: { api_key: 'super-secret-operator-api-key' },
};

function baseCommand(overrides = {}) {
  return {
    tenantId: 'tenant_01',
    productId: 'prod_01',
    sku: 'SKU-SERUM-30',
    catalogVersion: 'cat_2026_11_v1',
    expectedVersion: 0,
    status: 'draft',
    freshnessState: 'fresh',
    freshnessExpiresAt: '2026-11-21T10:00:00.000Z',
    name: 'Hydrating Serum 30ml',
    size: '30ml',
    sellingPoints: ['Dermatologist tested', 'Alcohol free'],
    usage: 'Apply 2 drops after cleansing.',
    priceMinor: 59900,
    currency: 'THB',
    currencyScale: 2,
    stockDisplay: 50,
    approvedClaims: ['Dermatologist tested'],
    evidenceIds: ['ev_01'],
    mode: 'SIMULATED',
    transitionReason: 'Initial draft creation',
    correlationId: 'corr_01JCA500000000000001',
    causationId: 'cmd_01JCA500000000000001',
    traceparent,
    idempotencyKey: 'idem_create_prod_01_rev_1',
    ...overrides,
  };
}

// ============================================================================
// 1. Outbox publishing atomicity, rollback on outbox failure, & strict ordering
// ============================================================================
{
  const h = createHarness();

  // Rev 1: draft (does not emit catalog.product.updated event, stays non-servable in read path)
  const draftRes = await h.mutationService.mutateRevision(baseCommand(), writerAuth);
  assert.equal(draftRes.fact.fact_revision, 1);
  assert.equal(draftRes.fact.status, 'draft');
  assert.equal(draftRes.outboxId, null);
  assert.equal(h.store.getOutboxSnapshot('tenant_01').length, 0);

  // Inject outbox write failure on draft -> approved (expectedVersion: 1)
  h.store.injectOutboxFailureOnce();
  await assert.rejects(
    () =>
      h.mutationService.mutateRevision(
        baseCommand({
          expectedVersion: 1,
          status: 'approved',
          transitionReason: 'Publish approved revision',
          idempotencyKey: 'idem_publish_fail_once',
          correlationId: 'corr_01JCA500000000000002',
        }),
        writerAuth,
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP11003',
  );

  // Verify zero partial commit: aggregate remains at version 1 / draft, no new history or outbox
  const aggAfterRollback = await h.store.getAggregate(
    'tenant_01',
    'prod_01',
    'SKU-SERUM-30',
    'cat_2026_11_v1',
  );
  assert.equal(aggAfterRollback.version, 1);
  assert.equal(aggAfterRollback.status, 'draft');
  const historyAfterRollback = await h.store.getStateHistory(
    'tenant_01',
    'prod_01',
    'SKU-SERUM-30',
    'cat_2026_11_v1',
  );
  assert.equal(historyAfterRollback.length, 1);
  assert.equal(h.store.getOutboxSnapshot('tenant_01').length, 0);

  // Now succeed rev 2 (draft -> approved) and rev 3 (approved -> approved price update)
  const rev2 = await h.mutationService.mutateRevision(
    baseCommand({
      expectedVersion: 1,
      status: 'approved',
      transitionReason: 'Approved for live session',
      idempotencyKey: 'idem_approve_prod_01_rev_2',
      correlationId: 'corr_01JCA500000000000003',
    }),
    writerAuth,
  );
  h.clock.advanceMs(1000);
  const rev3 = await h.mutationService.mutateRevision(
    baseCommand({
      expectedVersion: 2,
      status: 'approved',
      priceMinor: 54900,
      transitionReason: 'Promo price update',
      idempotencyKey: 'idem_update_prod_01_rev_3',
      correlationId: 'corr_01JCA500000000000004',
    }),
    writerAuth,
  );

  assert.equal(rev2.fact.fact_revision, 2);
  assert.equal(rev3.fact.fact_revision, 3);
  assert.ok(rev2.outboxId && rev3.outboxId);

  // Verify read path observes rev 3 immediately
  const readDto = await h.queryService.executeRead(
    {
      messageId: 'msg_read_after_mutate_1',
      tenantId: 'tenant_01',
      correlationId: 'corr_read_after_mutate_1',
      traceparent,
      mode: 'SIMULATED',
      productId: 'prod_01',
    },
    writerAuth,
  );
  assert.equal(readDto.fact_revision, 3);
  assert.equal(readDto.price_minor, 54900);

  // Process outbox and verify strict FIFO ordering & schema conformance
  const batch = await h.outboxProcessor.processPending('tenant_01');
  assert.deepEqual(batch.publishedIds, [rev2.outboxId, rev3.outboxId]);
  assert.equal(batch.retriedIds.length, 0);
  assert.equal(batch.dlqIds.length, 0);

  const productEvents = h.natsBus.publishedMessages.filter(
    (m) => m.subject === CATALOG_PRODUCT_UPDATED_SUBJECT,
  );
  assert.equal(productEvents.length, 2);
  assert.equal(productEvents[0].data.data.fact_revision, 2);
  assert.equal(productEvents[1].data.data.fact_revision, 3);
  assert.equal(productEvents[0].data.ordering_key, 'tenant_01:prod_01');
  assertSchemaValid(productEvents[0].data, updatedEventSchema, 'outbox event rev 2');
  assertSchemaValid(productEvents[1].data, updatedEventSchema, 'outbox event rev 3');
}

// ============================================================================
// 2. Duplicate message delivery & idempotency replay
// ============================================================================
{
  const h = createHarness();
  await h.mutationService.mutateRevision(baseCommand(), writerAuth);

  const approveCmd = baseCommand({
    expectedVersion: 1,
    status: 'approved',
    idempotencyKey: 'idem_dup_test_0001',
    correlationId: 'corr_dup_test_0001',
  });
  const first = await h.mutationService.mutateRevision(approveCmd, writerAuth);
  assert.equal(first.replayed, false);
  assert.equal(first.fact.fact_revision, 2);

  // Replay exact same command + idempotencyKey -> identical fact & outboxId, zero duplicates
  const replay = await h.mutationService.mutateRevision(approveCmd, writerAuth);
  assert.equal(replay.replayed, true);
  assert.equal(replay.fact.fact_revision, 2);
  assert.equal(replay.outboxId, first.outboxId);
  assert.equal(h.store.getOutboxSnapshot('tenant_01').length, 1);

  const agg = await h.store.getAggregate('tenant_01', 'prod_01', 'SKU-SERUM-30', 'cat_2026_11_v1');
  assert.equal(agg.version, 2);

  // Publish to NATS and deliver twice to idempotent consumer
  const appliedEvents = [];
  const consumer = new CatalogUpdatedEventConsumer({
    store: h.store,
    clock: h.clock,
    onApply: async (env) => {
      appliedEvents.push(env.data.fact_revision);
    },
  });
  h.natsBus.subscribe(CATALOG_PRODUCT_UPDATED_SUBJECT, async (msg) => {
    await consumer.consume(msg.data);
  });

  await h.outboxProcessor.processPending('tenant_01');
  const publishedEnvelope = h.natsBus.publishedMessages.find(
    (m) => m.subject === CATALOG_PRODUCT_UPDATED_SUBJECT,
  ).data;
  const secondDelivery = await consumer.consume(publishedEnvelope);
  assert.deepEqual(appliedEvents, [2]);
  assert.equal(secondDelivery.deduplicated, true);
  assert.equal(secondDelivery.applied, false);
}

// ============================================================================
// 3. Payload fingerprint mismatch conflict (LP04003)
// ============================================================================
{
  const h = createHarness();
  await h.mutationService.mutateRevision(baseCommand(), writerAuth);
  await h.mutationService.mutateRevision(
    baseCommand({
      expectedVersion: 1,
      status: 'approved',
      priceMinor: 59900,
      idempotencyKey: 'idem_mismatch_0001',
      correlationId: 'corr_mismatch_0001',
    }),
    writerAuth,
  );

  await assert.rejects(
    () =>
      h.mutationService.mutateRevision(
        baseCommand({
          expectedVersion: 1,
          status: 'approved',
          priceMinor: 49900, // Different payload under same idempotencyKey!
          idempotencyKey: 'idem_mismatch_0001',
          correlationId: 'corr_mismatch_0002',
        }),
        writerAuth,
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP04003' && err.spec.httpStatus === 409,
  );

  // Aggregate remains untouched at version 2 with original price 59900
  const agg = await h.store.getAggregate('tenant_01', 'prod_01', 'SKU-SERUM-30', 'cat_2026_11_v1');
  assert.equal(agg.version, 2);
}

// ============================================================================
// 4. Monotonic version conflict (LP04001 RESOURCE_VERSION_CONFLICT) & terminal state
// ============================================================================
{
  const h = createHarness();
  await h.mutationService.mutateRevision(baseCommand(), writerAuth);
  await h.mutationService.mutateRevision(
    baseCommand({
      expectedVersion: 1,
      status: 'approved',
      idempotencyKey: 'idem_ver_2',
      correlationId: 'corr_ver_2',
    }),
    writerAuth,
  );

  // Stale expectedVersion = 1 (current is 2) -> LP04001 RESOURCE_VERSION_CONFLICT
  await assert.rejects(
    () =>
      h.mutationService.mutateRevision(
        baseCommand({
          expectedVersion: 1,
          status: 'approved',
          priceMinor: 61000,
          idempotencyKey: 'idem_ver_stale_conflict',
          correlationId: 'corr_ver_stale',
        }),
        writerAuth,
      ),
    (err) =>
      err instanceof CatalogProblemError &&
      err.code === 'LP04001' &&
      err.spec.symbol === 'RESOURCE_VERSION_CONFLICT' &&
      err.spec.httpStatus === 409,
  );

  // Duplicate create at expectedVersion = 0 -> LP04001 RESOURCE_VERSION_CONFLICT
  await assert.rejects(
    () =>
      h.mutationService.mutateRevision(
        baseCommand({
          expectedVersion: 0,
          status: 'draft',
          idempotencyKey: 'idem_ver_zero_conflict',
          correlationId: 'corr_ver_zero',
        }),
        writerAuth,
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP04001',
  );

  // Transition approved -> withdrawn (terminal), then attempt withdrawn -> approved (must reject)
  await h.mutationService.mutateRevision(
    baseCommand({
      expectedVersion: 2,
      status: 'withdrawn',
      freshnessState: 'stale',
      idempotencyKey: 'idem_withdraw_3',
      correlationId: 'corr_withdraw_3',
    }),
    writerAuth,
  );

  await assert.rejects(
    () =>
      h.mutationService.mutateRevision(
        baseCommand({
          expectedVersion: 3,
          status: 'approved',
          freshnessState: 'fresh',
          idempotencyKey: 'idem_revive_4',
          correlationId: 'corr_revive_4',
        }),
        writerAuth,
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP04001',
  );
}

// ============================================================================
// 5. Transient failure retry, ordering preservation, & DLQ routing after max retries
// ============================================================================
{
  const h = createHarness();
  await h.mutationService.mutateRevision(baseCommand(), writerAuth);
  const prod1Rev2 = await h.mutationService.mutateRevision(
    baseCommand({
      expectedVersion: 1,
      status: 'approved',
      idempotencyKey: 'idem_dlq_prod1_rev2',
      correlationId: 'corr_dlq_prod1_rev2',
    }),
    writerAuth,
  );
  h.clock.advanceMs(100);
  const prod1Rev3 = await h.mutationService.mutateRevision(
    baseCommand({
      expectedVersion: 2,
      status: 'approved',
      priceMinor: 62000,
      idempotencyKey: 'idem_dlq_prod1_rev3',
      correlationId: 'corr_dlq_prod1_rev3',
    }),
    writerAuth,
  );
  // Also create an independent product prod_02 on another ordering key
  await h.mutationService.mutateRevision(
    baseCommand({
      productId: 'prod_02',
      sku: 'SKU-CREAM-50',
      expectedVersion: 0,
      status: 'draft',
      idempotencyKey: 'idem_dlq_prod2_rev1',
      correlationId: 'corr_dlq_prod2_rev1',
    }),
    writerAuth,
  );
  const prod2Rev2 = await h.mutationService.mutateRevision(
    baseCommand({
      productId: 'prod_02',
      sku: 'SKU-CREAM-50',
      expectedVersion: 1,
      status: 'approved',
      idempotencyKey: 'idem_dlq_prod2_rev2',
      correlationId: 'corr_dlq_prod2_rev2',
    }),
    writerAuth,
  );

  // Fail publishes for prod_01 while allowing prod_02 to succeed
  let failProd1 = true;
  h.natsBus.subscribe(CATALOG_PRODUCT_UPDATED_SUBJECT, async (msg) => {
    const parsed = JSON.parse(msg.data);
    if (failProd1 && parsed.data.product_id === 'prod_01') {
      throw new CatalogProblemError('LP11003', {
        detail: 'Simulated NATS JetStream outage with Bearer leaked_secret_token_abc',
      });
    }
  });

  // Attempt 1: prod1Rev2 fails (retried), prod1Rev3 is head-of-line blocked, prod2Rev2 publishes!
  const b1 = await h.outboxProcessor.processPending('tenant_01');
  assert.deepEqual(b1.retriedIds, [prod1Rev2.outboxId]);
  assert.deepEqual(b1.publishedIds, [prod2Rev2.outboxId]);
  assert.equal(b1.dlqIds.length, 0);

  // Backoff gating: before 250ms elapses, prod1Rev2 is NOT retried prematurely
  const bEarly = await h.outboxProcessor.processPending('tenant_01');
  assert.deepEqual(bEarly.publishedIds, []);
  assert.deepEqual(bEarly.retriedIds, []);

  // Attempts 2..5 with exponential backoff (250ms, 500ms, 1000ms, 2000ms) -> routes to DLQ on 5th
  for (const waitMs of [250, 500, 1000, 2000]) {
    h.clock.advanceMs(waitMs);
    const res = await h.outboxProcessor.processPending('tenant_01');
    if (waitMs < 2000) {
      assert.deepEqual(res.retriedIds, [prod1Rev2.outboxId]);
      assert.equal(res.dlqIds.length, 0);
    } else {
      assert.deepEqual(res.dlqIds, [prod1Rev2.outboxId]);
    }
  }

  // Verify DLQ envelope published to livepilot.v1.catalog.product.updated.dlq & schema valid
  const dlqMsgs = h.natsBus.publishedMessages.filter(
    (m) => m.subject === CATALOG_PRODUCT_UPDATED_DLQ_SUBJECT,
  );
  assert.equal(dlqMsgs.length, 1);
  assertSchemaValid(dlqMsgs[0].data, updatedEventSchema, 'DLQ event envelope');
  assert.equal(dlqMsgs[0].data.dlq_metadata.attempts, 5);
  assert.equal(dlqMsgs[0].data.dlq_metadata.replay_owner, 'catalog-service');
  assert.equal(dlqMsgs[0].data.dlq_metadata.replay_authorized, false);

  // Verify sensitive secret in error was redacted from outbox last_error
  const dlqRows = await h.store.listDlqMessages('tenant_01');
  assert.equal(dlqRows.length, 1);
  assert.equal(dlqRows[0].last_error.includes('leaked_secret_token_abc'), false);

  // ==========================================================================
  // 6. Operator-authorized replay from DLQ (and refusal of unauthorized replay)
  // ==========================================================================
  // Unauthenticated -> LP01001
  await assert.rejects(
    () =>
      h.outboxProcessor.replayDlq(
        {
          tenantId: 'tenant_01',
          reason: 'Recover after NATS broker fix',
          correlationIdForAudit: 'corr_replay_unauth',
          traceparent,
        },
        null,
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP01001',
  );

  // Missing audit capability (only catalog:write) -> LP02001
  await assert.rejects(
    () =>
      h.outboxProcessor.replayDlq(
        {
          tenantId: 'tenant_01',
          reason: 'Recover after NATS broker fix',
          correlationIdForAudit: 'corr_replay_missing_cap',
          traceparent,
        },
        writerAuth,
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP02001',
  );

  // Cross-tenant operator -> LP02001
  await assert.rejects(
    () =>
      h.outboxProcessor.replayDlq(
        {
          tenantId: 'tenant_01',
          reason: 'Cross-tenant replay attempt',
          correlationIdForAudit: 'corr_replay_cross_tenant',
          traceparent,
        },
        { ...operatorAuth, tenantId: 'tenant_other' },
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP02001',
  );

  // Authorized operator replay after NATS recovery
  failProd1 = false;
  h.clock.advanceMs(500);
  const replayResult = await h.outboxProcessor.replayDlq(
    {
      tenantId: 'tenant_01',
      outboxIds: [prod1Rev2.outboxId],
      limit: 10,
      reason: 'NATS cluster recovered; replay operator-approved',
      correlationIdForAudit: 'corr_replay_auth_01',
      traceparent,
    },
    operatorAuth,
  );
  assert.equal(replayResult.totalReplayed, 1);
  assert.equal(replayResult.replayed[0].outboxId, prod1Rev2.outboxId);
  assert.ok(replayResult.replayed[0].replayId.startsWith('rpl_'));
  assert.ok(replayResult.replayed[0].auditReceiptId.startsWith('rcpt_'));

  // Now that prod1Rev2 is published, head-of-line unblocks and prod1Rev3 publishes!
  const bAfterReplay = await h.outboxProcessor.processPending('tenant_01');
  assert.deepEqual(bAfterReplay.publishedIds, [prod1Rev3.outboxId]);
}

// ============================================================================
// 7. Safe pause / fail-closed behavior, audit receipts, & sensitive redaction
// ============================================================================
{
  const h = createHarness();
  h.pauseController.registerNatsListeners(h.natsBus);

  await h.mutationService.mutateRevision(baseCommand(), writerAuth);

  // Activate tenant emergency pause via NATS control-plane event
  await h.natsBus.publish(
    CONTROL_EMERGENCY_PAUSE_SUBJECT,
    JSON.stringify({
      tenant_id: 'tenant_01',
      occurred_at: '2026-11-21T08:05:00.000Z',
      producer: 'approval-control-service',
      data: {
        scope: 'tenant',
        paused: true,
        reason: 'Operator triggered emergency stop',
        actor_id: 'safety-op-1',
      },
    }),
  );

  // Mutations and outbox processing must fail closed with LP05004 EMERGENCY_PAUSE_ACTIVE
  await assert.rejects(
    () =>
      h.mutationService.mutateRevision(
        baseCommand({
          expectedVersion: 1,
          status: 'approved',
          idempotencyKey: 'idem_during_pause_01',
          correlationId: 'corr_during_pause_01',
        }),
        writerAuth,
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP05004' && err.spec.httpStatus === 422,
  );
  await assert.rejects(
    () => h.outboxProcessor.processPending('tenant_01'),
    (err) => err instanceof CatalogProblemError && err.code === 'LP05004',
  );

  // Resume pause, then verify malformed pause signal fails closed globally!
  h.pauseController.releaseTenantPause('tenant_01');
  const resumedMutation = await h.mutationService.mutateRevision(
    baseCommand({
      expectedVersion: 1,
      status: 'approved',
      transitionReason:
        'Approved by host@example.com using Bearer secret_jwt_token_xyz123',
      idempotencyKey: 'idem_after_resume_01',
      correlationId: 'corr_after_resume_01',
    }),
    writerAuth,
  );
  assert.equal(resumedMutation.fact.fact_revision, 2);

  // Malformed pause message -> fails closed globally
  await h.natsBus.publish(CONTROL_EMERGENCY_PAUSE_SUBJECT, '{malformed_json');
  await assert.rejects(
    () =>
      h.mutationService.mutateRevision(
        baseCommand({
          expectedVersion: 2,
          status: 'approved',
          priceMinor: 60000,
          idempotencyKey: 'idem_malformed_pause_01',
          correlationId: 'corr_malformed_pause_01',
        }),
        writerAuth,
      ),
    (err) => err instanceof CatalogProblemError && err.code === 'LP05004',
  );

  // Verify every emitted audit receipt conforms to audit-receipt.schema.json and contains zero leaked secrets
  assert.ok(h.auditSink.records.length >= 4);
  for (const record of h.auditSink.records) {
    assertSchemaValid(record.receipt, auditReceiptSchema, `audit receipt ${record.receipt.receipt_id}`);
    const serialized = JSON.stringify(record);
    assert.equal(serialized.includes('raw_secret_credential_should_redact'), false);
    assert.equal(serialized.includes('secret_jwt_token_xyz123'), false);
    assert.equal(serialized.includes('host@example.com'), false);
  }

  // Verify NATS audit.receipt.append publications also pass schema validation
  const natsAuditMessages = h.natsBus.publishedMessages.filter(
    (m) => m.subject === AUDIT_RECEIPT_APPEND_SUBJECT,
  );
  assert.equal(natsAuditMessages.length, h.auditSink.records.length);
  for (const msg of natsAuditMessages) {
    assertSchemaValid(msg.data, auditReceiptSchema, 'NATS audit receipt payload');
  }
}

// ============================================================================
// 8. NATS request/reply mutation & replay handler + PostgresCatalogMutationStore SQL/RLS
// ============================================================================
{
  const h = createHarness();
  const handler = new NatsCatalogMutationHandler(h.mutationService, {
    outboxProcessor: h.outboxProcessor,
    clock: h.clock,
  });
  const subs = handler.register(h.natsBus);

  const mutateReply = await h.natsBus.request(
    CATALOG_PRODUCT_MUTATE_REQUEST_SUBJECT,
    {
      message_id: 'msg_nats_mut_001',
      tenant_id: 'tenant_01',
      correlation_id: 'corr_nats_mut_001',
      causation_id: 'cmd_nats_mut_001',
      idempotency_key: 'idem_nats_mut_001',
      mode: 'SIMULATED',
      data: {
        product_id: 'prod_nats_01',
        sku: 'SKU-NATS-01',
        catalog_version: 'cat_2026_11_v1',
        expected_version: 0,
        status: 'draft',
        freshness_state: 'fresh',
        freshness_expires_at: '2026-11-21T10:00:00.000Z',
        name: 'NATS Created Serum',
        size: '30ml',
        selling_points: ['Clinical tested'],
        usage: 'Apply morning and evening.',
        price_minor: 45000,
        currency: 'THB',
        currency_scale: 2,
        stock_display: 25,
      },
    },
    {
      headers: {
        'Nats-Msg-Id': 'msg_nats_mut_001',
        'X-Correlation-Id': 'corr_nats_mut_001',
        'X-Tenant-Id': 'tenant_01',
        'X-Idempotency-Key': 'idem_nats_mut_001',
        'X-Traceparent': traceparent,
        'X-Mode': 'SIMULATED',
      },
      authContext: writerAuth,
    },
  );
  assert.equal(mutateReply.data.status, 'accepted');
  assert.equal(mutateReply.data.data.fact.fact_revision, 1);

  const replaySubCheck = await h.natsBus.request(
    CATALOG_PRODUCT_DLQ_REPLAY_REQUEST_SUBJECT,
    {
      message_id: 'msg_nats_replay_001',
      tenant_id: 'tenant_01',
      correlation_id: 'corr_nats_replay_001',
      data: {
        reason: 'Operator replay check',
        limit: 5,
      },
    },
    {
      headers: { 'X-Traceparent': traceparent },
      authContext: operatorAuth,
    },
  );
  assert.equal(replaySubCheck.data.status, 'accepted');
  assert.equal(replaySubCheck.data.data.totalReplayed, 0);

  for (const sub of subs) {
    await sub.unsubscribe();
  }

  // Verify PostgresCatalogMutationStore executes BEGIN, RLS set_config, idempotency, aggregate, fact, outbox, COMMIT
  const executedSql = [];
  const fakePgPool = {
    async connect() {
      return {
        async query(sql, params) {
          executedSql.push({ sql, params });
          if (sql.includes('FROM catalog.catalog_idempotency')) {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('INSERT INTO catalog.product_facts')) {
            return {
              rows: [
                {
                  tenant_id: 'tenant_01',
                  product_id: 'prod_pg_01',
                  sku: 'SKU-PG-01',
                  catalog_version: 'cat_2026_11_v1',
                  fact_revision: 1,
                  version: 1,
                  status: 'draft',
                  freshness_state: 'fresh',
                  freshness_expires_at: '2026-11-21T10:00:00.000Z',
                  price_minor: 50000,
                  currency: 'THB',
                  currency_scale: 2,
                },
              ],
              rowCount: 1,
            };
          }
          return { rows: [], rowCount: 1 };
        },
        release() {},
      };
    },
  };

  const pgStore = new PostgresCatalogMutationStore(fakePgPool);
  const pgSvc = new CatalogMutationService({ store: pgStore, clock: h.clock });
  const pgRes = await pgSvc.mutateRevision(
    baseCommand({ productId: 'prod_pg_01', sku: 'SKU-PG-01' }),
    writerAuth,
  );
  assert.equal(pgRes.fact.fact_revision, 1);
  assert.equal(executedSql[0].sql, 'BEGIN');
  assert.ok(executedSql[1].sql.includes("set_config('app.tenant_id'"));
  assert.deepEqual(executedSql[1].params, ['tenant_01']);
  assert.equal(executedSql[executedSql.length - 1].sql, 'COMMIT');
}

// Verify redaction helper directly for inline emails/JWTs/tokens
{
  const sanitized = redactSensitiveData({
    reason: 'Failed auth for alice@example.com with Bearer tok_999888777',
    password: 'my-secret-password',
  });
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.reason.includes('alice@example.com'), false);
  assert.equal(sanitized.reason.includes('tok_999888777'), false);
}

console.log(
  'catalog-reliability-mutation: PASS (outbox atomicity & ordering, idempotency replay, LP04003 mismatch, LP04001 version/terminal conflict, retry backoff & DLQ routing, operator-authorized replay, emergency pause fail-closed, audit receipts, sensitive redaction, and Postgres RLS transaction adapter verified)',
);
