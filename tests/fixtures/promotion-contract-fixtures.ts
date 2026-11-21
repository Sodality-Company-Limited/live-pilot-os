import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Schema = { [key: string]: Json };

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

export const SCHEMA_VERSION = '1.0.0';
export const TENANT_ID = 'tenant_promo_01';
export const SESSION_ID = 'session_live_01';
export const PROMOTION_ID = 'promotion_01';
export const CORRELATION_ID = 'corr_promotion_01';
export const CAUSATION_ID = 'msg_parent_01';
export const IDEMPOTENCY_KEY = 'proposal:session_live_01:promotion_01:1';
export const IDEMPOTENCY_FINGERPRINT = 'a'.repeat(64);

export const proposalSchema = readSchema('docs/03-architecture/api/schemas/nats/promotion-proposal.schema.json');
export const decisionSchema = readSchema('docs/03-architecture/api/schemas/nats/promotion-decision.schema.json');
export const aggregateSchema = readSchema('docs/03-architecture/api/schemas/promotion.schema.json');

export function readSchema(relativePath: string): Schema {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8')) as Schema;
}

export function validProposal(overrides: Record<string, Json> = {}): Record<string, Json> {
  return {
    schema_version: SCHEMA_VERSION,
    message_kind: 'command',
    event_type: 'promotion.proposal.requested',
    promotion_id: PROMOTION_ID,
    session_id: SESSION_ID,
    product_id: 'product_01',
    discount_percent: 15,
    claim_limit: 100,
    policy_revision: 'policy:2026-11-01',
    expected_resource_version: 0,
    resource_version: 0,
    actor_ref: 'actor:creator_01',
    capability: 'promotion.propose',
    idempotency_key: IDEMPOTENCY_KEY,
    idempotency_fingerprint: IDEMPOTENCY_FINGERPRINT,
    correlation_id: CORRELATION_ID,
    causation_id: CAUSATION_ID,
    lifecycle_state: 'proposed',
    mode: 'SIMULATED',
    ...overrides,
  };
}

export function validDecision(overrides: Record<string, Json> = {}): Record<string, Json> {
  return {
    schema_version: SCHEMA_VERSION,
    message_kind: 'command',
    event_type: 'promotion.decision.requested',
    promotion_id: PROMOTION_ID,
    decision: 'approve',
    expected_resource_version: 1,
    resource_version: 1,
    policy_revision: 'policy:2026-11-01',
    approval_revision: 'approval:2026-11-21:01',
    actor_ref: 'actor:approver_01',
    capability: 'promotion.approve',
    idempotency_key: 'decision:promotion_01:1',
    idempotency_fingerprint: 'b'.repeat(64),
    correlation_id: CORRELATION_ID,
    causation_id: 'msg_proposal_01',
    lifecycle_state: 'approved',
    reason: 'policy approved',
    mode: 'SIMULATED',
    ...overrides,
  };
}

export function validAggregate(overrides: Record<string, Json> = {}): Record<string, Json> {
  return {
    promotion_id: PROMOTION_ID,
    session_id: SESSION_ID,
    product_id: 'product_01',
    status: 'proposed',
    resource_version: 1,
    discount_percent: 15,
    margin_percent: 20,
    policy_revision: 'policy:2026-11-01',
    action_id: null,
    mode: 'SIMULATED',
    schema_version: SCHEMA_VERSION,
    correlation_id: CORRELATION_ID,
    causation_id: CAUSATION_ID,
    actor_ref: 'actor:creator_01',
    capability: 'promotion.propose',
    idempotency_fingerprint: IDEMPOTENCY_FINGERPRINT,
    read_model: {
      authoritative_state: 'proposed',
      projection_status: 'current',
      projected_resource_version: 1,
      version_lag: 0,
      reconciliation: {
        status: 'not_required',
        required: false,
        last_reconciled_resource_version: 1,
        last_reconciled_at: '2026-11-21T10:00:00Z',
      },
    },
    ...overrides,
  };
}

export type Envelope = {
  message_id: string;
  message_kind: 'command' | 'event';
  subject: string;
  schema_version: string;
  occurred_at: string;
  producer: string;
  tenant_id: string;
  session_id: string;
  aggregate_type: string;
  aggregate_id: string;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  priority: 'normal' | 'urgent';
  deadline_at: string;
  mode: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
  authorization: { actor_ref: string; capability: string; policy_revision: string };
  data: Record<string, Json>;
};

