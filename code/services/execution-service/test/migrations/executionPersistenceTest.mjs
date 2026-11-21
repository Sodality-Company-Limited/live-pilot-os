import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertValidExecutionStatusTransition,
  assertOptimisticLockVersion,
  EXECUTION_STATUSES,
  EXECUTION_ACTION_TYPES,
} from '../../src/persistence/executionPersistence.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const up = await readFile(join(root, 'migrations/001_execution_persistence.up.sql'), 'utf8');
const down = await readFile(join(root, 'migrations/001_execution_persistence.down.sql'), 'utf8');
const persistence = await readFile(join(root, 'src/persistence/executionPersistence.ts'), 'utf8');

const requiredMigrationFragments = [
  // Schema creation and isolation
  'CREATE SCHEMA IF NOT EXISTS execution;',
  'REVOKE ALL ON SCHEMA execution FROM PUBLIC;',
  'REVOKE ALL ON execution.execution_actions FROM PUBLIC;',
  'REVOKE ALL ON execution.execution_state_transitions FROM PUBLIC;',
  'REVOKE ALL ON execution.adapter_idempotency_records FROM PUBLIC;',
  'REVOKE ALL ON execution.execution_outbox FROM PUBLIC;',
  'REVOKE ALL ON execution.execution_inbox FROM PUBLIC;',
  'REVOKE ALL ON FUNCTION execution.enforce_execution_action_optimistic_lock() FROM PUBLIC;',
  'REVOKE ALL ON FUNCTION execution.reject_execution_transition_mutation() FROM PUBLIC;',

  // Aggregate table definition
  'CREATE TABLE IF NOT EXISTS execution.execution_actions',
  'tenant_id text NOT NULL',
  'session_id text NOT NULL',
  'action_id text NOT NULL',
  'aggregate_id text NOT NULL',
  "action_type IN ('pin_product', 'unpin_product', 'distribute_voucher', 'revoke_voucher', 'broadcast_announcement')",
  "status IN ('requested', 'accepted', 'pending', 'succeeded', 'failed', 'unknown', 'reconciled')",
  "mode IN ('SIMULATED', 'SANDBOX', 'CONFIRMED')",
  'payload_hash text NOT NULL',
  'idempotency_key text NOT NULL',
  'version bigint NOT NULL DEFAULT 1',
  'PRIMARY KEY (tenant_id, session_id, action_id)',
  'UNIQUE (tenant_id, idempotency_key)',

  // Audit history table definition
  'CREATE TABLE IF NOT EXISTS execution.execution_state_transitions',
  'history_id uuid NOT NULL DEFAULT gen_random_uuid()',
  'execution_transitions_append_only',
  'execution state history is append-only',

  // Adapter idempotency table definition
  'CREATE TABLE IF NOT EXISTS execution.adapter_idempotency_records',
  'PRIMARY KEY (tenant_id, idempotency_key)',

  // Outbox and Inbox
  'CREATE TABLE IF NOT EXISTS execution.execution_outbox',
  'CREATE TABLE IF NOT EXISTS execution.execution_inbox',
  'UNIQUE (tenant_id, idempotency_key, event_type)',
  'PRIMARY KEY (tenant_id, message_id)',

  // Optimistic locking trigger
  'enforce_execution_action_optimistic_lock',
  'optimistic lock conflict',

  // Tenant isolation via forced RLS on all 5 tables
  'ALTER TABLE execution.execution_actions ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.execution_actions FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.execution_state_transitions ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.execution_state_transitions FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.adapter_idempotency_records ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.adapter_idempotency_records FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.execution_outbox ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.execution_outbox FORCE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.execution_inbox ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE execution.execution_inbox FORCE ROW LEVEL SECURITY;',
  "current_setting('app.tenant_id', true)",

  // Required indexes
  'execution_actions_tenant_session_status_idx',
  'execution_actions_pending_reconciliation_idx',
  'execution_transitions_action_idx',
  'adapter_idempotency_expiry_idx',
  'execution_outbox_pending_dispatch_idx',
];

for (const fragment of requiredMigrationFragments) {
  assert.match(
    up,
    new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `missing migration invariant: ${fragment}`
  );
}

// Verify rollback migration
assert.match(down, /DROP TABLE IF EXISTS execution\.execution_actions;/);
assert.match(down, /DROP TABLE IF EXISTS execution\.execution_state_transitions;/);
assert.match(down, /DROP TABLE IF EXISTS execution\.adapter_idempotency_records;/);
assert.match(down, /DROP TABLE IF EXISTS execution\.execution_outbox;/);
assert.match(down, /DROP TABLE IF EXISTS execution\.execution_inbox;/);
assert.match(down, /DROP SCHEMA IF EXISTS execution;/);

// Verify FSM Transition logic in TypeScript invariants
assert.doesNotThrow(() => assertValidExecutionStatusTransition(null, 'requested'));
assert.throws(() => assertValidExecutionStatusTransition(null, 'accepted'));
assert.doesNotThrow(() => assertValidExecutionStatusTransition('requested', 'accepted'));
assert.doesNotThrow(() => assertValidExecutionStatusTransition('requested', 'failed'));
assert.doesNotThrow(() => assertValidExecutionStatusTransition('accepted', 'pending'));
assert.doesNotThrow(() => assertValidExecutionStatusTransition('pending', 'succeeded'));
assert.doesNotThrow(() => assertValidExecutionStatusTransition('pending', 'unknown'));
assert.doesNotThrow(() => assertValidExecutionStatusTransition('unknown', 'reconciled'));
assert.doesNotThrow(() => assertValidExecutionStatusTransition('reconciled', 'succeeded'));
assert.throws(() => assertValidExecutionStatusTransition('pending', 'accepted'));
assert.throws(() => assertValidExecutionStatusTransition('succeeded', 'failed'));

// Verify optimistic lock logic
assert.doesNotThrow(() => assertOptimisticLockVersion(1, 2));
assert.throws(() => assertOptimisticLockVersion(1, 1));
assert.throws(() => assertOptimisticLockVersion(1, 3));

console.log('execution-service persistence and migration invariants: PASS');
