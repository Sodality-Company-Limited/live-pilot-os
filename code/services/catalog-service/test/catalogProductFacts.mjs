import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertExpectedVersion,
  assertMinorUnitPrice,
  assertTenantScope,
  assertTraceLineage,
  assertValidStatusTransition,
  catalogIdempotencyTable,
  catalogInboxTable,
  catalogOutboxTable,
  catalogProductAggregatesTable,
  catalogProductFactsTable,
  catalogProductStateHistoryTable,
} from '../src/persistence/catalogProductFacts.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const up = await readFile(join(root, 'migrations/001_catalog_product_facts.up.sql'), 'utf8');
const down = await readFile(join(root, 'migrations/001_catalog_product_facts.down.sql'), 'utf8');
const persistence = await readFile(join(root, 'src/persistence/catalogProductFacts.ts'), 'utf8');

const requiredMigrationFragments = [
  // Single authoritative writer & schema isolation
  'CREATE SCHEMA IF NOT EXISTS catalog;',
  'REVOKE ALL ON SCHEMA catalog FROM PUBLIC;',
  'REVOKE ALL ON catalog.product_aggregates FROM PUBLIC;',
  'REVOKE ALL ON catalog.product_facts FROM PUBLIC;',
  'REVOKE ALL ON catalog.product_state_history FROM PUBLIC;',
  'REVOKE ALL ON catalog.catalog_outbox FROM PUBLIC;',
  'REVOKE ALL ON catalog.catalog_inbox FROM PUBLIC;',
  'REVOKE ALL ON catalog.catalog_idempotency FROM PUBLIC;',
  'REVOKE ALL ON FUNCTION catalog.enforce_aggregate_optimistic_lock() FROM PUBLIC;',
  'REVOKE ALL ON FUNCTION catalog.enforce_monotonic_fact_revision() FROM PUBLIC;',
  'REVOKE ALL ON FUNCTION catalog.record_product_state_history() FROM PUBLIC;',
  'REVOKE ALL ON FUNCTION catalog.reject_product_fact_mutation() FROM PUBLIC;',

  // Product facts, versioning, monetary fields, optimistic locking
  'tenant_id text NOT NULL',
  'fact_revision bigint NOT NULL CHECK (fact_revision >= 1)',
  'version bigint NOT NULL CHECK (version >= 1 AND version = fact_revision)',
  "status IN ('draft', 'approved', 'stale', 'withdrawn')",
  "freshness_state IN ('fresh', 'stale', 'unknown')",
  'price_minor bigint NOT NULL CHECK (price_minor >= 0)',
  "currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$')",
  'currency_scale smallint NOT NULL DEFAULT 2 CHECK (currency_scale BETWEEN 0 AND 4)',
  'PRIMARY KEY (tenant_id, product_id, sku, catalog_version, fact_revision)',
  'product_aggregates_optimistic_lock',
  'optimistic lock conflict',
  'product_facts_monotonic_revision',
  'catalog fact revision must advance monotonically',
  'pg_advisory_xact_lock',
  'idempotency_key text NOT NULL',
  'UNIQUE (tenant_id, idempotency_key)',
  'product_facts_append_only',

  // Lifecycle state history & transition enforcement (draft -> approved -> stale|withdrawn)
  'CREATE TABLE IF NOT EXISTS catalog.product_state_history',
  'product_facts_record_state_history',
  'product_state_history_append_only',
  'initial catalog fact status must be draft',
  'catalog fact status withdrawn is terminal',
  'invalid catalog status transition',

  // Transactional Outbox, Inbox, Idempotency
  'CREATE TABLE IF NOT EXISTS catalog.catalog_outbox',
  'CREATE TABLE IF NOT EXISTS catalog.catalog_inbox',
  'CREATE TABLE IF NOT EXISTS catalog.catalog_idempotency',
  'UNIQUE (tenant_id, idempotency_key, event_type)',
  'PRIMARY KEY (tenant_id, message_id)',
  'PRIMARY KEY (tenant_id, actor_id, operation, idempotency_key)',

  // Tenant isolation via forced RLS on all 6 tables
  'ALTER TABLE catalog.product_aggregates ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.product_aggregates FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.product_facts ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.product_facts FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.product_state_history ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.product_state_history FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.catalog_outbox ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.catalog_outbox FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.catalog_inbox ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.catalog_inbox FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.catalog_idempotency ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE catalog.catalog_idempotency FORCE ROW LEVEL SECURITY;',
  "current_setting('app.tenant_id', true)",

  // Required indexes
  'product_facts_tenant_product_idx',
  'product_facts_tenant_status_freshness_idx',
  'catalog_outbox_pending_dispatch_idx',
];

for (const fragment of requiredMigrationFragments) {
  assert.match(
    up,
    new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `missing migration invariant: ${fragment}`,
  );
}

// Ensure no floating-point SQL types exist in Catalog DDL.
assert.doesNotMatch(up, /\b(real|double precision|float4|float8|numeric|decimal)\b/i);

