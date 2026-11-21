import { createHash } from 'node:crypto';

export const AUDIT_RECEIPT_SCHEMA_VERSION = '1.0.0' as const;
export type AuditReceiptOutcome = 'committed' | 'pending' | 'rejected';

export interface ConsequentialTransition {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly promotionId: string;
  readonly actorRef: string;
  readonly capability: string;
  readonly policyRevision: string;
  readonly fromState: string;
  readonly toState: string;
  readonly expectedResourceVersion: number;
  readonly actualResourceVersion: number;
  readonly correlationId: string;
  readonly causationId: string;
  readonly idempotencyKey: string;
  readonly idempotencyFingerprint: string;
  readonly mode: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
  readonly occurredAt?: string;
  readonly reasonCode?: string;
}

export interface AuditReceipt {
  readonly schemaVersion: typeof AUDIT_RECEIPT_SCHEMA_VERSION;
  readonly receiptId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly promotionId: string;
  readonly actorRef: string;
  readonly capability: string;
  readonly policyRevision: string;
  readonly transition: { readonly from: string; readonly to: string };
  readonly expectedResourceVersion: number;
  readonly actualResourceVersion: number;
  readonly correlationId: string;
  readonly causationId: string;
  readonly idempotencyKey: string;
  readonly idempotencyFingerprint: string;
  readonly mode: ConsequentialTransition['mode'];
  readonly outcome: AuditReceiptOutcome;
  readonly reasonCode: string | null;
  readonly occurredAt: string;
  readonly previousReceiptHash: string | null;
  readonly receiptHash: string;
}

export interface AuditReceiptAppendResult {
  readonly receiptId: string;
  readonly receiptHash: string;
  readonly duplicate: boolean;
}

export interface AuditReceiptPublisherPort {
  append(receipt: AuditReceipt): Promise<AuditReceiptAppendResult>;
}

export interface ConsequentialTransitionResult {
  readonly status: 'committed' | 'pending';
  readonly committed: boolean;
  readonly receipt: AuditReceipt;
  readonly append: AuditReceiptAppendResult | null;
}

export type CommitTransition = (receipt: AuditReceipt) => Promise<void>;

export class AuditReceiptValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AuditReceiptValidationError';
  }
}

export class AuditReceiptUnavailableError extends Error {
  public constructor(message = 'Audit receipt append is unavailable; transition remains pending') {
    super(message);
    this.name = 'AuditReceiptUnavailableError';
  }
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const HASH = /^[a-f0-9]{64}$/;
const MODES = new Set<ConsequentialTransition['mode']>(['SIMULATED', 'SANDBOX', 'CONFIRMED']);

function assertText(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) throw new AuditReceiptValidationError(`${name} is invalid`);
}

function canonicalReceipt(receipt: Omit<AuditReceipt, 'receiptHash'>): string {
  return JSON.stringify(receipt, Object.keys(receipt).sort());
}

export function computeAuditReceiptHash(receipt: Omit<AuditReceipt, 'receiptHash'>): string {
  return createHash('sha256').update(canonicalReceipt(receipt)).digest('hex');
}

export function validateAuditReceipt(receipt: AuditReceipt): void {
  if (receipt.schemaVersion !== AUDIT_RECEIPT_SCHEMA_VERSION) throw new AuditReceiptValidationError('unsupported receipt schema');
  for (const [name, value] of Object.entries({
    receiptId: receipt.receiptId, tenantId: receipt.tenantId, sessionId: receipt.sessionId,
    promotionId: receipt.promotionId, actorRef: receipt.actorRef, capability: receipt.capability,
    policyRevision: receipt.policyRevision, correlationId: receipt.correlationId, causationId: receipt.causationId,
    idempotencyKey: receipt.idempotencyKey,
  })) assertText(value, name);
  if (!HASH.test(receipt.idempotencyFingerprint) || !HASH.test(receipt.receiptHash)) throw new AuditReceiptValidationError('receipt hash is invalid');
  if (receipt.previousReceiptHash !== null && !HASH.test(receipt.previousReceiptHash)) throw new AuditReceiptValidationError('previous receipt hash is invalid');
  if (!MODES.has(receipt.mode) || !['committed', 'pending', 'rejected'].includes(receipt.outcome)) throw new AuditReceiptValidationError('receipt outcome or mode is invalid');
  if (!Number.isSafeInteger(receipt.expectedResourceVersion) || receipt.expectedResourceVersion < 1 || !Number.isSafeInteger(receipt.actualResourceVersion) || receipt.actualResourceVersion < 1) throw new AuditReceiptValidationError('receipt resource version is invalid');
  if (receipt.actualResourceVersion < receipt.expectedResourceVersion) throw new AuditReceiptValidationError('receipt resource version regressed');
  if (!Number.isFinite(Date.parse(receipt.occurredAt)) || receipt.transition.from === receipt.transition.to) throw new AuditReceiptValidationError('receipt transition is invalid');
  if (computeAuditReceiptHash({ ...receipt, receiptHash: undefined as never }) !== receipt.receiptHash) throw new AuditReceiptValidationError('receipt hash does not match content');
}

export function buildAuditReceipt(input: ConsequentialTransition, previousReceiptHash: string | null = null, receiptId = input.idempotencyKey): AuditReceipt {
  for (const [name, value] of Object.entries(input)) {
    if (name === 'occurredAt' || name === 'reasonCode') continue;
    if (typeof value === 'number') continue;
    assertText(value, name);
  }
  if (!HASH.test(input.idempotencyFingerprint) || !Number.isSafeInteger(input.expectedResourceVersion) || input.expectedResourceVersion < 1 || !Number.isSafeInteger(input.actualResourceVersion) || input.actualResourceVersion < 1) throw new AuditReceiptValidationError('transition evidence is invalid');
  if (!MODES.has(input.mode) || input.fromState === input.toState) throw new AuditReceiptValidationError('transition is invalid');
  if (previousReceiptHash !== null && !HASH.test(previousReceiptHash)) throw new AuditReceiptValidationError('previous receipt hash is invalid');
  const unsigned = {
    schemaVersion: AUDIT_RECEIPT_SCHEMA_VERSION, receiptId, tenantId: input.tenantId, sessionId: input.sessionId,
    promotionId: input.promotionId, actorRef: input.actorRef, capability: input.capability, policyRevision: input.policyRevision,
    transition: { from: input.fromState, to: input.toState }, expectedResourceVersion: input.expectedResourceVersion,
    actualResourceVersion: input.actualResourceVersion, correlationId: input.correlationId, causationId: input.causationId,
    idempotencyKey: input.idempotencyKey, idempotencyFingerprint: input.idempotencyFingerprint, mode: input.mode,
    outcome: 'committed' as const, reasonCode: input.reasonCode ?? null, occurredAt: input.occurredAt ?? new Date().toISOString(), previousReceiptHash,
  };
  const receipt = { ...unsigned, receiptHash: computeAuditReceiptHash(unsigned) };
  validateAuditReceipt(receipt);
  return receipt;
}

export async function appendBeforeCommit(
  publisher: AuditReceiptPublisherPort,
  transition: ConsequentialTransition,
  commit: CommitTransition,
  previousReceiptHash: string | null = null,
): Promise<ConsequentialTransitionResult> {
  const receipt = buildAuditReceipt(transition, previousReceiptHash);
  try {
    const append = await publisher.append(receipt);
    await commit(receipt);
    return { status: 'committed', committed: true, receipt, append };
  } catch (error) {
    if (error instanceof AuditReceiptValidationError) throw error;
    return { status: 'pending', committed: false, receipt, append: null };
  }
}
