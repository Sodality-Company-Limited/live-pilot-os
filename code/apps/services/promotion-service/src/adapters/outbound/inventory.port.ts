export const INVENTORY_RESERVATION_SCHEMA_VERSION = '1.0.0' as const;

export type InventoryReservationOutcome =
  | 'accepted'
  | 'released'
  | 'insufficient'
  | 'unknown';

export interface InventoryReservationRequest {
  readonly reservationId: string;
  readonly promotionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly expectedRevision: number;
  readonly expiresAt: string;
  readonly idempotencyKey: string;
  readonly idempotencyFingerprint: string;
  readonly correlationId: string;
  readonly causationId: string | null;
}

export interface InventoryReservationResult {
  readonly schemaVersion: typeof INVENTORY_RESERVATION_SCHEMA_VERSION;
  readonly reservationId: string;
  readonly promotionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly outcome: InventoryReservationOutcome;
  readonly revision: number;
  readonly expiresAt: string;
  readonly idempotencyKey: string;
  readonly idempotencyFingerprint: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly observedAt: string;
  readonly reconciliationRequired: boolean;
}

export interface InventoryReservationReconciliation {
  readonly reservationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
  readonly idempotencyFingerprint: string;
  readonly correlationId: string;
  readonly causationId: string | null;
}

export interface InventoryPort {
  reserve(request: InventoryReservationRequest): Promise<InventoryReservationResult>;
  reconcile(request: InventoryReservationReconciliation): Promise<InventoryReservationResult>;
}

export class InventoryBoundaryError extends Error {
  public constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'InventoryBoundaryError';
  }
}

function required(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InventoryBoundaryError('INVENTORY_INVALID_RESULT', `${name} is required`);
  }
}

function validTimestamp(value: string, name: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new InventoryBoundaryError('INVENTORY_INVALID_RESULT', `${name} must be an ISO timestamp`);
  return parsed;
}

function validFingerprint(value: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new InventoryBoundaryError('INVENTORY_INVALID_RESULT', 'idempotencyFingerprint must be a SHA-256 hex digest');
  }
}

export function validateInventoryReservationRequest(request: InventoryReservationRequest): void {
  required(request.reservationId, 'reservationId');
  required(request.promotionId, 'promotionId');
  required(request.tenantId, 'tenantId');
  required(request.sessionId, 'sessionId');
  required(request.sku, 'sku');
  required(request.idempotencyKey, 'idempotencyKey');
  required(request.idempotencyFingerprint, 'idempotencyFingerprint');
  required(request.correlationId, 'correlationId');
  if (!Number.isSafeInteger(request.quantity) || request.quantity < 1) throw new InventoryBoundaryError('INVENTORY_INVALID_REQUEST', 'quantity must be a positive integer');
  if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) throw new InventoryBoundaryError('INVENTORY_INVALID_REQUEST', 'expectedRevision must be a non-negative integer');
  const expiry = validTimestamp(request.expiresAt, 'expiresAt');
  if (expiry <= Date.now()) throw new InventoryBoundaryError('INVENTORY_RESERVATION_EXPIRED', 'reservation expiry must be in the future');
  validFingerprint(request.idempotencyFingerprint);
}

export function validateInventoryReservationResult(result: InventoryReservationResult): void {
  required(result.reservationId, 'reservationId');
  required(result.promotionId, 'promotionId');
  required(result.tenantId, 'tenantId');
  required(result.sessionId, 'sessionId');
  required(result.sku, 'sku');
  required(result.idempotencyKey, 'idempotencyKey');
  required(result.idempotencyFingerprint, 'idempotencyFingerprint');
  required(result.correlationId, 'correlationId');
  required(result.outcome, 'outcome');
  if (result.schemaVersion !== INVENTORY_RESERVATION_SCHEMA_VERSION) throw new InventoryBoundaryError('INVENTORY_SCHEMA_UNSUPPORTED', 'unsupported inventory reservation schema');
  if (!['accepted', 'released', 'insufficient', 'unknown'].includes(result.outcome)) throw new InventoryBoundaryError('INVENTORY_INVALID_RESULT', 'unknown inventory outcome');
  if (!Number.isSafeInteger(result.quantity) || result.quantity < 1) throw new InventoryBoundaryError('INVENTORY_INVALID_RESULT', 'quantity must be a positive integer');
  if (!Number.isSafeInteger(result.revision) || result.revision < 0) throw new InventoryBoundaryError('INVENTORY_INVALID_RESULT', 'revision must be a non-negative integer');
  const expiry = validTimestamp(result.expiresAt, 'expiresAt');
  validTimestamp(result.observedAt, 'observedAt');
  validFingerprint(result.idempotencyFingerprint);
  if (result.outcome === 'accepted' && expiry <= Date.parse(result.observedAt)) throw new InventoryBoundaryError('INVENTORY_RESERVATION_EXPIRED', 'accepted reservation is expired');
  if (result.outcome === 'unknown' && result.reconciliationRequired !== true) throw new InventoryBoundaryError('INVENTORY_RECONCILIATION_REQUIRED', 'unknown outcome requires reconciliation');
  if (result.outcome !== 'unknown' && result.reconciliationRequired === true) throw new InventoryBoundaryError('INVENTORY_INVALID_RESULT', 'only unknown outcomes require reconciliation');
}

export function isInventoryReservationUsable(result: InventoryReservationResult, now = new Date().toISOString()): boolean {
  validateInventoryReservationResult(result);
  return result.outcome === 'accepted' && Date.parse(now) < Date.parse(result.expiresAt);
}