export function validEnvelope(data: Record<string, Json> = validProposal()): Envelope {
  return {
    message_id: 'msg_promotion_01',
    message_kind: 'command',
    subject: 'livepilot.v1.promotion.proposal.request',
    schema_version: SCHEMA_VERSION,
    occurred_at: '2026-11-21T10:00:00Z',
    producer: 'core-bff',
    tenant_id: TENANT_ID,
    session_id: SESSION_ID,
    aggregate_type: 'promotion',
    aggregate_id: PROMOTION_ID,
    correlation_id: CORRELATION_ID,
    causation_id: CAUSATION_ID,
    idempotency_key: IDEMPOTENCY_KEY,
    priority: 'normal',
    deadline_at: '2026-11-21T10:00:05Z',
    mode: 'SIMULATED',
    authorization: {
      actor_ref: 'actor:creator_01',
      capability: 'promotion.propose',
      policy_revision: 'policy:2026-11-01',
    },
    data,
  };
}

export function validateJsonSchema(value: Json, schema: Schema, path = '$', allowAdditiveFields = false): string[] {
  const errors: string[] = [];
  const type = schema.type;
  const types = Array.isArray(type) ? type : type === undefined ? [] : [type];
  const matchesType = types.length === 0 || types.some((candidate) =>
    (candidate === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) ||
    (candidate === 'array' && Array.isArray(value)) ||
    (candidate === 'string' && typeof value === 'string') ||
    (candidate === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
    (candidate === 'integer' && typeof value === 'number' && Number.isInteger(value)) ||
    (candidate === 'boolean' && typeof value === 'boolean') ||
    (candidate === 'null' && value === null),
  );
  if (!matchesType) return [`${path}: expected ${types.join(' or ')}`];
  if ('const' in schema && value !== schema.const) errors.push(`${path}: expected constant ${String(schema.const)}`);
  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => entry === value)) errors.push(`${path}: unexpected enum value`);
  if (typeof value === 'string') {
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: pattern mismatch`);
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) errors.push(`${path}: exceeds maxLength`);
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) errors.push(`${path}: invalid date-time`);
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) errors.push(`${path}: below minimum`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) errors.push(`${path}: above maximum`);
  }
  if (Array.isArray(value) && schema.items && typeof schema.items === 'object') {
    value.forEach((item, index) => errors.push(...validateJsonSchema(item, schema.items as Schema, `${path}[${index}]`, allowAdditiveFields)));
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const properties = (schema.properties ?? {}) as Record<string, Json>;
    const required = Array.isArray(schema.required) ? schema.required : [];
    required.forEach((key) => { if (!(key in value)) errors.push(`${path}: missing required ${String(key)}`); });
    Object.entries(value).forEach(([key, child]) => {
      if (!(key in properties)) {
        if (schema.additionalProperties === false && !allowAdditiveFields) errors.push(`${path}: unknown property ${key}`);
        return;
      }
      errors.push(...validateJsonSchema(child, properties[key] as Schema, `${path}.${key}`, allowAdditiveFields));
    });
  }
  return errors;
}

export function assertValid(value: Json, schema: Schema, allowAdditiveFields = false): void {
  const errors = validateJsonSchema(value, schema, '$', allowAdditiveFields);
  if (errors.length > 0) throw new Error(errors.join('; '));
}

export function validateEnvelope(envelope: Envelope): string[] {
  const required = ['message_id', 'message_kind', 'subject', 'schema_version', 'occurred_at', 'producer', 'tenant_id', 'session_id', 'aggregate_type', 'aggregate_id', 'correlation_id', 'idempotency_key', 'deadline_at', 'mode', 'authorization', 'data'];
  const errors = required.filter((field) => !(field in envelope)).map((field) => `missing envelope field ${field}`);
  if (envelope.schema_version !== SCHEMA_VERSION) errors.push('schema version mismatch');
  if (envelope.subject !== 'livepilot.v1.promotion.proposal.request') errors.push('subject mismatch');
  if (envelope.authorization?.capability !== envelope.data.capability) errors.push('authorization capability mismatch');
  if (envelope.authorization?.actor_ref !== envelope.data.actor_ref) errors.push('authorization actor mismatch');
  if (envelope.tenant_id !== TENANT_ID || envelope.session_id !== envelope.data.session_id) errors.push('scope mismatch');
  if (envelope.correlation_id !== envelope.data.correlation_id || envelope.causation_id !== envelope.data.causation_id) errors.push('correlation lineage mismatch');
  if (envelope.idempotency_key !== envelope.data.idempotency_key) errors.push('idempotency binding mismatch');
  return errors;
}

export function redactedContractView(value: Json): Json {
  if (Array.isArray(value)) return value.map(redactedContractView);
  if (value === null || typeof value !== 'object') return value;
  const output: { [key: string]: Json } = {};
  Object.entries(value).forEach(([key, child]) => {
    if (/(token|password|secret|credential|authorization|cookie|raw_provider_payload)/i.test(key)) return;
    output[key] = redactedContractView(child);
  });
  return output;
}

export function fingerprint(value: Json): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function idempotencyConflict(first: { key: string; fingerprint: string }, second: { key: string; fingerprint: string }): boolean {
  return first.key === second.key && first.fingerprint !== second.fingerprint;
}