// Down migration completeness checks.
for (const table of [
  'catalog.catalog_idempotency',
  'catalog.catalog_inbox',
  'catalog.catalog_outbox',
  'catalog.product_state_history',
  'catalog.product_facts',
  'catalog.product_aggregates',
]) {
  assert.match(
    down,
    new RegExp(`DROP TABLE IF EXISTS ${table.replace('.', '\\.')};`),
    `missing down migration drop for ${table}`,
  );
}
assert.match(down, /DROP SCHEMA IF EXISTS catalog;/);

// Persistence module static contract checks.
assert.match(persistence, /status = 'approved'/);
assert.match(persistence, /freshness_state = 'fresh'/);
assert.match(persistence, /price_minor/);
assert.match(persistence, /currency_scale/);
assert.match(persistence, /assertTenantScope/);
assert.match(persistence, /WHERE[\s\S]*AND version = \$11/);
assert.match(persistence, /INSERT INTO catalog\.catalog_outbox/);
assert.match(persistence, /INSERT INTO catalog\.catalog_inbox/);
assert.match(persistence, /catalog\.catalog_idempotency/);

// Executable runtime invariant checks on TypeScript persistence module.
assert.equal(catalogProductAggregatesTable, 'catalog.product_aggregates');
assert.equal(catalogProductFactsTable, 'catalog.product_facts');
assert.equal(catalogProductStateHistoryTable, 'catalog.product_state_history');
assert.equal(catalogOutboxTable, 'catalog.catalog_outbox');
assert.equal(catalogInboxTable, 'catalog.catalog_inbox');
assert.equal(catalogIdempotencyTable, 'catalog.catalog_idempotency');

assert.doesNotThrow(() => assertTenantScope('tenant-001'));
assert.throws(() => assertTenantScope(''), /tenant scope is required/);
assert.throws(() => assertTenantScope('x'.repeat(129)), /tenant scope is required/);

assert.doesNotThrow(() => assertMinorUnitPrice(19900, 'THB', 2));
assert.doesNotThrow(() => assertMinorUnitPrice(1500, 'JPY', 0));
assert.doesNotThrow(() => assertMinorUnitPrice(1250, 'BHD', 3));
assert.throws(() => assertMinorUnitPrice(19.99, 'USD', 2), /non-negative integer/);
assert.throws(() => assertMinorUnitPrice(-1, 'USD', 2), /non-negative integer/);
assert.throws(() => assertMinorUnitPrice(100, 'usd', 2), /ISO 4217/);
assert.throws(() => assertMinorUnitPrice(100, 'US', 2), /ISO 4217/);
assert.throws(() => assertMinorUnitPrice(100, 'USD', 5), /currency_scale/);

assert.doesNotThrow(() => assertExpectedVersion(0));
assert.doesNotThrow(() => assertExpectedVersion(4));
assert.throws(() => assertExpectedVersion(-1), /non-negative integer/);
assert.throws(() => assertExpectedVersion(1.5), /non-negative integer/);

assert.doesNotThrow(() => assertValidStatusTransition(null, 'draft'));
assert.doesNotThrow(() => assertValidStatusTransition('draft', 'draft'));
assert.doesNotThrow(() => assertValidStatusTransition('draft', 'approved'));
assert.doesNotThrow(() => assertValidStatusTransition('approved', 'approved'));
assert.doesNotThrow(() => assertValidStatusTransition('approved', 'stale'));
assert.doesNotThrow(() => assertValidStatusTransition('approved', 'withdrawn'));
assert.doesNotThrow(() => assertValidStatusTransition('stale', 'approved'));
assert.doesNotThrow(() => assertValidStatusTransition('stale', 'withdrawn'));

assert.throws(() => assertValidStatusTransition(null, 'approved'), /initial catalog status must be draft/);
assert.throws(() => assertValidStatusTransition('draft', 'stale'), /invalid catalog status transition/);
assert.throws(() => assertValidStatusTransition('draft', 'withdrawn'), /invalid catalog status transition/);
assert.throws(() => assertValidStatusTransition('withdrawn', 'approved'), /invalid catalog status transition/);
assert.throws(() => assertValidStatusTransition('withdrawn', 'draft'), /invalid catalog status transition/);

assert.doesNotThrow(() =>
  assertTraceLineage({
    actorId: 'actor-1',
    correlationId: 'corr-1',
    traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    idempotencyKey: 'idem-1',
  }),
);
assert.throws(
  () =>
    assertTraceLineage({
      actorId: '',
      correlationId: 'corr-1',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      idempotencyKey: 'idem-1',
    }),
  /actor_id is required/,
);

console.log('catalog-product-facts static and invariant checks: PASS');
console.log(
  'EVIDENCE_LIMITATION: static SQL/source verification and TypeScript invariant unit checks passed; live PostgreSQL execution, RLS enforcement, migration rollback, and concurrent revision tests were not run because no PostgreSQL server or Docker daemon is running in this workspace.',
);
