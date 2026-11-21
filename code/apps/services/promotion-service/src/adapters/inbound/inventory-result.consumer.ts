import {
  InventoryBoundaryError,
  type InventoryReservationResult,
  validateInventoryReservationResult,
} from '../outbound/inventory.port';

export interface InventoryResultEvent extends InventoryReservationResult {
  readonly messageId: string;
}

export type InventoryResultAction = 'accepted' | 'released' | 'insufficient' | 'unknown' | 'reconciliation_required';

export interface InventoryResultObservation {
  readonly action: InventoryResultAction;
  readonly result: InventoryReservationResult;
  readonly duplicate: boolean;
}

export interface InventoryResultConsumerOptions {
  readonly onResult: (observation: InventoryResultObservation) => Promise<void>;
  readonly reconcile: (result: InventoryReservationResult) => Promise<void>;
}

/**
 * Consumes inventory facts only. Inventory remains the authoritative writer;
 * this adapter keeps an inbox projection and forwards only safe references to Promotion.
 */
export class InventoryResultConsumer {
  private readonly seen = new Map<string, { readonly revision: number; readonly fingerprint: string }>();

  public constructor(private readonly options: InventoryResultConsumerOptions) {}

  public async consume(event: InventoryResultEvent): Promise<InventoryResultObservation> {
    if (typeof event.messageId !== 'string' || event.messageId.trim().length === 0) {
      throw new InventoryBoundaryError('INVENTORY_INVALID_EVENT', 'messageId is required');
    }
    validateInventoryReservationResult(event);
    const identity = `${event.tenantId}:${event.reservationId}`;
    const fingerprint = `${event.revision}:${event.outcome}:${event.idempotencyKey}:${event.idempotencyFingerprint}`;
    const prior = this.seen.get(identity);
    if (prior?.fingerprint === fingerprint) {
      const duplicate: InventoryResultObservation = { action: this.actionFor(event), result: event, duplicate: true };
      await this.options.onResult(duplicate);
      return duplicate;
    }
    if (prior && event.revision < prior.revision) {
      throw new InventoryBoundaryError('INVENTORY_STALE_RESULT', 'inventory revision regressed');
    }
    if (prior && event.revision === prior.revision) {
      throw new InventoryBoundaryError('INVENTORY_REVISION_CONFLICT', 'inventory revision has conflicting evidence');
    }
    this.seen.set(identity, { revision: event.revision, fingerprint });
    const action = this.actionFor(event);
    const observation: InventoryResultObservation = { action, result: event, duplicate: false };
    await this.options.onResult(observation);
    if (event.outcome === 'unknown') await this.options.reconcile(event);
    return observation;
  }

  private actionFor(result: InventoryReservationResult): InventoryResultAction {
    return result.outcome === 'unknown' ? 'reconciliation_required' : result.outcome;
  }

}
