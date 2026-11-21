import type { PromotionAggregate, PromotionTransitionResult } from '../domain/promotion-aggregate';
import { PromotionControl, type PromotionControlTransitionCommand } from '../application/promotion-control';

export interface PromotionExpiryJob extends PromotionControlTransitionCommand {
  readonly promotion: PromotionAggregate;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly promotionId: string;
}

/** Bounded expiry worker. Expiry/cancellation remain aggregate-authorized mutations. */
export class PromotionExpiryWorker {
  public constructor(private readonly control: PromotionControl) {}

  public expire(job: PromotionExpiryJob): PromotionTransitionResult {
    if (job.to !== 'expired') throw new Error('Expiry worker accepts only expired transitions');
    if (job.promotion.snapshot.id !== job.promotionId || job.promotion.snapshot.tenantId !== job.tenantId) {
      throw new Error('Expiry job promotion scope is invalid');
    }
    return this.control.transition(job.promotion, job);
  }

  public cancel(job: PromotionExpiryJob): PromotionTransitionResult {
    if (job.to !== 'cancelled') throw new Error('Cancellation worker accepts only cancelled transitions');
    if (job.promotion.snapshot.id !== job.promotionId || job.promotion.snapshot.tenantId !== job.tenantId) {
      throw new Error('Cancellation job promotion scope is invalid');
    }
    return this.control.transition(job.promotion, job);
  }
}

export const PromotionExpiryWorkflow = PromotionExpiryWorker;
